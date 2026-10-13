const fs = require('node:fs');
const path = require('node:path');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:8888';
const OUT = path.join('D:/codex/tarot-draw/output', 'redesign-preview');

function loadChromium() {
  for (const id of ['playwright', 'playwright-core', 'D:/npm-global/node_modules/openclaw/node_modules/playwright-core']) {
    try { return require(id).chromium; } catch {}
  }
  throw new Error('no playwright');
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await loadChromium().launch({
    headless: true,
    executablePath: CHROME,
    args: ['--use-angle=d3d11', '--ignore-gpu-blocklist']
  });

  const errors = [];

  // 1. Desktop 1440x900
  console.log('Testing Desktop 1440x900...');
  const deskCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const deskPage = await deskCtx.newPage();
  deskPage.on('pageerror', (e) => {
    console.error('Page error (desktop):', e.message);
    errors.push(e.message);
  });
  deskPage.on('console', msg => {
    if (msg.type() === 'error') console.error('Console error (desktop):', msg.text());
  });

  await deskPage.goto(`${BASE}/redesign.html`, { waitUntil: 'domcontentloaded' });
  await deskPage.waitForTimeout(2000); // Wait for Three.js render
  await deskPage.screenshot({ path: path.join(OUT, 'desktop-01-initial.png') });
  console.log('Saved desktop-01-initial.png');

  // Test "换一个问题"
  console.log('Testing "换一个问题" button click...');
  const promptBefore = await deskPage.textContent('#promptTextDisplay');
  await deskPage.click('#btnNextPrompt');
  await deskPage.waitForTimeout(600);
  const promptAfter = await deskPage.textContent('#promptTextDisplay');
  console.log(`Prompt changed from: "${promptBefore.trim().slice(0, 20)}..." to "${promptAfter.trim().slice(0, 20)}..."`);
  await deskPage.screenshot({ path: path.join(OUT, 'desktop-02-next-prompt.png') });
  console.log('Saved desktop-02-next-prompt.png');

  // Test custom input toggle
  console.log('Testing custom input toggle...');
  await deskPage.click('#btnToggleCustom');
  await deskPage.waitForTimeout(400);
  await deskPage.fill('#customPromptInput', '关于下半年团队业务方向的突破口');
  await deskPage.screenshot({ path: path.join(OUT, 'desktop-03-custom-input.png') });
  console.log('Saved desktop-03-custom-input.png');

  // Test modal open
  console.log('Testing "启卷入境" modal...');
  await deskPage.click('#primaryCastButton');
  await deskPage.waitForTimeout(500);
  await deskPage.screenshot({ path: path.join(OUT, 'desktop-04-modal-open.png') });
  console.log('Saved desktop-04-modal-open.png');
  await deskPage.click('#modalCloseBtn');
  await deskPage.waitForTimeout(300);

  // 2. Mobile 390x844 (iPhone 14)
  console.log('Testing Mobile 390x844...');
  const mobCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobPage = await mobCtx.newPage();
  mobPage.on('pageerror', (e) => {
    console.error('Page error (mobile):', e.message);
    errors.push(e.message);
  });

  await mobPage.goto(`${BASE}/redesign.html`, { waitUntil: 'domcontentloaded' });
  await mobPage.waitForTimeout(2000);
  await mobPage.screenshot({ path: path.join(OUT, 'mobile-01-initial.png') });
  console.log('Saved mobile-01-initial.png');

  await browser.close();

  console.log('Total page errors caught:', errors.length);
  if (errors.length > 0) {
    process.exit(1);
  } else {
    console.log('All tests passed with ZERO page errors!');
  }
})();
