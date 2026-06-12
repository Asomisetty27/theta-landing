import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const tag = process.argv[2] ?? 'baseline';
const dist = '/Users/amogh/theta-landing/dist';
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.woff2':'font/woff2' };
const server = createServer((req, res) => {
  let p = path.join(dist, req.url.split('?')[0]);
  if (!existsSync(p) || !path.extname(p)) p = path.join(dist, 'index.html');
  res.setHeader('Content-Type', mime[path.extname(p)] ?? 'application/octet-stream');
  res.end(readFileSync(p));
});
await new Promise(r => server.listen(4173, r));

const browser = await chromium.launch({ args: ['--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });

// hero: wait for the lazy 3D canvas + a few seconds of animation
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForTimeout(9000);
await page.screenshot({ path: `/tmp/hero-${tag}.png` });

// datacenter: scroll there, IntersectionObserver mounts the scene
await page.evaluate(() => document.getElementById('datacenter')?.scrollIntoView({ block: 'center' }));
await page.waitForTimeout(9000);
await page.screenshot({ path: `/tmp/datacenter-${tag}.png` });

await browser.close();
server.close();
console.log('wrote /tmp/hero-' + tag + '.png, /tmp/datacenter-' + tag + '.png');
