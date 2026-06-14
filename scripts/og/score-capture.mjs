// Iteration capture + objective-metrics harness for the design-scoring loop.
// Usage: node scripts/og/score-capture.mjs <iterationLabel>
// Captures sectioned desktop + mobile screenshots to /tmp/iter-<label>/ and
// prints a JSON block of objective metrics the scorer rubric consumes.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const LABEL = process.argv[2] || '0';
const URL = process.env.THETA_URL || 'http://localhost:8080/';
const OUT = `/tmp/iter-${LABEL}`;
mkdirSync(OUT, { recursive: true });

// WCAG relative-luminance contrast ratio between two rgb arrays
function contrast(rgb1, rgb2) {
  const lum = ([r, g, b]) => {
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  };
  const L1 = lum(rgb1), L2 = lum(rgb2);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return +((hi + 0.05) / (lo + 0.05)).toFixed(2);
}
const parseRGB = s => (s.match(/\d+/g) || [0, 0, 0]).slice(0, 3).map(Number);

const browser = await chromium.launch();
const metrics = { label: LABEL, errors: [], desktop: {}, mobile: {}, contrast: {} };

// ---------- DESKTOP ----------
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', m => { if (m.type() === 'error') metrics.errors.push(m.text().slice(0, 200)); });
page.on('pageerror', e => metrics.errors.push(String(e).slice(0, 200)));
await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(3500);

const dWidth = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
metrics.desktop.overflowPx = dWidth.scroll - dWidth.client;
metrics.desktop.height = await page.evaluate(() => document.body.scrollHeight);

// computed type + color sampling on key elements
metrics.typography = await page.evaluate(() => {
  const pick = sel => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const c = getComputedStyle(el);
    return { font: c.fontFamily.split(',')[0].replace(/['"]/g, ''), size: c.fontSize, weight: c.fontWeight, spacing: c.letterSpacing, color: c.color };
  };
  return { h1: pick('h1'), nav: pick('nav a, header a'), body: pick('p') };
});

// contrast on hero h1 vs page bg
const heroColors = await page.evaluate(() => {
  const h1 = document.querySelector('h1');
  const bg = getComputedStyle(document.body).backgroundColor;
  return { fg: h1 ? getComputedStyle(h1).color : null, bg };
});
if (heroColors.fg && heroColors.bg) metrics.contrast.heroH1 = contrast(parseRGB(heroColors.fg), parseRGB(heroColors.bg));

const dh = metrics.desktop.height;
const steps = Math.min(Math.ceil(dh / 900), 14);
for (let i = 0; i < steps; i++) {
  await page.evaluate(y => window.scrollTo(0, y), i * 900);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/d-${String(i).padStart(2, '0')}.png` });
}

// ---------- MOBILE ----------
const mp = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
mp.on('pageerror', e => metrics.errors.push('MOBILE: ' + String(e).slice(0, 200)));
await mp.goto(URL, { waitUntil: 'load' });
await mp.waitForTimeout(3500);
const mWidth = await mp.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
metrics.mobile.overflowPx = mWidth.scroll - mWidth.client;
metrics.mobile.height = await mp.evaluate(() => document.body.scrollHeight);
const mh = metrics.mobile.height;
const msteps = Math.min(Math.ceil(mh / 844), 14);
for (let i = 0; i < msteps; i++) {
  await mp.evaluate(y => window.scrollTo(0, y), i * 844);
  await mp.waitForTimeout(800);
  await mp.screenshot({ path: `${OUT}/m-${String(i).padStart(2, '0')}.png` });
}

await browser.close();
console.log('METRICS_JSON_START');
console.log(JSON.stringify(metrics, null, 2));
console.log('METRICS_JSON_END');
