import { chromium } from 'playwright';
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', e => errs.push(String(e)));
await p.goto('http://localhost:5173/', { waitUntil: 'load' });
await p.waitForTimeout(2500);
for (const [id, name] of [['signal','signal'],['evidence','evidence'],['gap','gap'],['pricing','pricing']]) {
  await p.evaluate(i => document.getElementById(i).scrollIntoView(), id);
  await p.waitForTimeout(1600);
  await p.screenshot({ path: `/tmp/brand-${name}.png` });
}
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await p.waitForTimeout(1200);
await p.screenshot({ path: '/tmp/brand-footer.png' });
console.log('errors:', errs.length ? errs : 'none');
await browser.close();
