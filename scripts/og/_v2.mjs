import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1600 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:8081/', { waitUntil: 'load' });
await p.waitForTimeout(3000);
await p.evaluate(() => { const e=document.querySelector('#gap'); if(e) window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 20); });
await p.waitForTimeout(2500);
await p.screenshot({ path: '/tmp/v-gap2.png' });
await b.close(); console.log('done');
