import { ZodError } from 'zod';
import { agentMode } from '../../../lib/gemini.ts';
import { executeCommand, parseCommand } from '../../../lib/commands.ts';
import { COOKIE_NAME, getSessionStore, PersistenceError, RevisionConflict, SessionExpired } from '../../../lib/session.ts';
import type { Session } from '../../../lib/types.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff' };
function cookie(request: Request) { return request.headers.get('cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1); }
function reply(session: Session, persistence: string, status = 200, error?: string) { return Response.json({ session, mode: agentMode(), persistence, ...(error ? { error } : {}) }, { status, headers }); }

export async function GET(request: Request) {
  try {
    const store = getSessionStore();
    const opened = await store.open(cookie(request));
    const response = reply(opened.session, store.persistence);
    const secure = new URL(request.url).protocol === 'https:' || process.env.NODE_ENV === 'production';
    response.headers.set('Set-Cookie', `${COOKIE_NAME}=${opened.token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${secure ? '; Secure' : ''}`);
    return response;
  } catch { return Response.json({ error: 'Demo storage is unavailable. Please retry.' }, { status: 503, headers }); }
}

async function boundedBody(request: Request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new Error('JSON request required.');
  if (Number(request.headers.get('content-length') ?? 0) > 8192) throw new Error('Request too large.');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('JSON request required.');
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 8192) { await reader.cancel(); throw new Error('Request too large.'); }
    chunks.push(value);
  }
  const data = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(data)) as unknown;
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  const requestUrl=new URL(request.url);
  const host=request.headers.get('host') || requestUrl.host;
  const protocol=request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || requestUrl.protocol.slice(0,-1);
  if (!origin || origin !== `${protocol}://${host}` || request.headers.get('sec-fetch-site') === 'cross-site') return Response.json({ error: 'Same-origin request required.' }, { status: 403, headers });
  const token = cookie(request);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return Response.json({ error: 'Open the demo before changing a session.' }, { status: 401, headers });
  const store = getSessionStore();
  try {
    const command = parseCommand(await boundedBody(request));
    const session = await store.transact(token, command.revision, draft => executeCommand(draft, command));
    return reply(session, store.persistence);
  } catch (error) {
    const status = error instanceof RevisionConflict ? 409 : error instanceof SessionExpired ? 401 : error instanceof PersistenceError ? 503 : 400;
    const message = error instanceof ZodError ? 'Invalid command. Use only the bounded synthetic controls.' : error instanceof SyntaxError ? 'Invalid JSON request.' : error instanceof Error ? error.message : 'Command failed.';
    // Known failures never return credentials, provider bodies, or stack traces.
    if (status === 503 || status === 401) return Response.json({ error: message }, { status, headers });
    try { return reply((await store.open(token)).session, store.persistence, status, message); }
    catch { return Response.json({ error: 'Demo storage is unavailable. Please retry.' }, { status: 503, headers }); }
  }
}
