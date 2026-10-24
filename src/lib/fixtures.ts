import { DEFAULT_SETTINGS, type Claim, type Scenario, type Session } from './types.ts';

const insurers = ['Meridian Health', 'Northstar Assurance', 'Cobalt Care', 'Evergreen Mutual'];
const clinics = ['Sunshine Clinic', 'Mesa Family Care', 'Harbor Medical Group', 'Juniper Health'];
const labels: Record<Scenario,string> = {
  documentation:'Encounter note omitted from submission', administrative:'Administrative field needs correction',
  missing:'Required lab note is not in the record', expired:'Permitted response window has expired',
  repeat:'Insurer repeats an unchanged refusal', conflict:'Service dates conflict across records',
  specialist:'Clinical interpretation requires a specialist', partial:'Only part of insurer responsibility is supported',
  negative:'Expected recovery does not justify the proposed advance', permission:'Recovery representation has not been authorized',
};

export function makeClaim(id: string, index: number, scenario: Scenario, collectible: number): Claim {
  const patient = id === 'CASE-1042' ? 10000 : 5000 + (index % 5) * 2500;
  const allowed = collectible + patient;
  const evidenceId = `E-${id.slice(5)}-A`;
  const evidence = {
    id:evidenceId, claimId:id, title: scenario==='administrative'?'Corrected administrative record':'Verified encounter note',
    content:`FABRICATED DEMO RECORD. ${id}: service recorded on 2026-09-03. Encounter documentation is present in this synthetic record. This excerpt supports documentation availability only, not an independent clinical or legal conclusion.`,
    verified:true, date:'2026-09-03',
  };
  const base: Claim = {
    id,clinic:clinics[index%4],insurer:insurers[index%4],service:'Synthetic outpatient encounter',denial:labels[scenario],scenario,
    billed:id==='CASE-1042'?100000:Math.round(allowed*1.6),allowed,patient,collectible,
    probability:scenario==='negative'?.25:.8,offer:Math.round(collectible*.6),expectedCosts:id==='CASE-1042'?3000:Math.max(3000,Math.round(collectible*.05)),daysToRecover:60,
    serviceDate:'2026-09-03',submittedDate:'2026-09-08',deniedDate:'2026-09-20',deadline:scenario==='expired'?'2026-10-01':'2026-12-20',
    transferAuthorized:true,appealAuthorized:scenario!=='permission',collectionAuthorized:true,
    evidence:scenario==='missing'?[]:[evidence],requiredEvidence:[evidenceId],contradiction:scenario==='conflict',specialist:scenario==='specialist',repeat:scenario==='repeat',expired:scenario==='expired',
    status:'ASSESSED',recovery:null,purchasePrice:null,fundedAt:null,
  };
  if(scenario==='partial') { base.offer=15000; base.expectedCosts=3000; }
  return base;
}

export function createSession(): Session {
  const named: [string, Scenario, number][] = [
    ['CASE-1042','documentation',50000],['CASE-2088','expired',2000000],['CASE-3021','missing',90000],
    ['CASE-4109','repeat',120000],['CASE-5060','conflict',160000],['CASE-6077','partial',80000],
  ];
  const claims=named.map(([id,scenario,amount],i)=>makeClaim(id,i,scenario,amount));
  const scenarios:Scenario[]=['documentation','documentation','administrative','documentation','missing','missing','specialist','negative','expired','permission','conflict','documentation'];
  for(let i=0;i<94;i++) claims.push(makeClaim(`CASE-${7001+i}`,i+6,scenarios[i%scenarios.length],(200+(i*137)%4800)*100));
  return {id:crypto.randomUUID(),revision:0,claims,settings:{...DEFAULT_SETTINGS},ledger:[],audit:[],createdAt:new Date().toISOString(),underwritten:false};
}
