/** Designed, FABRICATED outcomes. These are not insurer data or clinical labels.
 * Training/holdout counts are separate generative assumptions, with deterministic
 * shuffled ordering. Holdout outcomes are never used to estimate a training rate.
 */
export const RISK_VERSION = 'synthetic-cohorts-v2.0';
export const RISK_SOURCE = 'Reproducible synthetic historical outcomes';
export const RISK_CAVEAT = 'Entirely synthetic, fabricated training and holdout outcomes; not clinically validated, real insurer data, or evidence of commercial predictive accuracy. Cohort sizes and outcome counts are designed demo assumptions.';
export type DenialClass = 'DOCUMENTATION' | 'ADMINISTRATIVE' | 'PARTIAL' | 'CONTESTED';
export type EvidenceState = 'COMPLETE' | 'MISSING' | 'CONFLICT' | 'SPECIALIST';
export type HistoricalOutcome = Readonly<{ id: string; split: 'train' | 'holdout'; insurer: string; denialClass: DenialClass; evidenceState: EvidenceState; authorized: boolean; inWindow: boolean; outcome: 0 | 1 }>;
export const SYNTHETIC_INSURERS = ['Meridian Health', 'Northstar Assurance', 'Cobalt Care', 'Evergreen Mutual'] as const;
const rows: HistoricalOutcome[] = [];
// Independently designed holdout rates intentionally differ from training rates.
const designs: { denialClass: DenialClass; train: number[]; holdout: number[] }[] = [
  { denialClass: 'DOCUMENTATION', train: [80, 72, 76, 148], holdout: [38, 34, 33, 35] },
  { denialClass: 'ADMINISTRATIVE', train: [86, 78, 64, 82], holdout: [41, 37, 30, 39] },
  { denialClass: 'PARTIAL', train: [70, 70, 70, 70], holdout: [32, 35, 33, 34] },
  { denialClass: 'CONTESTED', train: [25, 25, 25, 25], holdout: [15, 12, 14, 11] },
];
for (const [group, design] of designs.entries()) for (const [insurerIndex, insurer] of SYNTHETIC_INSURERS.entries()) {
  for (const split of ['train', 'holdout'] as const) {
    const count = split === 'holdout' ? 50 : group === 0 && insurerIndex === 3 ? 200 : 100;
    const wins = split === 'train' ? design.train[insurerIndex] : design.holdout[insurerIndex];
    // Coprime permutation reproducibly spreads the known labels, separately per split.
    const shift = split === 'train' ? group * 13 + insurerIndex * 7 : group * 17 + insurerIndex * 11 + 31;
    for (let i = 0; i < count; i++) rows.push(Object.freeze({ id: `SYN-${split}-${group}-${insurerIndex}-${String(i + 1).padStart(3, '0')}`, split, insurer, denialClass: design.denialClass, evidenceState: 'COMPLETE', authorized: true, inWindow: true, outcome: ((i * 37 + shift) % count) < wins ? 1 : 0 }));
  }
}
export const SYNTHETIC_HISTORY: readonly HistoricalOutcome[] = Object.freeze(rows);
