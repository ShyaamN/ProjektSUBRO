import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseCommand, executeCommand } from '../src/lib/commands';
import { createSession } from '../src/lib/fixtures';
import { GET, POST } from '../src/app/api/demo/route';
import { validateGeminiProposal, geminiProposal } from '../src/lib/gemini';

beforeEach(() => { vi.unstubAllEnvs(); vi.stubEnv('DEMO_STORAGE', 'memory'); vi.stubEnv('GEMINI_API_KEY', ''); for (const key of ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_DEMO_KEY']) vi.stubEnv(key, ''); });
afterEach(() => { vi.unstubAllGlobals(); });
const request = (body: unknown, cookie = '', origin = 'http://localhost:3000') => new Request('http://localhost:3000/api/demo', {
  method: 'POST', headers: { 'content-type': 'application/json', origin, cookie }, body: JSON.stringify(body),
});
describe('validated demo commands', () => {
  it('bounds Flash Lite thinking and withholds unread source text at the provider boundary', async () => {
    vi.stubEnv('GEMINI_API_KEY','synthetic-test-key');vi.stubEnv('GEMINI_MODEL','gemini-3.1-flash-lite');
    let payload:Record<string,any>={};
    vi.stubGlobal('fetch',async (_input:unknown,init?:RequestInit)=>{
      payload=JSON.parse(String(init?.body));
      return Response.json({candidates:[{content:{role:'model',parts:[{text:JSON.stringify({action:'READ_CLAIM',reason:'Inspect the synthetic denial.',sources:[],requiresHuman:false})}]},finishReason:'STOP'}]});
    });
    const s=createSession();await executeCommand(s,parseCommand({command:'purchase',claimId:'CASE-1042',revision:0}));
    const proposal=await geminiProposal(s.claims[0]);
    expect(proposal?.action).toBe('READ_CLAIM');
    expect(payload.generationConfig.thinkingConfig.thinkingLevel).toBe('MINIMAL');
    expect(payload.generationConfig.responseJsonSchema.properties.action.enum).not.toContain('READ_EVIDENCE');
    expect(JSON.stringify(payload)).not.toContain(s.claims[0].evidence[0].content);
  });
  it('pauses on provider rate limiting without inventing a payer outcome', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-only');
    vi.stubGlobal('fetch', async () => Response.json({ error: { code: 429, message: 'Quota exceeded' } }, { status: 429 }));
    const s = createSession();
    await executeCommand(s, parseCommand({ command: 'purchase', claimId: 'CASE-1042', revision: 0 }));
    await executeCommand(s, parseCommand({ command: 'step', claimId: 'CASE-1042', revision: 0 }));
    expect(s.claims[0].status).toBe('ESCALATED');
    expect(s.claims[0].recovery?.terminalReason).toBe('GEMINI_RATE_LIMIT');
    expect(s.claims[0].recovery?.events.at(-1)?.outcome).toContain('GEMINI_RATE_LIMIT');
    expect(s.ledger.filter(e => e.type === 'COLLECTION')).toHaveLength(0);
  });
  it('checks scenario guardrails before calling a configured model', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-only');
    let calls = 0;
    vi.stubGlobal('fetch', async () => { calls++; throw new Error('Must never be reached'); });
    const s = createSession();
    await executeCommand(s, parseCommand({ command: 'purchase', claimId: 'CASE-1042', revision: 0 }));
    await executeCommand(s, parseCommand({ command: 'chaos', claimId: 'CASE-1042', kind: 'missing', revision: 0 }));
    await executeCommand(s, parseCommand({ command: 'step', claimId: 'CASE-1042', revision: 0 }));
    expect(s.claims[0].recovery?.terminalReason).toBe('EVIDENCE_MISSING');
    expect(calls).toBe(0);
  });
  it('honors a model request for human review instead of executing its draft action', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-only');
    vi.stubGlobal('fetch', async () => Response.json({ candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify({ action: 'DRAFT_RESPONSE', reason: 'Human review requested.', sources: [], requiresHuman: true }) }] }, finishReason: 'STOP' }] }));
    const s = createSession();
    await executeCommand(s, parseCommand({ command: 'purchase', claimId: 'CASE-1042', revision: 0 }));
    await executeCommand(s, parseCommand({ command: 'step', claimId: 'CASE-1042', revision: 0 }));
    expect(s.claims[0].status).toBe('ESCALATED');
    expect(s.claims[0].recovery?.draft).toBe('');
    expect(s.ledger.filter(e => e.type === 'COLLECTION')).toHaveLength(0);
  });
  it('rejects invented or cross-claim citations and model financial writes', () => {
    const claim = createSession().claims[0];
    expect(() => validateGeminiProposal({ action: 'DRAFT_RESPONSE', reason: 'ready', sources: ['E-6077-A'], requiresHuman: false }, claim)).toThrow();
    expect(() => validateGeminiProposal({ action: 'PAY_MONEY', reason: 'ready', sources: [], requiresHuman: false }, claim)).toThrow();
    expect(() => validateGeminiProposal({ action: 'READ_CLAIM', reason: 'ready', sources: [], requiresHuman: false, collection: 50000 }, claim)).toThrow();
  });
  it('honestly returns no model proposal when Gemini is unconfigured', async () => {
    expect(await geminiProposal(createSession().claims[0])).toBeNull();
  });
  it.each([
    { command: 'claim', revision: 0, claimId: 'CASE-1042', patch: { collectible: -1 } },
    { command: 'claim', revision: 0, claimId: 'CASE-1042', patch: { offer: 1.1 } },
    { command: 'claim', revision: 0, claimId: 'CASE-1042', patch: { probability: 2 } },
    { command: 'claim', revision: 0, claimId: 'CASE-1042', patch: { evidence: [] } },
    { command: 'settings', revision: 0, patch: { maxSteps: 999 } },
    { command: 'settings', revision: 0, patch: { capital: '9000' } },
    { command: 'step', revision: 0, claimId: 'CASE-1042', proposal: { action: 'STOP' } },
    { command: 'reset' },
  ])('rejects unsafe or unsupported input %j', body => expect(() => parseCommand(body)).toThrow());
  it('requires explicit funding before stepping', async () => {
    const s = createSession();
    await expect(executeCommand(s, parseCommand({ command: 'step', claimId: 'CASE-1042', revision: 0 }))).rejects.toThrow();
    expect(s.ledger).toHaveLength(0);
  });
  it('does not let capital settings spend reserves needed for funded recovery', async () => {
    const s = createSession();
    await executeCommand(s, parseCommand({ command: 'purchase', claimId: 'CASE-1042', revision: 0 }));
    await expect(executeCommand(s, parseCommand({ command: 'settings', revision: 0, patch: { capital: 30000 } }))).rejects.toThrow(/capital/i);
    await expect(executeCommand(s, parseCommand({ command: 'settings', revision: 0, patch: { capital: 33000, apr: 1 } }))).rejects.toThrow(/capital/i);
    expect(s.settings.capital).toBe(5000000);
  });
});
describe('demo route', () => {
  it('uses the browser Host behind a wildcard Next listener for same-origin checks', async () => {
    const first=await GET(new Request('http://0.0.0.0:3000/api/demo',{headers:{host:'localhost:3000'}}));
    const cookie=first.headers.get('set-cookie')!.split(';')[0];
    const response=await POST(new Request('http://0.0.0.0:3000/api/demo',{method:'POST',headers:{host:'localhost:3000',origin:'http://localhost:3000','content-type':'application/json',cookie},body:JSON.stringify({command:'underwrite',revision:0})}));
    expect(response.status).toBe(200);
  });
  it('returns a server-owned session and an HttpOnly opaque cookie', async () => {
    const response = await GET(new Request('http://localhost:3000/api/demo'));
    const data = await response.json();
    expect(data.session.claims).toHaveLength(100);
    expect(data.mode).toBe('rules');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
  it('rejects cross-origin mutations', async () => {
    expect((await POST(request({ command: 'reset', revision: 0 }, '', 'https://attacker.test'))).status).toBe(403);
  });
  it('preserves session on stale revision and validates financial patches', async () => {
    const first = await GET(new Request('http://localhost:3000/api/demo'));
    const cookie = first.headers.get('set-cookie')!.split(';')[0];
    const good = await POST(request({ command: 'underwrite', revision: 0 }, cookie));
    expect(good.status).toBe(200);
    expect((await good.json()).session.revision).toBe(1);
    const stale = await POST(request({ command: 'reset', revision: 0 }, cookie));
    expect(stale.status).toBe(409);
    expect((await stale.json()).session.underwritten).toBe(true);
    const unsafe = await POST(request({ command: 'claim', claimId: 'CASE-1042', revision: 1, patch: { offer: -500 } }, cookie));
    expect(unsafe.status).toBe(400);
  });
  it('isolates sessions and runs a funded synthetic recovery without duplicated collection', async () => {
    const first = await GET(new Request('http://localhost:3000/api/demo'));
    const cookie = first.headers.get('set-cookie')!.split(';')[0];
    let data = await first.json();
    for (const command of ['underwrite', 'purchase', ...Array(10).fill('step')]) {
      const response = await POST(request({ command, claimId: command === 'underwrite' ? undefined : 'CASE-1042', revision: data.session.revision }, cookie));
      data = await response.json();
      expect(response.status, data.error).toBe(200);
    }
    expect(data.session.claims.find((c: {id:string}) => c.id === 'CASE-1042').status).toBe('RECOVERED');
    expect(data.session.ledger.filter((e: {type:string}) => e.type === 'COLLECTION')).toHaveLength(1);
    const other = await GET(new Request('http://localhost:3000/api/demo'));
    expect((await other.json()).session.ledger).toHaveLength(0);
  });
});
