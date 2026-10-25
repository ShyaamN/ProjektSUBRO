import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSession } from '../src/lib/fixtures';
import { assess } from '../src/lib/underwriting';
import { changeClaim, chaos, purchase, resetClaim, step } from '../src/lib/engine';
import { SYNTHETIC_HISTORY } from '../src/lib/risk-history';
import { estimateRisk, refreshRisk, riskValidation, wilson95 } from '../src/lib/risk';
import { reviewRisk, validateRiskReview } from '../src/lib/risk-review';
import { executeCommand, parseCommand } from '../src/lib/commands';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe('fabricated historical outcomes', () => {
  it('derives the teaching case from exactly 80 successes in 100 matching training outcomes', () => {
    const c = createSession().claims[0];
    const r = estimateRisk(c);
    expect(r.sampleSize).toBe(100); expect(r.successes).toBe(80); expect(r.probability).toBe(.8);
    expect(r.lower95).toBeCloseTo(.7111708, 5); expect(r.upper95).toBeCloseTo(.8666331, 5);
    expect(c.probability).toBe(.8); expect(c.risk?.version).toBe(r.version);
    expect(r.source).toMatch(/synthetic/i); expect(r.caveat).toMatch(/not.*validat/i);
  });
  it('varies cohorts by actual insurer/denial/evidence conditions and keeps named demo cases useful', () => {
    const s = createSession();
    expect(new Set(s.claims.filter(c => c.risk?.status === 'SUPPORTED').map(c => c.probability)).size).toBeGreaterThan(3);
    const loop = s.claims.find(c => c.id === 'CASE-4109')!;
    expect(loop.risk?.probability).toBe(.74); expect(loop.risk?.sampleSize).toBe(200);
    expect(assess(loop, s.settings).eligible).toBe(true);
    expect(s.claims.find(c => c.id === 'CASE-6077')?.probability).toBe(.7);
  });
  it('uses only training rows and refuses precision with fewer than thirty matched cases', () => {
    const c = createSession().claims[0];
    const training = SYNTHETIC_HISTORY.filter(r => r.split === 'train' && r.insurer === c.insurer && r.denialClass === 'DOCUMENTATION');
    const sparse = estimateRisk(c, training.slice(0, 29));
    expect(sparse.status).toBe('INSUFFICIENT_DATA'); expect(sparse.probability).toBeNull(); expect(sparse.lower95).toBeNull();
    const changed = SYNTHETIC_HISTORY.map(r => r.split === 'holdout' ? { ...r, outcome: 0 as const } : r);
    expect(estimateRisk(c, changed).probability).toBe(.8);
    c.insurer = 'Unknown synthetic insurer'; c.probability = .99;
    expect(assess(c, createSession().settings).decision).toBe('REVIEW');
    expect(assess(c, createSession().settings).risk.probability).toBeNull();
  });
  it('calculates Wilson bounds correctly at zero and complete observed success', () => {
    expect(wilson95(0, 100)[0]).toBe(0); expect(wilson95(100, 100)[1]).toBe(1);
    expect(wilson95(0, 100)[1]).toBeCloseTo(.0369935, 5);
    expect(() => wilson95(31, 30)).toThrow();
  });
  it('reports a Brier score and calibration bins calculated from independent synthetic holdout outcomes', () => {
    const m = riskValidation(); const holdout = SYNTHETIC_HISTORY.filter(r => r.split === 'holdout');
    const trainIds = new Set(SYNTHETIC_HISTORY.filter(r => r.split === 'train').map(r => r.id));
    expect(holdout.some(r => trainIds.has(r.id))).toBe(false);
    let sum = 0;
    for (const row of holdout) {
      const cohort = SYNTHETIC_HISTORY.filter(r => r.split === 'train' && r.insurer === row.insurer && r.denialClass === row.denialClass && r.evidenceState === row.evidenceState);
      const p = cohort.reduce((s, r) => s + r.outcome, 0) / cohort.length;
      sum += (p - row.outcome) ** 2;
    }
    expect(m.holdoutSize).toBe(holdout.length); expect(m.scoredSize).toBe(holdout.length);
    expect(m.brierScore).toBeCloseTo(sum / holdout.length, 12);
    expect(m.calibrationBins.reduce((n, b) => n + b.count, 0)).toBe(holdout.length);
    expect(m.calibrationBins.some(b => b.count > 0 && b.predicted !== b.observed)).toBe(true);
    expect(m.caveat).toMatch(/synthetic/i);
  });
});
describe('economic decision provenance', () => {
  it('prices the maximum offer using the financing cost of that maximum bid', () => {
    const s=createSession();s.settings.apr=.365;
    const a=assess(s.claims[0],s.settings);
    // 31896 + round(31896*.06) + ceil(31896*.10) + 3000 = 40000 cents.
    expect(a.maxOffer).toBe(31896);
  });
  it('shows hypothetical manual economics even without historical support while preserving the hard review gate', () => {
    const s=createSession();changeClaim(s,'CASE-3021',{probability:.5});
    const c=s.claims.find(c=>c.id==='CASE-3021')!,a=assess(c,s.settings);
    expect(c.riskMode).toBe('manual');expect(a.risk.probability).toBeNull();expect(a.probability).toBe(.5);
    expect(a.expectedCollection).toBe(45000);expect(a.decision).toBe('REVIEW');expect(a.eligible).toBe(false);
    expect(a.provenance).toMatch(/hypothetical.*manual/i);expect(()=>purchase(s,c.id)).toThrow();
  });
  it('exposes break-even, policy threshold, downside and full-success contribution', () => {
    const s = createSession(); const a = assess(s.claims[0], s.settings);
    expect(a.breakEvenProbability).toBe(.66); expect(a.policyProbability).toBe(.72);
    expect(a.downsideContribution).toBe(-33000); expect(a.fullSuccessContribution).toBe(17000);
    expect(a.provenance).toMatch(/historical/i);
    changeClaim(s, 'CASE-1042', { probability: .5 });
    expect(s.claims[0].riskMode).toBe('manual');
    expect(assess(s.claims[0], s.settings).expectedContribution).toBe(-8000);
    expect(assess(s.claims[0], s.settings).provenance).toMatch(/manual/i);
  });
  it('holds unsupported cases without precise odds then matches newly supplied synthetic evidence', () => {
    const s = createSession(); const missing = s.claims.find(c => c.id === 'CASE-3021')!;
    expect(missing.risk?.probability).toBeNull();
    chaos(s, missing.id, 'inject'); expect(missing.risk?.status).toBe('SUPPORTED'); expect(assess(missing, s.settings).eligible).toBe(true);
    purchase(s, missing.id); const price = missing.purchasePrice;
    chaos(s, missing.id, 'missing'); expect(missing.risk?.probability).toBeNull(); expect(missing.purchasePrice).toBe(price);
  });
});
describe('qualitative risk analysis boundary', () => {
  const valid = { factors: [{ code: 'DOCUMENTATION_PRESENT', sources: ['E-1042-A'] }], narrative: 'The supplied verified document supports a documentation response.', requiresHuman: false };
  it('rejects numerical forecasts, financial bids, unsupported factor codes and cross-claim citations', () => {
    const c = createSession().claims[0];
    expect(() => validateRiskReview({ ...valid, probability: .93 }, c)).toThrow();
    expect(() => validateRiskReview({ ...valid, bid: 40000 }, c)).toThrow();
    expect(() => validateRiskReview({ ...valid, factors: [{ code: 'GUARANTEED_WIN', sources: [] }] }, c)).toThrow();
    expect(() => validateRiskReview({ ...valid, factors: [{ code: 'DOCUMENTATION_PRESENT', sources: ['E-6077-A'] }] }, c)).toThrow();
    expect(() => validateRiskReview({ ...valid, narrative: 'The odds are 93% and advance $400.' }, c)).toThrow();
  });
  it('discards unsupported clinical and approval prose and builds the summary from validated factors only', () => {
    const c=createSession().claims[0];
    const review=validateRiskReview({factors:[{code:'HISTORICAL_SUPPORT',sources:[]}],narrative:'The patient has severe cancer and the insurer accepted the appeal.',requiresHuman:false},c);
    expect(review.narrative).toBe(review.factors[0].explanation);
    expect(JSON.stringify(review)).not.toMatch(/cancer|accepted the appeal/i);
  });
  it.each(['noopOffer','repeat','cohortChange'] as const)('latches legacy human review before %s can invalidate the visible analysis', action => {
    const s=createSession(),c=s.claims[0];c.riskReview={...validateRiskReview(valid,c),requiresHuman:true};
    expect(c.humanRiskHold).toBeUndefined();
    if(action==='noopOffer')changeClaim(s,c.id,{offer:c.offer});
    else if(action==='repeat')chaos(s,c.id,'repeat');
    else {c.insurer='Northstar Assurance';refreshRisk(c);}
    expect(c.humanRiskHold?.source).toBe('gemini');
    expect(assess(c,s.settings).decision).toBe('REVIEW');expect(()=>purchase(s,c.id)).toThrow();
    resetClaim(s,c.id);expect(s.claims[0].humanRiskHold).toBeUndefined();expect(assess(s.claims[0],s.settings).eligible).toBe(true);
  });
  it('cannot lift a human hold through another favorable analysis, a provider failure, or clearing a cohort review', async () => {
    vi.stubEnv('GEMINI_API_KEY','test-only');
    const reply=(requiresHuman:boolean)=>Response.json({candidates:[{content:{role:'model',parts:[{text:JSON.stringify({...valid,requiresHuman})}]},finishReason:'STOP'}]});
    vi.stubGlobal('fetch',async()=>reply(true));
    const s=createSession();await executeCommand(s,parseCommand({command:'analyze',revision:0,claimId:'CASE-1042'}));
    const hold=s.claims[0].humanRiskHold;expect(hold).toBeDefined();
    vi.stubGlobal('fetch',async()=>reply(false));await executeCommand(s,parseCommand({command:'analyze',revision:0,claimId:'CASE-1042'}));
    expect(s.claims[0].humanRiskHold).toEqual(hold);expect(assess(s.claims[0],s.settings).eligible).toBe(false);
    vi.stubGlobal('fetch',async()=>Response.json({error:{code:429,message:'Quota exceeded'}},{status:429}));
    await executeCommand(s,parseCommand({command:'analyze',revision:0,claimId:'CASE-1042'}));
    expect(s.claims[0].riskReview?.status).toBe('UNAVAILABLE');expect(s.claims[0].humanRiskHold).toEqual(hold);
    expect(s.claims[0].riskReview?.requiresHuman).toBe(true);expect(assess(s.claims[0],s.settings).decision).toBe('REVIEW');
  });
  it('keeps the funded human hold after scenario controls clear the visible review', async () => {
    vi.stubEnv('GEMINI_API_KEY','test-only');
    vi.stubGlobal('fetch',async()=>Response.json({candidates:[{content:{role:'model',parts:[{text:JSON.stringify({...valid,requiresHuman:true})}]},finishReason:'STOP'}]}));
    const s=createSession();purchase(s,'CASE-1042');await executeCommand(s,parseCommand({command:'analyze',claimId:'CASE-1042',revision:0}));
    chaos(s,'CASE-1042','repeat');expect(s.claims[0].riskReview).toBeUndefined();step(s,'CASE-1042');
    expect(s.claims[0].recovery?.terminalReason).toBe('HUMAN_RISK_REVIEW');expect(s.claims[0].status).toBe('ESCALATED');
    expect(s.ledger.filter(e=>e.type==='COLLECTION')).toHaveLength(0);
  });
  it('retains the human-review outcome when another scenario gate changes underneath the hold', () => {
    const s=createSession();purchase(s,'CASE-1042');const c=s.claims[0];
    c.riskReview={...validateRiskReview(valid,c),requiresHuman:true};chaos(s,c.id,'expired');
    expect(assess(c,s.settings).decision).toBe('REVIEW');step(s,c.id);
    expect(c.recovery?.terminalReason).toBe('HUMAN_RISK_REVIEW');
  });
  it('labels deterministic fallback honestly and never changes the empirical probability', async () => {
    vi.stubEnv('GEMINI_API_KEY', ''); const s = createSession(); const probability = s.claims[0].probability;
    await executeCommand(s, parseCommand({ command: 'analyze', revision: 0, claimId: 'CASE-1042' }));
    expect(s.claims[0].riskReview?.source).toBe('rules'); expect(s.claims[0].riskReview?.status).toBe('COMPLETE');
    expect(s.claims[0].probability).toBe(probability); expect(s.ledger).toHaveLength(0);
  });
  it('keeps a qualitative human hold across a repeated underwriting calculation', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-only');
    vi.stubGlobal('fetch', async () => Response.json({ candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify({ ...valid, requiresHuman: true }) }] }, finishReason: 'STOP' }] }));
    const s=createSession();await executeCommand(s,parseCommand({command:'analyze',revision:0,claimId:'CASE-1042'}));
    expect(assess(s.claims[0],s.settings).decision).toBe('REVIEW');
    await executeCommand(s,parseCommand({command:'underwrite',revision:0}));
    expect(assess(s.claims[0],s.settings).decision).toBe('REVIEW');
  });
  it('escalates an already-funded claim when its qualitative review requires a human', async () => {
    vi.stubEnv('GEMINI_API_KEY','test-only');
    let calls=0;
    vi.stubGlobal('fetch',async()=>{calls++;return Response.json({candidates:[{content:{role:'model',parts:[{text:JSON.stringify({...valid,requiresHuman:true})}]},finishReason:'STOP'}]});});
    const s=createSession();purchase(s,'CASE-1042');
    await executeCommand(s,parseCommand({command:'analyze',claimId:'CASE-1042',revision:0}));
    step(s,'CASE-1042');
    expect(s.claims[0].recovery?.terminalReason).toBe('HUMAN_RISK_REVIEW');
    expect(s.claims[0].status).toBe('ESCALATED');
    expect(s.ledger.filter(e=>e.type==='COLLECTION')).toHaveLength(0);
    expect(calls).toBe(1);
  });
  it('accepts only verified qualitative factors from Gemini and retains hard gates', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-only');
    vi.stubGlobal('fetch', async () => Response.json({ candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify(valid) }] }, finishReason: 'STOP' }] }));
    const c = createSession().claims[0]; const review = await reviewRisk(c);
    expect(review.source).toBe('gemini'); expect(review.factors[0].explanation).toMatch(/verified/i);
    expect(c.probability).toBe(.8);
  });
});
