-- SUBRO — normalized PostgreSQL schema for Supabase (future production persistence).
-- The shipped sandbox runs browser-persisted synthetic state; apply this schema to move
-- the same domain model server-side. Only synthetic data may be loaded until legal,
-- contractual, privacy, and operational infrastructure is established.
-- Enable RLS on every table and add policies per authenticated role before production use.

create extension if not exists pgcrypto;

create table clinics (id text primary key, name text not null, created_at timestamptz not null default now());
create table insurers (id text primary key, name text not null, created_at timestamptz not null default now());

create table claims (
  id text primary key,
  clinic_id text not null references clinics(id),
  insurer_id text not null references insurers(id),
  service_date date not null, submission_date date not null, denial_date date not null, deadline date not null,
  denial_category text not null, denial_reason text not null,
  billed_cents bigint not null check (billed_cents >= 0),
  allowed_cents bigint not null check (allowed_cents >= 0),
  patient_responsibility_cents bigint not null check (patient_responsibility_cents >= 0),
  collectible_cents bigint generated always as (allowed_cents - patient_responsibility_cents) stored,
  recovery_probability numeric(5,4) not null check (recovery_probability between 0 and 1), -- modeled assumption
  estimated_cost_cents bigint not null default 0,
  estimated_duration_days int not null default 30,
  authorization_status text not null check (authorization_status in ('AUTHORIZED','PENDING','REQUIRED','NOT_REQUIRED')),
  required_evidence_id text,
  scenario text,
  check (allowed_cents - patient_responsibility_cents > 0)
);

create table claim_documents (
  id text primary key, claim_id text not null references claims(id) on delete cascade,
  doc_type text not null, status text not null check (status in ('AVAILABLE','MISSING','CONTRADICTORY')),
  provenance text not null, doc_date date, note text
);
create table evidence_records (id text primary key, claim_id text not null references claims(id) on delete cascade, document_id text references claim_documents(id), provenance text not null, verified_at timestamptz);

create table underwriting_assessments (
  id uuid primary key default gen_random_uuid(), claim_id text not null references claims(id),
  probability numeric(5,4) not null, expected_collection_cents bigint not null, advance_cents bigint not null,
  risk_reserve_cents bigint not null, max_price_cents bigint not null, expected_contribution_cents bigint not null,
  decision text not null check (decision in ('BUY CANDIDATE','NEEDS REVIEW','DECLINE')),
  reasons jsonb not null default '[]', checks jsonb not null default '[]', created_at timestamptz not null default now()
);

create table financing_offers (id uuid primary key default gen_random_uuid(), claim_id text not null references claims(id), advance_cents bigint not null, status text not null default 'OPEN', idempotency_key text not null unique, created_at timestamptz not null default now());
create table purchases (id uuid primary key default gen_random_uuid(), claim_id text not null unique references claims(id), offer_id uuid references financing_offers(id), advance_cents bigint not null, expected_collection_cents bigint not null, realized_collection_cents bigint not null default 0, status text not null default 'ACTIVE', idempotency_key text not null unique, created_at timestamptz not null default now());
create table capital_allocations (id uuid primary key default gen_random_uuid(), purchase_id uuid not null references purchases(id), reserved_cents bigint not null, released_cents bigint not null default 0, created_at timestamptz not null default now());

create table recovery_workflows (id uuid primary key default gen_random_uuid(), claim_id text not null references claims(id), status text not null, budget_cents bigint not null, spent_cents bigint not null default 0, submissions int not null default 0, realized_cents bigint not null default 0, terminal_reason text, created_at timestamptz not null default now());
create table agent_operations (id uuid primary key default gen_random_uuid(), workflow_id uuid not null references recovery_workflows(id) on delete cascade, tool text not null check (tool in ('READ_CLAIM','READ_EVIDENCE','CHECK_REQUIREMENTS','REQUEST_EVIDENCE','DRAFT_RESPONSE','SUBMIT_TO_MOCK_INSURER','RECHECK_ECONOMICS','ESCALATE','STOP')), detail text not null, validation text not null, cost_cents bigint not null default 0, evidence_ref text, created_at timestamptz not null default now());
create table insurer_responses (id uuid primary key default gen_random_uuid(), workflow_id uuid references recovery_workflows(id), outcome text not null, amount_cents bigint not null default 0, reason text not null, fingerprint text not null, created_at timestamptz not null default now());

create table financial_transactions (
  id uuid primary key default gen_random_uuid(), claim_id text references claims(id),
  type text not null check (type in ('ADVANCE','RESERVE','RECOVERY_EXPENSE','REALIZED_COLLECTION','LOSS_WRITE_OFF','CAPITAL_RELEASE')),
  amount_cents bigint not null, memo text not null, realized boolean not null default false,
  idempotency_key text not null unique, -- retries apply exactly once
  created_at timestamptz not null default now()
);
create table audit_events (id uuid primary key default gen_random_uuid(), actor text not null, action text not null, detail text not null, created_at timestamptz not null default now());
create table scenario_configurations (id text primary key, description text not null, expected_behavior text not null, config jsonb not null default '{}');

alter table clinics enable row level security;
alter table insurers enable row level security;
alter table claims enable row level security;
alter table claim_documents enable row level security;
alter table evidence_records enable row level security;
alter table underwriting_assessments enable row level security;
alter table financing_offers enable row level security;
alter table purchases enable row level security;
alter table capital_allocations enable row level security;
alter table recovery_workflows enable row level security;
alter table agent_operations enable row level security;
alter table insurer_responses enable row level security;
alter table financial_transactions enable row level security;
alter table audit_events enable row level security;
alter table scenario_configurations enable row level security;
-- Add role policies (authenticated operators, read-only auditors, service-role writers) per deployment.
