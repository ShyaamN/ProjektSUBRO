import { underwrite } from "./finance";
import { evaluateSubmission } from "./insurer";
import { AS_OF } from "./seed";
import type { Claim } from "./types";

export type AgentTool = "READ_CLAIM" | "READ_EVIDENCE" | "CHECK_REQUIREMENTS" | "REQUEST_EVIDENCE" | "DRAFT_RESPONSE" | "SUBMIT_TO_MOCK_INSURER" | "RECHECK_ECONOMICS" | "ESCALATE" | "STOP";
export type AgentStatus = "RUNNING" | "RECOVERED" | "PARTIAL_RECOVERY" | "NEEDS_EVIDENCE" | "NEEDS_HUMAN" | "ESCALATED" | "TERMINATED";
export interface AgentEvent { ts: string; tool: AgentTool; detail: string; validation: "PASS" | "BLOCKED" | "INFO"; cost: number; evidenceRef?: string; }
export interface AgentRun {
  claimId: string; status: AgentStatus; phase: string; events: AgentEvent[];
  spent: number; budget: number; submissions: number; maxActions: number;
  realized: number; draft?: string; draftHash?: string; insurerFingerprints: string[]; rejectionCount: number; terminalReason?: string;
}

export const MAX_ACTIONS = 12;
export const MAX_SUBMISSIONS = 2;
const COSTS: Record<AgentTool, number> = { READ_CLAIM: 2, READ_EVIDENCE: 3, CHECK_REQUIREMENTS: 3, REQUEST_EVIDENCE: 4, DRAFT_RESPONSE: 8, SUBMIT_TO_MOCK_INSURER: 10, RECHECK_ECONOMICS: 4, ESCALATE: 2, STOP: 1 };

export function createRun(claim: Claim): AgentRun {
  return { claimId: claim.id, status: "RUNNING", phase: "INVESTIGATE", events: [], spent: 0, budget: Math.max(90, claim.estimatedCost + 70), submissions: 0, maxActions: MAX_ACTIONS, realized: 0, insurerFingerprints: [], rejectionCount: 0 };
}
const now = () => new Date().toISOString();
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return `D-${Math.abs(h)}`; };

function push(run: AgentRun, tool: AgentTool, detail: string, validation: AgentEvent["validation"], evidenceRef?: string): AgentRun {
  const cost = COSTS[tool];
  return { ...run, spent: Math.round((run.spent + cost) * 100) / 100, events: [...run.events, { ts: now(), tool, detail, validation, cost, evidenceRef }] };
}
function terminate(run: AgentRun, status: AgentStatus, tool: AgentTool, reason: string): AgentRun {
  const r = push(run, tool, reason, status === "RECOVERED" || status === "PARTIAL_RECOVERY" ? "PASS" : "BLOCKED");
  return { ...r, status, phase: "DONE", terminalReason: reason };
}

