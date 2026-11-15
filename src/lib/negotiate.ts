import { evaluateSubmission, type InsurerResponse } from "./insurer";
import { AS_OF } from "./seed";
import type { Claim } from "./types";

export type NegStage = "QUEUED" | "CHECKING" | "FILING" | "TALKING" | "WAITING_PAPER" | "NEEDS_YOU" | "PAID_FULL" | "PAID_PART" | "STOPPED";
export interface NegState { claimId: string; stage: NegStage; rounds: number; realized: number; spent: number; updatedAt: string; }
export interface NegReply { outcome: string; amount: number; reason: string; fingerprint: string; final: boolean; }

export const STAGE_WORDS: Record<NegStage, string> = {
  QUEUED: "Waiting in line",
  CHECKING: "Checking papers",
  FILING: "Filing with insurer",
  TALKING: "Talking with insurer",
  WAITING_PAPER: "Waiting for a paper",
  NEEDS_YOU: "Needs you",
  PAID_FULL: "Paid in full",
  PAID_PART: "Paid in part",
  STOPPED: "Stopped",
};

const hashId = (id: string) => { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0; return Math.abs(h); };

/** Insurer side of the debate. Round aware: holding firm, giving ground, and final offers all live here. */
export function insurerRound(claim: Claim, round: number): NegReply {
  const base: InsurerResponse = evaluateSubmission(claim, claim.evidence.filter((e) => e.status === "AVAILABLE").map((e) => e.id), round);
  if (base.outcome === "PROCEDURALLY_INVALID" || base.outcome === "ESCALATION_REQUIRED" || base.outcome === "EVIDENCE_REQUESTED") {
    return { outcome: base.outcome, amount: 0, reason: base.reason, fingerprint: base.fingerprint, final: true };
  }
  if (base.outcome === "PARTIAL_PAYMENT") return { outcome: "OFFER", amount: base.amount, reason: base.reason, fingerprint: base.fingerprint, final: true };
  if (base.outcome === "REJECTED") return { outcome: "REJECTED", amount: 0, reason: base.reason, fingerprint: base.fingerprint, final: false };
  // APPROVED path becomes a debate for most claims: some pay at once, some haggle.
  const kind = hashId(claim.id) % 10;
  if (claim.id.startsWith("CASE-") || kind < 5) return { outcome: "APPROVED", amount: claim.collectible, reason: base.reason, fingerprint: base.fingerprint, final: true };
  if (kind < 8) {
    if (round === 1) { const offer = Math.round(claim.collectible * 0.45); return { outcome: "OFFER", amount: offer, reason: `We can offer $${offer.toLocaleString()} to close this now. The rest is not covered as billed.`, fingerprint: `CTR-${claim.id}-1`, final: false }; }
    const offer = Math.round(claim.collectible * 0.75); return { outcome: "OFFER", amount: offer, reason: `After looking again, we can go to $${offer.toLocaleString()}. That is our final offer.`, fingerprint: `CTR-${claim.id}-2`, final: true };
  }
  if (round === 1) return { outcome: "OFFER", amount: Math.round(claim.collectible * 0.6), reason: "We can pay most of this. The rest stays denied.", fingerprint: `CTR-${claim.id}-1`, final: true };
  return { outcome: "APPROVED", amount: claim.collectible, reason: base.reason, fingerprint: base.fingerprint, final: true };
}

export type NextMove = "ACCEPT" | "COUNTER" | "STOP" | "ESCALATE";
/** Sound default move when the AI decider is unavailable. The economics always get the last word. */
export function fallbackMove(claim: Claim, reply: NegReply, round: number, _advance: number, _spent: number): { move: NextMove; reason: string } {
  void _advance; void _spent;
  if (reply.outcome === "APPROVED") return { move: "ACCEPT", reason: "Full amount offered." };
  if (reply.outcome === "OFFER") {
    if (reply.final) return reply.amount > 0 ? { move: "ACCEPT", reason: "Final offer. The money paid to the clinic is gone either way, so real money back beats walking away with nothing." } : { move: "STOP", reason: "Final offer is nothing at all." };
    return { move: "COUNTER", reason: "First offer is low and not final, so we push back with the papers." };
  }
  if (round >= 2) return { move: "STOP", reason: "Same answer twice. Nothing is changing, so we stop." };
  if (claim.deadline < AS_OF) return { move: "STOP", reason: "The deadline has passed." };
  return { move: "COUNTER", reason: "They said no, but we have the main paper, so we argue the point once more." };
}
