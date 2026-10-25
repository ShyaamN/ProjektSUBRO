# ProjektSUBRO product redesign — active user request

## What the user wants now

The user rejected the current dense dark terminal as “AI slop.” **The complete visual and interaction overhaul has NOT been done.** Current UI changes only add factual underwriting transparency. Do not call that a completed redesign.

Build an actual sophisticated, fully functional product. A middle-school student should immediately understand what it does and how to use it, while technical and financial depth remains available. **Do not make the product revolve around a judge, a narrated demo, or a training wizard.** Judges should understand it because the product is clear.

Keep the original synthetic-only pipeline, safety, idempotent financing and recovery rules. Preserve all nine files in `context/`; read them first. The user's latest product-clarity request supersedes the old terminal's visual execution, not its business or safety requirements.

## Open Design: installation and connection verified

- Desktop 0.26.1 is installed at `C:/Users/user/AppData/Local/Programs/Open Design/Open Design.exe`.
- Registered using the packaged `--headless --mcp-install codex` operation, after an old desktop runtime completed shutdown.
- `codex mcp get open-design --json` confirms enabled stdio registration.
- A real read-only MCP initialize + tools/list handshake succeeded: **22 tools**, including collect_brief, confirm_brief, list/create/get_project, list_agents, start_run, get_run, cancel_run.
- This older chat could not hot-load the tools into its native tool list. The Open Design skill explicitly requires a fresh Codex task in that case. **Start the new task in this same project**, then discover the newly registered tools and use the actual Open Design workflow.
- One skipped Brief was created through an attempted short-lived local MCP client. That client did not preserve its in-memory attributed draft across calls; confirm_brief was rejected with `PLUGIN_CONTRACT_REJECTED`. **No design project/generation/run started.** The bridge was stopped rather than removing attribution or switching modes. The fresh task must explicitly restart the Open Design workflow through its native, persistent MCP session; do not reuse the old draft, nonce or workflow ID. Private diagnostic files remain ignored.
- Use the Open Design skill: default Open Design Cloud unless user explicitly chooses Local Codex or secure BYOK. The user has already supplied detailed requirements and asked not to repeat brainstorming/reconfirmation: for the explicitly restarted workflow, call `collect_brief` once with `skip:true`, locale `en`, and the skill's exact plugin attribution. Preserve one tool session throughout confirmation, login, project and generation. Follow login/mode/run/delivery requirements. Do not silently switch modes or claim Open Design was used without a successful run.
- Setup diagnostics are in ignored `.superpowers/opendesign-setup/`; registration uses app-provided paths and pipe metadata, not guessed ports.

## Product direction

Use Open Design to produce a distinct, coherent interface, not another dashboard template. Prefer generous readable type, strong hierarchy, few meaningful status colors, restrained charts and clear language. The existing tiny labels, repetitive badges, opaque percentages, large wall of rows, and theatrical “trading terminal” metaphors are the rejected execution.

The main workflow is operational: **Claims → risk assessment → clinic cash offer → accepted simulated acquisition → recovery → financial result**. Make current state and the next valid action obvious. A claim list should lead into one focused case workspace, with supporting portfolio and capital views. All 100 records must remain usable/searchable. Advanced formulas, calibration and audit information should be available without competing with the primary task.

The first screen should make these points understandable without narration:

1. A clinic has an already-denied insurer receivable. The full medical bill is not necessarily owed by the insurer.
2. ProjektSUBRO evaluates whether recovery is supported and economically worthwhile.
3. The clinic can accept a discounted simulated payment today for liquidity and improved cash flow, transferring defined recovery risk under the mock assumptions.
4. The recovery agent works from actual linked fabricated evidence and stops when evidence, permissions, economics, deadlines or retry limits fail.
5. Realized recovery and losses reconcile separately from expected values.

Use plain product language such as “Claims,” “Review assessment,” “Clinic's cash offer,” “Recovery,” “Capital,” “Needs evidence,” and “Not eligible.” Technical terms can be explained in details. Do not present a scripted judge tour as the product's navigation.

## Who decides what — make this visible

- **Gemini:** reads the selected claim's circumstances and proposes supported qualitative risk factors; later chooses permitted recovery actions. It does **not** invent a numerical probability, bid, ledger amount, medical evidence or insurer result.
- **Historical cohort estimator:** computes observed recovery frequencies and Wilson intervals from clearly labeled **fabricated training outcomes**. Too few matching cases means no estimate.
- **Deterministic decision rules:** check evidence, permissions, deadline, sample support, expected contribution, capital and exposure limits; output BUY_CANDIDATE / REVIEW / DECLINED with the binding reason.
- **Clinic/operator:** explicitly accepts a simulated offer; no real payment occurs.
- **Independent mock insurer:** applies scenario rules, regardless of persuasive language.
- **Guardrails:** can veto every recovery action and force a documented stop or human handoff.

## Underwriting v2 implementation

`src/lib/risk-history.ts`: 1,700 fabricated training + 800 separate fabricated holdout rows. Outcome counts and cohort sizes are designed demo assumptions, not real data. Never claim real-world predictive calibration.

`src/lib/risk.ts`: insurer/denial/evidence/authorization/deadline cohort matching; empirical frequency; Wilson 95% interval under the binomial illustration; minimum cohort n=30, otherwise probability=null and mandatory REVIEW. Holdout outcomes are excluded from estimation.

