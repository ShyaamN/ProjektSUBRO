# ProjektSUBRO

Autonomous claims underwriting & recovery · c0mpiled-16 · Track 3: Unsupervised.

**Entirely synthetic medical/financial data. All claim purchases, insurer responses and ledger movements are simulated. No actual appeals, insurer communications or financial transactions occur.**

Clinics trade uncertain future insurer collections for discounted upfront liquidity. The prototype makes the incentive concrete: improved immediate cash flow and transfer of modeled recovery risk. Transfer rights, representation authority and collection rights are separately checked synthetic assumptions, not real agreements.

## Run

Requires Node.js 24+ and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. All nine original planning documents remain in `context/`.

## Demonstrate in two minutes

1. Underwrite the 100 synthetic claims on Trading Floor. Inspect the allocation under the capital, margin and insurer exposure controls.
2. Open Underwriting Desk, CASE-1042. $1,000 billed becomes $600 allowed, less $100 patient share: only $500 potentially insurer-payable. At 80%, expected collection is $400. Less $300 advance and $30 hypothetical work cost gives **+$70 expected contribution**.
3. Select **50% risk shock**: the original offer becomes **−$80 expected contribution** and is disabled. Restore **80% baseline**.
4. **Accept simulated offer**, then **Start agent**. Evidence retrieval, exact-source draft and deterministic mock insurer lead to $500 collection. With the fixed $30 synthetic operations cost, realized contribution is **+$170**. Funding and collection each book once.
5. Choose CASE-4109, fund, start: two unchanged refusals force **REPEATED_NO_PROGRESS**. CASE-3021 cannot be funded without explicitly injecting its missing fabricated document. CASE-2088 is declined despite its $20,000 collectible because its deadline expired.
6. CASE-6077 collects **$350**, not its $800 face value. To demonstrate a realized loss, fund CASE-1042, select **Final insurer denial** before running; valid documentation cannot override the scenario's final refusal. The ledger books **−$330** contribution at default assumptions.

## Architecture and trust boundaries

- Next.js App Router, React, TypeScript, Tailwind; custom institutional terminal UI.
- Integer-cent deterministic underwriting and contribution calculations. Synthetic probabilities are editable assumptions, not empirically trained predictions.
- Allocation uses a disclosed greedy contribution-per-advance heuristic, with capital, expense reserves and insurer exposure limits. It is not guaranteed globally optimal.
- A server-owned session contains claims, ledger and audit atomically. The browser gets only a cryptographically random HttpOnly capability cookie. It cannot submit arbitrary snapshots or model actions.
- Every purchase/collection has a stable event key. Revision CAS prevents duplicate financial commits. A durable Supabase lease is acquired **before** any model call, preventing concurrent server instances from duplicating provider work for the same session revision. A crashed lease expires after 60 seconds.
- Gemini can propose one of nine allowlisted actions. It cannot alter money, invent evidence or insurer outcomes, run SQL, access infrastructure tools or send real communications. Every clinical/service assertion in a draft is an exact verified source excerpt with its evidence ID.
- The independent mock insurer checks evidence, permissions, deadline and scenario conditions. Eloquence never replaces proof.
- Hard limits: eight actions, three insurer submissions, $2 **hypothetical action accounting** budget. Missing or conflicting evidence, expired deadlines, human-required actions, repeated no progress, specialist issues and negative remaining economics stop or escalate the run.
- The UI drives one server step at a time while the page is open. Pause stops future steps; an in-flight step may finish. This is an interactive bounded agent demonstration, not a background production worker.

## Configuration

Copy `.env.example` to `.env.local` without overwriting existing private settings. Never commit `.env.local` or prefix secrets with `NEXT_PUBLIC_`.

- `GEMINI_API_KEY` enables Google Gemini only. `GEMINI_MODEL` configures the Flash model. With no key, the app honestly labels **Rules-only simulation**. A configured provider failure escalates; it never silently invents approval.
- Durable Supabase storage uses `SUPABASE_URL` and either a server secret key, or a publishable key plus the narrow `SUPABASE_DEMO_KEY` capability. The scoped capability grants access only to the demo session table through restrictive RLS; the browser key alone cannot read or write sessions. See `db/schema.sql` and `db/scoped-capability.sql`.
- Without Supabase, local development persists sessions under ignored `.demo/`. Hosted fallback is explicitly labeled ephemeral server memory and can reset across server instances/restarts. Use Supabase for a reliable hosted demo.

The $30 work charge and $0.10-per-step telemetry are fabricated scenario assumptions. Step amounts are included in the work charge, not added twice. No actual Gemini usage cost is inferred from them. Financing assumptions use advance × APR × modeled days / 365 and are included in both expected and realized synthetic costs.

## Verify

```sh
npm test
npm run typecheck
npm run build
npm run test:e2e
```

Browser tests use installed Microsoft Edge and isolated rules-only sessions. `BASE_URL` can target a hosted preview. Tests cover pricing, capital, purchases/collections, evidence guardrails, partial recovery, duplicate loops, API isolation/revisions, provider failures and session persistence. Native contracts additionally cover review regressions such as financing, human review and reset cash constraints.

Vercel preview deployments remain access-controlled by default. Keep that protection enabled when Gemini credentials are present: resets and newly created demo sessions intentionally restart the per-run hypothetical budget. This prototype does not provide account-wide API spend metering, production identity or commercial medical/financial operations.
