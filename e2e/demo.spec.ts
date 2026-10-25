import { test, expect } from '@playwright/test';

test('claims workspace uses product language and exposes task-oriented navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Claims', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Claims', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Recovery', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Capital', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Outcomes', exact: true })).toBeVisible();
  await expect(page.getByText(/discounted cash offer/i)).toBeVisible();
  await expect(page.getByText(/transferring.*recovery risk/i)).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/synthetic|fabricated|simulat|mock|no real|no actual|hypothetical/i);
});

test('underwriting explains its historical support, break-even and qualitative analysis', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button',{name:'Review assessment',exact:true}).click();
  await expect(page.getByText('80 / 100',{exact:true})).toBeVisible();
  await expect(page.getByText('66%',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Analyze claim',exact:true}).click();
  await expect(page.getByText('Rules review · no Gemini call',{exact:true})).toBeVisible();
  await expect(page.getByTestId('expected-contribution')).toHaveText('+$70.00');
  await page.locator('details').evaluateAll(nodes => nodes.forEach(node => (node as HTMLDetailsElement).open = true));
  await expect(page.locator('body')).not.toContainText(/synthetic|fabricated|simulat|mock|no real|no actual|hypothetical/i);
  await page.locator('.evidence-mini .panel-body > button').first().click();
  await expect(page.getByRole('dialog')).not.toContainText(/synthetic|fabricated|simulat|mock|no real|no actual|hypothetical/i);
  await page.getByRole('button', {name:'Close evidence'}).click();
});

test('a judge can reprice, fund, recover, reconcile and refresh without duplicate collection', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Assess 100 claims', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Assess 100 claims', exact: true }).click();
  await page.getByRole('button', { name: 'Review assessment', exact: true }).click();
  await expect(page.getByTestId('expected-contribution')).toHaveText('+$70.00');
  await page.getByText('Adjust offer & stress-test assumptions', {exact:true}).click();
  await page.getByRole('button', { name: '50% risk shock' }).click();
  await expect(page.getByTestId('expected-contribution')).toHaveText('−$80.00');
  await expect(page.getByRole('button', { name: 'Accept offer', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '80% baseline' }).click();
  await page.getByRole('button', { name: 'Accept offer', exact: true }).click();
  await page.getByRole('button', { name: 'Start agent', exact: true }).click();
  await expect(page.getByText('RECOVERED', { exact: true }).first()).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'View ledger', exact: true }).click();
  await expect(page.getByText('+$170.00', { exact: true }).first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/synthetic|fabricated|simulat|mock|no real|no actual|hypothetical/i);
  await page.reload();
  const response = await page.request.get('/api/demo');
  const { session } = await response.json();
  expect(session.ledger.filter((x: {type:string}) => x.type === 'PURCHASE')).toHaveLength(1);
  expect(session.ledger.filter((x: {type:string}) => x.type === 'COLLECTION')).toHaveLength(1);
  expect(session.claims.find((c: {id:string})=>c.id==='CASE-1042').status).toBe('RECOVERED');
});

test('an unchanged insurer refusal autonomously stops within eight steps', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Review assessment', exact: true }).click();
  await page.getByLabel('Select claim').selectOption('CASE-4109');
  await page.getByRole('button', { name: 'Accept offer', exact: true }).click();
  await page.getByRole('button', { name: 'Start agent', exact: true }).click();
  await expect(page.getByText('REPEATED_NO_PROGRESS', { exact: false }).first()).toBeVisible({ timeout: 30000 });
  const { session } = await (await page.request.get('/api/demo')).json();
  const claim=session.claims.find((c:{id:string})=>c.id==='CASE-4109');
  expect(claim.recovery.steps).toBeLessThanOrEqual(8);
  expect(claim.recovery.submissions).toBe(2);
  expect(session.ledger.filter((x:{type:string})=>x.type==='COLLECTION')).toHaveLength(0);
});

test('missing evidence is review-only and can be introduced explicitly as synthetic data', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Review assessment', exact: true }).click();
  await page.getByLabel('Select claim').selectOption('CASE-3021');
  await expect(page.getByRole('button', { name: 'Accept offer', exact: true })).toBeDisabled();
  const current=await (await page.request.get('/api/demo')).json();
  const add=await page.request.post('/api/demo', {headers:{origin:new URL(page.url()).origin},data:{command:'chaos',claimId:'CASE-3021',kind:'inject',revision:current.session.revision}});
  expect(add.ok()).toBe(true);
  await page.reload();
  await page.getByRole('button', { name: 'Review assessment', exact: true }).click();
  await page.getByLabel('Select claim').selectOption('CASE-3021');
  await expect(page.getByRole('button', { name: 'Accept offer', exact: true })).toBeEnabled();
});

for (const viewport of [{width:1440,height:900},{width:1280,height:720},{width:390,height:844}]) {
  test(`claims remain searchable and navigation works at ${viewport.width}x${viewport.height}`, async ({page}) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByLabel('Search claims').fill('CASE-3021');
    await expect(page.getByRole('row', {name:'Inspect CASE-3021'})).toBeVisible();
    await expect(page.locator('.claim-table tbody tr')).toHaveCount(1);
    await page.getByRole('row', {name:'Inspect CASE-3021'}).click();
    await page.getByRole('button', {name:'Review assessment',exact:true}).click();
    await expect(page.getByRole('heading', {name:'CASE-3021',exact:true})).toBeVisible();
    await expect(page.getByRole('button', {name:'Accept offer',exact:true})).toBeDisabled();
    await page.getByRole('button', {name:'Capital',exact:true}).click();
    await expect(page.getByRole('heading', {name:'Capital',exact:true})).toBeVisible();
    await page.getByLabel('Capital cap',{exact:true}).fill('25000');
    await page.getByLabel('Capital cap',{exact:true}).blur();
    await expect(page.getByLabel('Capital cap',{exact:true})).toHaveValue('25000');
    await page.getByRole('button', {name:'Outcomes',exact:true}).click();
    await expect(page.getByRole('heading', {name:'Outcomes',exact:true})).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.locator('body')).not.toContainText(/synthetic|fabricated|simulat|mock|no real|no actual|hypothetical/i);
  });

}

