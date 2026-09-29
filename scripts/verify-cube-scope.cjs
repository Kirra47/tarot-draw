// The cube is the entry's visual. It must be visible in the entry, and gone the
// moment the entry closes — the card stage is its own full-screen 3D scene.
const fs = require('node:fs');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:8888';
const OUT = 'D:/codex/tarot-draw/output/cube-scope';
function loadChromium() {
  for (const id of ['playwright', 'playwright-core', 'D:/npm-global/node_modules/openclaw/node_modules/playwright-core']) {
    try { return require(id).chromium; } catch {}
  }
  throw new Error('no playwright');
}
const rows = [];
const fails = [];
const chk = (l, ok, d = '') => { rows.push(`  ${ok ? 'ok  ' : 'FAIL'} ${l}${ok || !d ? '' : ` — ${d}`}`); if (!ok) fails.push(l); };
const cubeState = (page) => page.evaluate(() => {
  const c = document.getElementById('cubeBg');
  const cs = getComputedStyle(c);
  const r = c.getBoundingClientRect();
  return {
    display: cs.display,
    visible: cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0 && r.width > 1 && r.height > 1,
    parent: c.parentElement ? `${c.parentElement.tagName}.${(c.parentElement.className || '-').toString().split(' ')[0]}` : null,
    box: [Math.round(r.width), Math.round(r.height)],
    entryHidden: document.getElementById('questionOverlay').classList.contains('hidden'),
  };
});

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await loadChromium().launch({ headless: true, executablePath: CHROME, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 120)));

  await page.goto(`${BASE}/tarot.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#questionOverlay', { timeout: 30000 });
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#questionOverlay', { timeout: 30000 });
  await page.waitForTimeout(1800);

  const entry = await cubeState(page);
  chk('入口：魔方可见', entry.visible === true, JSON.stringify(entry));
  chk('入口：魔方在 qIntro 内', entry.parent === 'SECTION.qIntro', entry.parent);
  await page.screenshot({ path: `${OUT}/01-entry.png` });

  // tarot card stage
  await page.click('[data-reading-mode="tarot"]');
  await page.waitForTimeout(300);
  await page.click('#questionConfirm');
  await page.waitForTimeout(2200);
  const card = await cubeState(page);
  chk('抽牌阶段：魔方已隐藏', card.visible === false, JSON.stringify(card));
  await page.screenshot({ path: `${OUT}/02-cardstage.png` });

  // pick two, as in the reported screenshot
  for (let i = 0; i < 2; i += 1) {
    await page.mouse.click(720, 400);
    await page.waitForTimeout(700);
    await page.mouse.click(720, 400);
    await page.waitForTimeout(900);
  }
  const card2 = await cubeState(page);
  chk('抽牌中：魔方始终隐藏', card2.visible === false, JSON.stringify(card2));
  await page.screenshot({ path: `${OUT}/03-cardstage-picked.png` });

  // coin stage
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const p2 = await ctx2.newPage();
  await p2.goto(`${BASE}/tarot.html`, { waitUntil: 'domcontentloaded' });
  await p2.waitForSelector('#questionOverlay', { timeout: 30000 });
  await p2.waitForTimeout(1200);
  await p2.click('[data-reading-mode="gua"]');
  await p2.click('#questionConfirm');
  try { await p2.waitForSelector('#coinOverlay:not([hidden])', { timeout: 8000 }); } catch {}
  await p2.waitForTimeout(1200);
  const coin = await cubeState(p2);
  chk('摇卦阶段：魔方已隐藏', coin.visible === false, JSON.stringify(coin));
  await p2.screenshot({ path: `${OUT}/04-coinstage.png` });
  await ctx2.close();

  // back to the entry: the cube must return to the panel, not centre itself
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.goto(`${BASE}/tarot.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#questionOverlay', { timeout: 30000 });
  await page.waitForTimeout(1800);
  const again = await cubeState(page);
  chk('回到入口：魔方回到面板内', again.visible === true && again.parent === 'SECTION.qIntro', JSON.stringify(again));
  chk('回到入口：尺寸是面板内的小画布', again.box[0] < 900, JSON.stringify(again.box));

  chk('无脚本错误', errors.length === 0, errors.slice(0, 2).join(' | '));

  await browser.close();
  console.log(rows.join('\n'));
  console.log(JSON.stringify({ status: fails.length ? 'failed' : 'passed', checks: rows.length, failed: fails.length }, null, 2));
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log(rows.join('\n')); console.error('ERR', e && e.stack ? e.stack : e.message); process.exit(1); });
