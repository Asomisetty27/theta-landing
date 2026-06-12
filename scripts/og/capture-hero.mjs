// Deterministic frame-by-frame capture of the hero GPU scene → H.264 mp4.
//
// Playwright's clock API virtualizes performance.now/rAF/timers, so the
// page renders exactly one animation step per clock.runFor() call — no
// realtime jitter, and render settings can be arbitrarily slow (the scene's
// ?capture=1 mode turns everything up). Frames land in a temp dir and ffmpeg
// (Homebrew, libx264) assembles the video.
//
// Usage: node scripts/og/capture-hero.mjs [seconds=12] [fps=30]
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const SECONDS = Number(process.argv[2] ?? 12);
const FPS = Number(process.argv[3] ?? 30);
const FRAMES = Math.round(SECONDS * FPS);
const FRAME_MS = 1000 / FPS;
const FRAME_DIR = '/tmp/hero-frames';
const OUT = '/tmp/hero-poc.mp4';
const FFMPEG = '/opt/homebrew/bin/ffmpeg';

rmSync(FRAME_DIR, { recursive: true, force: true });
mkdirSync(FRAME_DIR, { recursive: true });

const dist = '/Users/amogh/theta-landing/dist';
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml' };
const server = createServer((req, res) => {
  let p = path.join(dist, req.url.split('?')[0]);
  if (!existsSync(p) || !path.extname(p)) p = path.join(dist, 'index.html');
  res.setHeader('Content-Type', mime[path.extname(p)] ?? 'application/octet-stream');
  res.end(readFileSync(p));
});
await new Promise(r => server.listen(4175, r));

// New-headless Chromium (full browser, not the headless shell) with
// Metal-backed ANGLE — real GPU rendering without a visible window.
// SwiftShader stalled indefinitely on the capture-mode settings.
const browser = await chromium.launch({
  channel: 'chromium',
  args: ['--use-angle=metal', '--enable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 2560, height: 1440 } });
await page.clock.install();
// Bare scene route — no landing-page text/HUD overlays baked into frames
await page.goto('http://localhost:4175/capture/hero?capture=1', { waitUntil: 'domcontentloaded' });
// CRITICAL: install() alone leaves the clock ticking in REAL time — runFor
// only adds jumps on top. Unpaused, every slow screenshot leaked seconds of
// wall-clock into the scene between frames (the "sped up" videos). Pause so
// virtual time advances ONLY via runFor.
await page.clock.pauseAt(Date.now() + 60_000);

// Warm-up: lazy chunks + textures load over (real) network while the page's
// virtual clock advances in small steps. Interleave the two until the canvas
// exists, then settle.
for (let i = 0; i < 120; i++) {
  await page.clock.runFor(100);
  await page.waitForTimeout(100);
  if (await page.locator('canvas').count() > 0 && i > 30) break;
}
await page.waitForLoadState('networkidle');
for (let i = 0; i < 30; i++) { await page.clock.runFor(100); await page.waitForTimeout(50); }

const canvas = page.locator('canvas').first();
const t0 = Date.now();
for (let f = 0; f < FRAMES; f++) {
  await page.clock.runFor(FRAME_MS);
  await canvas.screenshot({ path: path.join(FRAME_DIR, `f${String(f).padStart(4, '0')}.png`) });
  if (f % 30 === 0) {
    const rate = (f + 1) / ((Date.now() - t0) / 1000);
    console.log(`frame ${f}/${FRAMES} (${rate.toFixed(1)} fps capture, eta ${Math.round((FRAMES - f) / rate)}s)`);
  }
}
await browser.close();
server.close();

execFileSync(FFMPEG, [
  '-y', '-framerate', String(FPS),
  '-i', path.join(FRAME_DIR, 'f%04d.png'),
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
  '-crf', '19', '-preset', 'slow',
  '-vf', 'scale=2560:-2',
  '-movflags', '+faststart',
  OUT,
], { stdio: 'inherit' });
console.log('wrote', OUT);
