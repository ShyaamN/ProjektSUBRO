import { describe, it, expect } from 'vitest';
import { createSession } from '../src/lib/fixtures';
import { assess, allocate } from '../src/lib/underwriting';
import { purchase, step, propose, mockInsurer, portfolio, changeClaim, chaos } from '../src/lib/engine';
import { DEFAULT_SETTINGS, type Session, type Claim } from '../src/lib/types';

function claim(s: Session, id = 'CASE-1042') { return s.claims.find(c => c.id === id)!; }
function run(s: Session, id = 'CASE-1042') { for (let i = 0; i < 12 && !claim(s,id).recovery?.terminalReason; i++) step(s,id); return claim(s,id); }

describe('synthetic portfolio and deterministic economics', () => {
  it('creates exactly 100 stable synthetic records with separately reconciled insurer responsibility', () => {
    const s = createSession(); expect(s.claims).toHaveLength(100); expect(new Set(s.claims.map(c=>c.id)).size).toBe(100);
    expect(s.claims.map(c=>c.id)).toEqual(createSession().claims.map(c=>c.id));
    for (const c of s.claims) { expect(c.collectible).toBeLessThanOrEqual(c.allowed-c.patient); expect(c.allowed).toBeLessThanOrEqual(c.billed); }
  });
  it('returns $400 collection and +$70 expected contribution at the original $300 offer', () => {
    const a = assess(claim(createSession()),DEFAULT_SETTINGS); expect(a.expectedCollection).toBe(40000); expect(a.expectedContribution).toBe(7000); expect(a.decision).toBe('BUY_CANDIDATE');
  });
  it('rejects the original offer at 50% with −$80 expected contribution', () => {
    const c = claim(createSession()); c.probability=.5; const a=assess(c,DEFAULT_SETTINGS); expect(a.expectedContribution).toBe(-8000); expect(a.decision).toBe('DECLINED');
  });
  it('declines a large expired claim and holds absent/conflicting evidence for human review', () => {
    const s=createSession(); expect(assess(claim(s,'CASE-2088'),DEFAULT_SETTINGS).decision).toBe('DECLINED');
    expect(assess(claim(s,'CASE-3021'),DEFAULT_SETTINGS).decision).toBe('REVIEW'); expect(assess(claim(s,'CASE-5060'),DEFAULT_SETTINGS).decision).toBe('REVIEW');
  });
  it('enforces capital and insurer concentration with an explicitly bounded allocation', () => {
    const s=createSession(); const settings={...DEFAULT_SETTINGS,capital:100000,insurerCap:.4};
    const ids=allocate(s.claims,settings,[]); const chosen=s.claims.filter(c=>ids.includes(c.id));
    expect(chosen.reduce((t,c)=>t+c.offer,0)).toBeLessThanOrEqual(100000);
    for(const insurer of new Set(chosen.map(c=>c.insurer))) expect(chosen.filter(c=>c.insurer===insurer).reduce((t,c)=>t+c.offer,0)).toBeLessThanOrEqual(40000);
  });
  it('fails closed for non-finite probabilities and money', () => {
    const c=claim(createSession()); c.probability=NaN; expect(()=>assess(c,DEFAULT_SETTINGS)).toThrow();
    c.probability=.8; c.offer=-1; expect(()=>assess(c,DEFAULT_SETTINGS)).toThrow();
  });
});

