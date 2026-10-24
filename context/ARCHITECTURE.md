# ProjektSUBRO — Target architecture and economic model

**Document type:** Requirements and non-executable design. Actual coding starts after the hackathon's official build opening.  
**Scope:** A realistic synthetic-data demonstration, not deployed medical billing infrastructure.

## System overview

Three user-visible areas connected to one data and decision model:

1. **Trading Floor:** Claim portfolio, filters, status and capital summary.
2. **Underwriting Desk:** Per-claim evidence, modeled outcomes, pricing math and decision reasons; portfolio allocation decision.
3. **Recovery Arena:** Bounded autonomous agent, evidence provenance, simulated payer events, human escalation and recovery ledger.

Logical flow:

**Synthetic claim intake** -> **Validation & eligibility** -> **Recovery estimates & offer computation** -> **Portfolio selection** -> **Simulated offer accepted and capital reserved** -> **Recovery job** -> **Evidence retrieval and appeal draft** -> **Mock payer decision** -> **Recorded outcome and updated ledger**.

Every transition must be auditable; disallowed transitions should produce a comprehensible error rather than silently proceed.

## Proposed tech stack

- **UI:** Next.js App Router, React, TypeScript, Tailwind CSS; client interactivity with accessible forms and controls.
- **Visuals:** Recharts or comparable chart library, SVG diagrams for claim life cycle, badge-coded statuses (also text labels; never color alone).
- **Persistence:** **Supabase/Postgres is the preferred hosted persistence** because the user reports its MCP connection is available. First verify its availability in Codex, identify the approved demo-only project, and implement RLS-protected synthetic claim / audit / ledger storage if time allows. Retain a **working local/server-backed fallback** so database access cannot block a compelling demo.
- **Agent:** An LLM API called **server-side only**, preferably with structured action selection. Credentials stay server-side. Rules engine validates every proposed action.
- **Underwriting / allocation:** Pure deterministic TypeScript or Python functions, not LLM-generated financial results.
- **Mock payer:** Deterministic rule engine with optionally AI-written conversational explanation. Simulated outcomes derive from hidden scenario constraints/evidence, **not** which agent is more rhetorically persuasive.
- **Environment:** **Vercel is the preferred hosted preview** because the user reports its MCP connection is available, with **GitHub for project source/version control**. Verify Codex can access these integrations, deploy only to approved ProjektSUBRO-specific destinations, and retain a reliable local run fallback. See `MCP_INTEGRATIONS.md`.

Avoid live EHR, payer APIs, patient data, payments, and actual claim filing. These are commercialization modules, not hackathon requirements.

## Connected development infrastructure and access model

The project owner reports **GitHub, Supabase, and Vercel MCP connectors are connected**. These are available services to **check**, not proof that the current Codex session has inherited authorization or that any specific repository, Supabase project or Vercel project is selected.

- **GitHub:** Create and version a fresh hackathon repository after the official start, or use the explicitly approved ProjektSUBRO repo; don't borrow existing starter code or mutate unrelated repositories.
- **Supabase:** Persist only fabricated data, audited simulated transitions and a ledger. Use RLS and server-side enforcement on financial writes; do not expose service-role/secret keys to browsers. Design unique constraints/idempotency for purchases and collections. Verify schema and policies with real queries.
- **Vercel:** Deploy the Next.js demo to an approved preview project; configure secrets only in the environment management interface; test the URL and runtime behavior after deployment.
- **MCP availability:** Codex should discover actual tools and read their schemas when hacking starts. If MCP is unavailable, use local tooling/fallbacks without falsely claiming remote success.
- **Tool separation:** Development assistant access to GitHub/Supabase/Vercel **must never be provided to the in-product recovery agent**. ProjektSUBRO's recovery agent has only synthetic, restricted mock-claim tools.

The detailed workflow, security checklist, environment and verification requirements are in **`MCP_INTEGRATIONS.md`**. Do not implement or deploy anything before the 1:30 PM PT hacking start.

## Core entities (logical schema; not SQL)

### Provider
`provider_id`, display name, hypothetical location, provider type, consent/authorization demonstration flags.

