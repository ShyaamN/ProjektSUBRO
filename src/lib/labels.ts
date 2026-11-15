export const decisionLabel = (d: string) =>
  d === "BUY CANDIDATE" ? "Worth buying" : d === "NEEDS REVIEW" ? "Needs a closer look" : "Skip it";

export const decisionTone = (d: string) =>
  (d === "BUY CANDIDATE" ? "green" : d === "NEEDS REVIEW" ? "amber" : "red") as "green" | "amber" | "red";

export const purchaseLabel = (s: string) =>
  ({ ACTIVE: "Ready to chase", SETTLED: "Finished", TERMINATED: "Stopped", ESCALATED: "Needs a person" } as Record<string, string>)[s] ?? s;

export const agentStatusLabel = (s: string) =>
  ({ RUNNING: "In progress", RECOVERED: "Insurer paid in full", PARTIAL_RECOVERY: "Insurer paid part", NEEDS_EVIDENCE: "Waiting for a paper", NEEDS_HUMAN: "Needs a person", ESCALATED: "Needs a person", TERMINATED: "Stopped" } as Record<string, string>)[s] ?? s;

export const txLabel = (t: string) =>
  ({ ADVANCE: "Paid the clinic", RESERVE: "Safety cushion set aside", RECOVERY_EXPENSE: "Cost of chasing", REALIZED_COLLECTION: "Insurer paid us", LOSS_WRITE_OFF: "Written off as a loss", CAPITAL_RELEASE: "Money freed up" } as Record<string, string>)[t] ?? t;

export const toolLabel = (t: string) =>
  ({ READ_CLAIM: "Looked at the claim", READ_EVIDENCE: "Checked the papers", CHECK_REQUIREMENTS: "Checked the rules", REQUEST_EVIDENCE: "Asked for a missing paper", DRAFT_RESPONSE: "Wrote a letter to the insurer", SUBMIT_TO_MOCK_INSURER: "Sent the letter and got a reply", RECHECK_ECONOMICS: "Checked the numbers again", ESCALATE: "Handed to a person", STOP: "Stopped" } as Record<string, string>)[t] ?? t;

export const evidenceLabel = (s: string) =>
  ({ AVAILABLE: "Got it", MISSING: "Missing", CONTRADICTORY: "Papers disagree" } as Record<string, string>)[s] ?? s;

export const authLabel = (s: string) =>
  ({ AUTHORIZED: "Approval given", PENDING: "Waiting for approval", REQUIRED: "Approval still needed", NOT_REQUIRED: "No approval needed" } as Record<string, string>)[s] ?? s;

export const validationLabel = (v: string) =>
  ({ PASS: "Done", BLOCKED: "Needs attention", INFO: "Note" } as Record<string, string>)[v] ?? v;

export const categoryLabel = (c: string) =>
  ({ "Medical Necessity": "Insurer says the care was not needed", "Prior Authorization": "No approval was given first", "Coding / Documentation": "The bill and the notes do not match", Eligibility: "Patient cover is in doubt", "Timely Filing": "Claim may have arrived too late", "Coordination of Benefits": "Another insurer may need to pay first", "Duplicate Claim": "Claim may have been sent twice", "Bundling / Edits": "Charge may already be included in another charge" } as Record<string, string>)[c] ?? c;

export const auditLabel = (a: string) => {
  if (a.startsWith("AGENT_")) return "Chase update";
  return ({ SANDBOX_INITIALIZED: "Demo ready", DEMO_STARTED: "Demo ready", OFFER_ACCEPTED: "Claim bought", CAPITAL_CONFIG_UPDATED: "Your rules changed" } as Record<string, string>)[a] ?? a;
};
