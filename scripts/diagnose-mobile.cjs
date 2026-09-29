// Mobile emulation on the live site, service worker ENABLED, watching for the
// things that only break on a real phone GPU.
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
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  });
  const page = await ctx.newPage();
  const logs = [];
  page.on('pageerror', (e) => logs.push(`pageerror: ${e.message.slice(0, 140)}`));
  page.on('console', (m) => { if (m.type() === 'error') logs.push(`console: ${m.text().slice(0, 140)}`); });

  await page.goto(`${BASE}/tarot.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await gate(page);
  await page.waitForTimeout(4000);

  // Did anything actually paint? Sample real pixels, not the DOM.
  const painted = await page.evaluate(() => {
    const out = {};
    const probe = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), vis: getComputedStyle(el).visibility, op: getComputedStyle(el).opacity };
    };
    out.overlay = probe('#questionOverlay');
    out.card = probe('.qCard');
    out.form = probe('.qForm');
    out.cta = probe('#questionConfirm');
    // What is on top at the centre of the CTA? If the grain layer eats taps, this shows it.
    const cta = document.querySelector('#questionConfirm');
    if (cta) {
      const r = cta.getBoundingClientRect();
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      out.topAtCta = top ? `${top.tagName}#${top.id || '-'}.${(top.className || '-').toString().split(' ')[0]}` : 'none';
    }
    const before = getComputedStyle(document.body, '::before');
    const after = getComputedStyle(document.body, '::after');
    out.grain = { z: after.zIndex, blend: after.mixBlendMode, pe: after.pointerEvents, pos: after.position };
    out.ambient = { z: before.zIndex, pe: before.pointerEvents, pos: before.position };
    return out;
  });
  console.log(JSON.stringify(painted, null, 2));

  // Is the CTA actually tappable through the fixed layers?
  let tapped = false;
  try {
    await page.tap('#questionConfirm', { timeout: 8000 });
    tapped = true;
  } catch (e) { tapped = `failed: ${e.message.split('\n')[0]}`; }
  console.log('tap on CTA:', tapped);

  console.log('logs:', logs.length ? logs.slice(0, 8).join(' | ') : '(none)');
  await page.screenshot({ path: 'D:/codex/tarot-draw/output/live-mobile-check.png' });
  await browser.close();
})().catch((e) => { console.error('ERR', e && e.stack ? e.stack : e.message); process.exit(1); });
