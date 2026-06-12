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
await new Promise(r => server.listen(4179, r));
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4179/', { waitUntil: 'load' });
await page.waitForTimeout(3000);
await page.evaluate(() => document.getElementById('datacenter')?.scrollIntoView({ block: 'center' }));
await page.waitForTimeout(10000);
const state = await page.evaluate(() => {
  const s = document.getElementById('datacenter');
  const v = s?.querySelector('video');
  return { video: !!v, t: v?.currentTime ?? null, paused: v?.paused ?? null, err: v?.error?.code ?? null, hud: !!s?.textContent?.includes('THETA · NODE B07-04') };
});
console.log('datacenter:', JSON.stringify(state));
await page.screenshot({ path: '/tmp/dc-video-live.png' });
await browser.close(); server.close();
