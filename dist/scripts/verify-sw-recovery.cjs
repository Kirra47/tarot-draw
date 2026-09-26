// Regression test for the stale-service-worker outage.
//
// The failure: an older worker answers navigation from the network (so the page
// is new) but answers sub-resources from its cache with `ignoreSearch` (so
// `scripts/*.mjs` resolve to the previous release). When the newer page imports
// names those modules no longer export, the ES module graph fails to link, no
// app code runs, and the whole page is inert.
//
// This drives that exact sequence with a real service worker, then checks that
// the classic boot script in <head> recovers by letting the current worker take
// over and reloading.
//
// Needs: node scripts/local-server.mjs --port=8888
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const BASE = process.env.TAROT_BASE || 'http://127.0.0.1:8888';
const ROOT = path.resolve(__dirname, '..');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const STALE_WORKER = path.join(ROOT, 'stale-worker-check.js');
const STALE_CACHE = 'stale-worker-check-v0';
// The release whose modules were still cached in the visitor's browser.
const STALE_RELEASE = 'a460746';

function loadChromium() {
  for (const id of ['playwright', 'playwright-core', 'D:/npm-global/node_modules/openclaw/node_modules/playwright-core']) {
    try { return require(id).chromium; } catch {}
  }
  throw new Error('no playwright');
}

const STALE_WORKER_SOURCE = `
// Test double for the previous release's worker: navigation from network,
// everything else from cache, matching by path so a versioned URL still hits.
const CACHE = ${JSON.stringify(STALE_CACHE)};
self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') { event.respondWith(fetch(event.request)); return; }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = (await cache.match(event.request)) || (await cache.match(event.request, { ignoreSearch: true }));
    if (hit) return hit;
    return fetch(event.request);
  })());
});
`;

const failures = [];
const notes = [];
// Held outside the run so a failure can never leave a browser behind: a leaked
// Chromium keeps the event loop alive and the process hangs instead of exiting.
let activeBrowser = null;
function check(label, ok, detail = '') {
  notes.push(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) failures.push(label);
}

