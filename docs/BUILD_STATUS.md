# Build progress

Plan: docs/superpowers/plans/2026-10-24-projektsubro.md

## Completed and verified
- All nine context docs reviewed. Source repository ShyaamN/ProjektSUBRO verified. Working branch feat/hackathon-prototype in original root.
- Native contracts: 11/11 green; Vitest domain/API/session tests 45/45 green using `node node_modules/vitest/vitest.mjs run --configLoader native`.
- Core fixtures, pure underwriting, allocation, simulated purchases, recovery, mock insurer, ledger and guardrails implemented.
- Server routes/schema validation, Gemini adapter, opaque HttpOnly sessions, local file storage and Supabase CAS implemented.
- Independent reviewer found finance/reserve/reset/human-review issues; reproduced then fixed in native regression tests. settings APR reserve fix verified by server agent.
- Durable per-session lease acquired before model call. Actual separate-process concurrency test observed exactly one mutator execution and one revision committed.
- Supabase dedicated project vppoyfdycijwsuczoygt, org ProjektSUBRO. demo_sessions RLS enabled; missing/wrong backend key cannot access; actual REST create/read/update tested; advisors no findings. Scoped secret generated locally in ignored .env.local; only SHA256 hash in database policy.
- Vercel account/team verified: team_aM807rubBYxVnwfMz1Ihlrxg; dedicated project prj_UAoZ4pdfmz3anUA4qmntarA28VKU created, connected to correct GitHub repository. No deployment yet.
- UI four screens implemented, improving projector typography; interface agent owns current final polish.

## Pending
- npm combined install session 28345 still finishing large Next/SWC downloads. Last known failure source before final install: ECONNRESET, cache retry now progressing. Do not launch another concurrent npm install.
- Next package partial causes current typecheck/build module-not-found, not app errors. Wait install completion, then typecheck/build/full suite/browser tests and visual QA.
- Browser tests authored e2e/demo.spec.ts and playwright.config.ts; adjust actual UI selectors as required. MS Edge installed.
- User said they would configure GEMINI_API_KEY but last boolean check absent. Never print .env.local. Supabase URL, publishable key and scoped secret already configured locally by parent.
- Open Design plugin is tagged but no MCP registration or installation detected. User approved opening download page; request queued via open_in_codex. No Open Design generation performed. Check installation if user confirms.
- Push tested build branch and deploy Vercel preview; securely sync env to Vercel, retain default deployment protection, test live URL/new session.
- Update plan/status with final evidence, URLs, commits and real limitations.

## Decisions
- Build in original root per explicit user preference; do not create/move worktree.
- Existing design/architecture accepted as source of truth; no repeat brainstorming/approval.
- Scoped backend capability rather than service-role secret removes need for privileged database credentials.
- Action expenses are a component of fixed synthetic work cost, not actual measured provider billing.
- Unresolved STOPPED/ESCALATED claims retain capital at risk; only settled RECOVERED/PARTIAL/LOSS claims contribute to realized settlement totals.
