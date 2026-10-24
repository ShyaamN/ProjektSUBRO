-- Synthetic demo state only. Run against the dedicated ProjektSUBRO project.
-- One snapshot holds claims, ledger and audit atomically; revision is the CAS fence.
create table if not exists public.demo_sessions (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  revision integer not null default 0 check (revision >= 0),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  expires_at timestamptz not null default (now() + interval '1 day'),
  updated_at timestamptz not null default now(),
  lease_id text,
  lease_until timestamptz,
  constraint lease_pair_matches check ((lease_id is null) = (lease_until is null)),
  constraint snapshot_revision_matches check ((snapshot ->> 'revision')::integer = revision),
  constraint synthetic_claims_present check (jsonb_typeof(snapshot -> 'claims') = 'array'),
  constraint snapshot_size_bounded check (octet_length(snapshot::text) <= 1048576)
);
alter table public.demo_sessions enable row level security;
-- Intentionally no browser policies: all reads and writes go through the trusted
-- Next.js endpoint, which checks the HttpOnly session capability and revision.
revoke all on public.demo_sessions from anon, authenticated;
grant select, insert, update, delete on public.demo_sessions to service_role;
create index if not exists demo_sessions_expiry_idx on public.demo_sessions (expires_at);
