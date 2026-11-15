# SUBRO Architecture & Safety Model

## Principles
1. **Financial math is deterministic and LLM-free.** `src/lib/finance.ts` and `src/lib/capital.ts` are pure functions, unit-tested against hand-computed cases (CASE-1042: $500 × 80% − $300 − $30 = +$70; at 50% the same offer is −$80 and is declined with a $195 maximum price).
2. **Collectible ≠ billed.** Collectible is always `allowed − patient responsibility`, enforced per-claim in the seed data, the underwriting checks, and (as a generated column) in `supabase/schema.sql`.
3. **Expected ≠ realized.** Expected values are projections from modeled assumptions. Only mock-insurer outcomes post `REALIZED_COLLECTION` entries, always labeled simulated.
4. **The agent is bounded.** Nine tools, max 12 actions, max 2 submissions, a per-run cost budget, deadline/evidence/authorization gates before drafting, duplicate-draft detection, unchanged-insurer-response (`fingerprint`) loop detection, contradiction escalation, and negative-expected-value termination. It cannot access databases, credentials, external messaging, or financial accounts; drafting is template-grounded in cited evidence IDs. Event text is an operational record, never presented as model reasoning.
5. **Insurer independence.** `src/lib/insurer.ts` holds private scenario rules; the agent observes only responses. Evidence-free submissions return `EVIDENCE_REQUESTED` regardless of draft text.
6. **Idempotency everywhere.** Purchases, advances, reserves, expenses, and realized collections carry unique idempotency keys (`purchase-<claim>`, `realized-<claim>`, …) applied through `applyTx`, so retries reserve capital exactly once. In PostgreSQL this maps to the `unique` constraints in the schema.
7. **Degraded, never fake.** Without LLM/Supabase credentials, `/api/status` reports deterministic drafting and browser persistence openly; nothing fabricates external integrations.

## Lifecycle (continuously tested)
Claim intake → underwriting (eligibility → pricing) → capital-constrained financing → autonomous recovery → insurer response → ledger settlement. Covered end-to-end by `tests/subro.test.ts` for all six laboratory scenarios.

## Production path
Apply `supabase/schema.sql` (RLS enabled; add role policies), move `store.tsx` mutations into server actions/API routes with server-side authorization, add insurer/EHR integration adapters behind the `insurer.ts` boundary, and calibrate recovery probabilities only from validated empirical outcomes — until then they remain labeled assumptions.
