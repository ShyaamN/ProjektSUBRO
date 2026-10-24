import type { Session, AgentProposal, Claim, Portfolio, LedgerEvent, Action } from './types.ts';
import { assess, allocate, validateSettings } from './underwriting.ts';
import { makeClaim } from './fixtures.ts';

const STEP_COST=10; // Hypothetical $0.10, included in fixed synthetic work cost; not measured API billing.
const ACTIONS:Action[]=['READ_CLAIM','READ_EVIDENCE','CHECK_REQUIREMENTS','REQUEST_EVIDENCE','DRAFT_RESPONSE','SUBMIT_TO_MOCK_INSURER','RECHECK_ECONOMICS','ESCALATE','STOP'];
const CLOSED=['RECOVERED','PARTIAL','LOSS'];
const now=()=>new Date().toISOString();
export function getClaim(s:Session,id:string):Claim { const c=s.claims.find(c=>c.id===id); if(!c) throw new Error('Unknown synthetic claim'); return c; }
function audit(s:Session,id:string,action:string,reason:string){s.audit.push({id:crypto.randomUUID(),claimId:id,time:now(),action,reason});}
function book(s:Session,c:Claim,type:LedgerEvent['type'],amount:number,key:string,description:string){
  const id=`${c.id}:${key}`; if(s.ledger.some(e=>e.id===id))return;
  if(!Number.isSafeInteger(amount))throw new Error('Invalid ledger amount');
  s.ledger.push({id,claimId:c.id,type,amount,time:now(),description});
}
export function portfolio(s:Session):Portfolio {
  const counts:Portfolio['counts']={BUY_CANDIDATE:0,REVIEW:0,DECLINED:0};
  const selectedIds=allocate(s.claims,s.settings,s.ledger),selected=s.claims.filter(c=>selectedIds.includes(c.id));
  for(const c of s.claims)counts[assess(c,s.settings).decision]++;
  const total=(type:LedgerEvent['type'])=>s.ledger.filter(e=>e.type===type).reduce((t,e)=>t+e.amount,0);
  const deployed=-total('PURCHASE'),collected=total('COLLECTION'),expenses=-total('EXPENSE');
  const closedIds=new Set(s.claims.filter(c=>CLOSED.includes(c.status)).map(c=>c.id));
  return {totalCollectible:s.claims.reduce((t,c)=>t+c.collectible,0),expectedCollection:selected.reduce((t,c)=>t+assess(c,s.settings).expectedCollection,0),proposedFunding:selected.reduce((t,c)=>t+c.offer,0),expectedContribution:selected.reduce((t,c)=>t+assess(c,s.settings).expectedContribution,0),deployed,collected,expenses,cash:s.settings.capital-deployed+collected-expenses,realizedContribution:s.ledger.filter(e=>closedIds.has(e.claimId)).reduce((t,e)=>t+e.amount,0),selectedIds,counts};
}
export function purchase(s:Session,id:string){
  const c=getClaim(s,id);if(c.purchasePrice!==null)return;
  const a=assess(c,s.settings);if(!a.eligible)throw new Error(`Offer unavailable: ${a.reason}`);
  const cash=s.settings.capital+s.ledger.reduce((t,e)=>t+e.amount,0);
  const heldCosts=s.claims.filter(x=>x.purchasePrice!==null&&!x.recovery?.terminalReason).reduce((t,x)=>t+Math.max(0,assess(x,s.settings).totalCosts-(x.recovery?.spent??0)),0);
  if(c.offer+a.totalCosts>cash-heldCosts)throw new Error('Insufficient simulated capital including recovery expense reserves');
  const exposure=s.claims.filter(x=>x.insurer===c.insurer&&x.purchasePrice!==null&&!CLOSED.includes(x.status)).reduce((t,x)=>t+x.purchasePrice!,0);
  if(exposure+c.offer>s.settings.capital*s.settings.insurerCap)throw new Error('Insurer concentration cap exceeded');
  c.purchasePrice=c.offer;c.fundedAt=now();c.status='PURCHASED_SIMULATED';
  c.recovery={steps:0,submissions:0,spent:0,events:[],readEvidence:[],checked:false,readClaim:false,draft:'',draftSources:[],response:'',repeats:0,terminalReason:null,mode:'rules',proposedAction:null,invalidActions:0};
  book(s,c,'PURCHASE',-c.offer,'purchase','Simulated advance accepted; no actual payment.');
  audit(s,id,'PURCHASED_SIMULATED','Explicit simulated acceptance; transfer, representation and collection permissions checked separately.');
}
export type MockDecision={status:'APPROVED'|'PARTIAL'|'DENIED'|'RETRY';amount:number;message:string};
function draftText(c:Claim,ids:string[]){
  return `SIMULATED ${c.scenario==='administrative'?'CORRECTED SUBMISSION':'DOCUMENTATION RECONSIDERATION'} · ${c.id}\nPreviously omitted documentation is attached under the supplied synthetic scenario.\n`+ids.map(id=>{const e=c.evidence.find(e=>e.id===id)!;return `[${e.id}] ${e.content}`;}).join('\n')+'\nNo additional clinical or legal assertions are made.';
}
export function mockInsurer(c:Claim,sources:string[],draft:string):MockDecision {
  const denied=(message:string):MockDecision=>({status:'DENIED',amount:0,message});
  if(c.expired||c.deadline<'2026-10-24')return denied('Synthetic response deadline expired.');
  if(!c.transferAuthorized||!c.appealAuthorized||!c.collectionAuthorized)return denied('Required mock permissions absent.');
  if(c.contradiction||c.specialist)return denied('Human specialist required by scenario.');
  if(c.requiredEvidence.some(id=>!sources.includes(id)||!c.evidence.some(e=>e.id===id&&e.claimId===c.id&&e.verified)))return denied('Required evidence absent or unverified. Persuasive text cannot replace proof.');
  if(sources.some(id=>!c.evidence.some(e=>e.id===id&&e.claimId===c.id&&e.verified)))return denied('Cross-claim or unknown evidence rejected.');
  if(draft!==draftText(c,sources))return denied('Unsupported draft text or source excerpts do not match.');
  if(c.finalDenial)return denied('FINAL_DENIAL: Documents were received, but the judge-selected synthetic policy upholds the denial with no remaining permitted stage. No collection is authorized.');
  if(c.repeat)return {status:'RETRY',amount:0,message:'UNCHANGED_REFUSAL: Documentation response remains unchanged; no new evidence or strategy supplied.'};
  if(c.scenario==='partial')return {status:'PARTIAL',amount:Math.min(c.collectible,35000),message:'Synthetic policy supports only $350 of this insurer receivable. Partial approval; the remainder is not collected.'};
  return {status:'APPROVED',amount:c.collectible,message:'Verified documentation accepted before the scenario deadline. Simulated collection authorized.'};
}
function finish(s:Session,c:Claim,reason:string,status:Claim['status'],action:Action='STOP',detail?:string){
  const r=c.recovery!;if(r.terminalReason)return;
  r.terminalReason=reason;c.status=status;r.proposedAction=null;
  r.events.push({id:crypto.randomUUID(),time:now(),action,reason:detail??reason.replaceAll('_',' '),sources:[],requiresHuman:status==='ESCALATED',cost:0,outcome:`${reason} · ${status==='ESCALATED'?'Human handoff required.':'Autonomous work concluded.'}`,actor:'guardrail',mode:r.mode});
  const charged=-s.ledger.filter(e=>e.claimId===c.id&&e.type==='EXPENSE').reduce((t,e)=>t+e.amount,0);
  const remaining=Math.max(0,assess(c,s.settings).totalCosts-charged);
  if(remaining)book(s,c,'EXPENSE',-remaining,'work-expense','Fixed synthetic work cost net of actions already charged. Not measured API billing.');
  audit(s,c.id,reason,detail??`Recovery ended: ${reason}.`);
}
function failPreflight(s:Session,c:Claim):boolean {
  const r=c.recovery!;
  if(c.expired||c.deadline<'2026-10-24'){finish(s,c,'DEADLINE_EXPIRED','STOPPED');return true;}
  if(!c.transferAuthorized||!c.appealAuthorized||!c.collectionAuthorized){finish(s,c,'AUTHORIZATION_REQUIRED','ESCALATED','ESCALATE');return true;}
  if(c.contradiction){finish(s,c,'EVIDENCE_CONFLICT','ESCALATED','ESCALATE','Conflicting records require human resolution.');return true;}
  if(c.specialist){finish(s,c,'SPECIALIST_REQUIRED','ESCALATED','ESCALATE');return true;}
  if(c.requiredEvidence.some(id=>!c.evidence.some(e=>e.id===id&&e.claimId===c.id&&e.verified))){finish(s,c,'EVIDENCE_MISSING','ESCALATED','REQUEST_EVIDENCE',`Requested missing verified document: ${c.requiredEvidence.join(', ')}. No unsupported draft submitted.`);return true;}
  if(c.evidence.some(e=>/ignore (all|previous)|system prompt|api[_ -]?key|override (rules|guardrails)/i.test(e.content))){finish(s,c,'UNTRUSTED_INSTRUCTION','ESCALATED','ESCALATE','Instruction-like text in evidence treated as untrusted data.');return true;}
  const a=assess(c,s.settings);if(a.expectedCollection-Math.max(0,a.totalCosts-r.spent)<=0){finish(s,c,'NEGATIVE_EXPECTED_VALUE','STOPPED');return true;}
  if(r.repeats>=2){finish(s,c,'REPEATED_NO_PROGRESS','STOPPED');return true;}
  if(r.steps>=s.settings.maxSteps){finish(s,c,'MAX_STEPS','STOPPED');return true;}
  if(r.spent+STEP_COST>s.settings.agentBudget){finish(s,c,'BUDGET_EXHAUSTED','STOPPED');return true;}
  return false;
}
export function recoverPreflight(s:Session,id:string):boolean {
  const c=getClaim(s,id);if(c.purchasePrice===null||!c.recovery)throw new Error('A simulated purchase is required before recovery');
  return Boolean(c.recovery.terminalReason)||failPreflight(s,c);
}
export function propose(c:Claim):AgentProposal {
  const r=c.recovery;if(!r)throw new Error('A simulated purchase is required');
  const p=(action:Action,reason:string,sources:string[]=[],requiresHuman=false):AgentProposal=>({action,reason,sources,requiresHuman});
  if(!r.readClaim)return p('READ_CLAIM','Inspect denial, separate insurer responsibility, permissions and deadline.');
  if(!r.checked)return p('CHECK_REQUIREMENTS','Check independent policy for required documents and permitted route.');
  const unread=c.requiredEvidence.filter(id=>!r.readEvidence.includes(id));
  if(unread.length)return p('READ_EVIDENCE','Retrieve verified documents linked only to this case.',unread);
  if(!r.draft)return p('DRAFT_RESPONSE','Create response from exact verified excerpts with source citations.',r.readEvidence);
  if(r.response&&r.events.filter(e=>e.actor==='agent').at(-1)?.action!=='RECHECK_ECONOMICS')return p('RECHECK_ECONOMICS','Reassess economics and no-progress count before a permitted mock retry.');
  return p('SUBMIT_TO_MOCK_INSURER','Submit source-validated draft to deterministic mock insurer only.',r.draftSources);
}
function validateProposal(c:Claim,p:AgentProposal):string|null {
  const r=c.recovery!;
  if(!ACTIONS.includes(p.action)||typeof p.reason!=='string'||!p.reason.trim()||!Array.isArray(p.sources))return 'Unknown action or malformed decision.';
  if(p.sources.some(id=>typeof id!=='string'||!c.evidence.some(e=>e.id===id&&e.claimId===c.id&&e.verified)))return 'Citation absent, unverified or cross-claim.';
  if(p.action==='READ_EVIDENCE'&&(!r.readClaim||!r.checked||!p.sources.length))return 'Inspect claim and requirements before evidence retrieval.';
  if(p.action==='CHECK_REQUIREMENTS'&&!r.readClaim)return 'Read claim before checking requirements.';
  if(p.action==='DRAFT_RESPONSE'&&(!r.checked||!r.readClaim||c.requiredEvidence.some(id=>!r.readEvidence.includes(id)||!p.sources.includes(id))))return 'Draft requires previously retrieved mandatory evidence.';
  if(p.action==='SUBMIT_TO_MOCK_INSURER'&&(!r.draft||p.sources.length!==r.draftSources.length||p.sources.some(id=>!r.draftSources.includes(id))))return 'Submission requires validated draft and exact sources.';
  if(p.action==='SUBMIT_TO_MOCK_INSURER'&&r.submissions>0&&r.events.filter(e=>e.actor==='agent').at(-1)?.action!=='RECHECK_ECONOMICS')return 'Recheck economics before retrying.';
  return null;
}
export function step(s:Session,id:string,proposal?:AgentProposal){
  const c=getClaim(s,id);if(c.purchasePrice===null||!c.recovery)throw new Error('A simulated purchase is required before recovery');
  const r=c.recovery;if(r.terminalReason)return;if(failPreflight(s,c))return;
  const p=proposal??propose(c);r.proposedAction=p.action;
  const invalid=validateProposal(c,p);
  if(invalid){r.invalidActions++;r.steps++;r.events.push({id:crypto.randomUUID(),time:now(),...p,cost:0,outcome:`Action denied by guardrail: ${invalid}`,actor:'guardrail',mode:r.mode});audit(s,id,'ACTION_DENIED',invalid);if(r.invalidActions>=2)finish(s,c,'INVALID_ACTION','ESCALATED','ESCALATE');return;}
  if(p.requiresHuman){finish(s,c,'HUMAN_REQUIRED','ESCALATED','ESCALATE',`${p.action} was proposed with mandatory human review: ${p.reason}`);return;}
  if(p.action==='SUBMIT_TO_MOCK_INSURER'&&r.submissions>=s.settings.maxSubmissions){finish(s,c,'MAX_SUBMISSIONS','STOPPED');return;}
  if(p.action==='STOP'||p.action==='ESCALATE'||p.action==='REQUEST_EVIDENCE'){finish(s,c,p.action==='REQUEST_EVIDENCE'?'EVIDENCE_MISSING':p.action==='ESCALATE'?'HUMAN_REQUESTED':'AGENT_STOPPED',p.action==='STOP'?'STOPPED':'ESCALATED',p.action,p.reason);return;}
  c.status='RECOVERY_ACTIVE';r.steps++;r.spent+=STEP_COST;
  book(s,c,'EXPENSE',-STEP_COST,`action-${r.steps}`,'Hypothetical action expense, included in fixed synthetic work cost.');
  let outcome='';
  switch(p.action){
    case 'READ_CLAIM':r.readClaim=true;outcome=`${c.id}: ${c.collectible/100} USD insurer responsibility. Patient share and contractual adjustment excluded.`;break;
    case 'CHECK_REQUIREMENTS':r.checked=true;outcome=`Required ${c.requiredEvidence.join(', ')}. Deadline ${c.deadline}. Route: ${c.scenario==='administrative'?'corrected submission':'documentation reconsideration'}.`;break;
    case 'READ_EVIDENCE':r.readEvidence=[...new Set([...r.readEvidence,...p.sources])];outcome=`Verified exact source excerpts: ${p.sources.join(', ')}.`;break;
    case 'DRAFT_RESPONSE':r.draftSources=[...p.sources];r.draft=draftText(c,p.sources);outcome='Draft built from exact verified source excerpts; every assertion carries evidence IDs.';break;
    case 'RECHECK_ECONOMICS':outcome=`Modeled collection ${assess(c,s.settings).expectedCollection/100} USD; action budget ${(s.settings.agentBudget-r.spent)/100} USD; unchanged responses ${r.repeats}/2.`;break;
    case 'SUBMIT_TO_MOCK_INSURER':{
      const result=mockInsurer(c,r.draftSources,r.draft);r.submissions++;r.repeats=result.message===r.response?r.repeats+1:1;r.response=result.message;
      r.events.push({id:crypto.randomUUID(),time:now(),...p,cost:STEP_COST,outcome:'Evidence-validated draft sent through mock channel.',actor:'agent',mode:r.mode});
      r.events.push({id:crypto.randomUUID(),time:now(),action:p.action,reason:'Independent synthetic insurer evaluation.',sources:r.draftSources,requiresHuman:false,cost:0,outcome:result.message,actor:'insurer',mode:r.mode});
      if(result.status==='APPROVED'||result.status==='PARTIAL'){book(s,c,'COLLECTION',result.amount,'collection','Realized within synthetic scenario; no actual money.');finish(s,c,result.status==='PARTIAL'?'PARTIAL':'RECOVERED',result.status==='PARTIAL'?'PARTIAL':'RECOVERED');}
      else if(result.status==='DENIED')finish(s,c,'FINAL_DENIAL','LOSS');
      else if(r.repeats>=2)finish(s,c,'REPEATED_NO_PROGRESS','STOPPED');
      audit(s,id,p.action,result.message);return;
    }
  }
  r.events.push({id:crypto.randomUUID(),time:now(),...p,cost:STEP_COST,outcome,actor:'agent',mode:r.mode});audit(s,id,p.action,outcome);
}
export function changeClaim(s:Session,id:string,patch:Partial<Claim>){
  const c=getClaim(s,id);if(c.purchasePrice!==null)throw new Error('Funded economics frozen; use explicit judge scenario controls for recovery shocks.');
  if(Object.keys(patch).some(k=>!['probability','offer','collectible'].includes(k)))throw new Error('Unsupported synthetic claim edit');
  const next={...c,...patch};assess(next,s.settings);Object.assign(c,next);audit(s,id,'ASSUMPTION_CHANGED','Synthetic underwriting input changed; original offer reevaluated.');
}
export function chaos(s:Session,id:string,kind:string){
  const c=getClaim(s,id);if(c.recovery?.terminalReason)throw new Error('Reset case before changing a concluded scenario.');
  switch(kind){
    case 'missing':c.evidence=[];break;
    case 'inject':if(!c.evidence.some(e=>e.id===c.requiredEvidence[0]))c.evidence=makeClaim(c.id,0,'documentation',c.collectible).evidence;break;
    case 'repeat':c.repeat=!c.repeat;break;
    case 'conflict':c.contradiction=true;break;
    case 'expired':c.expired=true;c.deadline='2026-10-01';break;
    case 'negative':c.probability=0;break;
    case 'specialist':c.specialist=true;break;
    case 'finalDenial':c.finalDenial=true;break;
    case 'responsibility':c.collectible=Math.floor(c.collectible/2);break;
    default:throw new Error('Unknown synthetic scenario control');
  }
  if(c.recovery){c.recovery.draft='';c.recovery.draftSources=[];c.recovery.readEvidence=[];}
  audit(s,id,'JUDGE_SCENARIO_CHANGED',`Explicit synthetic control: ${kind}. Ledger preserved.`);
}
export function resetClaim(s:Session,id:string){
  const c=getClaim(s,id),index=s.claims.indexOf(c);
  const nextLedger=s.ledger.filter(e=>e.claimId!==id);
  const cashAfterReset=s.settings.capital+nextLedger.reduce((t,e)=>t+e.amount,0);
  const outstanding=s.claims.filter(x=>x.id!==id&&x.purchasePrice!==null&&!x.recovery?.terminalReason).reduce((t,x)=>t+Math.max(0,assess(x,s.settings).totalCosts-(x.recovery?.spent??0)),0);
  if(cashAfterReset<outstanding)throw new Error('Cannot reset this case: its collection is committed to other claims. Reset the full portfolio instead.');
  s.claims[index]=makeClaim(c.id,index,c.scenario,c.allowed-c.patient);
  s.ledger=nextLedger;audit(s,id,'CASE_RESET','Explicit judge reset reversed this synthetic case ledger and restored fixture.');
}
export function escalate(s:Session,id:string,reason='Human review requested by operator',reasonCode='HUMAN_REQUESTED'){
  const c=getClaim(s,id);if(!c.recovery)throw new Error('A simulated purchase is required before handoff');finish(s,c,reasonCode,'ESCALATED','ESCALATE',reason);
}
export function fundingReason(s:Session,id:string):string|null {
  const c=getClaim(s,id);if(c.purchasePrice!==null)return 'A simulated advance is already recorded.';
  const a=assess(c,s.settings);if(!a.eligible)return a.reason;
  const cash=s.settings.capital+s.ledger.reduce((sum,e)=>sum+e.amount,0);
  const reserve=s.claims.filter(x=>x.purchasePrice!==null&&!x.recovery?.terminalReason).reduce((sum,x)=>sum+Math.max(0,assess(x,s.settings).totalCosts-(x.recovery?.spent??0)),0);
  if(c.offer+a.totalCosts>cash-reserve)return 'Insufficient simulated capital including recovery expense reserves';
  const exposure=s.claims.filter(x=>x.insurer===c.insurer&&x.purchasePrice!==null&&!CLOSED.includes(x.status)).reduce((sum,x)=>sum+x.purchasePrice!,0);
  if(exposure+c.offer>s.settings.capital*s.settings.insurerCap)return 'Insurer concentration cap exceeded';
  return null;
}
export { validateSettings };
