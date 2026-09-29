// The online checks all blocked service workers. Real users do not. Load the
// live site with the worker enabled and see what actually happens.
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'https://peas47-d0g4dt5f002ccf6ba-1309640856.tcloudbaseapp.com/tarot';
function loadChromium() {
  for (const id of ['playwright', 'playwright-core', 'D:/npm-global/node_modules/openclaw/node_modules/playwright-core']) {
    try { return require(id).chromium; } catch {}
  }
  throw new Error('no playwright');
}
const gate = async (page) => {
  const btn = page.locator('#submitBtn');
  if (await btn.count()) { await btn.click({ timeout: 8000 }).catch(() => {}); await page.waitForTimeout(2500); }
};
(async () => {
  const browser = await loadChromium().launch({ headless: true, executablePath: CHROME, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  // NOTE: no serviceWorkers: 'block' — this is the real configuration.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const logs = [];
  page.on('pageerror', (e) => logs.push(`pageerror: ${e.message.slice(0, 160)}`));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`${m.type()}: ${m.text().slice(0, 160)}`); });
  page.on('requestfailed', (r) => logs.push(`reqfail: ${r.url().replace(BASE, '').slice(0, 90)} — ${r.failure() ? r.failure().errorText : '?'}`));
  page.on('response', (r) => { if (r.status() >= 400) logs.push(`http ${r.status()}: ${r.url().replace(BASE, '').slice(0, 90)}`); });

  console.log('--- load 1 ---');
  await page.goto(`${BASE}/tarot.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await gate(page);
  await page.waitForTimeout(4000);
  let state = await page.evaluate(() => ({
    title: document.title,
    hasOverlay: Boolean(document.getElementById('questionOverlay')),
    overlayVisible: document.getElementById('questionOverlay') ? getComputedStyle(document.getElementById('questionOverlay')).display : null,
    bodyLen: (document.body.innerText || '').replace(/\s+/g, '').length,
    sw: navigator.serviceWorker ? (navigator.serviceWorker.controller ? navigator.serviceWorker.controller.scriptURL.split('/').pop() : 'no-controller') : 'unsupported',
    grids: document.querySelectorAll('#questionOverlay .readingModeOption').length,
    v4: [...document.querySelectorAll('link[rel=stylesheet]')].some((l) => l.href.includes('tarot-ui-v4')),
  }));
  console.log(JSON.stringify(state, null, 2));

  console.log('--- reload (worker now active) ---');
  logs.length = 0;
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await gate(page);
  await page.waitForTimeout(4000);
  state = await page.evaluate(() => ({
    title: document.title,
    hasOverlay: Boolean(document.getElementById('questionOverlay')),
    bodyLen: (document.body.innerText || '').replace(/\s+/g, '').length,
    sw: navigator.serviceWorker.controller ? navigator.serviceWorker.controller.scriptURL.split('/').pop() : 'no-controller',
    caches: null,
  }));
  console.log(JSON.stringify(state, null, 2));

  const cacheNames = await page.evaluate(() => caches.keys()).catch(() => []);
  console.log('caches:', JSON.stringify(cacheNames));

  const reg = await page.evaluate(async () => {
    if (!navigator.serviceWorker) return 'unsupported';
    const r = await navigator.serviceWorker.getRegistration();
    return r ? { scope: r.scope, active: r.active ? r.active.state : null, waiting: r.waiting ? r.waiting.state : null, installing: r.installing ? r.installing.state : null } : 'none';
  }).catch((e) => 'err: ' + e.message);
  console.log('registration:', JSON.stringify(reg));

  console.log('--- logs ---');
  console.log(logs.length ? logs.slice(0, 14).join('\n') : '(none)');
  await page.screenshot({ path: 'D:/codex/tarot-draw/output/live-sw-check.png' });
  await browser.close();
})().catch((e) => { console.error('ERR', e && e.stack ? e.stack : e.message); process.exit(1); });
