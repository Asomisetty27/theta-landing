import { chromium } from 'playwright';
const browser = await chromium.launch();

// 1. Desktop: terminal demo — wait for full script to play, confirm alert line visible
const d = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await d.goto('http://localhost:5173/', { waitUntil: 'load' });
await d.waitForTimeout(2000);
await d.evaluate(() => document.querySelector('main').children); // noop warm
await d.evaluate(() => window.scrollTo(0, 1100));
await d.waitForTimeout(45000); // let the whole terminal script play through
await d.screenshot({ path: '/tmp/v-terminal.png' });

// 2. Desktop: pricing reveal right as it enters
await d.evaluate(() => document.getElementById('pricing').scrollIntoView({ block: 'start' }));
await d.waitForTimeout(1500);
await d.screenshot({ path: '/tmp/v-pricing.png' });

// 3. Mobile checks
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await m.goto('http://localhost:5173/', { waitUntil: 'load' });
await m.waitForTimeout(2500);
// hero stats
await m.evaluate(() => window.scrollTo(0, 700));
await m.waitForTimeout(1500);
await m.screenshot({ path: '/tmp/v-m-herostats.png' });
// signal table
await m.evaluate(() => document.getElementById('signal').scrollIntoView());
await m.waitForTimeout(1500);
await m.evaluate(() => window.scrollBy(0, 900));
await m.waitForTimeout(1200);
await m.screenshot({ path: '/tmp/v-m-signal.png' });
// horizontal overflow check
const overflow = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log('mobile horizontal overflow px:', overflow);
// capability matrix
await m.evaluate(() => document.getElementById('gap').scrollIntoView());
await m.waitForTimeout(1800);
await m.evaluate(() => window.scrollBy(0, 500));
await m.waitForTimeout(800);
await m.screenshot({ path: '/tmp/v-m-matrix.png' });
// key numbers grid
await m.evaluate(() => document.getElementById('evidence').scrollIntoView());
await m.waitForTimeout(1500);
const ev = document => 0;
await m.evaluate(() => window.scrollBy(0, document.getElementById('evidence').offsetHeight - 900));
await m.waitForTimeout(1200);
await m.screenshot({ path: '/tmp/v-m-keynums.png' });
await browser.close();
console.log('done');
