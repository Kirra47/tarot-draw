const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.TAROT_BASE_URL || 'http://127.0.0.1:8888';
const OUT = path.join('D:/codex/tarot-draw/output', 'redesign-preview');

function loadChromium() {
  for (const id of ['playwright', 'playwright-core', 'D:/npm-global/node_modules/openclaw/node_modules/playwright-core']) {
    try { return require(id).chromium; } catch {}
  }
  throw new Error('Playwright is unavailable');
}

async function createPage(browser, options = {}) {
  const context = await browser.newContext({ serviceWorkers: 'block', ...options });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.route('**/api/**', route => route.abort());
  await page.route('**/tarot-reading', route => route.abort());
  return { context, page, errors };
}

async function assertNoOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  assert.ok(dimensions.scrollWidth <= dimensions.clientWidth + 1, `${label} has horizontal overflow: ${JSON.stringify(dimensions)}`);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await loadChromium().launch({
    headless: true,
    executablePath: CHROME,
    args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'],
  });

  const allErrors = [];
  try {
    const blankStart = await createPage(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    allErrors.push(blankStart.errors);
    await blankStart.page.goto(`${BASE}/redesign.html`, { waitUntil: 'domcontentloaded' });
    await Promise.all([
      blankStart.page.waitForURL(url => url.pathname.endsWith('/tarot.html')),
      blankStart.page.locator('#primaryCastButton').click(),
    ]);
    assert.equal(await blankStart.page.locator('#questionInput').inputValue(), '', 'An unadopted random suggestion must not silently become the user question');
    await blankStart.context.close();

    const desktop = await createPage(browser, { viewport: { width: 1440, height: 900 } });
    allErrors.push(desktop.errors);
    await desktop.page.goto(`${BASE}/redesign.html?test=1`, { waitUntil: 'domcontentloaded' });
    await desktop.page.waitForFunction(() => window.__redesignCubeDebug);
    await desktop.page.screenshot({ path: path.join(OUT, 'v5-desktop.png'), fullPage: true });

    assert.equal(await desktop.page.locator('#questionLibrary').getAttribute('open'), null, 'Question library should start collapsed');
    assert.equal(await desktop.page.locator('#customPromptInput').isVisible(), true, 'Direct question input must be visible');
    assert.equal(await desktop.page.locator('.ritualOverlay').count(), 0, 'The redundant confirmation modal should be removed');
    assert.equal(await desktop.page.locator('.themeIcon').count(), 0, 'Theme controls should not use emoji icons');
    await assertNoOverflow(desktop.page, 'desktop');

    await desktop.page.locator('#questionLibrary > summary').click();
    const libraryPrompt = (await desktop.page.locator('#promptTextDisplay').textContent()).trim();
    await desktop.page.locator('#btnAdoptPrompt').click();
    assert.equal(await desktop.page.locator('#customPromptInput').inputValue(), libraryPrompt, 'Adopting a prompt must fill the question field');
    assert.equal(await desktop.page.locator('#btnAdoptPrompt').getAttribute('aria-pressed'), 'true');

    const draftQuestion = '未来三个月，我应该优先稳定关系还是推进工作？';
    await desktop.page.locator('#customPromptInput').fill(draftQuestion);
    await desktop.page.locator('[data-mode="gua"]').click();
    await desktop.page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await desktop.page.locator('#customPromptInput').inputValue(), draftQuestion, 'Draft question should survive a reload in the same tab');
    assert.equal(await desktop.page.locator('[data-mode="gua"]').getAttribute('aria-checked'), 'true', 'Mode draft should survive reload');
    assert.equal(await desktop.page.locator('#questionLibrary').getAttribute('open'), '', 'Library open state should survive reload');

    const beforePause = await desktop.page.evaluate(() => window.__redesignCubeDebug.snapshot().renderedFrames);
    await desktop.page.locator('#cubeMotionToggle').click();
    await desktop.page.waitForTimeout(450);
    const paused = await desktop.page.evaluate(() => window.__redesignCubeDebug.snapshot());
    assert.equal(paused.running, false, 'Cube loop must stop when paused');
    assert.ok(paused.renderedFrames - beforePause <= 3, `Paused cube rendered ${paused.renderedFrames - beforePause} extra frames`);
    await desktop.page.locator('#cubeMotionToggle').click();
    await desktop.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await desktop.page.waitForTimeout(450);
    const offscreenA = await desktop.page.evaluate(() => window.__redesignCubeDebug.snapshot());
    await desktop.page.waitForTimeout(350);
    const offscreenB = await desktop.page.evaluate(() => window.__redesignCubeDebug.snapshot());
    assert.equal(offscreenB.running, false, 'Cube loop must stop offscreen');
    assert.ok(offscreenB.renderedFrames - offscreenA.renderedFrames <= 2, 'Offscreen cube should not keep rendering');

    const handoff = await createPage(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    allErrors.push(handoff.errors);
    await handoff.page.goto(`${BASE}/redesign.html?test=1`, { waitUntil: 'domcontentloaded' });
    const directQuestion = '我该接受新的工作机会吗？';
    await handoff.page.locator('#customPromptInput').fill(directQuestion);
    await handoff.page.locator('[data-mode="combo"]').click();
    await Promise.all([
      handoff.page.waitForURL(url => url.pathname.endsWith('/tarot.html')),
      handoff.page.locator('#primaryCastButton').click(),
    ]);
    await handoff.page.waitForFunction(() => document.querySelector('.readingModeOption[aria-checked="true"]'));
    assert.equal(await handoff.page.locator('#questionInput').inputValue(), directQuestion, 'Formal page must receive the direct question');
    assert.equal(await handoff.page.locator('[data-reading-mode="combo"]').getAttribute('aria-checked'), 'true', 'Formal page must receive combo mode');
    assert.equal(new URL(handoff.page.url()).searchParams.has('q'), false, 'Private question should not remain in the URL');

    const mobile = await createPage(browser, { viewport: { width: 320, height: 700 }, isMobile: true, hasTouch: true });
    allErrors.push(mobile.errors);
    await mobile.page.goto(`${BASE}/redesign.html?test=1`, { waitUntil: 'domcontentloaded' });
    await mobile.page.locator('#customPromptInput').scrollIntoViewIfNeeded();
    await mobile.page.screenshot({ path: path.join(OUT, 'v5-mobile-320.png') });
    await assertNoOverflow(mobile.page, '320px mobile');
    const mobileMetrics = await mobile.page.evaluate(() => {
      const parseRGB = value => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      const luminance = rgb => {
        const channels = rgb.map(value => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      };
      const contrast = (foreground, background) => {
        const a = luminance(parseRGB(foreground));
        const b = luminance(parseRGB(background));
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      };
      const input = document.querySelector('#customPromptInput');
      const inactiveMode = document.querySelector('.modeSegmentItem:not(.active) span');
      const modeSurface = document.querySelector('.modeSegmentedGroup');
      return {
        inputFont: parseFloat(getComputedStyle(input).fontSize),
        modeHeights: [...document.querySelectorAll('.modeSegmentItem')].map(element => element.getBoundingClientRect().height),
        primaryHeight: document.querySelector('#primaryCastButton').getBoundingClientRect().height,
        viewport: document.querySelector('meta[name="viewport"]').content,
        modeTextContrast: contrast(getComputedStyle(inactiveMode).color, getComputedStyle(modeSurface).backgroundColor),
        placeholderContrast: contrast(getComputedStyle(input, '::placeholder').color, getComputedStyle(input).backgroundColor),
      };
    });
    assert.ok(mobileMetrics.inputFont >= 16, 'Mobile textarea font must be at least 16px');
    assert.ok(mobileMetrics.modeHeights.every(height => height >= 48), 'Mobile mode targets must be at least 48px tall');
    assert.ok(mobileMetrics.primaryHeight >= 48, 'Primary action must be at least 48px tall');
    assert.ok(mobileMetrics.modeTextContrast >= 4.5, `Inactive mode text contrast is ${mobileMetrics.modeTextContrast.toFixed(2)}:1`);
    assert.ok(mobileMetrics.placeholderContrast >= 4.5, `Placeholder contrast is ${mobileMetrics.placeholderContrast.toFixed(2)}:1`);
    assert.doesNotMatch(mobileMetrics.viewport, /user-scalable=no|maximum-scale=1/i, 'Viewport must allow zoom');

    const landscape = await createPage(browser, { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    allErrors.push(landscape.errors);
    await landscape.page.goto(`${BASE}/redesign.html?test=1`, { waitUntil: 'domcontentloaded' });
    await assertNoOverflow(landscape.page, '844px landscape');
    assert.equal(await landscape.page.locator('#customPromptInput').isVisible(), true, 'Question input must remain available in landscape');
    await landscape.page.screenshot({ path: path.join(OUT, 'v5-landscape-844.png') });

    const reduced = await createPage(browser, { viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    allErrors.push(reduced.errors);
    await reduced.page.goto(`${BASE}/redesign.html?test=1`, { waitUntil: 'domcontentloaded' });
    await reduced.page.waitForFunction(() => window.__redesignCubeDebug);
    const reducedSnapshot = await reduced.page.evaluate(() => window.__redesignCubeDebug.snapshot());
    assert.equal(reducedSnapshot.running, false, 'Reduced-motion preference must disable autoplay');
    assert.equal(await reduced.page.locator('#cubeMotionToggle').isDisabled(), true, 'Reduced-motion control should explain the stopped animation');

    const errors = allErrors.flat().filter(message => !/Failed to load resource.*ERR_FAILED/i.test(message));
    assert.deepEqual(errors, [], `Browser errors: ${errors.join('\n')}`);
    console.log('redesign v5: all interaction, responsive, handoff, and render lifecycle checks passed');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
