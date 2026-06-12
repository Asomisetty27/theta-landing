// Generalized deterministic scene capture → H.264 mp4.
// Usage: node scripts/og/capture-scene.mjs <route> <seconds> <fps> <out.mp4>
//   e.g. node scripts/og/capture-scene.mjs /capture/datacenter 36 24 /tmp/datacenter-poc.mp4
// Same mechanics as capture-hero.mjs: Playwright clock API virtualizes
// rAF/timers so the page renders exactly one step per runFor(); frames land
// in /tmp/scene-frames; Homebrew ffmpeg assembles the video.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROUTE = process.argv[2] ?? '/capture/hero';
const SECONDS = Number(process.argv[3] ?? 12);
const FPS = Number(process.argv[4] ?? 24);
const OUT = process.argv[5] ?? '/tmp/scene-poc.mp4';
const FRAMES = Math.round(SECONDS * FPS);
const FRAME_MS = 1000 / FPS;
const FRAME_DIR = '/tmp/scene-frames';
const FFMPEG = '/opt/homebrew/bin/ffmpeg';
const PORT = 4177;

rmSync(FRAME_DIR, { recursive: true, force: true });
mkdirSync(FRAME_DIR, { recursive: true });

const dist = '/Users/amogh/theta-landing/dist';
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.mp4':'video/mp4' };
const server = createServer((req, res) => {
  let p = path.join(dist, req.url.split('?')[0]);
  if (!existsSync(p) || !path.extname(p)) p = path.join(dist, 'index.html');
  res.setHeader('Content-Type', mime[path.extname(p)] ?? 'application/octet-stream');
  res.end(readFileSync(p));
});
await new Promise(r => server.listen(PORT, r));

const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=metal', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.clock.install();
await page.goto(`http://localhost:${PORT}${ROUTE}?capture=1`, { waitUntil: 'domcontentloaded' });
// CRITICAL: pause, or the clock keeps ticking in real time between runFor
// steps and wall-clock leaks into the scene (the "sped up" capture bug).
await page.clock.pauseAt(Date.now() + 60_000);

for (let i = 0; i < 120; i++) {
  await page.clock.runFor(100);
  await page.waitForTimeout(100);
  if (await page.locator('canvas').count() > 0 && i > 30) break;
}
await page.waitForLoadState('networkidle');
for (let i = 0; i < 30; i++) { await page.clock.runFor(100); await page.waitForTimeout(50); }

// Clipped JPEG page-shots: element PNG screenshots ran ~15 s/frame on this
// scene (PNG encode + element resolution overhead); page.screenshot with a
// clip + JPEG q95 is several times faster, and the q95 artifacts vanish
// under the downstream H.264 encode.
const clip = await page.locator('canvas').first().boundingBox();
const t0 = Date.now();
for (let f = 0; f < FRAMES; f++) {
  await page.clock.runFor(FRAME_MS);
  await page.screenshot({ path: path.join(FRAME_DIR, `f${String(f).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 95, clip });
  if (f % 48 === 0 && f > 0) {
    const rate = f / ((Date.now() - t0) / 1000);
    console.log(`frame ${f}/${FRAMES} (${rate.toFixed(2)} fps capture, eta ${Math.round((FRAMES - f) / rate / 60)}m)`);
  }
}
await browser.close();
server.close();

execFileSync(FFMPEG, [
  '-y', '-loglevel', 'error',
  '-framerate', String(FPS),
  '-i', path.join(FRAME_DIR, 'f%04d.jpg'),
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
  '-crf', '21', '-preset', 'slow',
  '-vf', 'scale=1920:-2',
  '-movflags', '+faststart',
  OUT,
], { stdio: 'inherit' });
console.log('wrote', OUT);
