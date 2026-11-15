import type { Claim, DenialCategory } from "./types";

/** Deterministic synthetic dataset. No real patients, providers, insurers, or transactions. */
export const AS_OF = "2026-11-14";
export const CLINICS = ["Northgate General Hospital", "Alder Creek Medical Center", "Harborview Surgical Institute", "Summit Ridge Clinic", "Cedar Point Oncology", "Lakeside Orthopaedic Group", "Meridian Valley Hospital", "Stonebridge Cardiology", "Willow Bend Behavioral Health", "Cascade Imaging Center", "Elm Street Family Practice", "Ironworks Rehabilitation Hospital"];
export const INSURERS = ["Meridian Health Plan", "NorthStar Benefits", "AtlasCare Insurance", "BluePeak Health", "Sentinel Mutual Health", "Vantage Health Alliance", "Cobalt Care Plans", "Harbor Mutual Insurance"];
const CATS: DenialCategory[] = ["Medical Necessity", "Prior Authorization", "Coding / Documentation", "Eligibility", "Timely Filing", "Coordination of Benefits", "Duplicate Claim", "Bundling / Edits"];
const REASONS: Record<DenialCategory, string[]> = {
  "Medical Necessity": ["Insurer says the notes do not show why the care was needed", "Insurer says this level of care was more than the patient needed"],
  "Prior Authorization": ["Insurer says no approval was given before the visit", "The approval on file is for a different treatment"],
  "Coding / Documentation": ["The bill and the notes do not match", "A small detail on the bill is missing, so the insurer will not pay yet"],
  Eligibility: ["Insurer says the patient had no cover on that day", "The name or number on the claim does not match the insurer records"],
  "Timely Filing": ["Insurer says the claim arrived too late", "We have no proof the claim was sent on time"],
  "Coordination of Benefits": ["Insurer wants to know if another insurer should pay first", "Insurer thinks another cover should pay part of this"],
  "Duplicate Claim": ["Insurer says this claim was already sent once", "The claim was sent again without being marked as a fixed claim"],
  "Bundling / Edits": ["Insurer says this charge is already included in another charge", "Insurer says two charges cannot be billed together"],
};
const EVIDENCE_TYPES = ["Doctor notes", "Surgery report", "Approval record", "Cover check", "Proof it was sent on time", "Full bill", "Referral letter", "Scan report"];

function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(20261114);
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rnd() * arr.length)];
const ri = (lo: number, hi: number) => Math.round(lo + rnd() * (hi - lo));
const d = (offsetDays: number) => new Date(new Date(`${AS_OF}T00:00:00Z`).getTime() - offsetDays * 86400000).toISOString().slice(0, 10);
const future = (days: number) => new Date(new Date(`${AS_OF}T00:00:00Z`).getTime() + days * 86400000).toISOString().slice(0, 10);

function scenarioClaims(): Claim[] {
  const base = { clinic: CLINICS[0], insurer: INSURERS[0], serviceDate: "2026-09-18", submissionDate: "2026-09-25", denialDate: "2026-10-21", authorizationStatus: "AUTHORIZED" as const };
  return [
    { ...base, id: "CASE-1042", scenario: "A claim we should win", denialCategory: "Coding / Documentation", denialReason: "A small detail on the bill is missing, so the insurer will not pay yet", billed: 1000, allowed: 600, patientResponsibility: 100, collectible: 500, recoveryProbability: 0.8, estimatedCost: 30, estimatedDurationDays: 21, deadline: future(46), requiredEvidenceId: "E-1042-A", evidence: [{ id: "E-1042-A", type: "Surgery report", status: "AVAILABLE", provenance: "clinic records", date: "2026-09-18" }, { id: "E-1042-B", type: "Full bill", status: "AVAILABLE", provenance: "billing records", date: "2026-09-25" }] },
    { ...base, clinic: CLINICS[3], insurer: INSURERS[2], id: "CASE-2088", scenario: "The deadline has passed", denialCategory: "Timely Filing", denialReason: "Insurer says the claim arrived too late", billed: 28500, allowed: 22000, patientResponsibility: 2000, collectible: 20000, recoveryProbability: 0.72, estimatedCost: 450, estimatedDurationDays: 45, deadline: "2026-08-14", requiredEvidenceId: "E-2088-A", evidence: [{ id: "E-2088-A", type: "Proof it was sent on time", status: "AVAILABLE", provenance: "the company that sent the claim", date: "2026-07-02" }] },
    { ...base, clinic: CLINICS[5], insurer: INSURERS[1], id: "CASE-3021", scenario: "A key paper is missing", denialCategory: "Medical Necessity", denialReason: "Insurer says the notes do not show why the care was needed", billed: 1400, allowed: 1050, patientResponsibility: 150, collectible: 900, recoveryProbability: 0.62, estimatedCost: 55, estimatedDurationDays: 30, deadline: future(31), requiredEvidenceId: "E-3021-A", evidence: [{ id: "E-3021-A", type: "Doctor notes", status: "MISSING", provenance: "the clinic, but it has not arrived yet", date: "2026-10-02" }, { id: "E-3021-B", type: "Full bill", status: "AVAILABLE", provenance: "billing records", date: "2026-09-25" }] },
    { ...base, clinic: CLINICS[7], insurer: INSURERS[3], id: "CASE-4109", scenario: "The insurer keeps saying no", denialCategory: "Medical Necessity", denialReason: "Insurer says the notes do not show why the care was needed", billed: 3600, allowed: 2750, patientResponsibility: 350, collectible: 2400, recoveryProbability: 0.55, estimatedCost: 110, estimatedDurationDays: 40, deadline: future(58), requiredEvidenceId: "E-4109-A", evidence: [{ id: "E-4109-A", type: "Doctor notes", status: "AVAILABLE", provenance: "clinic records", date: "2026-09-18" }] },
    { ...base, clinic: CLINICS[9], insurer: INSURERS[4], id: "CASE-5060", scenario: "Two papers disagree", denialCategory: "Coding / Documentation", denialReason: "Surgery report does not support billed code", billed: 2500, allowed: 2000, patientResponsibility: 250, collectible: 1750, recoveryProbability: 0.58, estimatedCost: 85, estimatedDurationDays: 35, deadline: future(39), requiredEvidenceId: "E-5060-A", evidence: [{ id: "E-5060-A", type: "Surgery report", status: "CONTRADICTORY", provenance: "clinic records. It says care took place on 2026-09-18", date: "2026-09-18", note: "The other paper gives a different date" }, { id: "E-5060-B", type: "Doctor notes", status: "CONTRADICTORY", provenance: "clinic records. It says care took place on 2026-09-21", date: "2026-09-21", note: "The other paper gives a different date" }] },
    { ...base, clinic: CLINICS[1], insurer: INSURERS[5], id: "CASE-6077", scenario: "Only part gets paid", denialCategory: "Bundling / Edits", denialReason: "Insurer says this charge is already included in another charge", billed: 1250, allowed: 950, patientResponsibility: 150, collectible: 800, recoveryProbability: 0.75, estimatedCost: 48, estimatedDurationDays: 28, deadline: future(52), requiredEvidenceId: "E-6077-A", evidence: [{ id: "E-6077-A", type: "Surgery report", status: "AVAILABLE", provenance: "clinic records", date: "2026-09-18" }] },
  ];
}

