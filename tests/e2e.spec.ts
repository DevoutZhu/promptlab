import { test, expect } from '@playwright/test';

async function waitForDashboard(page: any) {
  await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
}

/* ------------------------------------------------------------------ */
/*  1. Homepage                                                       */
/* ------------------------------------------------------------------ */
test('homepage loads and shows PromptLab title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/PromptLab/);
});

/* ------------------------------------------------------------------ */
/*  2. Dashboard loads                                                */
/* ------------------------------------------------------------------ */
test('dashboard loads and shows project list', async ({ page }) => {
  await page.goto('/dashboard');
  await waitForDashboard(page);
  await expect(page.locator('text=Customer Support Bot').first()).toBeVisible({ timeout: 10000 });
});

/* ------------------------------------------------------------------ */
/*  3. Create project                                                 */
/* ------------------------------------------------------------------ */
test('can create a new project', async ({ page }) => {
  const name = 'E2E-' + Date.now();
  await page.goto('/dashboard');
  await waitForDashboard(page);

  await page.locator('button:has-text("创建项目")').click();
  await page.locator('#project-name').fill(name);
  await page.locator('button:has-text("创建项目"):not([disabled])').last().click();
  await expect(page.locator(`text=${name}`).first()).toBeVisible({ timeout: 10000 });

  // Cleanup
  page.once('dialog', async (d) => { await d.accept(); });
  const card = page.getByText(name, { exact: true }).locator('..').locator('..');
  await card.hover();
  await card.locator('button').first().click();
  await expect(page.getByText(name, { exact: true })).not.toBeVisible({ timeout: 10000 });
});

/* ------------------------------------------------------------------ */
/*  4. Cancel create modal                                            */
/* ------------------------------------------------------------------ */
test('cancel create modal closes it', async ({ page }) => {
  await page.goto('/dashboard');
  await waitForDashboard(page);
  await page.locator('button:has-text("创建项目")').click();
  await page.locator('button:has-text("取消")').click();
  await expect(page.locator('#project-name')).not.toBeVisible({ timeout: 5000 });
});

/* ------------------------------------------------------------------ */
/*  5. Empty name validation                                          */
/* ------------------------------------------------------------------ */
test('shows error when submitting with empty name', async ({ page }) => {
  await page.goto('/dashboard');
  await waitForDashboard(page);
  await page.locator('button:has-text("创建项目")').click();
  await page.locator('button:has-text("创建项目"):not([disabled])').last().click();
  await expect(page.locator('.bg-red-50').first()).toBeVisible({ timeout: 5000 });
});

/* ------------------------------------------------------------------ */
/*  6. Search filter                                                  */
/* ------------------------------------------------------------------ */
test('search filters project list', async ({ page }) => {
  await page.goto('/dashboard');
  await waitForDashboard(page);
  const input = page.locator('input[placeholder*="搜索"]');
  await input.fill('Customer');
  await expect(page.locator('text=Customer Support Bot').first()).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=Content Generator')).not.toBeVisible({ timeout: 5000 });
});

/* ------------------------------------------------------------------ */
/*  7. Delete project                                                 */
/* ------------------------------------------------------------------ */
test('can delete a project', async ({ page }) => {
  // First create one to delete
  const name = 'E2E-Del-' + Date.now();
  await page.goto('/dashboard');
  await waitForDashboard(page);
  await page.locator('button:has-text("创建项目")').click();
  await page.locator('#project-name').fill(name);
  await page.locator('button:has-text("创建项目"):not([disabled])').last().click();
  await expect(page.locator(`text=${name}`).first()).toBeVisible({ timeout: 10000 });

  // Delete it
  page.once('dialog', async (d) => { await d.accept(); });
  const card = page.getByText(name, { exact: true }).locator('..').locator('..');
  await card.hover();
  await card.locator('button').first().click();
  await expect(page.getByText(name, { exact: true })).not.toBeVisible({ timeout: 10000 });
});

/* ------------------------------------------------------------------ */
/*  8. Language switching                                             */
/* ------------------------------------------------------------------ */
test('language switcher toggles between Chinese and English', async ({ page }) => {
  await page.goto('/dashboard');
  await waitForDashboard(page);
  await expect(page.locator('h1')).toContainText('项目');
  await page.locator('button:has-text("EN")').click();
  await expect(page.locator('h1')).toContainText('Projects');
  await page.locator('button:has-text("中")').click();
  await expect(page.locator('h1')).toContainText('项目');
});

/* ------------------------------------------------------------------ */
/*  9. Project detail                                                 */
/* ------------------------------------------------------------------ */
test('clicking a project card navigates to project detail', async ({ page }) => {
  await page.goto('/dashboard');
  await waitForDashboard(page);
  const link = page.locator('main a[href*="/dashboard/"]').first();
  await expect(link).toBeVisible({ timeout: 5000 });
  await Promise.all([
    page.waitForURL(/\/dashboard\/\d+/),
    link.click(),
  ]);
  await expect(page.locator('h1')).toContainText(/Customer Support Bot|Content Generator|Code Assistant/);
});

/* ------------------------------------------------------------------ */
/*  10. Prompt detail + editor                                        */
/* ------------------------------------------------------------------ */
test('prompt detail page loads with editor', async ({ page }) => {
  await page.goto('/dashboard/1');
  await expect(page.locator('h1')).toContainText('Customer Support Bot', { timeout: 10000 });
  const row = page.locator('tr[tabindex]').first();
  await expect(row).toBeVisible({ timeout: 10000 });
  await Promise.all([
    page.waitForURL(/\/dashboard\/\d+\/prompts\/\d+/),
    row.click(),
  ]);
  await expect(page.locator('textarea').first()).toBeVisible({ timeout: 10000 });
});

/* ------------------------------------------------------------------ */
/*  11. New experiment button                                         */
/* ------------------------------------------------------------------ */
test('new experiment button creates experiment and navigates', async ({ page }) => {
  await page.goto('/dashboard/1/prompts/6');
  await expect(page.locator('textarea').first()).toBeVisible({ timeout: 10000 });
  const btn = page.locator('button:has-text("新建实验")');
  await expect(btn).toBeVisible();
  await btn.click();
  await page.waitForURL(/\/dashboard\/1(?!\/prompts)/, { timeout: 10000 });
  await expect(page.locator('h1')).toContainText('Customer Support Bot');
});

/* ------------------------------------------------------------------ */
/*  12. Settings and Docs pages                                       */
/* ------------------------------------------------------------------ */
test('settings page loads', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.locator('text=版本号')).toBeVisible({ timeout: 5000 });
});

test('docs page loads', async ({ page }) => {
  await page.goto('/docs');
  await expect(page.locator('text=快速开始')).toBeVisible({ timeout: 5000 });
});
