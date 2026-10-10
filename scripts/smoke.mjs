// Real-browser smoke test against the built SSR server (run `npm run build:prod` first).
// Checks: server-rendered content, hero 3D goes live, hydrated sections, accordion drives the 3D
// viewer, form validation + focus, no console errors, no horizontal scroll. Screenshots -> ./screenshots
// Usage: CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe" npm run smoke
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const PORT = 4100;
const URL = `http://localhost:${PORT}/`;
const server = spawn(process.execPath, ['dist/app/server/server.mjs'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'pipe' });
await new Promise((resolve) => {
  const onData = (d) => String(d).includes('listening') && resolve();
  server.stdout.on('data', onData);
  server.stderr.on('data', onData); // the server logs its startup line with console.warn
});

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH,
  headless: true,
  userDataDir: mkdtempSync(join(tmpdir(), 'smoke-')),
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
mkdirSync('screenshots', { recursive: true });

const errors = [];
let failures = 0;
const check = (name, ok) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failures += 1;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  // Server-rendered HTML (no JS) must already contain every section.
  const html = await (await fetch(URL)).text();
  check('SSR HTML contains all home sections (incl. catalogue) + h1', ['home', 'about', 'products', 'catalogue', 'solutions'].every((id) => html.includes(`id="${id}"`)) && html.includes('<h1'));
  check('SSR HTML has JSON-LD, canonical and og:image', html.includes('application/ld+json') && html.includes('rel="canonical"') && html.includes('og:image'));

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'screenshots/1-poster.png' });

  await page.mouse.move(700, 300); // first interaction triggers the lazy 3D load
  await page.waitForSelector('.stage.live', { timeout: 25000 });
  await sleep(1500);
  check('hero 3D scene goes live after first interaction', true);
  await page.screenshot({ path: 'screenshots/2-hero-3d.png' });

  await page.evaluate(() => document.getElementById('products').scrollIntoView());
  await sleep(1800);
  await page.screenshot({ path: 'screenshots/3-products.png' });

  // Catalogue is part of the home page now: all 30 products, with a working 3D viewer.
  await page.evaluate(() => document.getElementById('catalogue').scrollIntoView());
  await page.waitForFunction(() => document.querySelectorAll('#catalogue .item').length === 30, { timeout: 25000 });
  check('home page shows all 30 catalogue products', true);
  await page.waitForFunction(() => document.querySelector('#catalogue app-model-viewer') && !document.querySelector('#catalogue app-model-viewer .fallback'), { timeout: 25000 });
  await page.evaluate(() => document.querySelectorAll('#catalogue .item')[12].click());
  await sleep(1000);
  check('catalogue viewer follows the selected product', (await page.$eval('#catalogue .info h2', (e) => e.textContent)).includes('Monitor'));
  await page.screenshot({ path: 'screenshots/3b-home-catalogue.png' });

  await page.evaluate(() => document.getElementById('solutions').scrollIntoView());
  await page.waitForFunction(() => document.querySelector('#solutions app-model-viewer') && !document.querySelector('#solutions app-model-viewer .fallback'), { timeout: 25000 });
  check('showcase 3D viewer goes live when scrolled into view', true);
  await page.evaluate(() => document.querySelectorAll('app-accordion-item button')[1].click());
  await sleep(1200);
  const state = await page.evaluate(() => ({
    expanded: [...document.querySelectorAll('app-accordion-item button')].map((b) => b.getAttribute('aria-expanded')),
    caption: document.querySelector('#solutions figcaption').textContent,
  }));
  check('accordion opens one item at a time', state.expanded.join() === 'false,true,false,false');
  check('caption follows the selected 3D model', state.caption.includes('switch'));
  await page.screenshot({ path: 'screenshots/4-showcase-network.png' });

  await page.evaluate(() => document.querySelectorAll('app-accordion-item button')[1].focus());
  await page.keyboard.press('ArrowDown');
  check('ArrowDown moves focus to the next accordion header', await page.evaluate(() => document.activeElement === document.querySelectorAll('app-accordion-item button')[2]));

  // The enquiry form lives on its own page.
  check('home page no longer contains the enquiry form', (await page.$('form')) === null);
  await page.click('.site-header a[href="/contact"].btn');
  await page.waitForSelector('form', { timeout: 15000 });
  await sleep(800);
  check('Get a quote opens the contact page', page.url().endsWith('/contact'));
  await page.click('form button[type=submit]');
  await sleep(500);
  const invalid = await page.evaluate(() => ({
    errors: [...document.querySelectorAll('form [aria-live=polite]')].map((e) => e.textContent.trim()).filter(Boolean).length,
    focusedInvalid: document.activeElement?.getAttribute('aria-invalid') === 'true',
  }));
  check('empty submit shows 4 field errors', invalid.errors === 4);
  check('first invalid field receives focus', invalid.focusedInvalid);
  await page.screenshot({ path: 'screenshots/5-contact-errors.png' });

  await page.setViewport({ width: 390, height: 844, isMobile: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(800);
  await page.screenshot({ path: 'screenshots/6-mobile.png' });
  check('no horizontal scroll on mobile', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  check('no console errors', errors.length === 0);
  if (errors.length) console.log(errors);
} finally {
  await browser.close();
  server.kill();
}
process.exit(failures ? 1 : 0);
