# ProjektSUBRO — Codex project instructions (AGENTS.md)

## Context and timing

This workspace contains **pre-event planning documents**, not a starter application. The c0mpiled-16 hackathon begins coding at **1:30 PM Pacific on October 24, 2026**. **Before that start, do not scaffold, generate, implement, deploy or commit application code.** Only review the plans and verify permitted environment readiness. The event rules prohibit existing starter projects/code; if the status of Markdown planning docs is in doubt, defer to event organizers.

## Mandatory context files

Read the following files before the first implementation step, in this order:

1. `CONTEXT.md` — business, terminology, scope, verified versus proposed claims.
2. `ARCHITECTURE.md` — claim model, underwriting math, state machine and audit/ledger.
3. `FEATURES.md` — P0 acceptance tests, priority order and definition of done.
4. `AGENT_RULES.md` — recovery-agent permissions, safety, stopping conditions.
5. `DEMO.md` — reproducible scenarios and judges' challenges.
6. `DESIGN.md` — UI direction and projector legibility.
7. `MCP_INTEGRATIONS.md` — connected development services and safe deployment procedure.
8. `BUILD_PROMPT.md` — stage-by-stage build instructions to follow **only after official start**.

## Connected MCP services (user-reported)

The user reports **GitHub, Supabase and Vercel MCP connections are connected**. Discover what MCP tools are **actually visible to this Codex session**, inspect their supported schemas, and verify the **correct ProjektSUBRO-specific account/project/repository** before write actions. Do not assume access or guess IDs. If the tools are absent, state so and use safe local fallbacks. Never alter unrelated existing projects or incur charges without approval.

- **GitHub:** dedicated new/approved ProjektSUBRO repo, checkpoints, push working code; **no secrets committed**.
- **Supabase:** prefer dedicated demo Postgres for **synthetic records only**, restrict writes, enable RLS on exposed tables, verify access, prevent duplicate financial ledger events. Keep local fallback.
- **Vercel:** connect the approved repo and deploy a **tested preview** when the app works. Put secrets only in secure environment settings, inspect logs, verify live URL. Keep local fallback.

These MCP tools belong to **Codex as a developer**, NOT to the in-product ProjektSUBRO recovery agent. Never expose infrastructure credentials or admin/deployment tools to that agent.

## Non-negotiables

- Use only **synthetic** medical and financial data; no real PHI, payers, patients, hospital portals, money movements or appeals.
- ProjektSUBRO's underwriting is deterministic and auditable; an LLM cannot invent probabilities, financial results, medical evidence or legal rights.
- The insurer simulation enforces independent rules; the in-product recovery agent can act only through its mock allowlisted actions, with finite costs/steps, evidence citations and mandatory stop/escalation paths.
- Simulated claim purchases/collections must be idempotent; expected return is not realized profit. Every screen plainly labels the demo as synthetic/simulated.
- Build the core **underwrite -> offer -> simulated fund -> autonomous recovery -> stop/recover -> reconciled ledger** loop before optional polish/integrations.
- For Supabase or Vercel-specific implementation, check current official docs; test changed behavior, do not claim unverified outcomes.
- Never leak keys/tokens into code, commits, screenshots, browser bundles, Markdown or logs.

## Execution instruction

**After 1:30 PM PT:** follow `BUILD_PROMPT.md`, build from scratch, and report working milestones, tests, deployment and any unavailable MCP integrations honestly. Do not confuse an impressive UI with a functioning product mechanism.
