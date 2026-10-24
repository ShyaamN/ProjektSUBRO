import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createSession } from './fixtures.ts';
import type { Session } from './types.ts';

type Row = { revision: number; snapshot: Session; expires_at: string };
type Options = { memory?: boolean; directory?: string; supabaseUrl?: string; secret?: string; publishableKey?: string; demoKey?: string };
const locks = new Map<string, Promise<void>>();
const lifetime = 24 * 60 * 60 * 1000;
export const COOKIE_NAME = 'subro_demo';
export class RevisionConflict extends Error { constructor() { super('This session changed. Latest state loaded; retry your action.'); } }
export class SessionExpired extends Error { constructor() { super('Demo session expired. Refresh to begin a new synthetic session.'); } }
export class PersistenceError extends Error { constructor() { super('Demo storage is unavailable. No change was saved; please retry.'); } }

/** Server-only capability store. Browser receives random token, never editable state. */
export class SessionStore {
  private rows = new Map<string, Row>();
  private options: Options;
  readonly persistence: string;
  constructor(options: Options = {}) {
    this.options = options;
    this.persistence = this.remoteEnabled() ? 'Supabase · durable server storage' : options.memory ? 'Ephemeral server memory · may reset' : 'Local disk · single server process';
  }
  private remoteEnabled() { return Boolean(this.options.supabaseUrl && (this.options.secret || (this.options.publishableKey && this.options.demoKey))); }
  private hash(token: string) { return createHash('sha256').update(token).digest('hex'); }
  private async remote(path: string, init?: RequestInit) {
    const secret = this.options.secret;
    const key = secret || this.options.publishableKey!;
    try {
      const response = await fetch(`${this.options.supabaseUrl!.replace(/\/$/, '')}/rest/v1/demo_sessions${path}`, {
        ...init, cache: 'no-store', signal: AbortSignal.timeout(8000),
        headers: { apikey: key, ...(secret?.startsWith('eyJ') ? { Authorization: `Bearer ${secret}` } : {}), ...(!secret ? { 'x-demo-key': this.options.demoKey! } : {}), 'content-type': 'application/json', Prefer: 'return=representation', ...init?.headers },
      });
      if (!response.ok) throw new PersistenceError();
      return await response.json() as Row[];
    } catch { throw new PersistenceError(); }
  }
  private async load(key: string): Promise<Row | undefined> {
    if (this.remoteEnabled()) {
      const rows = await this.remote(`?token_hash=eq.${key}&select=revision,snapshot,expires_at`);
      return rows[0];
    }
    if (this.options.memory) {
      // Bound idle synthetic sessions in a warm server process.
      for (const [k, row] of this.rows) if (Date.parse(row.expires_at) <= Date.now()) this.rows.delete(k);
      return this.rows.get(key);
    }
    try { return JSON.parse(await readFile(join(this.options.directory ?? resolve('.demo'), `${key}.json`), 'utf8')) as Row; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw new PersistenceError(); }
  }
  private async save(key: string, row: Row, expectedRevision?: number, leaseId?: string) {
    if (this.remoteEnabled()) {
      const rows = await this.remote(expectedRevision === undefined ? '' : `?token_hash=eq.${key}&revision=eq.${expectedRevision}${leaseId ? `&lease_id=eq.${leaseId}` : ''}`, {
        method: expectedRevision === undefined ? 'POST' : 'PATCH',
        body: JSON.stringify({ ...row, ...(expectedRevision === undefined ? { token_hash: key } : {}), lease_id: null, lease_until: null, updated_at: new Date().toISOString() }),
      });
      if (!rows.length) throw new RevisionConflict();
      return;
    }
    if (this.options.memory) { this.rows.set(key, structuredClone(row)); return; }
    const directory = this.options.directory ?? resolve('.demo');
    const temporary = join(directory, `${key}.${randomBytes(8).toString('hex')}.tmp`);
    try {
      await mkdir(directory, { recursive: true });
      await writeFile(temporary, JSON.stringify(row), { mode: 0o600 });
      await rename(temporary, join(directory, `${key}.json`));
    } catch { throw new PersistenceError(); }
  }
  async open(token?: string) {
    if (token && /^[a-f0-9]{64}$/.test(token)) {
      const row = await this.load(this.hash(token));
      if (row && Date.parse(row.expires_at) > Date.now()) return { token, session: structuredClone(row.snapshot) };
    }
    const nextToken = randomBytes(32).toString('hex');
    const session = createSession();
    await this.save(this.hash(nextToken), { revision: 0, snapshot: session, expires_at: new Date(Date.now() + lifetime).toISOString() });
    return { token: nextToken, session };
  }
  async transact(token: string, revision: number, mutate: (draft: Session) => void | Promise<void>) {
    if (!/^[a-f0-9]{64}$/.test(token)) throw new SessionExpired();
    const key = this.hash(token);
    const lockKey = `${this.options.supabaseUrl ?? this.options.directory ?? this.persistence}:${key}`;
    const previous = locks.get(lockKey) ?? Promise.resolve();
    let release!: () => void;
    const held = new Promise<void>(r => { release = r; });
    const queued = previous.then(() => held);
    locks.set(lockKey, queued);
    await previous;
    let leaseId: string | undefined;
    try {
      const row = await this.load(key);
      if (!row || Date.parse(row.expires_at) <= Date.now()) throw new SessionExpired();
      if (row.revision !== revision) throw new RevisionConflict();
      if (this.remoteEnabled()) {
        // Reserve before any provider call. CAS after a model call alone cannot
        // prevent duplicate billable calls from separate serverless workers.
        const candidate = randomBytes(16).toString('hex');
        const at = new Date().toISOString();
        const leased = await this.remote(`?token_hash=eq.${key}&revision=eq.${revision}&or=(lease_until.is.null,lease_until.lt.${encodeURIComponent(at)})`, {
          method: 'PATCH', body: JSON.stringify({ lease_id: candidate, lease_until: new Date(Date.now() + 60000).toISOString() }),
        });
        if (!leased.length) throw new RevisionConflict();
        leaseId = candidate;
      }
      const draft = structuredClone(row.snapshot);
      await mutate(draft);
      draft.revision = revision + 1;
      await this.save(key, { revision: draft.revision, snapshot: draft, expires_at: row.expires_at }, revision, leaseId);
      leaseId = undefined;
      return draft;
    } finally {
      if (leaseId) {
        try { await this.remote(`?token_hash=eq.${key}&lease_id=eq.${leaseId}`, { method: 'PATCH', body: JSON.stringify({ lease_id: null, lease_until: null }) }); }
        catch { /* Crash/storage failure leaves a bounded 60-second lease. */ }
      }
      release(); if (locks.get(lockKey) === queued) locks.delete(lockKey);
    }
  }
}
let currentStore: SessionStore | undefined;
let currentConfiguration = '';
export function getSessionStore() {
  const configuration = [process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, process.env.SUPABASE_PUBLISHABLE_KEY, process.env.SUPABASE_DEMO_KEY, process.env.DEMO_STORAGE, process.env.VERCEL].join('|');
  if (!currentStore || configuration !== currentConfiguration) {
    currentConfiguration = configuration;
    currentStore = new SessionStore({ supabaseUrl: process.env.SUPABASE_URL, secret: process.env.SUPABASE_SECRET_KEY, publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY, demoKey: process.env.SUPABASE_DEMO_KEY, memory: process.env.DEMO_STORAGE === 'memory' || Boolean(process.env.VERCEL) });
  }
  return currentStore;
}
