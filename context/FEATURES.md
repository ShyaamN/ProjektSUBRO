# ProjektSUBRO — Features, priorities and acceptance criteria

**Principle:** Show a deep *working mechanism*, not a sprawling static mockup. Prioritize correctness of the connected claim -> underwriting -> simulated purchase -> recovery loop.

## Priority legend

- **P0:** Absolutely necessary for a credible hackathon demonstration.
- **P1:** Valuable when P0 works and time allows.
- **P2:** Future roadmap, not tomorrow's build requirement.

## P0 — Complete the end-to-end loop

### F01. Load 100 synthetic denied claims

**Must:** Start with a reproducible fixture portfolio including insurer, provider, denial type, relevant dates, billed amount, allowed amount, patient responsibility, potential insurer collectible, documents and assumed success likelihood. Synthetic medical details only.

**Acceptance:** Page loads with 100 records; each claim has a stable ID; import never needs a real EHR or personal data. Portfolio total amounts reconcile with rows.

### F02. Understandably explain each claim

**Must:** Selecting a claim shows one coherent timeline: treatment, claim submission, denial, records, insurer obligation if recovered, and deadline. Show why this denial is or is not actionable.

**Acceptance:** A noob can distinguish billed $1,000 vs allowed $600 vs patient $100 vs insurer $500 without instruction.

### F03. Working risk underwriting

**Must:** Price claims using explicit assumptions and a deterministic calculation. Distinguish *projected collected insurer cash*, *proposed advance*, *expenses*, and *expected contribution*.

**Acceptance:** $500 collectible × 80% = $400 expected collection. $400−$300−$30 = $70 expected contribution. If probability changes to 50%, result becomes −$80 and the old offer is flagged/repriced. Show inputs or explanation alongside every bid.

### F04. Claims triage

**Must:** Each claim receives one of three decisions:

- **BUY CANDIDATE:** Supported evidence, valid deadline/permissions, and acceptable positive economic margin.
- **NEEDS REVIEW:** Missing information, uncertain authorization, contradictory evidence or specialist judgment needed.
- **DECLINE:** Expired deadline under given rules, negative risk-adjusted value, or disallowed category.

**Acceptance:** At least one large-dollar claim is declined; at least one small claim passes; the decision is not just ranked by billed charges.

### F05. Capital-budget-aware portfolio selection

**Must:** Judge adjusts available capital and a margin/risk control. Eligible claim selections and offer totals recalculate.

**Acceptance:** Funding outlays cannot exceed the capital cap; accepted offers reserve funds once; capital balance updates; per-insurer caps are respected if enabled.

### F06. Simulated financing offer and acceptance

**Must:** Provider-facing mock decision shows its proposed upfront payment and disclosed assumptions. A judge clicks **Accept simulated offer**; creates a purchase record and opens recovery workflow.

**Acceptance:** State moves from candidate to simulated purchase, ledger records the capital reservation exactly once, and it is impossible to pretend that a real bank transfer occurred.

### F07. Recovery agent with genuine next-action selection

**Must:** For a purchased case, agent can inspect *only linked synthetic evidence*, decide a permitted step, request evidence, create a cited response draft and send it to **mock insurer simulator**.

**Acceptance:** Agent behavior changes meaningfully when a judge adds/removes a document or mock insurer response. Output refers to actual available evidence rather than invented facts.

### F08. Rule-based insurer response

**Must:** Mock insurer has private scenario conditions (required evidence, deadlines, allowed action type). It can approve, deny, request information or issue partial recovery according to those conditions.

**Acceptance:** A claim missing mandatory proof **does not** get approved solely due to a well-worded AI argument. Judges can induce both success and failure.

### F09. Autonomous stop / escalation guardrails

**Must:** Monitor at least (i) maximum steps or calls, (ii) total agent spend cap, (iii) repeated identical insurer response, (iv) expired deadline, (v) missing/contradictory evidence, and (vi) negative remaining expected recovery value.

**Acceptance:** A judge triggers stuck mode and the agent stops with exact reason; it does not retry indefinitely or quietly claim success. Clinical/legal uncertainty prompts human review.

### F10. Financial outcome updates

