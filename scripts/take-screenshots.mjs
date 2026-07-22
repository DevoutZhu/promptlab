import { chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const VIEWPORT = { width: 1280, height: 800 };
const OUTPUT_DIR = 'public/screenshots';

const pages = [
  { name: 'hero', path: '/' },
  { name: 'dashboard', path: '/dashboard' },
  { name: 'prompt-editor', path: '/dashboard/1/prompts/6' },
  { name: 'experiment', path: '/dashboard/1' },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });

  for (const page of pages) {
    console.log(`Taking screenshot: ${page.name} (${page.path})`);
    const p = await context.newPage();
    await p.goto(`${BASE_URL}${page.path}`, { waitUntil: 'networkidle' });
    // Small extra wait for any animations to settle
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUTPUT_DIR}/${page.name}.png`, fullPage: true });
    console.log(`  -> Saved ${OUTPUT_DIR}/${page.name}.png`);
    await p.close();
  }

  await browser.close();
  console.log('All screenshots taken successfully.');
}

main().catch((err) => {
  console.error('Screenshot error:', err);
  process.exit(1);
});
