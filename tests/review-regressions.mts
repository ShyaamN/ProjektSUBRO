import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession,makeClaim } from '../src/lib/fixtures.ts';
import { purchase,step,portfolio,chaos,resetClaim } from '../src/lib/engine.ts';
test('financing cost appears in realized expense as well as expected math',()=>{
  const s=createSession();s.settings.apr=.365;purchase(s,'CASE-1042');
  for(let i=0;i<10&&!s.claims[0].recovery?.terminalReason;i++)step(s,'CASE-1042');
  assert.equal(portfolio(s).expenses,4800);assert.equal(portfolio(s).realizedContribution,15200);
});
test('settled stopped-case work cost is not reserved for a second time',()=>{
  const s=createSession();s.settings.capital=66000;s.claims.push(makeClaim('CASE-9999',0,'documentation',50000));
  purchase(s,'CASE-1042');chaos(s,'CASE-1042','missing');step(s,'CASE-1042');
  assert.equal(portfolio(s).cash,33000);
  purchase(s,'CASE-9999');assert.equal(portfolio(s).cash,3000);
});
test('case reset cannot reverse collections already committed to other recoveries',()=>{
  const s=createSession();s.settings.capital=33000;purchase(s,'CASE-1042');
  for(let i=0;i<10&&!s.claims[0].recovery?.terminalReason;i++)step(s,'CASE-1042');
  purchase(s,'CASE-7073');purchase(s,'CASE-6077');
  const before=JSON.stringify(s);
  assert.throws(()=>resetClaim(s,'CASE-1042'),/capital|commit/i);
  assert.equal(JSON.stringify(s),before);
});
test('human-required action is handed off without mock submission',()=>{
  const s=createSession();purchase(s,'CASE-1042');for(let i=0;i<4;i++)step(s,'CASE-1042');
  step(s,'CASE-1042',{action:'SUBMIT_TO_MOCK_INSURER',reason:'Human must review this filing.',sources:['E-1042-A'],requiresHuman:true});
  assert.equal(s.claims[0].status,'ESCALATED');assert.equal(s.claims[0].recovery?.submissions,0);assert.equal(portfolio(s).collected,0);
});
test('independent final insurer denial closes a loss with correct signs',()=>{
  const s=createSession();purchase(s,'CASE-1042');chaos(s,'CASE-1042','finalDenial');
  for(let i=0;i<10&&!s.claims[0].recovery?.terminalReason;i++)step(s,'CASE-1042');
  assert.equal(s.claims[0].status,'LOSS');assert.equal(portfolio(s).collected,0);assert.equal(portfolio(s).realizedContribution,-33000);
});
