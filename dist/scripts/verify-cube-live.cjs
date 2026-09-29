// Live check: the cube must be on in the entry and off on the card stage.
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
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/tarot.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await gate(page);
  await page.waitForSelector('#questionOverlay', { timeout: 40000 });
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await gate(page);
  await page.waitForSelector('#questionOverlay', { timeout: 40000 });
  await page.waitForTimeout(1600);

  const read = () => page.evaluate(() => {
    const c = document.getElementById('cubeBg');
    const cs = getComputedStyle(c);
    const r = c.getBoundingClientRect();
    return { display: cs.display, w: Math.round(r.width), parent: c.parentElement.tagName + '.' + (c.parentElement.className || '-').toString().split(' ')[0] };
  });

  const entry = await read();
  await page.click('[data-reading-mode="tarot"]');
  await page.waitForTimeout(300);
  await page.click('#questionConfirm');
  await page.waitForTimeout(2600);
  const card = await read();
  await page.screenshot({ path: 'D:/codex/tarot-draw/output/cube-scope/live-cardstage.png' });
  await browser.close();

  const ok = entry.display !== 'none' && card.display === 'none';
  console.log(`  入口: ${entry.display} ${entry.w}px inside ${entry.parent}`);
  console.log(`  抽牌阶段: ${card.display} inside ${card.parent}`);
  console.log(ok ? '  ok   魔方只在入口显示' : '  FAIL 魔方仍在抽牌阶段显示');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
