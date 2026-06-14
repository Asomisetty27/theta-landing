import { chromium } from 'playwright';
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://localhost:5173/', { waitUntil: 'load' });
await p.waitForTimeout(4500);
await p.screenshot({ path: '/tmp/hero-new.png' });
await browser.close();
console.log('done');
