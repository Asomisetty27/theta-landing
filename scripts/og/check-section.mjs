import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const dist = '/Users/amogh/theta-landing/dist';
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.woff2':'font/woff2' };
const server = createServer((req, res) => {
  let p = path.join(dist, req.url.split('?')[0]);
  if (!existsSync(p) || !path.extname(p)) p = path.join(dist, 'index.html');
  res.setHeader('Content-Type', mime[path.extname(p)] ?? 'application/octet-stream');
  res.end(readFileSync(p));
});
await new Promise(r => server.listen(4173, r));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.evaluate(() => document.getElementById('production').scrollIntoView());
await page.waitForTimeout(1800); // let entrance animations finish
await page.locator('#production').screenshot({ path: '/tmp/production-section.png' });
await browser.close();
server.close();
console.log('done');