**Must:** On mock approval/denial, update claim status, gross mock collection, advance already paid, simulated recovery costs, portfolio realized results, and funding balance.

**Acceptance:** Successful recovery and loss have correct signs; expected returns remain labeled **expected**, distinct from outcome. Refresh/re-run doesn't double-enter results.

### F11. Transparent demo provenance

**Must:** Persistent top-level indicator **SYNTHETIC DATA — SIMULATED CLAIM PURCHASES AND PAYER RESPONSES**. Display data source, assumption labels and audit/event history.

**Acceptance:** No judge can reasonably mistake the demo for real patient billing, legal filings or deployed financial products.

## P1 — Valuable enhancements

### F12. Inspector controls / chaos mode

**Should:** Presets: "reduce recovery odds", "remove evidence", "insurer repeats refusal", "new contradictory note", "reduce capital", "make insurer owe less", "expire deadline".

**Acceptance:** Controls update the relevant calculations/state, not just visual labels.

### F13. CSV ingestion for synthetic claims

**Should:** Upload local demo-format CSV with schema checks, row-level errors and clear warning not to upload real patient data.

### F14. Agent budget telemetry

**Should:** Display action count, mock or measured token/API cost, retries, steps remaining, and estimated remaining upside; clarify simulated vs actual API charges.

### F15. Explainable audit trail

**Should:** Human-readable events: "Claim 1042 categorized as documentation issue", "advance reserved", "requested note E-12", "mock insurer upheld denial", "stopped after repeat".

### F16. Provider view

**Should:** Clinic can see immediate simulated cash offers vs continuing to handle claims itself, with disclaimer that actual purchase rights and commercial discounts are unvalidated.

### F17. Portfolio analytics

**Should:** Expected collection, simulated capital deployed, payer concentration, claim distribution by denial class, benchmark against *no recovery work* and *manual claim process* under disclosed assumptions. Don't invent real benchmark performance.

### F18. Connected development infrastructure (GitHub / Supabase / Vercel)

**Should (when accessible within Codex):** Use the user-connected services for an approved ProjektSUBRO-specific GitHub repository, synthetic-only Supabase persistence and a tested Vercel preview deployment. `MCP_INTEGRATIONS.md` defines the safe workflow.

**Acceptance:** Actual Codex MCP capabilities and target identifiers were verified; no credentials committed/exposed; Supabase tables have appropriate RLS; a repeated simulated purchase or recovery does not duplicate ledger entries; the deployed app works from a new browser session. If unavailable, demonstrate the local fallback and plainly disclose which integrations were not completed.

**Do not conflate this development capability with ProjektSUBRO's recovery-agent permissions.** GitHub, Supabase administrative access and Vercel deployment tools are never available to the in-product agent.

## P2 — Long-term company, NOT hackathon implementation

- Real EHR integrations; X12 837/835, real payer contracts, provider portals.
- HIPAA-compliant production workflow with business-associate agreements and access controls.
- Contracts vetted for receivable transfer, appeal representation, insurer payment routing, lockbox, and permitted servicing.
- Real capital partners, underwriting validation, investor/portfolio reporting, regulated financial arrangements where applicable.
- Licensed professionals reviewing clinical, legal, or ambiguous cases.
- True payer communications and actual recoveries; real underwriting models trained on permissioned historical outcomes.

## Definition of done for hackathon submission

All must be true:

- At least **one complete successful** synthetic claim path works end to end.
- At least **one rejected or stuck** path works end to end.
- Judge-controlled inputs affect both the bid and subsequent recovery decision.
- The interface tells a coherent economic story with correct arithmetic.
- Core LLM decisions are bounded by deterministic guardrails, or if LLM unavailable the UI honestly switches to a clearly labeled rules-only fallback.
- No real claims, PHI, financing or insurers are involved.
- The team can explain what is working versus mocked in 30 seconds.

## Ruthless tradeoff order

If schedule slips, protect **working underwriting + real state transitions + stop/evidence verification**. Cut: real-time voice, complicated sign-in, broad CSV support, animation flourishes, live EHR connectivity, multiple LLM personas and nonessential infrastructure. **Connected MCP tools are a convenience, not a reason to delay the core demo.** Don't cut financial correctness or agent safety.
