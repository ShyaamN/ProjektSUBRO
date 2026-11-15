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
    { label: "The amount adds up", pass: collectibleOk, detail: collectibleOk ? `The insurer may owe ${fmt(claim.collectible)}. That is the agreed price of ${fmt(claim.allowed)}, minus the ${fmt(claim.patientResponsibility)} the patient owes. The first bill amount of ${fmt(claim.billed)} does not count, because the insurer never agreed to it.` : "The amount the insurer may owe does not match the agreed price minus what the patient owes, so we stop here." },
    { label: "We have the paper we need", pass: evidenceOk && !contradictory, detail: contradictory ? "Two papers disagree with each other. A person needs to sort that out before we trust either one." : evidenceOk ? `We have the main paper we need, and we know where it came from.` : "The main paper we need is missing, so we cannot buy this yet with confidence." },
    { label: "We are allowed to chase it", pass: authOk, detail: claim.authorizationStatus === "AUTHORIZED" ? "Approval is in place." : claim.authorizationStatus === "NOT_REQUIRED" ? "No approval is needed for this one." : "Approval is still missing, so a person needs to look before we buy." },
    { label: "There is still time", pass: !expired, detail: expired ? `The last day to act was ${claim.deadline}, and that day has passed. In other words, the deadline expired.` : `We have until ${claim.deadline} to act, so there is still time.` },
    { label: "The numbers work", pass: expectedContribution >= minContribution, detail: `On average we expect to get back ${fmt(expectedCollection)}. Paying ${fmt(advance)} now and spending ${fmt(cost)} to chase it leaves ${expectedContribution >= 0 ? `${fmt(expectedContribution)} ahead` : `${fmt(Math.abs(expectedContribution))} behind`}. We want at least ${fmt(minContribution)} ahead, so the most we should pay is ${fmt(Math.max(0, maxPrice))}.` },
  ];

  const reasons: string[] = [];
  let decision: Underwriting["decision"];
  if (expired) { decision = "DECLINE"; reasons.push("The deadline has expired, so this money is almost certainly gone, no matter how big the amount looks."); }
  else if (expectedContribution < 0) { decision = "DECLINE"; reasons.push(`At this price we would lose money on average. We should pay no more than ${fmt(Math.max(0, maxPrice))}, or walk away.`); }
  else if (!evidenceOk || contradictory || !authOk) {
    decision = "NEEDS REVIEW";
    if (contradictory) reasons.push("Two papers disagree. We will not just pick the one that helps us most, so a person needs to sort it out.");
    if (!evidenceOk) reasons.push("The main paper we need is missing. Once it turns up, this can be looked at again.");
    if (!authOk) reasons.push("Approval is still missing, so a person needs to say yes before we buy.");
  } else if (expectedContribution < minContribution) { decision = "NEEDS REVIEW"; reasons.push(`The numbers work, but the gain is smaller than the least we accept. A lower price could still make this worth buying.`); }
  else { decision = "BUY CANDIDATE"; reasons.push("We have the papers, we are allowed to chase it, there is still time, and the numbers work."); }
  if (!collectibleOk) { decision = "DECLINE"; reasons.push("The amount the insurer may owe does not add up, so we will not touch this one."); }

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
      { name: "Chance at least 70 out of 100", value: claims.filter((c) => c.recoveryProbability >= 0.7).length },
      { name: "Chance 50 to 69 out of 100", value: claims.filter((c) => c.recoveryProbability >= 0.5 && c.recoveryProbability < 0.7).length },
      { name: "Chance 35 to 49 out of 100", value: claims.filter((c) => c.recoveryProbability >= 0.35 && c.recoveryProbability < 0.5).length },
      { name: "Chance under 35 out of 100", value: claims.filter((c) => c.recoveryProbability < 0.35).length },
    ],
  };
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const fmt = (n: number) => `$${n.toLocaleString("en-US")}`;
