// The user opens the short URL (/tarot/), not /tarot/tarot.html. Test exactly
// that, with the service worker live, and follow where it actually lands.
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = 'https://peas47-d0g4dt5f002ccf6ba-1309640856.tcloudbaseapp.com/tarot/';
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
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const trail = [];
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) trail.push(f.url().replace('https://peas47-d0g4dt5f002ccf6ba-1309640856.tcloudbaseapp.com', '')); });
  const logs = [];
  page.on('pageerror', (e) => logs.push(`pageerror: ${e.message.slice(0, 140)}`));
  page.on('console', (m) => { if (m.type() === 'error') logs.push(`console: ${m.text().slice(0, 120)}`); });

  console.log('--- visit 1: short URL ---');
  await page.goto(ROOT, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  console.log('trail:', JSON.stringify(trail));
  console.log('title:', await page.title());
  await gate(page);
  await page.waitForTimeout(3500);
  const s1 = await page.evaluate(() => ({
    url: location.pathname,
    title: document.title,
    hasOverlay: Boolean(document.getElementById('questionOverlay')),
    bodyLen: (document.body.innerText || '').replace(/\s+/g, '').length,
  }));
  console.log('state:', JSON.stringify(s1));

  console.log('--- visit 2: short URL again (worker warm) ---');
  trail.length = 0; logs.length = 0;
  await page.goto(ROOT, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  console.log('trail:', JSON.stringify(trail));
  console.log('title:', await page.title());
  await gate(page);
  await page.waitForTimeout(3500);
  const s2 = await page.evaluate(() => ({
    url: location.pathname,
    title: document.title,
    hasOverlay: Boolean(document.getElementById('questionOverlay')),
    bodyLen: (document.body.innerText || '').replace(/\s+/g, '').length,
  }));
  console.log('state:', JSON.stringify(s2));
  console.log('logs:', logs.length ? logs.slice(0, 6).join(' | ') : '(none)');
  await page.screenshot({ path: 'D:/codex/tarot-draw/output/live-root-url.png' });
  await browser.close();
})().catch((e) => { console.error('ERR', e && e.stack ? e.stack : e.message); process.exit(1); });
