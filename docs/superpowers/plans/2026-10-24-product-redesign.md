# ProjektSUBRO Product Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dense terminal UI with a polished, accessible operating product that makes all 100 synthetic claims, deterministic assessment, offers, recovery and outcomes understandable and fully usable.

**Architecture:** Keep the existing `/api/demo` contract, domain calculations and state transitions authoritative. Rework the client presentation in `src/components/terminal.tsx` and its design system in `src/app/globals.css`; preserve each action by wiring the new screens to the current command helpers. Add focused browser coverage for navigation, search, decision explanation, explicit purchase, recovery, and realized outcomes.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Lucide, Playwright.

**Spec:** `docs/PRODUCT_REDESIGN_HANDOFF.md` (user-authorized full product direction and immutable behavior contracts).

## Global Constraints

- Use synthetic claims and explicitly simulated payments/actions only.
- Preserve all 100 claims and the existing server-side validation, CAS, idempotency, human holds, evidence provenance and stop rules.
- Gemini proposes qualitative factors/recovery actions only; cohort estimator provides empirical probability; deterministic rules own financial decisions; insurer outcomes stay independently rule-determined.
- Label fabricated training/holdout data and synthetic calibration honestly.
- Never expose `.env.local`, credentials, or server-only integrations in the browser.
- Keep ordinary users on clear task language; put financial/audit detail behind progressively disclosed controls.

## Review Focus

- Claims with insufficient matching history: display `Not eligible`/`Needs evidence` and no invented probability.
- Stale or duplicate purchase/recovery commands: retain server validation and idempotency.
- Long clinic/insurer/evidence strings and 100-row portfolio: maintain searchability and responsive layout.
- Mobile/compact navigation: preserve reachability of primary sections and selected-claim actions.
- Reset, network failure, and persistent human-review hold: retain existing truthful states and errors.

## File Map

- `src/components/terminal.tsx`: app shell, task-oriented navigation, claims list, selected claim, decision basis, recovery, capital and outcomes screens; preserve command and calculation semantics.
- `src/app/globals.css`: replace dark terminal tokens/layout with the generated Open Design direction, readable responsive hierarchy, focus/motion/accessibility states.
- `e2e/demo.spec.ts`: add behavioral coverage for redesigned primary tasks while retaining existing domain-flow scenarios.
- `docs/BUILD_STATUS.md`: update final design, verification and deployment checkpoint after delivery.

## Tasks

### Task 1: Integrate the generated visual direction and clear product shell

**Files:** modify `src/components/terminal.tsx`, `src/app/globals.css`.

- [ ] Add failing browser assertions for Claims / Recovery / Capital / Outcomes navigation, synthetic-only explanation, and readable selected claim state.
- [ ] Run the targeted browser test and confirm it fails on current terminal labels/copy.
- [ ] Implement the generated visual direction with clear navigation, primary workflow labels, responsive spacing, visible decision owner/reason, and progressive disclosure for deep model/audit details.
- [ ] Run the targeted browser test and confirm it passes.

### Task 2: Make claim assessment and clinic offer legible and actionable

**Files:** modify `src/components/terminal.tsx`, `e2e/demo.spec.ts`.

- [ ] Add failing browser assertions for 100-claim search/filter, 80/100 cohort explanation, break-even/policy thresholds, clinic liquidity/risk-transfer terms, and explicit simulated purchase.
- [ ] Run the targeted browser test and confirm it fails.
- [ ] Implement the claims assessment and offer view using existing `assess`, `allocate`, `fundingReason`, and `purchase` behaviors; expose evidence links and binding rule reasons.
- [ ] Run the targeted browser test and confirm it passes.

### Task 3: Integrate recovery, capital and reconciled outcomes views

**Files:** modify `src/components/terminal.tsx`, `e2e/demo.spec.ts`.

- [ ] Add failing browser assertions for permitted recovery progression, separate expected vs realized totals, audit visibility, human escalation/stops, and adjustable capital policy.
- [ ] Run the targeted browser test and confirm it fails.
- [ ] Implement the views with existing commands and domain totals; distinguish Gemini proposals, server guardrail decisions and independent mock insurer responses.
- [ ] Run the targeted browser test and confirm it passes.

### Task 4: Verify responsive operation, contracts and deployment

**Files:** modify `src/app/globals.css`, `e2e/demo.spec.ts`, `docs/BUILD_STATUS.md`.

- [ ] Add failing coverage for 1280×720 and compact navigation plus a full search-to-assessment-to-simulated-funding-to-recovery-to-outcome flow.
- [ ] Run the targeted tests and confirm the relevant checks fail before implementation.
- [ ] Fix responsive and interaction issues while preserving the backend and test contracts.
- [ ] Run `npm test`, `npm run typecheck`, `npm run build`, and `npm run test:e2e`; inspect and resolve any failures.
- [ ] Deploy the tested preview with the already-authorized server-only credentials and deployment protection intact; verify a fresh-session live core flow and generate the already-authorized 23-hour access link.
- [ ] Record the exact commit/deployment identifiers and verification results in `docs/BUILD_STATUS.md`.

## Execution result

Tasks 1–3 implemented; eight browser flows and80 domain/API checks pass. Final production build succeeds with webpack. Task4 protected staging deployment and fresh live Gemini flow passed; see BUILD_STATUS for identifiers. Existing behavioral tests were adapted and retained; added product navigation and three responsive scenarios. Saved generated source guides the visuals; authoritative risk math remains unchanged.
