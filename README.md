# ProjektSUBRO

**SUBRO** is an AI-native financial underwriting and autonomous insurance recovery platform for denied healthcare receivables — built as an institutional, production-oriented synthetic sandbox.

> **Sandbox notice:** every clinic, insurer, claim, and dollar figure in this repository is synthetic. No real patient data is used, no real funds move, and no ledger entry represents an actual bank transfer, insurer payment, or claim collection. Modeled recovery probabilities are explicit underwriting *assumptions*, not validated empirical rates.

## What it does

SUBRO combines financial decision-making with the operational infrastructure to realize uncertain receivables:

1. **Trading Floor** — a 120-claim synthetic denied-receivables book with live portfolio analytics (collectible exposure, modeled expected collection, insurer/category concentration, risk distribution), search, filtering, and sorting.
2. **Underwriting Desk** — a deterministic pricing engine. `Expected collection = collectible × modeled probability`; `Expected contribution = expected collection − advance − recovery expenses`. Billed charges are never treated as collectible. Every claim gets explicit evidence, authorization, procedural-window, collectible-integrity, and economics checks, ending in **BUY CANDIDATE / NEEDS REVIEW / DECLINE** with transparent reasons. Worked example: CASE-1042 prices to **+$70** at 80% and is invalidated at **−$80** when repriced to 50%.
3. **Capital Allocation** — a configurable facility (capital, minimum contribution, per-insurer concentration cap, risk tolerance, eligible categories) with a greedy capital-efficiency allocator that cannot breach its constraints, and atomic, idempotent simulated purchases that reserve capital exactly once.
4. **Autonomous Recovery Arena** — a bounded agent operations console (not a chat UI). The agent has only nine restricted tools (`READ_CLAIM` … `STOP`), a hard action cap, submission limit, operating-cost budget, evidence-provenance checks, deadline checks, duplicate-draft and unchanged-response loop detection, contradiction escalation, and negative-expected-value termination. Stopping is a valid outcome.
5. **Mock Insurer** — a separate deterministic response engine (approval, rejection, evidence request, partial payment, procedural invalidity, escalation). Its scenario rules are not in the agent's context; an eloquent but unsupported submission cannot succeed.
6. **Financial Ledger & Audit** — an append-only, idempotency-keyed ledger that strictly separates *expected* value from *realized simulated* outcomes, plus a structured audit trail. `CASE-6077` demonstrates a $350 realized partial on an $800 collectible.

The **Scenario Laboratory** pins six asserted cases (profitable recovery, expired deadline, missing evidence, repeated rejection, contradictory records, partial recovery) with one-click finance-and-run execution and a full sandbox reset.

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # 18 deterministic tests (underwriting, capital, insurer, agent)
npm run build    # production build
```

State persists in the browser (`localStorage`, key `subro-state-v1`). Use **Scenario Laboratory → Reset sandbox** to restore the seeded state.

## Architecture

| Layer | Location |
|---|---|
| Domain model & seeded synthetic portfolio (120 claims) | `src/lib/types.ts`, `src/lib/seed.ts` |
| Deterministic underwriting & portfolio analytics | `src/lib/finance.ts` |
| Capital allocation, idempotent ledger, reconciliation | `src/lib/capital.ts` |
| Bounded recovery agent (pure state machine) | `src/lib/agent.ts` |
| Deterministic mock insurer (separate trust boundary) | `src/lib/insurer.ts` |
| Persistent app state, atomic purchases, audit log | `src/lib/store.tsx` |
| Workspaces (Trading Floor, Underwriting, Capital, Arena, Scenarios, Ledger) | `src/components/` |
| Service status / degraded-mode endpoint | `src/app/api/status/route.ts` |
| Production PostgreSQL schema (Supabase-ready) | `supabase/schema.sql` |
| Tests | `tests/subro.test.ts` |

Financial computations are deterministic and unit-tested, and never consume probabilistic model output. The platform is fully operational without any LLM credentials: drafting falls back to deterministic evidence-grounded generation and `/api/status` reports the degraded mode openly. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for design decisions, safety model, and the lifecycle test path.

## Stack

Next.js (App Router) · React · strict TypeScript · Tailwind CSS · Recharts · Lucide · Vitest. Deployment targets Vercel; `supabase/schema.sql` prepares PostgreSQL persistence with row-level security enabled on all tables.
