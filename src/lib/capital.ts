import { underwrite, round2 } from "./finance";
import type { CapitalConfig, Claim, LedgerTx, Purchase } from "./types";

export interface AllocationCandidate { claim: Claim; advance: number; expectedCollection: number; expectedContribution: number; efficiency: number; }
export interface AllocationPlan { selected: AllocationCandidate[]; skipped: { claimId: string; reason: string }[]; totalAdvance: number; totalExpectedCollection: number; totalExpectedContribution: number; }

const MIN_PROB: Record<CapitalConfig["riskTolerance"], number> = { CONSERVATIVE: 0.6, BALANCED: 0.45, AGGRESSIVE: 0.3 };

/** Greedy capital-efficiency allocation under capital + insurer-concentration constraints. Deterministic ordering. */
export function allocatePortfolio(claims: Claim[], config: CapitalConfig, purchasedIds: Set<string>, reservedByInsurer: Record<string, number> = {}, alreadyReserved = 0): AllocationPlan {
  const skipped: AllocationPlan["skipped"] = [];
  const candidates: AllocationCandidate[] = [];
  for (const claim of claims) {
    if (purchasedIds.has(claim.id)) { skipped.push({ claimId: claim.id, reason: "Already financed — duplicate purchase prevented" }); continue; }
    if (config.eligibleCategories !== "ALL" && !config.eligibleCategories.includes(claim.denialCategory)) { skipped.push({ claimId: claim.id, reason: "Denial category not eligible under current capital policy" }); continue; }
    const uw = underwrite(claim, { minContribution: config.minContribution });
    if (uw.decision !== "BUY CANDIDATE") { skipped.push({ claimId: claim.id, reason: `Underwriting: ${uw.decision}` }); continue; }
    if (claim.recoveryProbability < MIN_PROB[config.riskTolerance]) { skipped.push({ claimId: claim.id, reason: `Modeled probability below ${config.riskTolerance} threshold` }); continue; }
    candidates.push({ claim, advance: uw.advance, expectedCollection: uw.expectedCollection, expectedContribution: uw.expectedContribution, efficiency: uw.advance > 0 ? uw.expectedContribution / uw.advance : 0 });
  }
  candidates.sort((a, b) => b.efficiency - a.efficiency || b.expectedContribution - a.expectedContribution || a.claim.id.localeCompare(b.claim.id));

  const selected: AllocationCandidate[] = [];
  const perInsurer = { ...reservedByInsurer };
  let deployed = alreadyReserved;
  const insurerCap = config.availableCapital * config.maxInsurerConcentration;
  for (const c of candidates) {
    if (deployed + c.advance > config.availableCapital) { skipped.push({ claimId: c.claim.id, reason: "Insufficient remaining capital" }); continue; }
    if ((perInsurer[c.claim.insurer] ?? 0) + c.advance > insurerCap) { skipped.push({ claimId: c.claim.id, reason: `Would breach insurer concentration cap (${Math.round(config.maxInsurerConcentration * 100)}% for ${c.claim.insurer})` }); continue; }
    selected.push(c); deployed += c.advance; perInsurer[c.claim.insurer] = (perInsurer[c.claim.insurer] ?? 0) + c.advance;
  }
  return {
    selected, skipped,
    totalAdvance: round2(selected.reduce((a, c) => a + c.advance, 0)),
    totalExpectedCollection: round2(selected.reduce((a, c) => a + c.expectedCollection, 0)),
    totalExpectedContribution: round2(selected.reduce((a, c) => a + c.expectedContribution, 0)),
  };
}

/** Idempotent ledger application: a retried transaction with the same key is applied exactly once. */
export function applyTx(ledger: LedgerTx[], tx: LedgerTx): { ledger: LedgerTx[]; applied: boolean } {
  if (ledger.some((t) => t.idempotencyKey === tx.idempotencyKey)) return { ledger, applied: false };
  return { ledger: [...ledger, tx], applied: true };
}

export function reconcile(capital: number, ledger: LedgerTx[], purchases: Purchase[]) {
  const cashEffect = round2(ledger.reduce((a, t) => a + t.amount, 0));
  const deployed = round2(purchases.filter((p) => p.status === "ACTIVE" || p.status === "SETTLED" || p.status === "ESCALATED").reduce((a, p) => a + p.advance, 0));
  const realized = round2(ledger.filter((t) => t.type === "REALIZED_COLLECTION").reduce((a, t) => a + t.amount, 0));
  const expenses = round2(-ledger.filter((t) => t.type === "RECOVERY_EXPENSE").reduce((a, t) => a + t.amount, 0));
  return { available: round2(capital + cashEffect), deployed, realized, expenses, remainingCapacity: round2(capital - deployed), txCount: ledger.length };
}

/** Actual (realized) contribution for a settled purchase: realized collection − advance − expenses. Distinct from expected value. */
export function actualContribution(purchase: Purchase, expensesForClaim: number) {
  return round2(purchase.realizedCollection - purchase.advance - expensesForClaim);
}