CASE-1042 derives 80% from **80/100** matching training outcomes, rather than a fixed probability assignment. Its interval is approximately **71–87%**. Other portfolio estimates vary by cohort. CASE-4109 uses 148/200=74%; CASE-6077 uses 70%. Missing evidence has no supported estimate.

`riskValidation()` reports actual synthetic holdout metrics: holdout/scored n=800, Brier 0.204075; calibration bins show predicted vs observed frequencies and sample counts. **Brier is not accuracy.** Holdout performance on deliberately synthetic data is not commercial validation.

The deterministic assessment exposes break-even and policy thresholds. Teaching case: ($300 advance + $30 work)/$500 conditional payment = **66% break-even**. With minimum margin10%, the policy threshold is72%. Expected contribution at80% is+$70; an explicitly labeled manual50% shock gives−$80 and disables funding. Patient responsibility and contractual write-off are excluded.

`src/lib/risk-review.ts` and POST command `analyze`: actual Gemini qualitative analysis with supported factor codes and exact linked evidence IDs; no numerical output accepted. An actual review returned source=gemini/status=COMPLETE without changing the probability. Provider failure is labeled and falls back to a deterministic qualitative summary.

The current RiskTransparency/CalibrationPanel in `terminal.tsx` provides functional fields to carry into the new design. It is not the visual redesign.

## Interfaces to preserve

GET `/api/demo` → `{session,mode:'rules'|'gemini',persistence,error?}`.

POST `/api/demo` → `{command,revision,claimId?,patch?,kind?}` with commands `underwrite`, `analyze`, `settings`, `claim`, `purchase`, `step`, `chaos`, `reset`, `resetClaim`, `escalate`.

All changes are server validated. Revision CAS and a durable Supabase lease occur before provider calls. Funding and collection events are idempotent. Model/API errors do not become mock insurer approvals.

Pure UI imports: `assess`, `allocate`, `fundingReason`, `portfolio`, `riskValidation`. Money is integer cents. Do not expose keys or service/admin tools to the browser or in-product agent.

## Infrastructure and current source

- Root: `C:/Users/user/Documents/c0mpiled16 2026/ProjektSUBRO`.
- Branch: `feat/hackathon-prototype`; PR https://github.com/ShyaamN/ProjektSUBRO/pull/1 (draft, already attached to chat).
- Original verified commit: 73daa9534933ad55a2e8ac44da3bdb97fc6d8757. Risk v2 changes are being tested and committed after this checkpoint; inspect current git status/log, do not redo them.
- Supabase project: vppoyfdycijwsuczoygt; scoped backend capability, RLS protected demo_sessions, atomic snapshots/CAS/leases. Actual access restrictions and two-process concurrency verified.
- Vercel team: team_aM807rubBYxVnwfMz1Ihlrxg; project: prj_UAoZ4pdfmz3anUA4qmntarA28VKU (`projektsubro`). Use an explicit preview/staging deployment after tested changes. Vercel API uses `target:'staging'` for this preview; `target:'preview'` is rejected.
- Existing preview: https://projektsubro-rnnd6ymi0-shyaamns-projects.vercel.app/ . Re-deploy after v2/new UI and verify current commit/environment.
- User explicitly approved copying GEMINI_API_KEY and scoped Supabase credentials into **sensitive server-only variables on this protected Vercel preview**. Those were configured. Never display `.env.local`, credentials, or environment values.
- User explicitly approved a temporary judge-access link, valid23h. Use Vercel get_access_to_vercel_url for the current preview; do not commit share tokens. Keep deployment protection enabled.
- `.env.local` contains the user's actual Gemini key and configured scoped Supabase settings. Default verified model: gemini-3.1-flash-lite, MINIMAL thinking,20s bounded timeout. Gemini3.8 repeatedly timed out in this account; do not blindly revert.

## Verification and active review fixes

Before risk v2: 58 unit/API/native checks +3 browser flows, typecheck, production build, actual five-step Gemini RECOVERED run, Supabase persistence/lease and Vercel build/GET verified.

Risk v2 final local checks: **11 native +69 Vitest green (80 total), typecheck green,4 browser flows passed**. Independent review's human-hold clearing, unconstrained narrative, and unsupported manual0% inconsistencies were reproduced and fixed with regression tests. Human holds are now persisted separately until explicit reset; model prose is replaced by validated factor explanations; manual hypothetical economics remain blocked by unsupported-history rules. Max-offer pricing also correctly finances the maximum proposed bid itself. Inspect latest BUILD_STATUS/git log for final deployment IDs; do not redo completed risk work.

Commands: `npm test`, `npm run typecheck`, `npm run build`, `npm run test:e2e`. Use installed Microsoft Edge for Playwright. Local Turbopack once needed a generated `.next` cache clear after switching sandbox contexts; always verify paths and never remove `context/` or user data. Native child-process/network permissions may require tool escalation.

Next: finish/verify risk changes, use actual Open Design to generate the product redesign, integrate it in this root while preserving backend contracts, test desktop1440×900 and1280×720 plus compact navigation, deploy and test the live preview from a fresh session. Keep local fallback working. Do not equate a successful build or static design with a functioning end-to-end product.
