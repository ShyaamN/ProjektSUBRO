export type EvidenceStatus = "AVAILABLE" | "MISSING" | "CONTRADICTORY";
export interface EvidenceItem {
  id: string;
  type: string;
  status: EvidenceStatus;
  provenance: string;
  date: string;
  note?: string;
}
export type AuthorizationStatus = "AUTHORIZED" | "PENDING" | "REQUIRED" | "NOT_REQUIRED";
export type DenialCategory =
  | "Medical Necessity" | "Prior Authorization" | "Coding / Documentation" | "Eligibility"
  | "Timely Filing" | "Coordination of Benefits" | "Duplicate Claim" | "Bundling / Edits";

export interface Claim {
  id: string;
  clinic: string;
  insurer: string;
  serviceDate: string;
  submissionDate: string;
  denialDate: string;
  deadline: string;
  denialCategory: DenialCategory;
  denialReason: string;
  billed: number;
  allowed: number;
  patientResponsibility: number;
  /** Allowed minus patient responsibility. Never billed charges. */
  collectible: number;
  recoveryProbability: number; // modeled assumption, not empirical
  estimatedCost: number;
  estimatedDurationDays: number;
  evidence: EvidenceItem[];
  requiredEvidenceId: string;
  authorizationStatus: AuthorizationStatus;
  scenario?: string;
}

export type Decision = "BUY CANDIDATE" | "NEEDS REVIEW" | "DECLINE";
export interface Underwriting {
  expectedCollection: number;
  advance: number;
  riskReserve: number;
  maxPrice: number;
  expectedContribution: number;
  decision: Decision;
  reasons: string[];
  checks: { label: string; pass: boolean; detail: string }[];
}

export interface CapitalConfig {
  availableCapital: number;
  minContribution: number;
  maxInsurerConcentration: number; // 0..1 of capital
  riskTolerance: "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE";
  eligibleCategories: DenialCategory[] | "ALL";
}

export type TxType = "ADVANCE" | "RESERVE" | "RECOVERY_EXPENSE" | "REALIZED_COLLECTION" | "LOSS_WRITE_OFF" | "CAPITAL_RELEASE";
export interface LedgerTx {
  id: string;
  idempotencyKey: string;
  ts: string;
  claimId: string;
  type: TxType;
  amount: number; // signed effect on available capital
  memo: string;
  realized: boolean;
}
export interface Purchase {
  claimId: string;
  advance: number;
  expectedCollection: number;
  expectedContribution: number;
  ts: string;
  idempotencyKey: string;
  status: "ACTIVE" | "SETTLED" | "TERMINATED" | "ESCALATED";
  realizedCollection: number;
}
export interface AuditEvent { id: string; ts: string; actor: string; action: string; detail: string; }
