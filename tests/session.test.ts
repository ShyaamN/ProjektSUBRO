import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { SessionStore, RevisionConflict } from '../src/lib/session';

describe('server session transactions', () => {
  it('leases remote state before invoking a billable mutator in independent workers', async () => {
    let row: Record<string, unknown> | undefined;
    vi.stubGlobal('fetch', async (input: string, init: RequestInit) => {
      const url = new URL(input);
      if (init.method === 'POST') { row = JSON.parse(init.body as string); return Response.json([row]); }
      if (!init.method) return Response.json(row ? [structuredClone(row)] : []);
      const patch = JSON.parse(init.body as string);
      if (url.searchParams.has('or') && row?.lease_id) return Response.json([]);
      if (url.searchParams.get('revision') && url.searchParams.get('revision') !== `eq.${row?.revision}`) return Response.json([]);
      if (url.searchParams.get('lease_id') && url.searchParams.get('lease_id') !== `eq.${row?.lease_id}`) return Response.json([]);
      Object.assign(row!, patch); return Response.json([structuredClone(row)]);
    });
    try {
      const options = { publishableKey: 'sb_publishable_demo', demoKey: 'backend-secret' };
      const first = new SessionStore({ ...options, supabaseUrl: 'https://demo.supabase.co' });
      // Equivalent URLs give separate in-process mutex scopes, as separate workers have.
      const second = new SessionStore({ ...options, supabaseUrl: 'https://demo.supabase.co/' });
      const { token } = await first.open();
      let billableCalls = 0;
      const mutate = async () => { billableCalls++; await new Promise(r => setTimeout(r, 30)); };
      const results = await Promise.allSettled([first.transact(token, 0, mutate), second.transact(token, 0, mutate)]);
      expect(billableCalls).toBe(1);
      expect(results.filter(x => x.status === 'fulfilled')).toHaveLength(1);
      expect(row?.lease_id).toBeNull();
      expect(row?.revision).toBe(1);
    } finally { vi.unstubAllGlobals(); }
  });
  it('uses scoped backend capability headers for Supabase without a service-role key', async () => {
    let stored: unknown;
    const fetcher = vi.fn(async (_url: string, init: RequestInit) => {
      const headers = init.headers as Record<string, string>;
      if (headers.apikey !== 'sb_publishable_demo' || headers['x-demo-key'] !== 'backend-secret') return new Response('{}', { status: 401 });
      if (init.method === 'POST') stored = JSON.parse(init.body as string);
      return Response.json(stored ? [stored] : []);
    });
    vi.stubGlobal('fetch', fetcher);
    try {
      const store = new SessionStore({ supabaseUrl: 'https://demo.supabase.co', publishableKey: 'sb_publishable_demo', demoKey: 'backend-secret' });
      const first = await store.open();
      expect((await store.open(first.token)).session.id).toBe(first.session.id);
      expect(store.persistence).toContain('Supabase');
      expect(JSON.stringify(first)).not.toContain('backend-secret');
    } finally { vi.unstubAllGlobals(); }
  });
  it('persists state under an opaque token across store instances', async () => {
    const directory = await mkdtemp(join(process.cwd(), '.session-test-'));
    try {
      const a = new SessionStore({ directory });
      const first = await a.open();
      expect(first.token).toMatch(/^[a-f0-9]{64}$/);
      await a.transact(first.token, 0, s => { s.underwritten = true; });
      const second = await new SessionStore({ directory }).open(first.token);
      expect(second.session.underwritten).toBe(true);
      expect(second.session.revision).toBe(1);
      expect(second.session.id).toBe(first.session.id);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
  it('allows only one concurrent mutation at a revision', async () => {
    const store = new SessionStore({ memory: true });
    const { token } = await store.open();
    const outcomes = await Promise.allSettled([0, 1].map(() => store.transact(token, 0, async s => {
      await new Promise(resolve => setTimeout(resolve, 5));
      s.underwritten = true;
    })));
    expect(outcomes.filter(x => x.status === 'fulfilled')).toHaveLength(1);
    const rejected = outcomes.find(x => x.status === 'rejected');
    expect(rejected?.status === 'rejected' && rejected.reason).toBeInstanceOf(RevisionConflict);
    expect((await store.open(token)).session.revision).toBe(1);
  });
  it('does not persist partial changes when a command fails', async () => {
    const store = new SessionStore({ memory: true });
    const { token, session } = await store.open();
    await expect(store.transact(token, 0, s => { s.settings.capital = 0; throw new Error('failed'); })).rejects.toThrow('failed');
    expect((await store.open(token)).session).toEqual(session);
  });
  it('does not expose another session from a fabricated token', async () => {
    const store = new SessionStore({ memory: true });
    const first = await store.open();
    const other = await store.open('a'.repeat(64));
    expect(first.session.id).not.toBe(other.session.id);
    expect(other.token).not.toBe('a'.repeat(64));
  });
});
