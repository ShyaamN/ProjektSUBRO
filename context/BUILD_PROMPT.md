# ProjektSUBRO — Prompt for the AI coding assistant at official hackathon start

**IMPORTANT — READ BEFORE EXECUTION:** This file is a **pre-event planning prompt**, not actual application code. Do **not execute it, scaffold a project, create source files, or start implementation until the organizer's official hacking start at 1:30 PM Pacific on October 24, 2026.** Existing starter code/projects are not permitted according to the guide. Check Discord `#help` to clarify whether prewritten Markdown planning documents/repositories are permitted; the handbook does not explicitly resolve that detail.

## Start-of-build message to coding assistant

You are the engineering lead building **ProjektSUBRO**, a compelling hackathon proof of concept of an autonomous financial underwriting and claims recovery platform for **already-denied US commercial medical-insurance claims**.

**FIRST READ ALL OF THESE DOCUMENTS IN ORDER:** (`AGENTS.md` at the repository root also contains persistent Codex instructions and should be discovered automatically by Codex.)

1. `CONTEXT.md` (problem, business model, industry vocabulary, assumptions and restrictions).
2. `ARCHITECTURE.md` (core data entities, math, bounded workflows, state transitions).
3. `FEATURES.md` (P0 priorities and acceptance criteria).
4. `AGENT_RULES.md` (strict agent permissions, stopping logic and mock insurer rules).
5. `DEMO.md` (reproducible live presentation cases and judge failure scenarios).
6. `DESIGN.md` (polished financial terminal aesthetics and information hierarchy).
7. **`MCP_INTEGRATIONS.md`** (connected GitHub, Supabase and Vercel services; permissions, safe targets, verification, secret handling, deploy sequence, fallbacks).

**CONNECTED TOOL CONTEXT:** The user reports that **GitHub, Supabase, and Vercel MCP services have been connected**. Treat this as a capability to discover and verify in **your actual Codex session**, not as permission to assume fixed project IDs or that connectors are automatically visible. Read `MCP_INTEGRATIONS.md` before attempting any MCP action. These services are **developer infrastructure**, not tools for ProjektSUBRO's claims recovery agent.

**Your mission:** During the official permitted hacking time, build a real working interactive web prototype. Do not merely make mock screens or hardcode success messages. The demo must link (i) denied-claim underwriting, (ii) capital allocation, (iii) simulated purchase, and (iv) a bounded autonomous evidence-grounded recovery workflow.

### Non-negotiable safety & accuracy

- ONLY synthetic fictional medical/patient data. No actual PHI, real claim files, financial transfers, actual payer contacts, or real legal/clinical advice.
- Show unmistakable **DEMO / SYNTHETIC / SIMULATED** indicators.
- Do not claim that model-derived confidence is empirically validated; use explicit fictional assumptions.
- Never assume billed charges equal insurer's actual payment. Track allowed amount, patient share and potential insurer collectible separately.
- Financial figures must be computed deterministically. Do not let an LLM fabricate underwriting numbers or manipulate the capital ledger.
- Claim transfer, authority to appeal, and right to collect money are distinct; treat all as mock eligibility conditions in the demo. An actual company needs separate legal structuring.
- Simulated insurer outcomes are driven by independent written case rules/evidence, NOT by persuasive chatbot dialogue.
- Agents must have enforced loop detection, finite action/cost budgets, verified evidence references, and human review for clinical or legal uncertainty.

### Deliverables, in priority order

**Milestone 1 — Working foundation:** Initialize a new hackathon project from scratch after the event starts. Build a high-quality Next.js/React/TypeScript/Tailwind interface with three navigable sections: Trading Floor, Underwriting Desk, Recovery Arena. Create a realistic **fabricated** 100-claim fixture portfolio that includes BUY / REVIEW / DECLINE cases. Show demo-only status throughout.

**Milestone 2 — Real math:** Implement deterministic per-claim calculations. `Expected collection = probability × possible insurer payment` for binary cases. `Expected contribution = expected collection − upfront offer − total expected costs`. Calculate max bid after risk reserve/minimum acceptable margin. Reject ineligible claims, expired filing scenarios, negative expected contribution and capital cap violations. Show a clear financial waterfall and reasons.

**Milestone 3 — Simulated claim purchase:** Enable a user to select and accept a paper-trade offer. Reserve demo capital once; create an audit event; move the claim to recovery status. No actual payments.

**Milestone 4 — Autonomous recovery:** Connect a server-side LLM agent if available. Agent may inspect fabricated documents, propose evidence-linked next actions, draft a response and communicate only with the deterministic mock insurer. Server rules must validate each action. Missing evidence must prompt a request/human review, not invention. Repeat/no-progress or cost/step limit must force a stop. Real agent logic is the core of the Unsupervised track.

**Milestone 5 — Judging controls:** Add scenario switches that modify assumptions and evidence in real time. Support CASE-1042 success and pricing shock, CASE-3021 missing evidence, CASE-4109 repeated insurer response, CASE-2088 invalid deadline, and CASE-6077 partial recovery when practical. Show the financial consequences and an auditable agent timeline.

**Milestone 6 — Polish, version, deploy & test:** Projector-friendly dark financial interface, obvious terminology, correct aggregate totals, concise on-screen explainability and graceful offline/API failure states. **If integrations are available and app is stable**, commit the working build to the approved GitHub repository, persist synthetic demo state in the approved Supabase project, and deploy/verify a Vercel preview URL. Rehearse an end-to-end 2-minute judge demo. Keep a tested local fallback if any external service fails.

