// Real-browser smoke test for /catalog: loads the page, selects all 30 products in the WebGL viewer,
// checks for errors, drags the model, and writes a contact sheet to screenshots/catalog-sheet.png.
// Usage: CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe" npm run smoke:catalog
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

const PORT = 4101;
const server = spawn(process.execPath, ['dist/app/server/server.mjs'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'pipe' });
await new Promise((resolve) => {
  const onData = (d) => String(d).includes('listening') && resolve();
  server.stdout.on('data', onData);
  server.stderr.on('data', onData);
});

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH,
  headless: true,
  userDataDir: mkdtempSync(join(tmpdir(), 'smoke-cat-')),
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
mkdirSync('screenshots/catalog', { recursive: true });
const errors = [];
let failures = 0;
const check = (name, ok) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failures += 1;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  const html = await (await fetch(`http://localhost:${PORT}/catalog`)).text();
  check('SSR HTML lists all 30 products', (html.match(/class="item"/g) ?? []).length === 30);
  check('SSR HTML has ItemList JSON-LD and canonical', html.includes('"ItemList"') && html.includes('rel="canonical"'));

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://localhost:${PORT}/catalog`, { waitUntil: 'networkidle0' });
  await page.mouse.move(600, 400); // first interaction lets the lazy 3D load
  await page.waitForFunction(() => document.querySelector('app-model-viewer') && !document.querySelector('app-model-viewer .fallback'), { timeout: 30000 });
  check('3D viewer goes live', true);

  // Auto-play carousel: the pointer stays ON the catalogue (no hover pause) and nothing is clicked.
  await page.mouse.move(400, 600);
  const titleNow = () => page.$eval('.info h2', (e) => e.textContent.trim());
  // Tracker, DEFAULT = list: exactly five products in a row, the current one in the centre slot.
  await page.evaluate(() => document.querySelector('.head').scrollIntoView());
  await sleep(500);
  const listState = await page.evaluate(() => {
    const chips = [...document.querySelectorAll('.strip .chip')];
    return {
      count: chips.length,
      onIndex: chips.findIndex((c) => c.classList.contains('on')),
      curve: !!document.querySelector('.stage'),
      pressed: document.querySelector('.view .seg').getAttribute('aria-pressed'),
      first: document.querySelector('.view .seg').textContent.trim(),
    };
  });
  check('default view is the list, not the curve', listState.first === 'List' && listState.pressed === 'true' && !listState.curve);
  check('list shows exactly 5 products in a row with the current one centred', listState.count === 5 && listState.onIndex === 2);

  // The five list slots are live 3D models rendered on one canvas behind the labels.
  await page.waitForSelector('.strip.live', { timeout: 30000 });
  await sleep(1200);
  const stripPng = await (await page.$('.strip')).screenshot();
  const { data, info } = await sharp(stripPng).raw().toBuffer({ resolveWithObject: true });
  const colW = Math.floor(info.width / 5);
  const lit = [0, 1, 2, 3, 4].map((c) => {
    let hits = 0;
    let total = 0;
    for (let y = 0; y < Math.floor(info.height * 0.7); y += 2) {
      for (let x = c * colW + Math.floor(colW * 0.1); x < (c + 1) * colW - Math.floor(colW * 0.1); x += 2) {
        const i = (y * info.width + x) * info.channels;
        total += 1;
        if (Math.max(data[i], data[i + 1], data[i + 2]) > 110) hits += 1;
      }
    }
    return hits / total;
  });
  check('each of the 5 list slots shows a rendered 3D model (' + lit.map((v) => (v * 100).toFixed(1) + '%').join(' ') + ')', lit.every((v) => v > 0.01));
  check('only one WebGL canvas serves the row', (await page.$$eval('.strip canvas', (c) => c.length)) === 1);

  // Layout: viewer directly UNDER the tracker, details beside it, product list full width below.
  const lay = await page.evaluate(() => {
    const r = (sel) => document.querySelector(sel).getBoundingClientRect();
    const track = r('app-catalog-track');
    const viewer = r('.showcase app-model-viewer');
    const detail = r('.detail');
    const list = r('.list');
    return {
      trackBottom: track.bottom,
      viewerTop: viewer.top,
      viewerBottom: viewer.bottom,
      viewerLeft: viewer.left,
      detailLeft: detail.left,
      listTop: list.top,
      listWidth: list.width,
      pageWidth: r('.page').width,
    };
  });
  check('3D viewer sits directly under the tracker', lay.viewerTop >= lay.trackBottom - 1 && lay.viewerTop - lay.trackBottom < 160);
  check('product details sit beside the viewer', lay.detailLeft > lay.viewerLeft + 200);
  check('product list is full width, below the viewer', lay.listTop >= lay.viewerBottom - 1 && lay.listWidth > lay.pageWidth * 0.9);
  await page.screenshot({ path: 'screenshots/catalog-layout-list.png', clip: { x: 0, y: Math.max(0, (await page.evaluate(() => document.querySelector('.head').getBoundingClientRect().top)) - 10), width: 1280, height: 800 } });

  // Watch ~3.7 s: the row must keep showing 5 items and slide sideways when the product changes.
  const row = await page.evaluate(async () => {
    const strip = document.querySelector('.strip');
    const out = [];
    const start = performance.now();
    while (performance.now() - start < 3700) {
      const r = document.querySelector('.row').getBoundingClientRect();
      const chips = document.querySelectorAll('.strip .chip');
      out.push({ offset: r.left - strip.getBoundingClientRect().left, centre: chips[2].textContent.trim(), n: chips.length });
      await new Promise((res) => setTimeout(res, 25));
    }
    return out;
  });
  const centres = [...new Set(row.map((r) => r.centre))];
  const offsets = row.map((r) => r.offset);
  const travelled = Math.max(...offsets) - Math.min(...offsets);
  check('list keeps 5 items while rotating (' + centres.length + ' different centre products seen)', row.every((r) => r.n === 5) && centres.length >= 2);
  check('the row slides sideways when the product changes (moved ' + travelled.toFixed(0) + 'px)', travelled > 20);
  check('and settles back in place between changes', offsets.filter((o) => Math.abs(o - offsets[0]) < 8).length > offsets.length * 0.5);
  await (await page.$('.head')).screenshot({ path: 'screenshots/catalog-track-list.png' });

  // Curve is still available through the toggle: the marker glides along the parabola.
  await page.evaluate(() => document.querySelectorAll('.view .seg')[1].click());
  await sleep(500);
  // Deterministic: press Next (one step along the curve) and watch the marker glide for ~1 s.
  const samples = await page.evaluate(async () => {
    const stage = document.querySelector('.stage');
    const out = [];
    out.animation = null;
    document.querySelectorAll('.step')[2].click();
    const start = performance.now();
    while (performance.now() - start < 1100) {
      const anim = document.querySelector('.ball').getAnimations()[0];
      if (anim && !out.animation) {
        out.animation = { duration: anim.effect.getTiming().duration, keyframes: anim.effect.getKeyframes().length };
      }
      const b = document.querySelector('.ball').getBoundingClientRect();
      const r = stage.getBoundingClientRect();
      out.push({ x: ((b.left + b.width / 2 - r.left) / r.width) * 100, y: ((b.top + b.height / 2 - r.top) / r.height) * 100 });
      await new Promise((res) => setTimeout(res, 20));
    }
    return { points: out, animation: out.animation };
  });
  const onCurve = (p) => {
    const t = (p.x * 10 - 30) / 940;
    return Math.abs(p.y - (205 - 640 * t * (1 - t)) / 2.4);
  };
  const worst = Math.max(...samples.points.map(onCurve));
  check('curve: marker positions all lie on the parabola (max deviation ' + worst.toFixed(2) + '% of height)', worst < 1.5);
  const stageDots = await page.$$eval('.stage .dot', (d) => d.map((e) => parseFloat(e.style.left)));
  check('curve: marker has a 700 ms Web Animation along the curve (' + JSON.stringify(samples.animation) + ')', samples.animation?.duration === 700 && samples.animation.keyframes === 17);
  check('curve: 30 products sit on the curve, left to right', stageDots.length === 30 && stageDots.every((v, i) => i === 0 || v > stageDots[i - 1]));
  await (await page.$('.head')).screenshot({ path: 'screenshots/catalog-track-curve.png' });
  await page.screenshot({ path: 'screenshots/catalog-layout-curve.png', clip: { x: 0, y: Math.max(0, (await page.evaluate(() => document.querySelector('.head').getBoundingClientRect().top)) - 10), width: 1280, height: 800 } });
  await page.evaluate(() => document.querySelectorAll('.view .seg')[0].click());
  await sleep(400);
  check('toggling back restores the five-item list', (await page.$$eval('.strip .chip', (c) => c.length)) === 5 && (await page.$('.stage')) === null);
  const live = await page.$eval('.info', (e) => e.getAttribute('aria-live'));
  const t0 = await titleNow();
  await sleep(3600);
  const t1 = await titleNow();
  await sleep(3600);
  const t2 = await titleNow();
  check('auto-play advances the product every ~3 s (' + t0.split(' ')[0] + ' > ' + t1.split(' ')[0] + ' > ' + t2.split(' ')[0] + ')', t0 !== t1 && t1 !== t2);
  check('live region is off while auto-playing (no screen-reader spam)', live === 'off');
  check('Pause button is a pressed toggle while playing', (await page.$eval('.step[aria-pressed]', (b) => b.getAttribute('aria-pressed') + '|' + b.textContent.trim())).startsWith('true|'));
  await page.evaluate(() => document.querySelectorAll('.step')[1].click());
  const paused = await titleNow();
  await sleep(4000);
  check('Pause stops the rotation', (await titleNow()) === paused);
  check('live region becomes polite when paused', (await page.$eval('.info', (e) => e.getAttribute('aria-live'))) === 'polite');
  await page.evaluate(() => document.querySelectorAll('.step')[1].click());
  await sleep(3600);
  check('Play resumes the rotation', (await titleNow()) !== paused);

  // Clicking a product only restarts the countdown: it then moves on by itself again.
  await page.evaluate(() => document.querySelectorAll('.item')[9].click());
  await sleep(1000);
  check('a clicked product stays for its 3 s', (await titleNow()).includes('Audio Interface'));
  // Software-rendered WebGL (this headless Chrome) can delay timers, so poll instead of using a fixed wait.
  const moved = await page
    .waitForFunction(() => document.querySelector('.info h2').textContent.includes('Keyboard'), { timeout: 9000 })
    .then(() => true, () => false);
  check('then the carousel moves on by itself (no Next click)', moved);

  const total = await page.$$eval('.item', (els) => els.length);
  const frames = [];
  for (let i = 0; i < total; i += 1) {
    await page.evaluate((n) => document.querySelectorAll('.item')[n].click(), i);
    await sleep(900); // appear animation + a few frames
    const title = await page.$eval('.info h2', (e) => e.textContent.trim());
    const file = `screenshots/catalog/${String(i + 1).padStart(2, '0')}.png`;
    const viewer = await page.$('app-model-viewer .frame');
    await viewer.screenshot({ path: file });
    frames.push({ file, title });
  }
  check(`selected and rendered all ${total} products`, total === 30);

  // Drag-to-rotate + keyboard rotate change the rendered frame.
  await page.evaluate(() => document.querySelectorAll('.item')[19].click());
  await sleep(900);
  const viewer = await page.$('app-model-viewer .frame');
  const box = await viewer.boundingBox();
  const before = await viewer.screenshot();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await sleep(150);
  const after = await viewer.screenshot();
  check('dragging the viewer rotates the model', Buffer.compare(before, after) !== 0);

  await page.evaluate(() => document.querySelectorAll('.chip')[3].click());
  await sleep(300);
  check('category filter shows only that group', (await page.$$eval('.item', (e) => e.length)) === 7);
  check('no console errors across all 30 models', errors.length === 0);
  if (errors.length) console.log(errors);

  // Contact sheet: 6 columns x 5 rows, 320x240 tiles.
  const W = 320;
  const H = 240;
  const tiles = await Promise.all(
    frames.map(async (f, i) => ({
      input: await sharp(f.file).resize(W, H, { fit: 'cover' }).toBuffer(),
      left: (i % 6) * W,
      top: Math.floor(i / 6) * H,
    })),
  );
  await sharp({ create: { width: W * 6, height: H * 5, channels: 3, background: '#070b14' } })
    .composite(tiles)
    .png()
    .toFile('screenshots/catalog-sheet.png');
  console.log('contact sheet: screenshots/catalog-sheet.png');
  frames.forEach((f, i) => console.log(`${String(i + 1).padStart(2, '0')} ${f.title}`));

  await page.setViewport({ width: 390, height: 844, isMobile: true });
  await page.goto(`http://localhost:${PORT}/catalog`, { waitUntil: 'networkidle0' });
  check('no horizontal scroll on mobile', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.screenshot({ path: 'screenshots/catalog-mobile.png' });
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`http://localhost:${PORT}/catalog`, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'screenshots/catalog-desktop.png' });
} finally {
  await browser.close();
  server.kill();
}
process.exit(failures ? 1 : 0);
