// Fast single-frame preview of the hero scene at an arbitrary virtual time.
// Reuses the deterministic clock-step path from capture-hero.mjs so the frame
// is bit-identical to what the full video would show at that timestamp — but
// renders ONE frame in ~20s instead of a 30-min full capture.
//
// Usage: node scripts/og/shoot-scene-frame.mjs <route> <seconds> <out.png> [fps=24]
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROUTE = process.argv[2] ?? '/capture/hero';
const T = Number(process.argv[3] ?? 0);
const OUT = process.argv[4] ?? '/tmp/scene-frame.png';
const FPS = Number(process.argv[5] ?? 24);
const FRAME_MS = 1000 / FPS;

const dist = '/Users/amogh/theta-landing/dist';
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml' };
const server = createServer((req, res) => {
  let p = path.join(dist, req.url.split('?')[0]);
  if (!existsSync(p) || !path.extname(p)) p = path.join(dist, 'index.html');
  res.setHeader('Content-Type', mime[path.extname(p)] ?? 'application/octet-stream');
  res.end(readFileSync(p));
});
await new Promise(r => server.listen(4181, r));

const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=metal', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 2560, height: 1440 } });
await page.clock.install();
await page.goto('http://localhost:4181' + ROUTE + '?capture=1', { waitUntil: 'domcontentloaded' });
await page.clock.pauseAt(Date.now() + 60_000);

for (let i = 0; i < 120; i++) {
  await page.clock.runFor(100);
  await page.waitForTimeout(100);
  if (await page.locator('canvas').count() > 0 && i > 30) break;
}
await page.waitForLoadState('networkidle');
for (let i = 0; i < 30; i++) { await page.clock.runFor(100); await page.waitForTimeout(50); }

// If the scene exposes story time (DataCenterScene in capture mode), treat
// T as an ABSOLUTE story time and advance the clock to land exactly there —
// the warm-up's virtual advance varies run-to-run, so relative stepping
// hits different beats across builds. Falls back to relative stepping.
const story = await page.evaluate(() => {
  const w = window;
  return w.__storyT ? { t: w.__storyT(), loop: w.__storyLoop } : null;
});
let remaining = T;
if (story) {
  remaining = (((T - story.t) % story.loop) + story.loop) % story.loop;
  console.log(`story time ${story.t.toFixed(2)}s → advancing ${remaining.toFixed(2)}s to hit story t=${T}`);
}
const steps = Math.round(remaining / (FRAME_MS / 1000));
for (let f = 0; f < steps; f++) await page.clock.runFor(FRAME_MS);
await page.waitForTimeout(120); // let the last frame settle

await page.locator('canvas').first().screenshot({ path: OUT });
console.log('shot', OUT, 'at t=', T);
await browser.close();
server.close();
