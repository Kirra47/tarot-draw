// Mobile toss check: does the coin stay in frame on a phone, and does the page
// stay free of horizontal overflow while the coins are in the air?
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:8888';
const OUT = 'D:/codex/tarot-draw/output/coin-toss';
function loadChromium() {
  for (const id of ['playwright', 'playwright-core', 'D:/npm-global/node_modules/openclaw/node_modules/playwright-core']) {
    try { return require(id).chromium; } catch {}
  }
  throw new Error('no playwright');
}
(async () => {
  const browser = await loadChromium().launch({ headless: true, executablePath: CHROME, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  for (const [w, h, label] of [[390, 844, 'mobile'], [320, 700, 'narrow']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/tarot.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#questionOverlay', { timeout: 30000 });
    await page.evaluate(() => { try { localStorage.clear(); } catch {} });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#questionOverlay', { timeout: 30000 });
    await page.click('[data-reading-mode="gua"]');
    await page.click('#advancedSetup');
    await page.waitForSelector('#setupOverlay:not([hidden])', { timeout: 10000 });
    await page.selectOption('#castMode', 'coin');
    await page.waitForSelector('#drawStyleOptions', { state: 'visible', timeout: 8000 });
    await page.click('#drawStyleOptions [data-draw-style="manual"]');
    await page.click('#settingsSheetDone');
    await page.waitForSelector('#setupOverlay', { state: 'hidden', timeout: 8000 });
    await page.click('#questionConfirm');
    await page.waitForSelector('#coinOverlay:not([hidden])', { timeout: 15000 });
    await page.waitForTimeout(1200);

    // sample the whole flight for clipping, not just one instant
    await page.click('#coinTossBtn');
    let worstClip = 0;
    let worstOverflow = 0;
    for (let i = 0; i < 26; i += 1) {
      await page.waitForTimeout(80);
      const s = await page.evaluate(() => ({
        clip: window.__tarotCoinStage ? window.__tarotCoinStage.clipCheck().filter((c) => !c.inside).length : -1,
        over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }));
      worstClip = Math.max(worstClip, s.clip);
      worstOverflow = Math.max(worstOverflow, s.over);
      if (i === 7) await page.screenshot({ path: `${OUT}/mobile-${label}-air.png` });
    }
    console.log(`  ${label} ${w}x${h}  最大裁剪=${worstClip}  最大横向溢出=${worstOverflow}px`);
    await ctx.close();
  }
  await browser.close();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
