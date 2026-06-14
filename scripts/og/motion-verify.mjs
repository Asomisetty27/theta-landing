import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const errs = [];
p.on('pageerror', e => errs.push(String(e).slice(0,140)));
await p.goto('http://localhost:8080/', { waitUntil: 'load' });
await p.waitForTimeout(3000);

const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log('overflowPx:', ov, '| pageerrors:', errs.length ? errs : 'none');

const clip = { x: 0, y: 60, width: 620, height: 470 };
await p.screenshot({ path: '/tmp/mv-pulse-a.png', clip });
await p.waitForTimeout(1300);
await p.screenshot({ path: '/tmp/mv-pulse-b.png', clip });

// hover install CTA via JS dispatch (avoids actionability hang) + capture
try {
  await p.evaluate(() => {
    const el = document.querySelector('header a[href*="pypi"], a[href*="pypi/project/runtheta"]') || [...document.querySelectorAll('a')].find(a => /install/i.test(a.textContent) && a.href.includes('pypi'));
    if (el) el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
  });
  await p.waitForTimeout(300);
  await p.screenshot({ path: '/tmp/mv-cta.png', clip: { x: 980, y: 0, width: 460, height: 92 } });
} catch (e) { console.log('cta', e.message.slice(0,60)); }

await b.close();
