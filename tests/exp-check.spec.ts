import { test, expect } from '@playwright/test';
test('exp-button', async ({ page }) => {
  page.on('dialog', d => { console.log('ALERT:', d.message()); d.accept(); });
  await page.goto('http://localhost:3000/dashboard/1/prompts/6');
  await page.waitForTimeout(2000);
  // Try to find the experiment button
  const expBtns = page.locator('button:has-text("新建实验")');
  const count = await expBtns.count();
  console.log('Buttons found:', count);
  if (count > 0) {
    await expBtns.first().click();
    await page.waitForTimeout(5000);
    console.log('URL after click:', page.url());
  }
  // Also check console errors
  page.on('console', msg => { if(msg.type()==='error') console.log('CONSOLE ERROR:', msg.text()); });
  await page.waitForTimeout(1000);
});
