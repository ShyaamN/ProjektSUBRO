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
  if (prev.events.length >= prev.maxActions) return terminate(prev, "TERMINATED", "STOP", `Stopped. It reached the limit of ${prev.maxActions} steps, so it can never loop forever.`);
  const nextCost = COSTS[(phaseTool(prev.phase))];
  if (prev.spent + nextCost > prev.budget) return terminate(prev, "TERMINATED", "STOP", `Stopped. This chase has hit its spending limit of $${prev.budget}, so it will not spend another dollar.`);

  switch (prev.phase) {
    case "INVESTIGATE": {
      const r = push(prev, "READ_CLAIM", `${claim.clinic}. ${claim.insurer} may still owe $${claim.collectible.toLocaleString()}. They said no because: ${claim.denialReason}`, "PASS");
      return { ...r, phase: "EVIDENCE" };
    }
    case "EVIDENCE": {
      const contradictory = claim.evidence.find((e) => e.status === "CONTRADICTORY");
      const r = push(prev, "READ_EVIDENCE", `Looked at ${claim.evidence.length} papers: ${claim.evidence.map((e) => `${e.type} (${e.status === "AVAILABLE" ? "got it" : e.status === "MISSING" ? "missing" : "papers disagree"})`).join(", ")}.`, contradictory ? "BLOCKED" : "PASS", claim.requiredEvidenceId);
      if (contradictory) return terminate(r, "NEEDS_HUMAN", "ESCALATE", `Two papers give different information. A person needs to sort that out. The helper will not just pick the paper that helps us most.`);
      return { ...r, phase: "REQUIREMENTS" };
    }
    case "REQUIREMENTS": {
      const expired = claim.deadline < AS_OF;
      let r = push(prev, "CHECK_REQUIREMENTS", expired ? `The last day to act was ${claim.deadline}, and that day has passed.` : `There is still time. The last day to act is ${claim.deadline}, and the main paper we need is ${claim.requiredEvidenceId}.`, expired ? "BLOCKED" : "PASS");
      if (expired) return terminate(r, "TERMINATED", "STOP", "Stopped. The deadline has passed, so there is no point writing to the insurer, however big the amount looks.");
      if (claim.authorizationStatus === "REQUIRED") return terminate(r, "NEEDS_HUMAN", "ESCALATE", "A person needs to give approval before anyone writes to the insurer, so the helper hands this over now.");
      const req = claim.evidence.find((e) => e.id === claim.requiredEvidenceId);
      if (!req || req.status !== "AVAILABLE") { r = push(r, "REQUEST_EVIDENCE", `Asked ${claim.clinic} for the missing paper (${claim.requiredEvidenceId}). The helper cannot make a paper up.`, "BLOCKED", claim.requiredEvidenceId); return { ...r, status: "NEEDS_EVIDENCE", phase: "DONE", terminalReason: `Waiting for the missing paper (${claim.requiredEvidenceId}). Nothing has been sent to the insurer.` }; }
      return { ...r, phase: "DRAFT" };
    }
    case "DRAFT": {
      const draft = `Dear ${claim.insurer}, please take another look at claim ${claim.id} for care on ${claim.serviceDate}. You turned it down because: ${claim.denialReason}. The papers that support this claim are: ${claim.evidence.filter((e) => e.status === "AVAILABLE").map((e) => `${e.type} (${e.id})`).join(", ")}. We are asking for $${claim.collectible.toLocaleString()}. That is the price you agreed to, $${claim.allowed.toLocaleString()}, minus the $${claim.patientResponsibility.toLocaleString()} the patient owes. Thank you.`;
      const h = hash(draft);
      if (prev.draftHash === h) { const r = push(prev, "DRAFT_RESPONSE", "The new letter is word for word the same as the one the insurer already turned down, so it will not be sent again.", "BLOCKED"); return terminate(r, "ESCALATED", "ESCALATE", "Handed to a person. Nothing new has turned up, and sending the same letter again would get nowhere."); }
      const r = push(prev, "DRAFT_RESPONSE", `Wrote a letter using only facts from the papers we have. The main paper behind it is ${claim.requiredEvidenceId}.`, "PASS", claim.requiredEvidenceId);
      return { ...r, draft, draftHash: h, phase: "SUBMIT" };
    }
    case "SUBMIT": {
      if (prev.submissions >= MAX_SUBMISSIONS) return terminate(prev, "TERMINATED", "STOP", `Stopped. It has already written to the insurer ${MAX_SUBMISSIONS} times, and that is the limit.`);
      const submitted = claim.evidence.filter((e) => e.status === "AVAILABLE").map((e) => e.id);
      const resp = evaluateSubmission(claim, submitted, prev.submissions + 1);
      let r = push(prev, "SUBMIT_TO_MOCK_INSURER", `The insurer replied: ${resp.reason}`, resp.outcome === "APPROVED" || resp.outcome === "PARTIAL_PAYMENT" ? "PASS" : "BLOCKED");
      r = { ...r, submissions: prev.submissions + 1, insurerFingerprints: [...prev.insurerFingerprints, resp.fingerprint] };
      if (resp.outcome === "APPROVED") return { ...r, realized: resp.amount, phase: "RECHECK" };
      if (resp.outcome === "PARTIAL_PAYMENT") return { ...r, realized: resp.amount, phase: "RECHECK" };
      if (resp.outcome === "EVIDENCE_REQUESTED") { r = push(r, "REQUEST_EVIDENCE", `Asked ${claim.clinic} for the paper the insurer wants (${resp.requestedEvidenceId}). The helper cannot make it up.`, "BLOCKED", resp.requestedEvidenceId); return { ...r, status: "NEEDS_EVIDENCE", phase: "DONE", terminalReason: `Waiting for a paper the insurer asked for (${resp.requestedEvidenceId}).` }; }
      if (resp.outcome === "ESCALATION_REQUIRED") return terminate(r, "ESCALATED", "ESCALATE", `Handed to a person. ${resp.reason}`);
      if (resp.outcome === "PROCEDURALLY_INVALID") return terminate(r, "TERMINATED", "STOP", `Stopped. ${resp.reason}`);
      // REJECTED
      const repeats = r.insurerFingerprints.filter((f) => f === resp.fingerprint).length;
      if (repeats >= 2) return terminate(r, "TERMINATED", "STOP", "Stopped. The insurer has now given the exact same answer twice, so nothing is changing.");
      return { ...r, rejectionCount: prev.rejectionCount + 1, phase: "RECHECK" };
    }
    case "RECHECK": {
      const uw = underwrite(claim, {});
      const actualSoFar = Math.round((prev.realized - uw.advance - prev.spent - COSTS.RECHECK_ECONOMICS) * 100) / 100;
      const r = push(prev, "RECHECK_ECONOMICS", prev.realized > 0 ? `The insurer agreed to pay $${prev.realized.toLocaleString()}. We paid the clinic $${uw.advance.toLocaleString()} and have spent $${(prev.spent + COSTS.RECHECK_ECONOMICS).toFixed(0)} chasing it so far, which leaves the real result at $${actualSoFar.toLocaleString()}.` : `Checked the numbers again after the insurer said no. On average we still expect to gain $${uw.expectedContribution.toLocaleString()}, and we have spent $${(prev.spent + COSTS.RECHECK_ECONOMICS).toFixed(0)} so far.`, "PASS");
      if (prev.realized > 0) return terminate(r, prev.realized >= claim.collectible ? "RECOVERED" : "PARTIAL_RECOVERY", "STOP", prev.realized >= claim.collectible ? `Finished. The insurer paid the full $${prev.realized.toLocaleString()}.` : `Finished. The insurer paid $${prev.realized.toLocaleString()} of the $${claim.collectible.toLocaleString()} it may owe. The books record the $${prev.realized.toLocaleString()} that really came in.`);
      if (uw.expectedContribution < 0) return terminate(r, "TERMINATED", "STOP", "Stopped. The numbers no longer add up, so chasing this any further would likely lose money. Stopping is the right call.");
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
