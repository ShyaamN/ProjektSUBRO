import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from '../src/lib/fixtures.ts';
import { assess } from '../src/lib/underwriting.ts';
test('100 synthetic claims and exact documented underwriting contract', () => {
  const session = createSession();
  assert.equal(session.claims.length, 100);
  const claim = session.claims.find(c => c.id === 'CASE-1042')!;
  const a = assess(claim, session.settings);
  assert.equal(a.expectedCollection, 40000);
  assert.equal(a.expectedContribution, 7000);
  assert.equal(a.decision, 'BUY_CANDIDATE');
  claim.probability = .5;
  const b = assess(claim, session.settings);
  assert.equal(b.expectedContribution, -8000);
  assert.equal(b.decision, 'DECLINED');
});
