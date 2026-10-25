# ProjektSUBRO Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task by task. User authorized immediate execution without design reconfirmation.

**Goal:** A tested, deployed synthetic underwriting → acquisition → bounded recovery → reconciled outcome demo.

**Architecture:** Next.js with a pure typed financial and recovery domain. Server routes own validation and state transitions. An isolated browser session has a signed, server-validated snapshot fallback; Supabase persistence is optional after target verification. Gemini proposes actions only; deterministic rules own permissions and insurer outcomes.

**Tech Stack:** Next.js, React, TypeScript, Tailwind, official Google GenAI SDK, Vitest, Playwright.

**Spec:** All nine files in context/, especially BUILD_PROMPT.md, ARCHITECTURE.md, DESIGN.md, AGENT_RULES.md.

## Global Constraints
- Synthetic data and simulated purchases/payer responses visibly labeled throughout.
- 100 reproducible records, including the six named demo cases.
- Gemini exclusively for model calls; rules-only mode explicitly labeled when unavailable.
- Financial calculations deterministic; all monetary values in integer cents.
- Purchase and collection idempotent; no funding without explicit acceptance.
- Nine allowlisted mock actions; maximum 8 steps, 3 submissions, $2 hypothetical action budget.
- Work in the existing project root and preserve context/ as requested.

## Review Focus
- Duplicate/concurrent requests must not double-book transactions.
- Invalid or stale money/probability inputs fail closed.
- Cross-claim citations, unsupported assertions and prompt injection cannot authorize action.
- Refresh and provider failures preserve honest state and do not invent approvals.
- Partial recovery, escalation and loss reconcile separately from expected contribution.

### Task 1: Domain and fixture
Files: src/lib/{types,fixtures,underwriting,recovery,portfolio}.ts, tests/domain.test.ts.
Interfaces: Claim, Settings, Session, Assessment, AgentAction, AgentEvent; assess(claim,settings), allocate(claims,settings,ledger), purchase(session,id), step(session,id,proposal?), createSession().
- [ ] Write tests for +$70/−$80, expired deadline, missing evidence, capital caps, duplicate funding, successful/partial/loop/evidence stops and ledger signs; run RED.
- [ ] Implement fixtures, financial math, action validation, mock insurer and idempotent ledger; run GREEN.
- [ ] Commit tested domain.

### Task 2: Application and session API
Files: src/app/{layout,page,globals.css}, src/components/*, src/app/api/demo/route.ts, src/lib/{session,gemini}.ts; tests/api.test.ts; e2e/demo.spec.ts.
Interfaces: GET /api/demo returns {session,mode,persistence}; POST {command,claimId,...} returns same shape. UI submits commands; server computes financial state. Signed snapshot restores refresh in fallback mode.
- [ ] Write API and browser acceptance tests for underwriting, funding, recovery, chaos controls and ledger; run RED.
- [ ] Implement accessible dark terminal per DESIGN.md with meaningful visual state, provider incentive and explicit assumption provenance.
- [ ] Implement Gemini structured action adapter, bounded timeout/error escalation and honest fallback.
- [ ] Run unit, typecheck, build and browser tests; fix root causes; commit.

### Task 3: Verify and deploy
Files: README.md, .env.example, deployment configuration; optional database schema.
- [ ] Independently review boundary/security/economic behavior and fix important findings with regression tests.
- [ ] Push verified code to ShyaamN/ProjektSUBRO on a feature branch.
- [ ] Create dedicated Vercel preview using verified account; inspect build logs and exercise full live flow from a new session.
- [ ] Verify Supabase project availability; use restrictive RLS and atomic writes if a dedicated target is available. Otherwise document fallback limitations.
- [ ] Record exact checks, URLs, commit and remaining limitations.
