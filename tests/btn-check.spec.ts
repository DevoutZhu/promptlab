import { test, expect } from '@playwright/test';
test('btn-new-prompt', async ({ page }) => {
  await page.goto('http://localhost:3000/dashboard/1');
  await page.locator('button:has-text("新建提示词")').click();
  await page.waitForURL(/\/prompts\/\d+/);
  console.log('OK: new prompt');
});
test('btn-edit', async ({ page }) => {
  await page.goto('http://localhost:3000/dashboard/1/prompts/6');
  await page.locator('button:has-text("编辑")').click();
  await expect(page.locator('button:has-text("保存修改")')).toBeVisible();
  console.log('OK: edit');
});
