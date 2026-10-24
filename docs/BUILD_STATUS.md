# Product redesign checkpoint — October 24, 2026

The product UI has been rebuilt locally using the saved OpenDesign Cloud visual direction: ivory surfaces, forest green actions, serif headings, and a Claims / Recovery / Capital / Outcomes workspace. The existing 100-claim pipeline, server decisions, risk model, evidence, bounded recovery and ledger remain authoritative.

## Redesign verification
- 80 domain/API checks passed (11 native + 69 Vitest); TypeScript passed.
- 8 browser flows passed: product/navigation clarity; historical support and qualitative analysis; stress-test → explicit purchase → recovery → ledger → refresh without duplicate collection; repeated-refusal stop; synthetic missing-evidence injection; searchable claims and capital/outcomes navigation at 1440×900, 1280×720 and 390×844.
- Production build passed with `npm run build -- --webpack`. Local Turbopack encountered a Windows child-process failure; the supported webpack compiler built successfully. Deployment uses the project's normal Linux build.
- Visual checks covered Claims, assessment, Recovery, Capital and Outcomes. Fixed compact selected-claim action visibility, navigation scroll reset, inherited dark backgrounds/low-contrast text and negative-zero display.
- Fresh independent review found the compact inspector issue; it was reproduced and fixed. No other Important/Critical findings.
- OpenDesign Cloud produced HTML/CSS/JS, saved under ignored `.superpowers/opendesign-reference/`. The Cloud run itself failed for insufficient credits. Switching accounts cannot access the original project. The user explicitly authorized continuing locally; no additional Cloud generation was purchased. Generated illustrative data was not wired into the app.
- Published UI commit: `04e4b9f5b16e53c3515d4a8288b389446b7d1d02` through the authenticated GitHub connector (local equivalent UI commit `bc52c14297938163f5f4c802363427a8857e2e9e`). The shell Git credential manager awaited login, so connector publication was used; local and remote commit histories differ. Source changes are backed up on the existing feature branch and PR1.
- Protected staging deployment `dpl_2JAaVyHUummotYWcB8GpDtR3jGN8` is READY at https://projektsubro-rl5zh7pkj-shyaamns-projects.vercel.app/ from the published UI commit. Vercel's normal build succeeded; SSO deployment protection remains enabled.
- Fresh live browser verification passed:100 claims, Gemini mode, durable Supabase storage; actual Gemini qualitative review COMPLETE; explicit simulated purchase; five actual Gemini recovery actions; CASE-1042 RECOVERED; exactly one PURCHASE and one COLLECTION; refresh preserved the single collection. Temporary23-hour access link was created and shared privately; no share token is committed.

---

# Previous checkpoint — underwriting v2

Read `docs/PRODUCT_REDESIGN_HANDOFF.md` for the active user request and exact continuation context. **The user rejected the existing UI. A full Open Design product overhaul remains outstanding.** Current interface additions are functional risk transparency, not that redesign.

## Verified
- All nine `context/` source documents preserved; project root unchanged; branch `feat/hackathon-prototype`; draft PR https://github.com/ShyaamN/ProjektSUBRO/pull/1.
- Original pipeline: 100 claims → deterministic underwriting/allocation → explicit simulated purchase → bounded Gemini/rules recovery → independent insurer → reconciled ledger.
- Actual Gemini five-step CASE-1042 recovery completed with one collection. Actual Gemini qualitative risk review completed without changing probability. Verified model: gemini-3.1-flash-lite, MINIMAL thinking,20s timeout; credentials remain private.
- Risk v2: 1,700 fabricated training outcomes; 800 distinct fabricated holdout outcomes; empirical matched frequencies; Wilson intervals; n<30 => no estimate/REVIEW. CASE1042 derives80/100, other rates vary. Break-even66%, default policy72%. Brier/calibration are synthetic validation illustrations, not real predictive validation.
- Qualitative factors/citations are validated; summaries are assembled from supported factual explanations. Persistent human-review holds cannot be cleared by no-op edits, chaos controls, favorable re-analysis or provider failure. Explicit reset restarts synthetic cases.
- Manual rates are labeled hypothetical even with unsupported history; hard REVIEW remains. Max offer correctly accounts for financing at the maximum bid, with integer-cent constraints.
- Latest local verification: **80 automated checks (11 native +69 Vitest), typecheck green**. **4 browser flows passed** (history/break-even/review, shock/funding/recovery/refresh, loop stop, missing-evidence injection).
- Supabase project vppoyfdycijwsuczoygt: actual scoped REST storage/read/update/access denial verified; restrictive RLS; no advisor findings; durable lease before model calls; actual two-process mutation count1. Local disk/ephemeral fallbacks labeled.
- Vercel team team_aM807rubBYxVnwfMz1Ihlrxg; project prj_UAoZ4pdfmz3anUA4qmntarA28VKU. Original staging deployment dpl_7REH87Aa2nqAk2MeRt1Qe5PL1j8o READY at https://projektsubro-rnnd6ymi0-shyaamns-projects.vercel.app/ . Actual GET mode=gemini, persistence=Supabase,100claims verified.
- User explicitly approved sensitive server-only preview credential export and a23-hour judge link. Keep protection enabled; do not commit share tokens.
- Open Design0.26.1 installed, registered/enabled; real initialize/tools-list handshake passed with22tools. This chat cannot hot-load its native tool list. A short-lived direct MCP bridge lost its attributed Brief between calls, so confirmation was rejected; bridge stopped. **No design generation/project/run started.** Use a fresh task in this same project, explicitly restart the workflow, and keep its native MCP session intact. Setup no longer blocked on installation.

## Current remaining
- Risk v2 commit e8b5924fa395cbc8c94a486b8fe7491548fa8892 is pushed. Protected staging deployment dpl_7yK7ArLrgyVaktprpK5UTQF1ijSQ is READY at https://projektsubro-dlpeyohpk-shyaamns-projects.vercel.app/ . Live GET returned200, Gemini mode, durable Supabase storage,100claims and CASE1042 cohort80/100 with Wilson interval. Qualitative review was verified locally against actual Gemini; it has not yet been exercised on this new preview.
- The user authorized and started fresh product-redesign chat 01a17010-c73e-7082-8321-43293910ee4d in this same saved project. That chat confirmed native Open Design tools are loaded and the attributed workflow is active. It owns the **actual full product UI overhaul**, integration, testing and deployment. Use the handoff brief; do not repeat brainstorming or redo completed risk work.
- Working dependencies are installed and pinned. No npm installs are currently pending. Never print `.env.local` or credentials.

## Preserved decisions
- Work in the original root as requested. Synthetic data and simulation only.
- Financial rules, ledger, permissions, deadlines, citations, human holds and stopping limits remain authoritative over model suggestions.
- Scoped Supabase backend capability avoids database-admin credentials in the app.
- Hypothetical action costs are included in fixed synthetic work costs, not double charged or represented as real API charges.
- STOPPED/ESCALATED remain unresolved capital-at-risk states; only settled RECOVERED/PARTIAL/LOSS contribute to realized settlement totals.
