import type { Claim, RiskEstimate } from './types.ts';
import { RISK_CAVEAT, RISK_SOURCE, RISK_VERSION, SYNTHETIC_HISTORY, type DenialClass, type EvidenceState, type HistoricalOutcome } from './risk-history.ts';

export const MIN_COHORT_SIZE = 30;
type Conditions = Pick<HistoricalOutcome, 'insurer' | 'denialClass' | 'evidenceState' | 'authorized' | 'inWindow'>;
export function riskConditions(c: Claim): Conditions {
  const denialClass: DenialClass = c.scenario === 'administrative' ? 'ADMINISTRATIVE' : c.scenario === 'partial' ? 'PARTIAL' : c.scenario === 'negative' ? 'CONTESTED' : 'DOCUMENTATION';
  const complete = c.requiredEvidence.length > 0 && c.requiredEvidence.every(id => c.evidence.some(e => e.id === id && e.claimId === c.id && e.verified));
  const evidenceState: EvidenceState = c.contradiction ? 'CONFLICT' : c.specialist ? 'SPECIALIST' : complete ? 'COMPLETE' : 'MISSING';
  return { insurer: c.insurer, denialClass, evidenceState, authorized: c.transferAuthorized && c.appealAuthorized && c.collectionAuthorized, inWindow: !c.expired && c.deadline >= '2026-10-24' };
}
function key(c: Conditions) { return `${c.insurer}|${c.denialClass}|${c.evidenceState}|${c.authorized ? 'authorized' : 'unauthorized'}|${c.inWindow ? 'current' : 'expired'}`; }
function matches(row: HistoricalOutcome, c: Conditions) { return row.split === 'train' && row.insurer === c.insurer && row.denialClass === c.denialClass && row.evidenceState === c.evidenceState && row.authorized === c.authorized && row.inWindow === c.inWindow; }
/** Wilson score interval around an observed binomial frequency, not a warranty. */
export function wilson95(successes: number, count: number): [number, number] {
  if (!Number.isInteger(count) || count <= 0 || !Number.isInteger(successes) || successes < 0 || successes > count) throw new Error('Invalid observed outcome counts');
  const z = 1.959963984540054, z2 = z * z, p = successes / count, denominator = 1 + z2 / count;
  const center = (p + z2 / (2 * count)) / denominator;
  const half = z * Math.sqrt(p * (1 - p) / count + z2 / (4 * count * count)) / denominator;
  return [successes === 0 ? 0 : Math.max(0, center - half), successes === count ? 1 : Math.min(1, center + half)];
}
function fromConditions(c: Conditions, history: readonly HistoricalOutcome[]): RiskEstimate {
  const cohort = history.filter(row => matches(row, c));
  const sampleSize = cohort.length, successes = cohort.reduce((sum, row) => sum + row.outcome, 0);
  const supported = sampleSize >= MIN_COHORT_SIZE;
  const interval = supported ? wilson95(successes, sampleSize) : [null, null];
  return { status: supported ? 'SUPPORTED' : 'INSUFFICIENT_DATA', probability: supported ? successes / sampleSize : null, lower95: interval[0], upper95: interval[1], sampleSize, successes, cohortKey: key(c), matchingDescription: `${c.insurer}; ${c.denialClass.toLowerCase()} denial; ${c.evidenceState.toLowerCase()} evidence; ${c.authorized ? 'all mock rights present' : 'mock rights incomplete'}; ${c.inWindow ? 'within deadline' : 'expired deadline'}. Outcome means the supported conditional insurer payment was recovered in the synthetic history.`, source: RISK_SOURCE, version: RISK_VERSION, caveat: RISK_CAVEAT };
}
export function estimateRisk(c: Claim, history: readonly HistoricalOutcome[] = SYNTHETIC_HISTORY): RiskEstimate { return fromConditions(riskConditions(c), history); }
/** A human-review hold survives refreshed estimates and transient model responses.
 * Capture legacy reviews before invalidating them. Only an explicit case/session
 * reset constructs a fresh claim without this persisted hold.
 */
export function captureHumanRiskHold(c: Claim) {
  if(c.riskReview?.requiresHuman&&!c.humanRiskHold)c.humanRiskHold={reason:'Qualitative risk review requires human resolution. Explicitly reset the synthetic case to restart.',source:c.riskReview.source,createdAt:c.riskReview.reviewedAt||new Date().toISOString()};
}
/** Refresh provenance after an explicit evidence/condition change; never reprice a purchase. */
export function refreshRisk(c: Claim, preserveManual = true) {
  captureHumanRiskHold(c);
  const previousKey=c.risk?.cohortKey;
  if(!c.risk && c.purchasePrice!==null && preserveManual)c.riskMode='legacy';
  c.risk = estimateRisk(c);
  if (!preserveManual || !['manual','legacy'].includes(c.riskMode??'')) { c.probability = c.risk.probability ?? 0; c.riskMode = 'historical'; }
  if(previousKey!==c.risk.cohortKey)c.riskReview = undefined;
  return c.risk;
}
export function riskValidation(history: readonly HistoricalOutcome[] = SYNTHETIC_HISTORY) {
  const holdout = history.filter(row => row.split === 'holdout');
  const scored = holdout.map(row => ({ outcome: row.outcome, probability: fromConditions(row, history).probability })).filter((r): r is { outcome: 0 | 1; probability: number } => r.probability !== null);
  const calibrationBins = Array.from({ length: 5 }, (_, i) => {
    const lower = i / 5, upper = (i + 1) / 5;
    const bin = scored.filter(r => r.probability >= lower && (i === 4 ? r.probability <= upper : r.probability < upper));
    return { lower, upper, count: bin.length, predicted: bin.length ? bin.reduce((s, r) => s + r.probability, 0) / bin.length : null, observed: bin.length ? bin.reduce((s, r) => s + r.outcome, 0) / bin.length : null };
  });
  return { holdoutSize: holdout.length, scoredSize: scored.length, brierScore: scored.length ? scored.reduce((sum, r) => sum + (r.probability - r.outcome) ** 2, 0) / scored.length : null, calibrationBins, source: RISK_SOURCE, version: RISK_VERSION, caveat: RISK_CAVEAT };
}
