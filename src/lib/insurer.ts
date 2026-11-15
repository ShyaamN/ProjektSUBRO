import { AS_OF } from "./seed";
import type { Claim } from "./types";

/**
 * Deterministic mock insurer engine (separate trust boundary).
 * Scenario rules in this module are NOT part of the recovery agent's context:
 * the agent may only call evaluateSubmission() and observe the response.
 * A well written letter with no paper behind it cannot succeed here.
 */
export type InsurerOutcome = "APPROVED" | "REJECTED" | "EVIDENCE_REQUESTED" | "PARTIAL_PAYMENT" | "PROCEDURALLY_INVALID" | "ESCALATION_REQUIRED";
export interface InsurerResponse { outcome: InsurerOutcome; amount: number; reason: string; fingerprint: string; requestedEvidenceId?: string; }

const PRIVATE_SCENARIO_RULES: Record<string, { kind: string; partialAmount?: number }> = {
  "CASE-4109": { kind: "REPEAT_REJECTION" },
  "CASE-6077": { kind: "PARTIAL", partialAmount: 350 },
};

export function evaluateSubmission(claim: Claim, submittedEvidenceIds: string[], attempt: number): InsurerResponse {
  if (claim.deadline < AS_OF) return { outcome: "PROCEDURALLY_INVALID", amount: 0, reason: "The deadline for this claim has passed, so we cannot look at it again.", fingerprint: "PROC-EXPIRED" };
  if (claim.evidence.some((e) => e.status === "CONTRADICTORY")) return { outcome: "ESCALATION_REQUIRED", amount: 0, reason: "Two papers give different information. A person needs to sort that out before we can decide.", fingerprint: "CONFLICT-01" };

  const required = claim.evidence.find((e) => e.id === claim.requiredEvidenceId);
  if (!required || required.status !== "AVAILABLE" || !submittedEvidenceIds.includes(required.id)) {
    return { outcome: "EVIDENCE_REQUESTED", amount: 0, reason: `We still need one key paper (${claim.requiredEvidenceId}) before we can decide.`, fingerprint: `EVREQ-${claim.requiredEvidenceId}`, requestedEvidenceId: claim.requiredEvidenceId };
  }
  if (claim.authorizationStatus === "REQUIRED") return { outcome: "ESCALATION_REQUIRED", amount: 0, reason: "A specialist needs to check the approval on this claim first.", fingerprint: "AUTH-ESC" };

  const rule = PRIVATE_SCENARIO_RULES[claim.id];
  if (rule?.kind === "REPEAT_REJECTION") return { outcome: "REJECTED", amount: 0, reason: "Our answer is the same as before. The papers still do not show why this care was needed.", fingerprint: "INS-4109-R1" };
  if (rule?.kind === "PARTIAL") return { outcome: "PARTIAL_PAYMENT", amount: rule.partialAmount ?? 0, reason: `We will pay part of this claim. The rest sits inside another charge we already pay for, so we will not pay it twice.`, fingerprint: `PARTIAL-6077-${attempt}` };

  if (claim.denialCategory === "Duplicate Claim") return { outcome: "REJECTED", amount: 0, reason: "This claim was already decided once. It needs to be marked as a fixed claim before we look at it again.", fingerprint: "DUP-01" };
  return { outcome: "APPROVED", amount: claim.collectible, reason: "The papers answer our questions and there is still time, so we will pay.", fingerprint: `APPR-${claim.id}` };
}
