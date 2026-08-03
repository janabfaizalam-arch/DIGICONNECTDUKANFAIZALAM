import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const widths = [320, 390, 768, 1440, 1920];
const outDir = path.join(process.cwd(), 'tests', 'visual', 'output');
fs.mkdirSync(outDir, { recursive: true });
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const channel = process.env.PW_CHANNEL || 'chrome';

const browser = await chromium.launch({ channel, headless: true });
const context = await browser.newContext();
const page = await context.newPage();

for (const width of widths) {
  await page.setViewportSize({ width, height: width <= 768 ? 844 : 1024 });
  await page.goto(baseURL + '/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(2000);
  const forbidden = await page.getByText(/Hidden when empty|Empty \/ Hidden|CMS-driven/i).count();
  if (forbidden > 0) throw new Error('Empty-state copy still visible at ' + width);
  const file = path.join(outDir, 'homepage-' + width + '.png');
  await page.screenshot({ path: file, fullPage: true });
  console.log('wrote', file);
  if (width <= 430) {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log('overflow', width, overflow);
  }
}
await browser.close();
console.log('visual capture complete');
