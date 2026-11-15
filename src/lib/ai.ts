import type { Claim } from "./types";

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