/** One bounded, server-validatable step. The agent has no database, credential, or external-messaging access. */
export function stepAgent(prev: AgentRun, claim: Claim): AgentRun {
  if (prev.status !== "RUNNING") return prev;
  if (prev.events.length >= prev.maxActions) return terminate(prev, "TERMINATED", "STOP", `Maximum action count (${prev.maxActions}) reached — loop guard stopped the run.`);
  const nextCost = COSTS[(phaseTool(prev.phase))];
  if (prev.spent + nextCost > prev.budget) return terminate(prev, "TERMINATED", "STOP", `Operational budget exhausted ($${prev.spent.toFixed(0)} of $${prev.budget}). Further action is not authorized.`);

  switch (prev.phase) {
    case "INVESTIGATE": {
      const r = push(prev, "READ_CLAIM", `Claim ${claim.id} · ${claim.clinic} · insurer ${claim.insurer} · collectible $${claim.collectible.toLocaleString()} (allowed $${claim.allowed.toLocaleString()} − patient $${claim.patientResponsibility.toLocaleString()}; billed charges excluded). Denial: ${claim.denialCategory} — ${claim.denialReason}`, "PASS");
      return { ...r, phase: "EVIDENCE" };
    }
    case "EVIDENCE": {
      const contradictory = claim.evidence.find((e) => e.status === "CONTRADICTORY");
      let r = push(prev, "READ_EVIDENCE", `Inspected ${claim.evidence.length} evidence record(s): ${claim.evidence.map((e) => `${e.id} [${e.status}] ${e.type}`).join("; ")}`, contradictory ? "BLOCKED" : "PASS", claim.requiredEvidenceId);
      if (contradictory) return terminate(r, "NEEDS_HUMAN", "ESCALATE", `Contradictory evidence (${contradictory.id}: ${contradictory.note ?? "conflicting record"}). The agent will not choose the more favorable record — human reconciliation required.`);
      return { ...r, phase: "REQUIREMENTS" };
    }
    case "REQUIREMENTS": {
      const expired = claim.deadline < AS_OF;
      let r = push(prev, "CHECK_REQUIREMENTS", expired ? `Procedural window closed ${claim.deadline} (as of ${AS_OF}).` : `Procedural window open until ${claim.deadline}. Authorization: ${claim.authorizationStatus}. Required evidence: ${claim.requiredEvidenceId}.`, expired ? "BLOCKED" : "PASS");
      if (expired) return terminate(r, "TERMINATED", "STOP", "Procedural window expired. No submission will be made despite the apparent collectible value.");
      if (claim.authorizationStatus === "REQUIRED") return terminate(r, "NEEDS_HUMAN", "ESCALATE", "Specialist authorization is REQUIRED before any submission — human authorization gate.");
      const req = claim.evidence.find((e) => e.id === claim.requiredEvidenceId);
      if (!req || req.status !== "AVAILABLE") { r = push(r, "REQUEST_EVIDENCE", `Requested ${claim.requiredEvidenceId} from ${claim.clinic} via the synthetic evidence channel. The agent cannot manufacture clinical documents.`, "BLOCKED", claim.requiredEvidenceId); return { ...r, status: "NEEDS_EVIDENCE", phase: "DONE", terminalReason: `Awaiting required evidence ${claim.requiredEvidenceId}. Run paused — no draft or submission attempted.` }; }
      return { ...r, phase: "DRAFT" };
    }
    case "DRAFT": {
      const draft = `Reconsideration request — claim ${claim.id}, service ${claim.serviceDate}. Denial basis: ${claim.denialReason}. Evidence cited: ${claim.evidence.filter((e) => e.status === "AVAILABLE").map((e) => `${e.id} (${e.type}, ${e.provenance})`).join(", ")}. Requested insurer payment $${claim.collectible.toLocaleString()} = allowed $${claim.allowed.toLocaleString()} − patient responsibility $${claim.patientResponsibility.toLocaleString()}. [Synthetic sandbox submission]`;
      const h = hash(draft);
      if (prev.draftHash === h) { const r = push(prev, "DRAFT_RESPONSE", "Duplicate-response detection: regenerated draft is identical to the previously rejected submission.", "BLOCKED"); return terminate(r, "ESCALATED", "ESCALATE", "No new evidence and an identical draft after insurer rejection — lack of progress. Escalated instead of resubmitting duplicates."); }
      const r = push(prev, "DRAFT_RESPONSE", `Draft generated strictly from cited evidence (${claim.requiredEvidenceId}). No unsupported facts added. Draft ${h}.`, "PASS", claim.requiredEvidenceId);
      return { ...r, draft, draftHash: h, phase: "SUBMIT" };
    }
    case "SUBMIT": {
      if (prev.submissions >= MAX_SUBMISSIONS) return terminate(prev, "TERMINATED", "STOP", `Submission limit (${MAX_SUBMISSIONS}) reached.`);
      const submitted = claim.evidence.filter((e) => e.status === "AVAILABLE").map((e) => e.id);
      const resp = evaluateSubmission(claim, submitted, prev.submissions + 1);
      let r = push(prev, "SUBMIT_TO_MOCK_INSURER", `Mock insurer: ${resp.outcome} — ${resp.reason} [${resp.fingerprint}]`, resp.outcome === "APPROVED" || resp.outcome === "PARTIAL_PAYMENT" ? "PASS" : "BLOCKED");
      r = { ...r, submissions: prev.submissions + 1, insurerFingerprints: [...prev.insurerFingerprints, resp.fingerprint] };
      if (resp.outcome === "APPROVED") return { ...r, realized: resp.amount, phase: "RECHECK" };
      if (resp.outcome === "PARTIAL_PAYMENT") return { ...r, realized: resp.amount, phase: "RECHECK" };
      if (resp.outcome === "EVIDENCE_REQUESTED") { r = push(r, "REQUEST_EVIDENCE", `Insurer requested ${resp.requestedEvidenceId}. Request routed to ${claim.clinic}; agent cannot fabricate it.`, "BLOCKED", resp.requestedEvidenceId); return { ...r, status: "NEEDS_EVIDENCE", phase: "DONE", terminalReason: `Insurer requested evidence ${resp.requestedEvidenceId}.` }; }
      if (resp.outcome === "ESCALATION_REQUIRED") return terminate(r, "ESCALATED", "ESCALATE", `Insurer requires escalation: ${resp.reason}`);
      if (resp.outcome === "PROCEDURALLY_INVALID") return terminate(r, "TERMINATED", "STOP", `Procedurally invalid: ${resp.reason}`);
      // REJECTED
      const repeats = r.insurerFingerprints.filter((f) => f === resp.fingerprint).length;
      if (repeats >= 2) return terminate(r, "TERMINATED", "STOP", "Insurer returned an unchanged substantive response twice — no progress. Terminating rather than looping.");
      return { ...r, rejectionCount: prev.rejectionCount + 1, phase: "RECHECK" };
    }
    case "RECHECK": {
      const uw = underwrite(claim, {});
      const actualSoFar = Math.round((prev.realized - uw.advance - prev.spent - COSTS.RECHECK_ECONOMICS) * 100) / 100;
      let r = push(prev, "RECHECK_ECONOMICS", prev.realized > 0 ? `Realized (simulated) $${prev.realized.toLocaleString()} · advance $${uw.advance.toLocaleString()} · operating spend $${(prev.spent + COSTS.RECHECK_ECONOMICS).toFixed(0)} · modeled expected contribution was $${uw.expectedContribution.toLocaleString()}.` : `Reassessed economics after rejection: expected contribution $${uw.expectedContribution.toLocaleString()}, spent $${(prev.spent + COSTS.RECHECK_ECONOMICS).toFixed(0)}.`, "PASS");
      if (prev.realized > 0) return terminate(r, prev.realized >= claim.collectible ? "RECOVERED" : "PARTIAL_RECOVERY", "STOP", prev.realized >= claim.collectible ? `Recovered in simulation: $${prev.realized.toLocaleString()} realized (not a real collection). Actual contribution vs advance/expenses: $${actualSoFar.toLocaleString()}.` : `Partial simulated recovery $${prev.realized.toLocaleString()} of $${claim.collectible.toLocaleString()} collectible. Ledger records realized, not expected, value.`);
      if (uw.expectedContribution < 0) return terminate(r, "TERMINATED", "STOP", "Negative expected value after reassessment — stopping is the correct outcome.");
      return { ...r, phase: "DRAFT" };
    }
    default: return terminate(prev, "TERMINATED", "STOP", `Unknown phase ${prev.phase}.`);
  }
}
function phaseTool(phase: string): AgentTool {
  return ({ INVESTIGATE: "READ_CLAIM", EVIDENCE: "READ_EVIDENCE", REQUIREMENTS: "CHECK_REQUIREMENTS", DRAFT: "DRAFT_RESPONSE", SUBMIT: "SUBMIT_TO_MOCK_INSURER", RECHECK: "RECHECK_ECONOMICS" } as Record<string, AgentTool>)[phase] ?? "STOP";
}
export function runToCompletion(claim: Claim, run = createRun(claim)): AgentRun {
  let r = run; let guard = 0;
  while (r.status === "RUNNING" && guard++ < 20) r = stepAgent(r, claim);
  return r;
}