describe('acquisition and financial ledger', () => {
  it('requires eligibility and capital, reserves exactly once', () => {
    const s=createSession(); purchase(s,'CASE-1042'); purchase(s,'CASE-1042');
    expect(s.ledger.filter(e=>e.type==='PURCHASE')).toHaveLength(1); expect(portfolio(s).cash).toBe(4970000);
    expect(()=>purchase(s,'CASE-2088')).toThrow(); s.settings.capital=30000; expect(()=>purchase(s,'CASE-4109')).toThrow();
  });
  it('cannot run an unfunded claim', () => { expect(()=>step(createSession(),'CASE-1042')).toThrow(/purchase/i); });
  it('books success once and reconciles actual expense independently from estimated $30', () => {
    const s=createSession(); purchase(s,'CASE-1042'); const c=run(s); expect(c.status).toBe('RECOVERED'); expect(c.recovery?.terminalReason).toBe('RECOVERED');
    expect(s.ledger.filter(e=>e.type==='COLLECTION')).toHaveLength(1); expect(portfolio(s).collected).toBe(50000);
    const before=JSON.stringify(s.ledger); step(s,c.id); expect(JSON.stringify(s.ledger)).toBe(before);
    expect(portfolio(s).realizedContribution).toBe(50000-30000-portfolio(s).expenses);
  });
  it('books only the $350 partial outcome', () => {
    const s=createSession(); purchase(s,'CASE-6077'); const c=run(s,'CASE-6077'); expect(c.status).toBe('PARTIAL'); expect(portfolio(s).collected).toBe(35000);
  });
  it('freezes purchase price and forbids changing funded economics directly',()=>{
    const s=createSession(); purchase(s,'CASE-1042'); expect(()=>changeClaim(s,'CASE-1042',{offer:1})).toThrow(); expect(claim(s).purchasePrice).toBe(30000);
  });
});

describe('autonomous guardrails and mock insurer independence', () => {
  it('stops a repeated insurer response after two identical responses',()=>{
    const s=createSession(); purchase(s,'CASE-4109'); const c=run(s,'CASE-4109'); expect(c.recovery?.terminalReason).toBe('REPEATED_NO_PROGRESS'); expect(c.recovery!.steps).toBeLessThanOrEqual(8); expect(c.recovery!.submissions).toBe(2);
    expect(portfolio(s).collected).toBe(0);
  });
  it('requests missing evidence after a judge removes it from a funded case',()=>{
    const s=createSession(); purchase(s,'CASE-1042'); chaos(s,'CASE-1042','missing'); const c=run(s); expect(c.status).toBe('ESCALATED'); expect(c.recovery?.terminalReason).toBe('EVIDENCE_MISSING'); expect(c.recovery?.draft).toBe('');
  });
  it('will not let eloquent unsupported or cross-claim citations win',()=>{
    const s=createSession(); const c=claim(s,'CASE-3021'); expect(mockInsurer(c,[], 'A persuasive unsupported response').status).toBe('DENIED');
    purchase(s,'CASE-1042'); step(s,'CASE-1042',{action:'DRAFT_RESPONSE',reason:'Invented proof',sources:['E-6077-A'],requiresHuman:false}); expect(claim(s).recovery?.draft).toBe(''); expect(claim(s).recovery?.events.at(-1)?.actor).toBe('guardrail');
  });
  it.each([['conflict','EVIDENCE_CONFLICT'],['expired','DEADLINE_EXPIRED'],['negative','NEGATIVE_EXPECTED_VALUE'],['specialist','SPECIALIST_REQUIRED']] as const)('stops after %s chaos with %s', (kind,reason)=>{
    const s=createSession(); purchase(s,'CASE-1042'); chaos(s,'CASE-1042',kind); const c=run(s); expect(c.recovery?.terminalReason).toBe(reason); expect(portfolio(s).collected).toBe(0);
  });
  it('enforces a hard step limit and hypothetical action budget before executing',()=>{
    let s=createSession(); purchase(s,'CASE-1042'); s.settings.maxSteps=1; run(s); expect(claim(s).recovery?.terminalReason).toBe('MAX_STEPS');
    s=createSession(); purchase(s,'CASE-1042'); s.settings.agentBudget=1; run(s); expect(claim(s).recovery?.terminalReason).toBe('BUDGET_EXHAUSTED'); expect(claim(s).recovery?.spent).toBe(0);
  });
  it('newly injected synthetic evidence makes the missing case eligible',()=>{
    const s=createSession(); chaos(s,'CASE-3021','inject'); expect(assess(claim(s,'CASE-3021'),s.settings).decision).toBe('BUY_CANDIDATE'); purchase(s,'CASE-3021'); expect(run(s,'CASE-3021').status).toBe('RECOVERED');
  });
});