(async () => {
  const chromium = loadChromium();
  fs.writeFileSync(STALE_WORKER, STALE_WORKER_SOURCE, 'utf8');
  const staleModule = execSync(`git show ${STALE_RELEASE}:scripts/meihua-display.mjs`, { cwd: ROOT, encoding: 'utf8' });
  const staleInsight = execSync(`git show ${STALE_RELEASE}:scripts/meihua-insight.mjs`, { cwd: ROOT, encoding: 'utf8' });
  check('旧模块确实缺少新导出', !/COIN_LINE_LABELS/.test(staleModule) && !/coinMovingLabel/.test(staleModule));

  const browser = activeBrowser = await chromium.launch({ headless: true, executablePath: CHROME, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

  // ── Part A: prove the failure mode deterministically, with no worker involved.
  // Serving the previous release's module is enough to kill the whole page,
  // because the import graph fails to link and no app code runs.
  const reproContext = await browser.newContext({ viewport: { width: 1200, height: 900 }, serviceWorkers: 'block' });
  const reproPage = await reproContext.newPage();
  const reproErrors = [];
  reproPage.on('pageerror', (e) => reproErrors.push(e.message));
  reproPage.on('console', (m) => { if (m.type() === 'error') reproErrors.push(m.text()); });
  await reproPage.route('**/scripts/meihua-display.mjs*', (route) => route.fulfill({
    status: 200, contentType: 'text/javascript; charset=utf-8', body: staleModule,
  }));
  await reproPage.goto(`${BASE}/tarot.html`, { waitUntil: 'domcontentloaded' });
  await reproPage.waitForTimeout(2000);
  const dead = await reproPage.evaluate(() => ({
    booted: typeof window.coinCast !== 'undefined',
    hasClickHandler: Boolean(document.getElementById('questionConfirm').onclick),
  }));
  check('旧模块让整个应用无法启动', !dead.booted && !dead.hasClickHandler, JSON.stringify(dead));
  check('浏览器报出模块链接错误', reproErrors.some((e) => /does not provide an export|Importing a module script failed/i.test(e)), reproErrors.slice(0, 2).join(' | '));
  // And a real click must do nothing at all, which is the reported symptom.
  await reproPage.click('#questionConfirm', { force: true }).catch(() => {});
  await reproPage.waitForTimeout(800);
  const stuck = await reproPage.evaluate(() => !document.getElementById('questionOverlay').classList.contains('hidden'));
  check('点击主按钮完全无反应', stuck);
  await reproContext.close();

  // ── Part B: with the shipped worker, the page recovers on its own.
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  // 1. Install the previous release's worker on this origin and let it control us.
  await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.register('/stale-worker-check.js', { scope: '/' });
    await registration.update();
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 8000);
        navigator.serviceWorker.addEventListener('controllerchange', () => { clearTimeout(timer); resolve(); });
      });
    }
  });
  // Seed the stale cache with the previous release's modules.
  await page.evaluate(async ({ cacheName, sources }) => {
    const cache = await caches.open(cacheName);
    for (const [url, text] of Object.entries(sources)) {
      await cache.put(url, new Response(text, { headers: { 'content-type': 'text/javascript' } }));
    }
  }, { cacheName: STALE_CACHE, sources: { '/scripts/meihua-display.mjs': staleModule, '/scripts/meihua-insight.mjs': staleInsight } });

  const controlled = await page.evaluate(() => Boolean(navigator.serviceWorker.controller));
  check('旧 worker 已接管页面', controlled);

  // 2. Navigate to the real page: new HTML, stale modules, and the boot script.
  errors.length = 0;
  await page.goto(`${BASE}/tarot.html`, { waitUntil: 'domcontentloaded' });

  // 3. The classic boot script must recover without any user action.
  let recovered = false;
  try {
    await page.waitForFunction(() => typeof window.coinCast !== 'undefined', { timeout: 30000 });
    recovered = true;
  } catch {}
  check('无需人工操作即自动恢复', recovered);
  const after = await page.evaluate(() => ({
    booted: typeof window.coinCast !== 'undefined',
    controller: navigator.serviceWorker.controller ? navigator.serviceWorker.controller.scriptURL.split('/').pop() : 'none',
  }));
  check('恢复后由当前 worker 接管', after.controller === 'service-worker.js', after.controller);
  const staleGone = await page.evaluate(async (name) => !(await caches.keys()).includes(name), STALE_CACHE);
  check('旧缓存已被清理', staleGone);

  if (recovered) {
    // 4. And the app must actually work after recovery. 亲手摇卦 is what opens
    // the shaking screen, so the check has to pick it before confirming.
    await page.waitForSelector('#questionOverlay', { timeout: 15000 });
    await page.click('[data-reading-mode="gua"]');
    await page.click('#advancedSetup');
    await page.waitForSelector('#castMode', { state: 'visible' });
    await page.selectOption('#castMode', 'coin');
    await page.waitForSelector('#drawStyleOptions', { state: 'visible' });
    await page.click('#drawStyleOptions [data-draw-style="manual"]');
    await page.click('#settingsSheetDone');
    await page.waitForSelector('#setupOverlay', { state: 'hidden' });
    await page.click('#questionConfirm');
    await page.waitForSelector('#coinOverlay:not([hidden])', { timeout: 15000 });
    await page.click('#coinQuickBtn');
    await page.waitForSelector('#settleOverlay.show', { timeout: 25000 });
    const lines = await page.evaluate(() => window.coinCast.getLines());
    check('恢复后铜钱起卦可用', Array.isArray(lines) && lines.length === 6, JSON.stringify(lines));
  }

  // ── Part C: an up-to-date visit must never bounce. A reload loop would be a
  // worse failure than the outage this guards against.
  const stable = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const stablePage = await stable.newPage();
  let navigations = 0;
  stablePage.on('framenavigated', (frame) => { if (frame === stablePage.mainFrame()) navigations += 1; });
  await stablePage.goto(`${BASE}/tarot.html`, { waitUntil: 'domcontentloaded' });
  await stablePage.waitForSelector('#questionOverlay', { timeout: 15000 });
  await stablePage.waitForTimeout(4000);
  const firstVisitNavigations = navigations;
  check('首次访问不会自我重载', firstVisitNavigations === 1, `navigations=${firstVisitNavigations}`);
  await stablePage.reload({ waitUntil: 'domcontentloaded' });
  await stablePage.waitForSelector('#questionOverlay', { timeout: 15000 });
  await stablePage.waitForTimeout(4000);
  check('已是最新版时再次访问不会重载', navigations === 2, `navigations=${navigations}`);
  const servedBy = await stablePage.evaluate(() => (navigator.serviceWorker.controller ? navigator.serviceWorker.controller.scriptURL.split('/').pop() : 'none'));
  check('稳定访问由已安装的 worker 提供', servedBy === 'service-worker.js', servedBy);
  await stable.close();

  await browser.close();
  console.log(notes.join('\n'));
  console.log(JSON.stringify({ status: failures.length ? 'failed' : 'passed', checks: notes.length, failed: failures.length }, null, 2));
  process.exitCode = failures.length ? 1 : 0;
})().catch((error) => {
  console.log(notes.join('\n'));
  console.error('RUN ERROR:', error && error.stack ? error.stack : error.message);
  process.exitCode = 1;
}).finally(async () => {
  try { if (activeBrowser) await activeBrowser.close(); } catch {}
  try { fs.rmSync(STALE_WORKER, { force: true }); } catch {}
});
