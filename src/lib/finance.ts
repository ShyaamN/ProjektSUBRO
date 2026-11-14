import { AS_OF } from "./seed";
import type { Claim, Underwriting } from "./types";

export interface UnderwriteInput { probability?: number; advance?: number; cost?: number; minContribution?: number; }

/** Deterministic underwriting. No LLM output enters any figure here. */
export function underwrite(claim: Claim, input: UnderwriteInput = {}): Underwriting {
  const p = clamp(input.probability ?? claim.recoveryProbability, 0, 1);
  const cost = Math.max(0, input.cost ?? claim.estimatedCost);
  const minContribution = input.minContribution ?? 25;
  const expectedCollection = round2(claim.collectible * p);
  const advance = Math.max(0, Math.round(input.advance ?? claim.collectible * 0.6));
  const expectedContribution = round2(expectedCollection - advance - cost);
  const maxPrice = round2(expectedCollection - cost - minContribution);
  const riskReserve = round2(advance * (0.05 + (1 - p) * 0.5));

  const required = claim.evidence.find((e) => e.id === claim.requiredEvidenceId);
  const evidenceOk = required?.status === "AVAILABLE";
  const contradictory = claim.evidence.some((e) => e.status === "CONTRADICTORY");
  const expired = claim.deadline < AS_OF;
  const authOk = claim.authorizationStatus === "AUTHORIZED" || claim.authorizationStatus === "NOT_REQUIRED";
  const collectibleOk = claim.collectible === claim.allowed - claim.patientResponsibility && claim.collectible > 0;

  const checks = [
    { label: "Collectible integrity", pass: collectibleOk, detail: collectibleOk ? `Allowed ${fmt(claim.allowed)} − patient ${fmt(claim.patientResponsibility)} = collectible ${fmt(claim.collectible)} (billed charges excluded)` : "Collectible does not reconcile to allowed − patient responsibility" },
    { label: "Required evidence", pass: evidenceOk && !contradictory, detail: contradictory ? "Evidence contains contradictory records — specialist review required" : evidenceOk ? `${required?.id} available · ${required?.provenance}` : `${claim.requiredEvidenceId} is ${required?.status ?? "absent"} — cannot price as a buy` },
    { label: "Authorization", pass: authOk, detail: `Authorization status: ${claim.authorizationStatus}` },
    { label: "Procedural window", pass: !expired, detail: expired ? `Deadline ${claim.deadline} has passed (as of ${AS_OF})` : `Open until ${claim.deadline}` },
    { label: "Economics", pass: expectedContribution >= minContribution, detail: `Expected collection ${fmt(expectedCollection)} − advance ${fmt(advance)} − expenses ${fmt(cost)} = contribution ${fmt(expectedContribution)} (minimum ${fmt(minContribution)}; max price ${fmt(maxPrice)})` },
  ];

  const reasons: string[] = [];
  let decision: Underwriting["decision"];
  if (expired) { decision = "DECLINE"; reasons.push("Procedural window expired — apparent collectible value is not recoverable through this channel."); }
  else if (expectedContribution < 0) { decision = "DECLINE"; reasons.push(`Negative expected contribution (${fmt(expectedContribution)}). Offer must be repriced to at most ${fmt(Math.max(0, maxPrice))} or declined.`); }
  else if (!evidenceOk || contradictory || !authOk) {
    decision = "NEEDS REVIEW";
    if (contradictory) reasons.push("Contradictory evidence must be reconciled by a human — the system will not select the more favorable record.");
    if (!evidenceOk) reasons.push(`Required evidence ${claim.requiredEvidenceId} is not available.`);
    if (!authOk) reasons.push(`Authorization is ${claim.authorizationStatus.toLowerCase()} — specialist authorization required before financing.`);
  } else if (expectedContribution < minContribution) { decision = "NEEDS REVIEW"; reasons.push(`Positive but below minimum contribution (${fmt(expectedContribution)} < ${fmt(minContribution)}). Reprice or obtain review approval.`); }
  else { decision = "BUY CANDIDATE"; reasons.push("Evidence, authorization, procedural window, and economics all pass deterministic checks."); }
  if (!collectibleOk) { decision = "DECLINE"; reasons.push("Collectible amount fails reconciliation."); }

  return { expectedCollection, advance, riskReserve, maxPrice, expectedContribution, decision, reasons, checks };
}

export function portfolioAnalytics(claims: Claim[], minContribution = 25) {
  const uws = claims.map((c) => underwrite(c, { minContribution }));
  const sum = (f: (c: Claim, i: number) => number) => round2(claims.reduce((a, c, i) => a + f(c, i), 0));
  const by = (key: (c: Claim) => string, value: (c: Claim, i: number) => number) => {
    const m = new Map<string, number>();
    claims.forEach((c, i) => m.set(key(c), round2((m.get(key(c)) ?? 0) + value(c, i))));
    return [...m.entries()].map(([name, v]) => ({ name, value: v })).sort((a, b) => b.value - a.value);
  };
  return {
    count: claims.length,
    billed: sum((c) => c.billed),
    collectible: sum((c) => c.collectible),
    expectedCollection: sum((_, i) => uws[i].expectedCollection),
    proposedAdvance: sum((_, i) => (uws[i].decision === "BUY CANDIDATE" ? uws[i].advance : 0)),
    expectedContribution: sum((_, i) => uws[i].expectedContribution),
    buyCount: uws.filter((u) => u.decision === "BUY CANDIDATE").length,
    reviewCount: uws.filter((u) => u.decision === "NEEDS REVIEW").length,
    declineCount: uws.filter((u) => u.decision === "DECLINE").length,
    byInsurer: by((c) => c.insurer, (c) => c.collectible),
    byCategory: by((c) => c.denialCategory, (c) => c.collectible),
    risk: [
      { name: "p ≥ 70%", value: claims.filter((c) => c.recoveryProbability >= 0.7).length },
      { name: "p 50–69%", value: claims.filter((c) => c.recoveryProbability >= 0.5 && c.recoveryProbability < 0.7).length },
      { name: "p 35–49%", value: claims.filter((c) => c.recoveryProbability >= 0.35 && c.recoveryProbability < 0.5).length },
      { name: "p < 35%", value: claims.filter((c) => c.recoveryProbability < 0.35).length },
    ],
  };
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const fmt = (n: number) => `$${n.toLocaleString("en-US")}`;
