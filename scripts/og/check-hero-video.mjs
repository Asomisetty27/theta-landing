import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
const dist = '/Users/amogh/theta-landing/dist';
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.mp4':'video/mp4' };
const server = createServer((req, res) => {
  let p = path.join(dist, req.url.split('?')[0]);
  if (!existsSync(p) || !path.extname(p)) p = path.join(dist, 'index.html');
  res.setHeader('Content-Type', mime[path.extname(p)] ?? 'application/octet-stream');
  res.end(readFileSync(p));
});
await new Promise(r => server.listen(4176, r));
const browser = await chromium.launch({ channel: 'chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4176/', { waitUntil: 'networkidle' });
await page.waitForTimeout(9000);
await page.screenshot({ path: '/tmp/hero-video-live.png' });
const state = await page.evaluate(() => {
  const v = document.querySelector('video');
  return v ? { t: v.currentTime, paused: v.paused, err: v.error?.code ?? null, w: v.videoWidth } : null;
});
console.log('video state:', JSON.stringify(state));
await browser.close(); server.close();
