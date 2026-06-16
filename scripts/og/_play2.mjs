import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:8086/',{waitUntil:'load'}); await p.waitForTimeout(2500);
await p.evaluate(()=>{const e=document.querySelector('#signal'); const y=e.getBoundingClientRect().top+window.scrollY; window.scrollTo(0,y+ e.offsetHeight - 520);});
await p.waitForTimeout(1200);
await p.screenshot({ path: '/tmp/play-default.png', clip:{x:0,y:380,width:1280,height:300} });
// drag junction temp way up + power down → degrading
const s = await p.$$('#signal .tos-range');
if(s[0]){ await s[0].focus(); for(let i=0;i<22;i++) await p.keyboard.press('ArrowRight'); }   // temp up
if(s[1]){ await s[1].focus(); for(let i=0;i<30;i++) await p.keyboard.press('ArrowLeft'); }    // power down
await p.waitForTimeout(400);
await p.screenshot({ path: '/tmp/play-degrading.png', clip:{x:0,y:380,width:1280,height:300} });
await b.close();
