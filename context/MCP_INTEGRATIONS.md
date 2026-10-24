# ProjektSUBRO — Connected development tools and MCP workflow

**Status:** The project owner reports that **GitHub, Supabase, and Vercel MCP connections are installed/connected**. That is an instruction to **discover and verify the tools available in Codex's own execution environment**; it is **not proof** that the Codex session has inherited the same connections, has access to a particular project, or is authorized to mutate arbitrary resources.

**Document type:** Pre-hackathon planning/operational instructions. This is not source code or an executable scaffold. Read this alongside `AGENTS.md`, `ARCHITECTURE.md` and `BUILD_PROMPT.md`. Codex should automatically discover the root `AGENTS.md` when run in this folder/repository; if the session was already open, start a fresh session or explicitly request it to read the file.

## 1. The role of each connected service

| Service | Intended role in ProjektSUBRO | Appropriate MCP operations once implementation begins |
| --- | --- | --- |
| **GitHub** | Version control, shared collaboration, issue tracking if useful, remote source repository | Confirm identity and permissions; identify the correct repo; create a new hackathon-only repo if needed and authorized; commit/push project files; inspect commit state and optionally create a pull request |
| **Supabase** | Postgres persistence for synthetic claims, offers, recovery runs, agent events, and a simulated ledger; optional Realtime for collaborative demo | Identify the approved project; inspect existing schema; plan/apply reviewed demo-only schema; check security/advisors; verify queries and access policies |
| **Vercel** | Host the Next.js demonstration at a reliable HTTPS URL; preview and build logs; server-side environment configuration | Verify team/project permissions; link the correct new or approved project; set environment variables securely; create a preview deployment; inspect deployment and logs; verify the demo URL |

**The connections do not require inventing new business features.** They are development/deployment infrastructure. Keep ProjektSUBRO's product scope unchanged.

## 2. Before using any MCP tool

1. **Discover actual tools** visible to the current Codex session and read their supported operations/argument schemas. Never assume names or capabilities from this Markdown document. The user connected services in ChatGPT; Codex may have a separate connection/authorization boundary.
2. **Verify access safely** using read-only listing/inspection before any write. If unavailable, describe the missing connection, use a non-MCP fallback only when appropriate, and continue the local prototype. Do not claim the integration worked if it did not.
3. **Resolve the specific target** repo, database project, and Vercel project. They are **not identified in these files**. Never guess a project ID, organization, GitHub owner, database, or deployment target. Do not modify existing unrelated apps just because they are visible.
4. **Respect permission boundaries.** Ask for approval before modifying an ambiguous existing project, performing destructive operations, deploying publicly when that is not already intended, or creating billable resources. Prefer new isolated hackathon-only resources where appropriate.
5. **Do not build before the permitted time.** Event rules permit pre-event ideation but require implementing application code after official hacking starts at **1:30 PM Pacific, October 24, 2026**. Planning documents and environment readiness are distinct from building. The guide does not explicitly rule on prewritten Markdown docs—confirm in event Discord `#help` if needed.

## 3. Suggested execution sequence after the hacking start

### A. GitHub — establish a safe code home

- Identify the agreed owner/repository; if there is no dedicated repository, create a **new, empty, ProjektSUBRO-specific** repo only after confirming its destination and permissions. Never clone a preexisting starter app as a shortcut around the event rule.
- Generate the Next.js project **from scratch after 1:30 PM**. Keep `.gitignore` correct before commits: `.env*` secrets, local credentials, service tokens and private data must not enter source control. Example env-variable names can live in `.env.example` with blank values.
- Commit in small coherent milestones. Push when local tests pass. Record the final commit hash for the submission if the organizer requires a repository link.
- If GitHub tools are not visible, local Git is an acceptable fallback; do not waste the demonstration building time troubleshooting MCP access.

### B. Supabase — persist *synthetic* data only

