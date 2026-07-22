import { test } from '@playwright/test';
test('exp-final', async ({ page }) => {
  const logs = [];
  page.on('console', msg => logs.push(msg.text()));
  
  await page.goto('http://localhost:3000/dashboard/1/prompts/6');
  await page.waitForTimeout(3000);
  
  await page.evaluate(() => {
    window.fetch = async (...args: any[]) => {
      const res = await window._origFetch!((args[0] as RequestInfo), args[1]);
      const clone = res.clone();
      const text = await clone.text();
      console.log('FETCH-RESULT:', args[0].toString(), res.status, text.substring(0,200));
      return res;
    };
  });
  
  await page.locator('button:has-text("新建实验")').first().click();
  await page.waitForTimeout(10000);
  
  // Find any FETCH-RESULT with PATCH
  const patchLogs = logs.filter(l => l.includes('PATCH'));
  console.log('PATCH logs:', patchLogs.length);
  patchLogs.forEach(l => console.log(' ', l.substring(0,300)));
  console.log('Final URL:', page.url());
  
  // Also check if router is available
  const hasRouter = await page.evaluate(() => {
    return typeof (window as any).__NEXT_ROUTER !== 'undefined';
  });
  console.log('Next router exists:', hasRouter);
});
