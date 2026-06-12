import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto('file:///Users/amogh/theta-landing/scripts/og/thermal-flow.html', { waitUntil: 'networkidle' });
await page.evaluate(() => { document.body.style.background = '#0E0C12'; });
await page.screenshot({ path: '/tmp/texture-check.png', type: 'png' });
await browser.close();
