import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from '../src/lib/fixtures.ts';
import { purchase, step, portfolio, chaos, mockInsurer } from '../src/lib/engine.ts';
for(const [id,reason,collected] of [['CASE-1042','RECOVERED',50000],['CASE-4109','REPEATED_NO_PROGRESS',0],['CASE-6077','PARTIAL',35000]] as const) {
  test(`${id}: real bounded state transitions and idempotent ledger`,()=>{
    const s=createSession(); purchase(s,id); purchase(s,id);
    assert.equal(s.ledger.filter(e=>e.type==='PURCHASE').length,1);
    const c=s.claims.find(c=>c.id===id)!;
    for(let i=0;i<12&&!c.recovery?.terminalReason;i++) step(s,id);
    assert.equal(c.recovery?.terminalReason,reason);
    assert.equal(portfolio(s).collected,collected);
    const before=JSON.stringify(s.ledger); step(s,id); assert.equal(JSON.stringify(s.ledger),before);
  });
}
test('missing and contradictory evidence never becomes a successful recovery',()=>{
  for(const [kind,reason] of [['missing','EVIDENCE_MISSING'],['conflict','EVIDENCE_CONFLICT'],['expired','DEADLINE_EXPIRED'],['negative','NEGATIVE_EXPECTED_VALUE'],['specialist','SPECIALIST_REQUIRED']] as const){
    const s=createSession(); purchase(s,'CASE-1042'); chaos(s,'CASE-1042',kind); step(s,'CASE-1042');
    assert.equal(s.claims[0].recovery?.terminalReason,reason); assert.equal(portfolio(s).collected,0);
  }
});
test('unsupported insurer draft denied independently',()=>{
  const c=createSession().claims.find(c=>c.id==='CASE-3021')!;
  assert.equal(mockInsurer(c,[],'Persuasive unsupported claim').status,'DENIED');
});
