# Current checkpoint — underwriting v2

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
- Build and publish final risk-v2 commit/preview, verify new fields and qualitative review live; update this status with exact IDs.
- Start one fresh task in the same project to load Open Design tools and do the **actual full product UI overhaul**, integrate, test and deploy. Use the handoff brief; do not repeat brainstorming or redo completed risk work.
- Working dependencies are installed and pinned. No npm installs are currently pending. Never print `.env.local` or credentials.

## Preserved decisions
- Work in the original root as requested. Synthetic data and simulation only.
- Financial rules, ledger, permissions, deadlines, citations, human holds and stopping limits remain authoritative over model suggestions.
- Scoped Supabase backend capability avoids database-admin credentials in the app.
- Hypothetical action costs are included in fixed synthetic work costs, not double charged or represented as real API charges.
- STOPPED/ESCALATED remain unresolved capital-at-risk states; only settled RECOVERED/PARTIAL/LOSS contribute to realized settlement totals.
