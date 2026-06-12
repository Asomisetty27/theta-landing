import { chromium } from 'playwright';

const browser = await chromium.launch();

// Desktop full-page sweep: screenshot every viewport-height step
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));
await page.goto('http://localhost:5173/', { waitUntil: 'load' });
await page.waitForTimeout(3000);

const height = await page.evaluate(() => document.body.scrollHeight);
console.log('page height:', height);
const steps = Math.ceil(height / 900);
for (let i = 0; i < steps; i++) {
  await page.evaluate(y => window.scrollTo(0, y), i * 900);
  await page.waitForTimeout(1200); // entrance animations
  await page.screenshot({ path: `/tmp/ux-d-${String(i).padStart(2,'0')}.png` });
}

// Mobile sweep
const mp = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
mp.on('pageerror', e => errors.push('MOBILE: ' + String(e)));
await mp.goto('http://localhost:5173/', { waitUntil: 'load' });
await mp.waitForTimeout(3000);
const mh = await mp.evaluate(() => document.body.scrollHeight);
console.log('mobile height:', mh);
const msteps = Math.ceil(mh / 844);
for (let i = 0; i < msteps; i++) {
  await mp.evaluate(y => window.scrollTo(0, y), i * 844);
  await mp.waitForTimeout(1000);
  await mp.screenshot({ path: `/tmp/ux-m-${String(i).padStart(2,'0')}.png` });
}

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
