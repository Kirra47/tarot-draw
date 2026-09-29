// Capture the current UI so the redesign can be compared honestly.
// Usage: node capture-ui.cjs <outDirName>
const fs = require('node:fs');
const path = require('node:path');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:8888';
const OUT = path.join('D:/codex/tarot-draw/output', process.argv[2] || 'ui-v4-before');
function loadChromium() {
  for (const id of ['playwright', 'playwright-core', 'D:/npm-global/node_modules/openclaw/node_modules/playwright-core']) {
    try { return require(id).chromium; } catch {}
  }
  throw new Error('no playwright');
}
const shot = async (page, name, full = false) => {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: full });
  console.log('  ' + name);
};
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await loadChromium().launch({ headless: true, executablePath: CHROME, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });

  // ── desktop ──────────────────────────────────────────────────────────────
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('  pageerror:', e.message.slice(0, 90)));
  await page.goto(`${BASE}/tarot.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#questionOverlay', { timeout: 30000 });
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#questionOverlay', { timeout: 30000 });
  await page.waitForTimeout(1400);
  await shot(page, '01-entry');

  // settings sheet
  await page.click('#advancedSetup');
  await page.waitForSelector('#setupOverlay:not([hidden])', { timeout: 10000 });
  await page.waitForTimeout(600);
  await shot(page, '02-settings');
  await page.click('#settingsSheetDone');
  await page.waitForSelector('#setupOverlay', { state: 'hidden', timeout: 8000 });

  // manual coin stage
  await page.click('#advancedSetup');
  await page.waitForSelector('#setupOverlay:not([hidden])', { timeout: 10000 });
  await page.selectOption('#castMode', 'coin');
  await page.waitForSelector('#drawStyleOptions', { state: 'visible', timeout: 8000 });
  await page.click('#drawStyleOptions [data-draw-style="manual"]');
  await page.click('#settingsSheetDone');
  await page.waitForSelector('#setupOverlay', { state: 'hidden', timeout: 8000 });
  await page.click('#questionConfirm');
  await page.waitForSelector('#coinOverlay:not([hidden])', { timeout: 15000 });
  await page.waitForTimeout(2200);
  await shot(page, '03-coin-stage');

  // toss once, then finish through the quick path
  await page.click('#coinTossBtn').catch(() => {});
  await page.waitForTimeout(2600);
  await shot(page, '04-coin-after-toss');

  // settlement via one-click path
  await ctx.close();
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  const p2 = await ctx2.newPage();
  await p2.goto(`${BASE}/tarot.html`, { waitUntil: 'domcontentloaded' });
  await p2.waitForSelector('#questionOverlay', { timeout: 30000 });
  await p2.evaluate(() => { try { localStorage.clear(); } catch {} });
  await p2.reload({ waitUntil: 'domcontentloaded' });
  await p2.waitForSelector('#questionOverlay', { timeout: 30000 });
  await p2.fill('#questionInput', '这段时间该把精力放在哪里？');
  await p2.click('#questionConfirm');
  try {
    await p2.waitForSelector('#coinOverlay:not([hidden])', { timeout: 6000 });
    await p2.click('#coinQuickBtn');
  } catch {}
  await p2.waitForSelector('#settleOverlay.show', { timeout: 30000 });
  await p2.waitForTimeout(2600);
  await shot(p2, '05-settle-top');
  await p2.evaluate(() => { const el = document.getElementById('settleOverlay'); el.scrollTop = Math.round(el.scrollHeight * 0.45); });
  await p2.waitForTimeout(700);
  await shot(p2, '06-settle-mid');
  await p2.evaluate(() => { const el = document.getElementById('settleOverlay'); el.scrollTop = el.scrollHeight; });
  await p2.waitForTimeout(700);
  await shot(p2, '07-settle-bottom');
  await p2.evaluate(() => { const el = document.getElementById('settleOverlay'); el.scrollTop = 0; });
  await p2.waitForTimeout(400);
  await shot(p2, '08-settle-full', true);
  await ctx2.close();

  // ── mobile ───────────────────────────────────────────────────────────────
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const mp = await m.newPage();
  await mp.goto(`${BASE}/tarot.html`, { waitUntil: 'domcontentloaded' });
  await mp.waitForSelector('#questionOverlay', { timeout: 30000 });
  await mp.evaluate(() => { try { localStorage.clear(); } catch {} });
  await mp.reload({ waitUntil: 'domcontentloaded' });
  await mp.waitForSelector('#questionOverlay', { timeout: 30000 });
  await mp.waitForTimeout(1400);
  await shot(mp, '09-mobile-entry');
  await mp.fill('#questionInput', '这件事接下来会怎么走？');
  await mp.click('#questionConfirm');
  try {
    await mp.waitForSelector('#coinOverlay:not([hidden])', { timeout: 6000 });
    await mp.click('#coinQuickBtn');
  } catch {}
  await mp.waitForSelector('#settleOverlay.show', { timeout: 30000 });
  await mp.waitForTimeout(2600);
  await shot(mp, '10-mobile-settle');
  await m.close();

  await browser.close();
  console.log('done ->', OUT);
})().catch((e) => { console.error('ERR', e && e.stack ? e.stack : e.message); process.exit(1); });