### Insurer / plan
`insurer_id`, plan label, mock rule set, supported scenario categories, prior probability assumption source (e.g., synthetic seed).

### Claim
`claim_id`, provider, insurer, service date, submission/denial dates, claim state, denial type, denial reason, original billed amount, allowed amount, hypothetical patient responsibility, **potential insurer collectible**, appeal deadline, related evidence IDs, legal/authorization status, confidence flags.

**Do not conflate:** billed price, allowed amount, collectible insurer portion, recovered cash or purchase price. All are distinct.

### Evidence record
`evidence_id`, claim linkage, record type (clinical note, order, eligibility proof, denial notice, contract excerpt), fabricated content, issued date, verification flag and exact source excerpt locator. Every factual assertion in appeal drafts must trace to evidence IDs.

### Underwriting assessment
`claim_id`, scenario version, modeled outcome distribution, recovery probability, conditional payment amount(s), expected collection, expected work costs, cost of capital, risk buffer, max offer, decision, explanation, timestamp, model version, decision provenance.

### Offer / purchase (SIMULATION ONLY)
`offer_id`, claim, quoted price, expiration, simulated provider acceptance, eligibility confirmation, financial state, capital reserved. Use **no payment provider and no actual financial movement**.

### Recovery job
`job_id`, claim, state, actions attempted, evidence requests, appeal draft, mock payer status, budget consumed, repeats detected, escalation flag, termination reason, max calls/steps.

### Capital and settlement ledger
Events such as **capital committed**, **claim purchased (simulation)**, **mock collection realized**, **loss booked**, **operational expense** and **capital returned**. A ledger entry stores amount, currency, claim ID, timestamp, linked event; entries must not duplicate on refresh or retry.

### Audit event
Actor (user / underwriting engine / agent / mock payer), action, inputs used, version, decision, reason, timestamp. Exclude genuine personally identifiable patient information.

## Underwriting model: simple version that actually works

For a binary-outcome demo case:

**Expected collection = P(recovery) × insurer payment if successful.**

**Expected contribution = expected collection − provider advance − expected all-in operations/financing cost.**

**Max economically acceptable offer = expected collection − expected costs − risk reserve − minimum required expected contribution.**

Only offer if ALL conditions hold: claim type in supported commercial segment, mock rights valid, deadline remains, evidence meets minimum requirements, meaningful expected margin, provider approval pending, capital sufficient, and risk policy compliant.

Example (explicitly **synthetic**, single insurer-pay outcome):

- Original billed amount: **$1,000** (informational only).
- Allowed amount: **$600**.
- Hypothetical patient responsibility: **$100**.
- Potential insurer collectible if successful: **$500**.
- Modeled probability: **80%** (synthetic assumption).
- Expected collection: **$400**.
- Provider advance: **$300**.
- Expected total operations/financing cost: **$30**.
- Expected contribution: **$70** *before omitted corporate costs*.
- Successful realized result with $30 expense: **$170** contribution.
- Failed realized result with $30 expense: **−$330** contribution.

**If recovery probability drops to 50%:** expected collection $250; expected contribution **−$80**; the originally proposed $300 price is no longer acceptable.

For real-world extension with partial payments and multiple outcomes, use:

**Expected collection = sum over outcomes [P(outcome) × amount actually collected in outcome].**

Do not label probability as empirically trained/validated in the hackathon. It may come from transparent **fictional scenario assumptions**, adjusted by predeclared evidence-based rules. No LLM free-form guesses used as quantitative probabilities.

## Capital constraints and selection

- Judge controls **available capital**, **minimum expected margin**, **cost-of-capital assumption**, **insurer-specific risk adjustment** and optionally **max exposure per insurer**.
- Price each claim conservatively; no offer if legal/evidence/deadline constraints fail.
- Select a portfolio under available capital. A documented greedy selection by expected contribution per dollar advanced is acceptable for MVP; label it as a heuristic, not mathematically guaranteed globally optimal. If time permits, implement 0/1 knapsack or integer optimization.
- Portfolio must obey concentration caps and available balance. On purchase, capital is committed; on recovery, collection is recorded. A retry must not double-debit.
- Distinguish **expected return**, **realized recovery**, **cash remaining**, and **contribution**. Do not label expected contribution as guaranteed yield.
- Cost of capital depends on actual cash tied up, financing APR and time; in demo, estimated time to recovery is another explicit assumption.

