// Full-detail element screenshots of named sections (dark frames don't get
// downscaled the way tall viewport slices do). Usage: node section-shot.mjs <label>
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const LABEL = process.argv[2] || '0';
const OUT = `/tmp/sec-${LABEL}`;
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:8080/', { waitUntil: 'load' });
await page.waitForTimeout(4000);
for (const id of ['hero', 'signal', 'evidence', 'production', 'features', 'gap', 'pricing']) {
  const el = await page.$(`#${id}`);
  if (!el) { console.log('missing', id); continue; }
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  try { await el.screenshot({ path: `${OUT}/${id}.png` }); console.log('shot', id); }
  catch (e) { console.log('fail', id, String(e).slice(0, 80)); }
}
await browser.close();
