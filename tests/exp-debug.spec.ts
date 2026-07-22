import { test } from '@playwright/test';
test('exp-debug', async ({ page }) => {
  const errors = [];
  page.on('console', msg => { if(msg.type()==='error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  
  await page.goto('http://localhost:3000/dashboard/1/prompts/6');
  await page.waitForTimeout(2000);
  
  // Check what's available
  const v = await page.evaluate(() => {
    // Check for any visible error text
    return document.body.innerText.substring(0, 500);
  });
  console.log('Page text:', v.substring(0,200));
  
  await page.locator('button:has-text("新建实验")').first().click();
  await page.waitForTimeout(3000);
  console.log('Errors:', errors.length ? errors : 'none');
  console.log('Final URL:', page.url());
});
