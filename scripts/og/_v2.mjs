import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 1000 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:8080/',{waitUntil:'load'}); await p.waitForTimeout(2800);
await p.evaluate(()=>{const e=document.querySelector('#evidence'); if(e) e.scrollIntoView({block:'start'});});
await p.waitForTimeout(1500);
// find the "v2 · 1800s wait" text node and screenshot its chart container
const handle = await p.evaluateHandle(()=>{
  const el=[...document.querySelectorAll('div')].find(n=>n.textContent && n.textContent.startsWith('v2 · 1800s wait'));
  return el ? el.parentElement : null;
});
const box = handle.asElement ? await handle.asElement().boundingBox?.() : null;
if (box) await p.screenshot({ path:'/tmp/v2only.png', clip:{x:Math.max(0,box.x-10),y:Math.max(0,box.y-10),width:Math.min(1200,box.width+20),height:Math.min(700,box.height+20)} });
else { await p.screenshot({path:'/tmp/v2only.png'}); console.log('fallback full'); }
await b.close();
