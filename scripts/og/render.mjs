// Renders scripts/og/og-card.html → public/og-image.png (1200×630)
// Usage: node scripts/og/render.mjs [input.html] [output.png]
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const input = path.resolve(process.argv[2] ?? path.join(here, 'og-card.html'));
const output = path.resolve(process.argv[3] ?? path.join(here, '../../public/og-image.png'));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
await page.goto('file://' + input, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: output, type: 'png' });
await browser.close();
console.log('wrote', output);
