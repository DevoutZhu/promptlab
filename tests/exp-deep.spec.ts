import { test } from '@playwright/test';
test('exp-deep', async ({ page }) => {
  const errors = [];
  page.on('console', msg => errors.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => errors.push(`[error] ${err.message}`));
  
  await page.goto('http://localhost:3000/dashboard/1/prompts/6');
  await page.waitForTimeout(3000);
  
  // Inject debug - override fetch to log
  await page.evaluate(() => {
    const origFetch = window.fetch;
    (window as any).fetch = async (...args: any[]) => {
      console.log('FETCH:', args[0], args[1]?.method || 'GET');
      const res = await origFetch(...args);
      console.log('FETCH RESULT:', res.status, (await res.clone().text()).substring(0,100));
      return res;
    };
  });
  
  // Click "新建实验"
  await page.locator('button:has-text("新建实验")').first().click();
  await page.waitForTimeout(5000);
  
  console.log('Errors:', errors.length ? errors.slice(0,10) : 'none');
  console.log('URL:', page.url());
});
