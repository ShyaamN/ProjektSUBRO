import { describe, expect, it } from "vitest";
import { createRun, runToCompletion, stepAgent } from "@/lib/agent";
import { actualContribution, allocatePortfolio, applyTx } from "@/lib/capital";
import { portfolioAnalytics, underwrite } from "@/lib/finance";
import { evaluateSubmission } from "@/lib/insurer";
import { INITIAL_CLAIMS } from "@/lib/seed";
import type { CapitalConfig, LedgerTx } from "@/lib/types";

const claim = (id: string) => INITIAL_CLAIMS.find((c) => c.id === id)!;
const CONFIG: CapitalConfig = { availableCapital: 250000, minContribution: 25, maxInsurerConcentration: 0.35, riskTolerance: "BALANCED", eligibleCategories: "ALL" };

describe("deterministic underwriting", () => {
  it("prices CASE-1042 at +$70 at 80% (collectible, not billed)", () => {
    const uw = underwrite(claim("CASE-1042"), {});
    expect(uw.expectedCollection).toBe(400); expect(uw.advance).toBe(300); expect(uw.expectedContribution).toBe(70); expect(uw.decision).toBe("BUY CANDIDATE");
  });
  it("repricing to 50% gives $250 expected and −$80 — offer invalidated", () => {
    const uw = underwrite(claim("CASE-1042"), { probability: 0.5 });
    expect(uw.expectedCollection).toBe(250); expect(uw.expectedContribution).toBe(-80); expect(uw.decision).toBe("DECLINE"); expect(uw.maxPrice).toBe(195);
  });
  it("CASE-2088 is declined despite $20,000 collectible (expired window)", () => {
    const uw = underwrite(claim("CASE-2088"), {});
    expect(claim("CASE-2088").collectible).toBe(20000); expect(uw.decision).toBe("DECLINE"); expect(uw.reasons.join(" ")).toMatch(/expired/i);
  });
  it("every claim reconciles collectible = allowed − patient, never billed", () => {
    expect(INITIAL_CLAIMS.length).toBeGreaterThanOrEqual(100);
    for (const c of INITIAL_CLAIMS) expect(c.collectible).toBe(c.allowed - c.patientResponsibility);
  });
  it("portfolio analytics are internally consistent", () => {
    const a = portfolioAnalytics(INITIAL_CLAIMS);
    expect(a.buyCount + a.reviewCount + a.declineCount).toBe(a.count);
    expect(a.byInsurer.reduce((x, y) => x + y.value, 0)).toBeCloseTo(a.collectible, 0);
  });
});

describe("capital allocation & ledger", () => {
  it("allocation never exceeds capital or insurer concentration", () => {
    const plan = allocatePortfolio(INITIAL_CLAIMS, CONFIG, new Set());
    expect(plan.totalAdvance).toBeLessThanOrEqual(CONFIG.availableCapital);
    const per = new Map<string, number>(); plan.selected.forEach((x) => per.set(x.claim.insurer, (per.get(x.claim.insurer) ?? 0) + x.advance));
    per.forEach((v) => expect(v).toBeLessThanOrEqual(CONFIG.availableCapital * CONFIG.maxInsurerConcentration + 0.01));
    expect(plan.selected.every((x) => underwrite(x.claim, { minContribution: CONFIG.minContribution }).decision === "BUY CANDIDATE")).toBe(true);
  });
  it("ledger application is idempotent — a retried transaction applies exactly once", () => {
    const tx: LedgerTx = { id: "t1", idempotencyKey: "purchase-X-advance", ts: "2026-11-14T00:00:00Z", claimId: "X", type: "ADVANCE", amount: -100, memo: "test", realized: false };
    const once = applyTx([], tx); const twice = applyTx(once.ledger, tx);
    expect(once.applied).toBe(true); expect(twice.applied).toBe(false); expect(twice.ledger).toHaveLength(1);
  });
  it("actual contribution uses realized, not expected, value (CASE-6077)", () => {
    expect(actualContribution({ claimId: "CASE-6077", advance: 480, expectedCollection: 544, expectedContribution: 16, ts: "", idempotencyKey: "k", status: "SETTLED", realizedCollection: 350 }, 48)).toBe(-178);
  });
});

describe("mock insurer (independent of agent)", () => {
  it("approves CASE-1042 only with required evidence submitted", () => {
    expect(evaluateSubmission(claim("CASE-1042"), ["E-1042-A"], 1).outcome).toBe("APPROVED");
    expect(evaluateSubmission(claim("CASE-1042"), [], 1).outcome).toBe("EVIDENCE_REQUESTED"); // eloquence without evidence cannot succeed
  });
  it("CASE-6077 pays exactly $350 partial", () => { const r = evaluateSubmission(claim("CASE-6077"), ["E-6077-A"], 1); expect(r.outcome).toBe("PARTIAL_PAYMENT"); expect(r.amount).toBe(350); });
  it("CASE-2088 is procedurally invalid", () => { expect(evaluateSubmission(claim("CASE-2088"), ["E-2088-A"], 1).outcome).toBe("PROCEDURALLY_INVALID"); });
});

describe("bounded recovery agent", () => {
  it("CASE-1042 recovers $500 in simulation within budget/action limits", () => {
    const run = runToCompletion(claim("CASE-1042"));
    expect(run.status).toBe("RECOVERED"); expect(run.realized).toBe(500); expect(run.events.length).toBeLessThanOrEqual(run.maxActions); expect(run.spent).toBeLessThanOrEqual(run.budget); expect(run.events.some((e) => e.tool === "DRAFT_RESPONSE" && e.evidenceRef === "E-1042-A")).toBe(true);
  });
  it("CASE-3021 requests evidence and never submits or fabricates it", () => {
    const run = runToCompletion(claim("CASE-3021"));
    expect(run.status).toBe("NEEDS_EVIDENCE"); expect(run.submissions).toBe(0); expect(run.events.some((e) => e.tool === "REQUEST_EVIDENCE")).toBe(true);
  });
  it("CASE-5060 escalates contradictory evidence to a human", () => {
    const run = runToCompletion(claim("CASE-5060"));
    expect(run.status).toBe("NEEDS_HUMAN"); expect(run.submissions).toBe(0);
  });
  it("CASE-2088 stops procedurally without submitting", () => {
    const run = runToCompletion(claim("CASE-2088"));
    expect(run.status).toBe("TERMINATED"); expect(run.submissions).toBe(0);
  });
  it("CASE-4109 detects lack of progress and terminates/escalates within submission limit", () => {
    const run = runToCompletion(claim("CASE-4109"));
    expect(["TERMINATED", "ESCALATED"]).toContain(run.status); expect(run.submissions).toBeLessThanOrEqual(2); expect(run.events.length).toBeLessThanOrEqual(run.maxActions);
  });
  it("CASE-6077 ends in partial recovery of $350", () => {
    const run = runToCompletion(claim("CASE-6077"));
    expect(run.status).toBe("PARTIAL_RECOVERY"); expect(run.realized).toBe(350);
  });
  it("step-by-step execution is bounded and terminal states are sticky", () => {
    let run = createRun(claim("CASE-1042")); const c = claim("CASE-1042");
    for (let i = 0; i < 30 && run.status === "RUNNING"; i++) run = stepAgent(run, c);
    expect(run.status).toBe("RECOVERED"); expect(stepAgent(run, c)).toBe(run);
  });
});