function generated(): Claim[] {
  const out: Claim[] = [];
  for (let i = 0; i < 114; i++) {
    const cat = pick(CATS);
    const billed = Math.round((350 + Math.pow(rnd(), 1.6) * 42000) / 10) * 10;
    const allowed = Math.round(billed * (0.52 + rnd() * 0.24));
    const patient = Math.round(allowed * (0.04 + rnd() * 0.14));
    const reqMissing = rnd() < 0.18;
    const contradictory = !reqMissing && rnd() < 0.07;
    const expired = cat === "Timely Filing" && rnd() < 0.35;
    const evType = pick(EVIDENCE_TYPES);
    const id = `CLM-${7001 + i}`;
    const baseProb: Record<DenialCategory, number> = { "Medical Necessity": 0.52, "Prior Authorization": 0.66, "Coding / Documentation": 0.71, Eligibility: 0.48, "Timely Filing": 0.38, "Coordination of Benefits": 0.6, "Duplicate Claim": 0.44, "Bundling / Edits": 0.57 };
    out.push({
      id, clinic: pick(CLINICS), insurer: pick(INSURERS), serviceDate: d(ri(35, 210)), submissionDate: d(ri(28, 180)), denialDate: d(ri(5, 90)),
      deadline: expired ? d(ri(4, 60)) : future(ri(6, 120)), denialCategory: cat, denialReason: pick(REASONS[cat]),
      billed, allowed, patientResponsibility: patient, collectible: allowed - patient,
      recoveryProbability: Math.min(0.92, Math.max(0.14, baseProb[cat] + (rnd() - 0.5) * 0.28 - (reqMissing ? 0.14 : 0))),
      estimatedCost: Math.round(22 + (allowed - patient) * (0.02 + rnd() * 0.05)), estimatedDurationDays: ri(14, 75),
      requiredEvidenceId: `E-${7001 + i}-A`,
      authorizationStatus: cat === "Prior Authorization" ? pick(["REQUIRED", "PENDING", "AUTHORIZED"] as const) : pick(["AUTHORIZED", "NOT_REQUIRED", "AUTHORIZED", "PENDING"] as const),
      evidence: [
        { id: `E-${7001 + i}-A`, type: evType, status: contradictory ? "CONTRADICTORY" : reqMissing ? "MISSING" : "AVAILABLE", provenance: contradictory ? "clinic records, and two of them disagree" : reqMissing ? "the clinic, but it has not arrived yet" : "clinic and billing records", date: d(ri(30, 190)), note: contradictory ? "It gives a different care date than the other paper" : undefined },
        { id: `E-${7001 + i}-B`, type: "Full bill", status: "AVAILABLE", provenance: "billing records", date: d(ri(20, 170)) },
      ],
    });
  }
  return out;
}

export const INITIAL_CLAIMS: Claim[] = [...scenarioClaims(), ...generated()];
export const DENIAL_CATEGORIES = CATS;
