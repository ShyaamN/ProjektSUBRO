import type { Claim, Settings, Assessment, LedgerEvent } from './types';

export function validateSettings(s: Settings) {
  for(const [key,value] of Object.entries(s)) if(typeof value!=='number'||!Number.isFinite(value)) throw new Error(`Invalid ${key}`);
  if(!Number.isSafeInteger(s.capital)||s.capital<0||s.capital>1000000000) throw new Error('Capital must be a nonnegative integer number of cents');
  if(s.minMargin<0||s.minMargin>1||s.apr<0||s.apr>1||s.probabilityAdjustment<-.9||s.probabilityAdjustment>.9||s.insurerCap<0||s.insurerCap>1) throw new Error('Invalid risk settings');
  if(!Number.isSafeInteger(s.riskReserve)||s.riskReserve<0||s.riskReserve>10000000) throw new Error('Invalid risk reserve');
  if(!Number.isSafeInteger(s.maxSteps)||s.maxSteps<1||s.maxSteps>8||!Number.isSafeInteger(s.maxSubmissions)||s.maxSubmissions<1||s.maxSubmissions>3||!Number.isSafeInteger(s.agentBudget)||s.agentBudget<0||s.agentBudget>200) throw new Error('Demo action limits cannot exceed 8 steps, 3 submissions or $2');
}

export function assess(c: Claim,s: Settings): Assessment {
  validateSettings(s);
  for(const value of [c.billed,c.allowed,c.patient,c.collectible,c.offer,c.expectedCosts,c.daysToRecover]) if(!Number.isSafeInteger(value)||value<0) throw new Error('Invalid claim financial input');
  if(!Number.isFinite(c.probability)||c.probability<0||c.probability>1||c.allowed>c.billed||c.patient>c.allowed||c.collectible>c.allowed-c.patient) throw new Error('Invalid probability or insurer responsibility');
  const probability=Math.max(0,Math.min(1,c.probability+s.probabilityAdjustment));
  // Partial cases have a disclosed $350 conditional outcome; face value stays distinct.
  const conditionalPayment=c.scenario==='partial'?Math.min(35000,c.collectible):c.collectible;
  const expectedCollection=Math.round(probability*conditionalPayment);
  const price=c.purchasePrice??c.offer;
  const financingCost=Math.round(price*s.apr*c.daysToRecover/365);
  const totalCosts=c.expectedCosts+financingCost;
  const expectedContribution=expectedCollection-price-totalCosts;
  const maxOffer=Math.max(0,Math.floor((expectedCollection-totalCosts-s.riskReserve)/(1+s.minMargin)));
  const margin=price>0?expectedContribution/price:0;
  let decision:Assessment['decision']='BUY_CANDIDATE'; let reason='Verified synthetic evidence, current permissions and positive expected economics.';
  if(c.expired||c.deadline<'2026-10-24') {decision='DECLINED';reason='Response deadline expired under the synthetic policy. Face value does not override the deadline.';}
  else if(!c.transferAuthorized||!c.appealAuthorized||!c.collectionAuthorized){decision='REVIEW';reason='Payment transfer, appeal representation and collection rights must each be authorized.';}
  else if(c.contradiction){decision='REVIEW';reason='Contradictory evidence requires a human specialist.';}
  else if(c.specialist){decision='REVIEW';reason='Clinical or legal interpretation requires specialist review.';}
  else if(c.requiredEvidence.some(id=>!c.evidence.some(e=>e.id===id&&e.claimId===c.id&&e.verified))){decision='REVIEW';reason='Required evidence is absent or unverified. Request the document; do not invent it.';}
  else if(price<=0||expectedContribution<=0||price>maxOffer){decision='DECLINED';reason='The original upfront offer no longer meets the required expected margin and reserve.';}
  return {decision,reason,probability,expectedCollection,financingCost,totalCosts,expectedContribution,maxOffer,margin,eligible:decision==='BUY_CANDIDATE'};
}

export function allocate(claims: Claim[],s: Settings,ledger: LedgerEvent[]): string[] {
  validateSettings(s);
  const cash=s.capital+ledger.reduce((t,e)=>t+e.amount,0);
  const heldCosts=claims.filter(c=>c.purchasePrice!==null&&!['RECOVERED','PARTIAL','LOSS','STOPPED','ESCALATED'].includes(c.status)).reduce((t,c)=>t+Math.max(0,assess(c,s).totalCosts-(c.recovery?.spent??0)),0);
  let available=Math.max(0,cash-heldCosts); const exposures:Record<string,number>={};
  for(const c of claims) if(c.purchasePrice!==null&&!['RECOVERED','PARTIAL','LOSS'].includes(c.status)) exposures[c.insurer]=(exposures[c.insurer]??0)+c.purchasePrice;
  const ranked=claims.filter(c=>c.purchasePrice===null&&assess(c,s).eligible).sort((a,b)=>assess(b,s).expectedContribution/b.offer-assess(a,s).expectedContribution/a.offer||a.id.localeCompare(b.id));
  const selected:string[]=[];
  for(const c of ranked) if(c.offer+assess(c,s).totalCosts<=available&&(exposures[c.insurer]??0)+c.offer<=s.capital*s.insurerCap){selected.push(c.id);available-=c.offer+assess(c,s).totalCosts;exposures[c.insurer]=(exposures[c.insurer]??0)+c.offer;}
  return selected;
}
