// Renders scripts/og/thermal-flow.html → public/textures/thermal-flow.png
// (1600×900, transparent background — layers over the page bg)
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const input = path.join(here, 'thermal-flow.html');
const output = path.join(here, '../../public/textures/thermal-flow.png');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
await page.goto('file://' + input, { waitUntil: 'networkidle' });
await page.screenshot({ path: output, type: 'png', omitBackground: true });
await browser.close();
console.log('wrote', output);