- Select a **dedicated demo project** or a specifically approved target. Do not touch unrelated production databases.
- Inspect available tables/configuration first. Treat `ARCHITECTURE.md`'s core entities as a **logical model**, not preapproved SQL. Create only schema needed for the working demo: claims, evidence, underwriting assessments, offers/transactions, recovery jobs, audit events, and ledger events as required.
- Design for **idempotence**: an offer is funded at most once; a simulated recovery is booked at most once; retried webhooks/UI actions cannot duplicate ledger entries. Consider unique event IDs, database constraints and transaction-safe updates.
- Enable **row-level security** (RLS) for tables in exposed schemas, and define appropriately restrictive policies. Do **not** make synthetic financial records publicly writable merely because they aren't real data. If the demo does not need public write access, perform sensitive writes from server-side routes with authorization checks.
- Use only publishable/browser-safe client keys in browser code. **Never expose Supabase secret/service-role keys** to the browser, a `NEXT_PUBLIC_*` variable, GitHub, logs, screenshots or model prompts.
- Check current Supabase docs/changelog and the MCP tool capabilities before issuing implementation operations. After any change, run actual verification queries, review security advisor findings where supported, and test policies from the access level the app will use.
- If Supabase connectivity fails, **degrade to deterministic local/server-backed synthetic storage** and keep the end-to-end demo working. Label persistence limitations rather than claiming a working database.

### C. Vercel — deploy a verified preview

- Choose an appropriate Vercel team and a dedicated ProjektSUBRO project, or an explicitly approved existing one. Check that the repository/build configuration is supported for the actual app.
- Use GitHub-to-Vercel integration and MCP actions when available. Do not assume the connection alone has linked the correct repository.
- Set required environment variables via the Vercel secret/environment mechanism, not hard-coded in source. Determine exact current key names from the installed libraries and official docs; common examples include `NEXT_PUBLIC_SUPABASE_URL`, a browser-safe Supabase publishable key, and a **server-side-only** LLM API key.
- Deploy a **preview** build first. Inspect build/runtime logs, open the actual URL, and test the full claim-underwrite-fund-recover-stop flow from an incognito/private browser session or separate device.
- If GitHub/Vercel integration or deployment stalls, preserve a reliable locally running demo. Do not allow a broken remote URL to become the only presentation option.

## 4. Security and separation of powers

**Distinguish two different agents:**

1. **Codex / development assistant** may, with user approval and relevant permissions, use GitHub/Supabase/Vercel MCP tools to create and deploy the demo.
2. **ProjektSUBRO's in-product recovery agent** is a **simulated insurance-claims agent**. It must **never receive these MCP development tools**, GitHub repository-write permissions, deployment privileges, database-administration access, real provider credentials, payment access, or unrestricted SQL execution. Its action set is strictly the mock tool list in `AGENT_RULES.md`.

Additional controls:

- **Data:** Fabricated patients, fictional providers, fabricated evidence, simulated insurers, simulated payments, and labeled assumptions only. Never upload real PHI or actual payer records.
- **Secrets:** Do not paste API keys, access tokens, connection strings with passwords, or service role credentials into Markdown docs, commits, browser bundles or visible logs.
- **External actions:** No live claim submission, insurer contact, fax/SMS, patient data access, transfers, card charges, or real medical billing workflows.
- **Safe write checks:** Inspect targets; favor additive changes; review irreversible and destructive operations; protect existing resources.
- **Auditability:** The same simulated purchase event must not affect balances twice due to a retry, refresh or deployment restart.

## 5. Practical priority order

1. **P0:** Working local end-to-end loop and honest synthetic presentation.
2. **P1:** Supabase-backed persistence when verified without jeopardizing P0; alternatively an ephemeral persistence layer that the demo genuinely uses.
3. **P1:** GitHub commits/push and a Vercel preview URL after the functionality works.
4. **P2:** Optional Realtime, advanced authentication, CI workflows, observability, multi-tenant administration and complex infrastructure.

If the setup is already connected and straightforward, use it. **But don't mistake infrastructure complexity for product innovation.**

## 6. Integration completion criteria

When relevant services are used, verify and truthfully report:

- **GitHub:** correct destination and repository URL; no secrets committed; expected app files and commit present.
- **Supabase:** selected project is confirmed; tables and RLS inspected; synthetic inserts/read and ledger idempotence tested; no real clinical/financial data.
- **Vercel:** preview deploy succeeded; URL opens; required server-side environment is configured; a new browser session can underwrite a claim and run an actual bounded mock-agent scenario.
- **Fallback:** if any MCP integration is not available in Codex, state that plainly and run the highest-quality local demo possible.

**Never invent successful connector calls, deployed URLs, repo IDs, database tables, or passing tests.**