## Denial / evidence scenarios

Start with controlled categories:

1. **Missing clinical documentation** — evidence exists in mock record but was not attached. Eligible for evidence-supported correction/reconsideration/appeal according to synthetic rules.
2. **Missing or invalid administrative data** — often needs corrected submission rather than formal appeal.
3. **Documentation genuinely absent** — agent must request human-supplied document, never invent it.
4. **Claim filed after simulated permissible deadline** — decline or escalate for human exception review; no fictional deadline extension.
5. **Coverage or medical-necessity dispute** — clinical expert review needed; the agent can organize documents but not independently decide clinical correctness.
6. **Contradictory records** — hold, flag discrepancy, escalate; no creative reconstruction.
7. **Insurer repeating the same response** — loop detector stops the autonomous sequence.
8. **Partial reimbursement** — produce a partial outcome and appropriate financial accounting, if time allows.

Use clear textual denial descriptions. If using actual CARC/RARC codes, map only properly verified codes and document exact source/version; don't invent code meanings.

## Workflow states

Claim: `IMPORTED` -> `VALIDATED` -> `ASSESSED` -> (`BUY_CANDIDATE` / `REVIEW` / `DECLINED`) -> optionally `OFFERED` -> `PURCHASED_SIMULATED` -> `RECOVERY_ACTIVE` -> (`RECOVERED` / `PARTIAL` / `ESCALATED` / `STOPPED` / `LOSS`).

Constraints:

- No **funding** without explicit simulated approval.
- No **agent launch** without a successfully recorded simulated purchase and permissions.
- No **recovered** state without favorable mock payer resolution and accounting event.
- No **appeal-submitted** state without rule-engine approval and clearly simulated mock channel.
- No **real** insurers, real payment events or real patient records.

## Agent vs rules: strict separation

- **LLM may:** Understand denial narrative, find relevant provided evidence, propose next action, summarize insurer message, draft a referenced response.
- **Rules must:** Compute money, authorize action, enforce deadlines, verify evidence exists, validate scenario outcomes, enforce budget and termination policies, and maintain the ledger.
- **Mock insurer must:** Rule on a scenario according to synthetic insurance rules, irrespective of agent confidence or persuasive prose.

Read `AGENT_RULES.md` for escalation, permission, and stopping policies.

## Data access and deployment verification (only if the integrations are used)

- Persist financial transitions atomically or with equivalent idempotent safeguards; refresh, retry and parallel requests must not double-reserve capital or double-book collections.
- Apply restrictive RLS to exposed Supabase tables, test with the actual client role, and keep administrative database writes server-only. Synthetic data is not permission to expose unrestricted writes.
- If a production-like auth layer is deliberately omitted, protect demo mutation endpoints sufficiently for the selected public/preview deployment, or host a controlled demo session instead of exposing open write APIs.
- Keep source credentials and server-only keys outside GitHub and browser bundles; verify deployment environment variables are available only where intended.
- Test on the deployed Vercel preview URL **and** retain a local fallback; don't treat a successful deployment build as proof that live application flows work.

## Quality and testing requirements

- Changing insurer collectible, probability, advance price or expenses updates the underlying math everywhere.
- A claim with expired deadline cannot become a purchasable offer merely by having high nominal value.
- Amount paid by insurer never includes billed-price contractual write-off or patient responsibility in the standard example.
- Missing evidence remains missing until introduced as an explicit new synthetic record.
- Negative-value portfolios are rejected; capital never becomes negative.
- Refresh or retry cannot double-purchase, double-collect or double-charge.
- Mock payer denies claims lacking required evidence even if the appeal draft is eloquent.
- Agent stops under step, cost and duplicate-response thresholds and records *why*.
- Every output reveals whether it is **synthetic**, **assumed**, **modeled**, **submitted in simulation**, or **verified within scenario**.