### Technology preferences

- Preferred: Next.js + React + TypeScript + Tailwind.
- Charts: Recharts or another reliable React chart library if needed.
- State/data: deterministic logic + synthetic fixtures first; **prefer Supabase Postgres for hosted persistence** because its MCP is reportedly connected, subject to Codex visibility, authorized project selection, and security checks. Preserve a local/server-backed fallback.
- Agent: server-side OpenAI (or compatible) structured tool/action selection, with deterministic validator and rule-driven insurer responses. Do not expose API credentials client-side.
- Version control/deployment: **GitHub + Vercel are the preferred connected services**; inspect MCP tools and approved targets before using them. Generate all application code **after 1:30 PM**. Deploy preview only after the app runs; verify the URL. Keep secrets in approved environment settings only.
- Keep state transitions and cost calculations testable independently of visuals.

### MCP readiness and first authorized actions (after official start)

1. Confirm the **GitHub, Supabase, and Vercel MCP tools are actually available within Codex**. Enumerate/read tool capabilities; **do not invent tool names, URLs or identifiers**.
2. Read-only discover the GitHub account/repositories, Supabase projects and Vercel teams/projects. Identify **the correct ProjektSUBRO-specific targets** or establish new isolated demo targets when authorized. Never mutate an unrelated existing app.
3. Initialize a **fresh repository/application only after hacking starts**, avoiding existing starter projects or reused implementation code. Commit after working milestones.
4. Prefer **Supabase for synthetic-only persistence** with RLS, controlled mutation endpoints and idempotency; verify queries/security policies before claiming the integration is working.
5. Prefer a **Vercel preview deployment** connected to the correct repository, with secrets set privately in the hosting environment; confirm the actual live URL and test a full purchase/recovery/stop demonstration in the browser.
6. On connectivity/auth/deployment failure, **log the precise blocker and continue a local working demo**. Connector access is beneficial, not a prerequisite for completing P0.
7. Do not allow the **in-product recovery agent** to call development MCP tools, run arbitrary SQL, modify GitHub or deploy anything. It only has the mock action set in `AGENT_RULES.md`.

### Project engineering instructions

- Deliver **working** behavior one milestone at a time; avoid planning paralysis or coding entire app before running it.
- Create a small, coherent domain model and strongly typed calculation functions.
- Ensure operations are idempotent: funding, payout and settlements must not duplicate after retry or refresh.
- Make recovery scenarios reproducible and adjustable by the judge; clearly distinguish random simulated outcomes from underwriting probabilities.
- If LLM integration cannot be finished reliably, fall back to a **clearly labeled rules-driven agent demo** with genuine autonomous state progression. Do not claim a scripted state machine is a live generative agent.
- Before adding another feature, verify the previous one genuinely works from UI to state and back.
- Show errors and pending states; do not silently treat API failures as insurer approvals.
- Explain briefly what was built with AI coding tools and any distinctive testing approach for submission.

### Core tests to pass

1. CASE-1042: $500 potential insurer payment × 80% = $400 expected collection; $300 bid and $30 expected cost implies **+$70 expected contribution**.
2. Change odds to 50% with original $300 bid: expected contribution becomes **−$80**, and buying at that price should be disallowed.
3. CASE-2088 ($20,000 collectible, expired mock appeal deadline) is **declined/reviewed**, not purchased just because of large value.
4. CASE-3021 with missing required evidence cannot be approved by the simulated insurer until a valid new fictional record is explicitly added.
5. CASE-4109 repeats its substantive insurer response and the agent stops within its finite configured limit.
6. Purchased claims consume no more than available demo capital; retries never debit twice.
7. Successful and failed mock cases produce correct *realized* ledger entries, distinct from expected economics.
8. Every output accurately states it is a simulated hackathon demonstration, not a live medical or financial service.

### Suggested timeboxing (PT, subject to official schedule changes)

- **1:30–2:15:** Project initialization, design shell and synthetic fixture.
- **2:15–3:00:** Underwriting math, classifications and portfolio selection.
- **3:00–4:00:** Autonomous agent + independent simulated insurer, evidence chain and stop conditions.
- **4:00–4:45:** Simulated funding and reconciliation/ledger.
- **4:45–5:30:** Interactive judge chaos controls and polish.
- **5:30–6:30:** Verify GitHub push and Vercel preview if stable (do not block the demo on MCP); test/rehearse, prepare required submission and submit before deadline.

### How to prioritize if the clock gets tight

Do not sacrifice the economic engine, action validation, evidence provenance, or clear stop behavior. Cut advanced animations, elaborate auth, voice integration, real healthcare APIs, complex graphs and optional CSV import first. **Connected Supabase, GitHub and Vercel should accelerate the project, not consume the build window; fall back cleanly if necessary.** A complete, defensible prototype beats five nonfunctional screens.

### Final demo narrative

“Here are denied claims. We don't buy them all. ProjektSUBRO prices each insurer receivable based on recoverability, cost and constraints, then offers a simulated advance for the economically sound ones. A bounded autonomous agent pursues an eligible case against a rule-based mock insurer. When evidence is inadequate or the payer loops, it refuses or stops. That combination—underwrite, finance, recover—is the business we're proposing.”

**End of pre-event prompt. Only turn these specs into implementation after hacking officially starts.**
