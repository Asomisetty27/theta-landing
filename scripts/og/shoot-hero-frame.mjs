// Fast single-frame preview of the hero scene at an arbitrary virtual time.
// Reuses the deterministic clock-step path from capture-hero.mjs so the frame
// is bit-identical to what the full video would show at that timestamp — but
// renders ONE frame in ~20s instead of a 30-min full capture.
//
// Usage: node scripts/og/shoot-hero-frame.mjs <seconds> <out.png> [fps=24]
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const T = Number(process.argv[2] ?? 0);
const OUT = process.argv[3] ?? '/tmp/hero-frame.png';
const FPS = Number(process.argv[4] ?? 24);
const FRAME_MS = 1000 / FPS;

const dist = '/Users/amogh/theta-landing/dist';
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml' };
const server = createServer((req, res) => {
  let p = path.join(dist, req.url.split('?')[0]);
  if (!existsSync(p) || !path.extname(p)) p = path.join(dist, 'index.html');
  res.setHeader('Content-Type', mime[path.extname(p)] ?? 'application/octet-stream');
  res.end(readFileSync(p));
});
await new Promise(r => server.listen(4177, r));

const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=metal', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 2560, height: 1440 } });
await page.clock.install();
await page.goto('http://localhost:4177/capture/hero?capture=1', { waitUntil: 'domcontentloaded' });
await page.clock.pauseAt(Date.now() + 60_000);

for (let i = 0; i < 120; i++) {
  await page.clock.runFor(100);
  await page.waitForTimeout(100);
  if (await page.locator('canvas').count() > 0 && i > 30) break;
}
await page.waitForLoadState('networkidle');
for (let i = 0; i < 30; i++) { await page.clock.runFor(100); await page.waitForTimeout(50); }

// Step the virtual clock to the target time in FPS-sized increments so the
// authored camera path lands exactly where it would in the video.
const steps = Math.round(T / (FRAME_MS / 1000));
for (let f = 0; f < steps; f++) await page.clock.runFor(FRAME_MS);
await page.waitForTimeout(120); // let the last frame settle

await page.locator('canvas').first().screenshot({ path: OUT });
console.log('shot', OUT, 'at t=', T);
await browser.close();
server.close();
