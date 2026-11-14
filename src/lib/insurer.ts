import { AS_OF } from "./seed";
import type { Claim } from "./types";

/**
 * Deterministic mock-insurer engine (separate trust boundary).
 * Scenario rules in this module are NOT part of the recovery agent's context:
 * the agent may only call evaluateSubmission() and observe the response.
 * An eloquent but unsupported submission cannot succeed — only evidence + procedural validity matter.
 */
export type InsurerOutcome = "APPROVED" | "REJECTED" | "EVIDENCE_REQUESTED" | "PARTIAL_PAYMENT" | "PROCEDURALLY_INVALID" | "ESCALATION_REQUIRED";
export interface InsurerResponse { outcome: InsurerOutcome; amount: number; reason: string; fingerprint: string; requestedEvidenceId?: string; }

const PRIVATE_SCENARIO_RULES: Record<string, { kind: string; partialAmount?: number }> = {
  "CASE-4109": { kind: "REPEAT_REJECTION" },
  "CASE-6077": { kind: "PARTIAL", partialAmount: 350 },
};

export function evaluateSubmission(claim: Claim, submittedEvidenceIds: string[], attempt: number): InsurerResponse {
  if (claim.deadline < AS_OF) return { outcome: "PROCEDURALLY_INVALID", amount: 0, reason: "Submission is outside the contractual procedural window.", fingerprint: "PROC-EXPIRED" };
  if (claim.evidence.some((e) => e.status === "CONTRADICTORY")) return { outcome: "ESCALATION_REQUIRED", amount: 0, reason: "Records conflict. Human reconciliation of source documents is required before adjudication.", fingerprint: "CONFLICT-01" };

  const required = claim.evidence.find((e) => e.id === claim.requiredEvidenceId);
  if (!required || required.status !== "AVAILABLE" || !submittedEvidenceIds.includes(required.id)) {
    return { outcome: "EVIDENCE_REQUESTED", amount: 0, reason: `Required evidence ${claim.requiredEvidenceId} was not received in adjudicable form.`, fingerprint: `EVREQ-${claim.requiredEvidenceId}`, requestedEvidenceId: claim.requiredEvidenceId };
  }
  if (claim.authorizationStatus === "REQUIRED") return { outcome: "ESCALATION_REQUIRED", amount: 0, reason: "Prior authorization must be validated by a human specialist.", fingerprint: "AUTH-ESC" };

  const rule = PRIVATE_SCENARIO_RULES[claim.id];
  if (rule?.kind === "REPEAT_REJECTION") return { outcome: "REJECTED", amount: 0, reason: "Medical necessity not established on the submitted record. Determination unchanged.", fingerprint: "INS-4109-R1" };
  if (rule?.kind === "PARTIAL") return { outcome: "PARTIAL_PAYMENT", amount: rule.partialAmount ?? 0, reason: `Partial payment issued; balance denied under bundling edit (attempt ${attempt}).`, fingerprint: "PARTIAL-6077" };

  if (claim.denialCategory === "Duplicate Claim") return { outcome: "REJECTED", amount: 0, reason: "Original claim already adjudicated; corrected-claim indicator absent.", fingerprint: "DUP-01" };
  return { outcome: "APPROVED", amount: claim.collectible, reason: "Submitted evidence satisfies the denial basis and the procedural window is valid.", fingerprint: `APPR-${claim.id}` };
}
