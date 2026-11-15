import { underwrite } from "./finance";
import type { CapitalConfig, Claim } from "./types";

export interface AiPick { id?: string; claimId?: string; pay?: number; why?: string; }
export interface CheckedPick { claimId: string; advance: number; expectedCollection: number; expectedContribution: number; why: string; trimmed: boolean; }

/**
 * The AI proposes. This decides what may actually happen.
 * A pick only survives if the claim passes every buying check at that price,
 * the money is there, and one insurer would not hold too big a share.
 */
export function validatePicks(picks: AiPick[], claims: Claim[], config: CapitalConfig, purchasedIds: Set<string>, alreadyWithInsurer: Record<string, number> = {}, alreadySpent = 0): { accepted: CheckedPick[]; rejected: { claimId: string; reason: string }[] } {
  const accepted: CheckedPick[] = [];
  const rejected: { claimId: string; reason: string }[] = [];
  const withInsurer = { ...alreadyWithInsurer };
  let spent = alreadySpent;
  for (const pick of picks.slice(0, 30)) {
    const id = String(pick.id ?? pick.claimId ?? "");
    const claim = claims.find((c) => c.id === id);
    if (!claim) { rejected.push({ claimId: id || "unknown", reason: "The AI named a claim that does not exist." }); continue; }
    if (purchasedIds.has(id) || accepted.some((a) => a.claimId === id)) { rejected.push({ claimId: id, reason: "Already bought, so it cannot be bought twice." }); continue; }
    const uw = underwrite(claim, { minContribution: config.minContribution });
    if (uw.decision !== "BUY CANDIDATE") { rejected.push({ claimId: id, reason: "It does not pass the buying checks, so the AI pick was thrown out." }); continue; }
    let advance = Math.round(Number(pick.pay) || uw.advance);
    let trimmed = false;
    if (advance > uw.maxPrice) { advance = Math.max(0, Math.floor(uw.maxPrice)); trimmed = true; }
    if (advance <= 0) { rejected.push({ claimId: id, reason: "The price made no sense, so the AI pick was thrown out." }); continue; }
    if (spent + advance > config.availableCapital) { rejected.push({ claimId: id, reason: "Not enough money left for this one." }); continue; }
    if ((withInsurer[claim.insurer] ?? 0) + advance > config.availableCapital * config.maxInsurerConcentration) { rejected.push({ claimId: id, reason: `Too much money would sit with ${claim.insurer}.` }); continue; }
    const atPrice = underwrite(claim, { minContribution: config.minContribution, advance });
    accepted.push({ claimId: id, advance, expectedCollection: atPrice.expectedCollection, expectedContribution: atPrice.expectedContribution, why: String(pick.why ?? "").slice(0, 220), trimmed });
    spent += advance;
    withInsurer[claim.insurer] = (withInsurer[claim.insurer] ?? 0) + advance;
  }
  return { accepted, rejected };
}

/** Facts the AI letter is allowed to use. Anything outside this list must be rejected. */
export function letterFacts(claim: Claim) {
  return {
    claimId: claim.id,
    clinic: claim.clinic,
    insurer: claim.insurer,
    serviceDate: claim.serviceDate,
    denialReason: claim.denialReason,
    papers: claim.evidence.filter((e) => e.status === "AVAILABLE").map((e) => `${e.type} (${e.id})`),
    insurerMayOwe: claim.collectible,
    agreedPrice: claim.allowed,
    patientOwes: claim.patientResponsibility,
  };
}

export function plainLetter(claim: Claim): string {
  const f = letterFacts(claim);
  return `Dear ${f.insurer}, please take another look at claim ${f.claimId} for care on ${f.serviceDate}. You turned it down because: ${f.denialReason}. The papers that support this claim are: ${f.papers.join(", ")}. We are asking for $${f.insurerMayOwe.toLocaleString()}. That is the price you agreed to, $${f.agreedPrice.toLocaleString()}, minus the $${f.patientOwes.toLocaleString()} the patient owes. Thank you.`;
}

/**
 * Guardrail for AI written letters: the text must name the claim, and every dollar
 * figure in it must be one of the real figures for that claim. Anything else is thrown away.
 */
export function validateAiLetter(text: string, claim: Claim): { ok: boolean; reason: string } {
  if (!text || text.trim().length < 40) return { ok: false, reason: "The AI reply was too short to use." };
  if (text.length > 1400) return { ok: false, reason: "The AI reply was far too long, so it was thrown away." };
  if (!text.includes(claim.id)) return { ok: false, reason: "The AI reply did not name the claim, so it was thrown away." };
  const allowed = new Set([claim.collectible, claim.allowed, claim.patientResponsibility]);
  const amounts = text.match(/\$\s?[\d,]+(?:\.\d{2})?/g) ?? [];
  for (const a of amounts) {
    const value = Number(a.replace(/[$,\s]/g, ""));
    if (!allowed.has(value)) return { ok: false, reason: `The AI reply used a dollar figure that is not part of this claim (${a}), so it was thrown away.` };
  }
  return { ok: true, reason: "Checked: every dollar figure in the AI letter belongs to this claim." };
}
