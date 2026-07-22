import { test } from '@playwright/test';
test('exp-full', async ({ page }) => {
  const errors = [];
  page.on('console', msg => { if(msg.type()==='error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  
  await page.goto('http://localhost:3000/dashboard/1/prompts/6');
  await page.waitForTimeout(3000);
  
  // Log current state
  const hasData = await page.evaluate(() => !!document.querySelector('textarea'));
  console.log('Editor loaded:', hasData);
  
  // Click top experiment button
  const btn = page.locator('header button:has-text("新建实验"), nav button:has-text("新建实验")').first();
  // Fallback: any button with "实验"
  const anyBtn = page.locator('button:has-text("实验")');
  console.log('Any experiment buttons:', await anyBtn.count());
  
  // Try clicking each one  
  for (let i = 0; i < await anyBtn.count(); i++) {
    const b = anyBtn.nth(i);
    const text = await b.textContent();
    console.log(`Button ${i}: "${text.trim()}"`);
    if (text.includes('新建实验') || text.includes('运行实验')) {
      console.log(`  -> Clicking...`);
      await b.click();
      await page.waitForTimeout(5000);
      console.log(`  -> URL: ${page.url()}`);
    }
  }
  
  console.log('Errors:', errors.length ? errors : 'none');
});
