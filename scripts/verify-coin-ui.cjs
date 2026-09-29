// End-to-end check for the 三钱摇卦 (coin-3q-1) integration.
//
// Needs the local server: node scripts/local-server.mjs --port=8888
// Playwright is resolved from whichever of the known locations exists, because
// this project intentionally has no package.json.
const fs = require('node:fs');
const path = require('node:path');

const BASE = process.env.TAROT_BASE || 'http://127.0.0.1:8888';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUTPUT = path.resolve(process.env.TAROT_TEST_OUTPUT || path.join(__dirname, '../output/coin-integrated'));

function loadChromium() {
  const candidates = [
    'playwright',
    'playwright-core',
    'D:/npm-global/node_modules/openclaw/node_modules/playwright-core',
  ];
  for (const id of candidates) {
    try {
      return require(id).chromium;
    } catch {}
  }
  throw new Error('No playwright/playwright-core found; cannot run the browser checks.');
}

const chromium = loadChromium();
const failures = [];
// Held outside the run so a failure can still close Chromium. A leaked browser
// keeps the event loop alive, hangs the process instead of reporting, and leaves
// the next run short of the machine it needs.
let activeBrowser = null;
const notes = [];
// The live model is external, costs money and can refuse its own output, so the
// UI checks stub it. The stubbed request bodies are inspected instead, which is
// what actually proves the payload describes 三钱法 correctly.
const aiRequests = [];
const aiRequestOrigins = new Set();
const AI_STUB = [
  `data: ${JSON.stringify({ choices: [{ delta: { content: '这是一段用于界面校验的解读文字，先说结论。' } }] })}`,
  '',
  `data: ${JSON.stringify({ choices: [{ delta: { content: '再给一条可以核实的建议。' }, finish_reason: 'stop' }] })}`,
  '',
  'data: [DONE]',
  '',
  '',
].join('\n');

async function stubAI(context) {
  await context.route('**/api/tarot-reading', async (route) => {
    // The deployed page must reach the same-origin proxy. Routing at a private
    // host instead returned 401 to anonymous visitors and killed every reading.
    try {
      const url = new URL(route.request().url());
      aiRequestOrigins.add(url.origin);
    } catch {}
    try {
      const body = route.request().postDataJSON();
      aiRequests.push(body);
    } catch {
      aiRequests.push(null);
    }
    await route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream; charset=utf-8' }, body: AI_STUB });
  });
}

function check(label, condition, detail = '') {
  if (condition) {
    notes.push(`  ok   ${label}`);
    return true;
  }
  failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
  notes.push(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
  return false;
}

async function openSettingsForCoin(page, { drawStyle = 'manual' } = {}) {
  await page.click('#advancedSetup');
  await page.waitForSelector('#setupOverlay:not([hidden])', { timeout: 8000 });
  // The sheet groups live in <details>; the 起卦与补充资料 group holds #castMode.
  await page.waitForSelector('#castMode', { state: 'visible', timeout: 8000 });
  await page.selectOption('#castMode', 'coin');
  const applied = await page.$eval('#castMode', (el) => el.value);
  if (applied !== 'coin') throw new Error(`castMode did not switch to coin (got ${applied})`);
  // 亲手摇卦 opens the shaking screen; 一键起卦 must not. 单起卦 only shows this
  // choice once 铜钱摇卦 is selected.
  await page.waitForSelector('#drawStyleOptions', { state: 'visible', timeout: 8000 });
  await page.click(`#drawStyleOptions [data-draw-style="${drawStyle}"]`);
  const styleApplied = await page.evaluate(() => {
    const active = document.querySelector('#drawStyleOptions .drawStyleOption.active');
    return active ? active.dataset.drawStyle : null;
  });
  if (styleApplied !== drawStyle) throw new Error(`drawStyle did not switch to ${drawStyle} (got ${styleApplied})`);
  await page.click('#settingsSheetDone');
  await page.waitForSelector('#setupOverlay', { state: 'hidden', timeout: 8000 });
}

async function run() {
  fs.mkdirSync(OUTPUT, { recursive: true });
  const browser = activeBrowser = await chromium.launch({
    headless: true,
    executablePath: CHROME,
    // Real GPU first. SwiftShader rasterises every 3D frame on the CPU, and with
    // several live pages that starves the renderer main thread; it showed up as
    // clicks and navigations timing out in the later sections.
    args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
  });
  const errors = [];
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 1,
    serviceWorkers: 'block',
  });
  await stubAI(context);
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });

  // ── A0. Entry must expose 起卦方法, and 抽牌方式 must really hide ─────────
  // `element.hidden = true` did nothing to #drawStyleOptions because the class
  // sets display:flex, so 亲手抽牌 showed in 单起卦 where it means nothing.
  const entryPage = await context.newPage();
  entryPage.on('pageerror', (error) => errors.push(`entry pageerror: ${error.message}`));
  entryPage.on('console', (message) => { if (message.type() === 'error') errors.push(`entry console: ${message.text()}`); });
  await entryPage.goto(`${BASE}/tarot.html`, { waitUntil: 'domcontentloaded' });
  await entryPage.waitForSelector('#questionOverlay', { timeout: 15000 });
  const defaultSelection = await entryPage.evaluate(() => ({
    readingMode: document.querySelector('.readingModeOption[aria-checked="true"]')?.dataset.readingMode,
    castMode: document.getElementById('castMode').value,
    drawStyle: document.querySelector('#drawStyleOptions [data-draw-style][aria-checked="true"]')?.dataset.drawStyle,
    action: document.querySelector('#questionConfirm span')?.textContent.trim(),
  }));
  check('未设置偏好时默认起卦、铜钱摇卦、亲手摇卦', defaultSelection.readingMode === 'gua' && defaultSelection.castMode === 'coin' && defaultSelection.drawStyle === 'manual', JSON.stringify(defaultSelection));
  check('默认主操作提示开始摇卦', defaultSelection.action === '开始摇卦', defaultSelection.action);
  await entryPage.click('[data-reading-mode="tarot"]');
  await entryPage.click('#advancedSetup');
  await entryPage.waitForSelector('#setupOverlay:not([hidden])', { timeout: 8000 });
  await entryPage.click('#drawStyleOptions [data-draw-style="quick"]');
  await entryPage.click('#settingsSheetDone');
  await entryPage.waitForSelector('#setupOverlay', { state: 'hidden' });
  const tarotConfirmLabel = await entryPage.$eval('#questionConfirm span', (el) => el.textContent.trim());
  check('单塔罗可选一键翻牌', tarotConfirmLabel === '一键翻牌', tarotConfirmLabel);
  check('单塔罗隐藏起卦方法快捷行', await entryPage.$eval('#castMethodQuick', (el) => el.hidden));
  await entryPage.click('[data-reading-mode="gua"]');
  check('单起卦显示起卦方法快捷行', !(await entryPage.$eval('#castMethodQuick', (el) => el.hidden)));
  const quickChips = await entryPage.$$eval('#castMethodQuick [data-cast-method]', (n) => n.map((x) => x.textContent.trim()));
  check('首页直接提供铜钱摇卦入口', quickChips.includes('铜钱摇卦'), quickChips.join('/'));
  await entryPage.click('#castMethodQuick [data-cast-method="time"]');

  await entryPage.click('#advancedSetup');
  await entryPage.waitForSelector('#setupOverlay:not([hidden])', { timeout: 8000 });
  const drawHidden = await entryPage.evaluate(() => {
    const el = document.getElementById('drawStyleOptions');
    return { hidden: el.hidden, display: getComputedStyle(el).display, height: Math.round(el.getBoundingClientRect().height) };
  });
  check('单起卦 + 按时间：抽牌方式真正隐藏', drawHidden.hidden && drawHidden.display === 'none' && drawHidden.height === 0, JSON.stringify(drawHidden));
  await entryPage.click('#settingsSheetDone');
  await entryPage.waitForSelector('#setupOverlay', { state: 'hidden' });

  // One tap on the entry chip replaces the three-level trip into the sheet.
  await entryPage.click('#castMethodQuick [data-cast-method="coin"]');
  const castAfterChip = await entryPage.$eval('#castMode', (el) => el.value);
  check('首页点「铜钱摇卦」即切换起卦方法', castAfterChip === 'coin', castAfterChip);
  await entryPage.click('#advancedSetup');
  await entryPage.waitForSelector('#setupOverlay:not([hidden])', { timeout: 8000 });
  const drawShown = await entryPage.evaluate(() => {
    const el = document.getElementById('drawStyleOptions');
    return { hidden: el.hidden, display: getComputedStyle(el).display };
  });
  check('选中铜钱后抽牌方式出现', !drawShown.hidden && drawShown.display !== 'none', JSON.stringify(drawShown));
  const coinChips = await entryPage.$$eval('#drawStyleOptions .drawStyleOption', (n) => n.map((x) => x.textContent.trim()));
  check('抽牌方式改为铜钱措辞', coinChips.includes('亲手摇卦'), coinChips.join('/'));
  await entryPage.click('#drawStyleOptions [data-draw-style="manual"]');
  await entryPage.click('#settingsSheetDone');
  await entryPage.waitForSelector('#setupOverlay', { state: 'hidden' });
  // Clicking a 起卦方法 chip must not be mistaken for a 抽牌方式 choice.
  await entryPage.click('#castMethodQuick [data-cast-method="time"]');
  const styleAfterChip = await entryPage.evaluate(() => {
    const active = document.querySelector('#drawStyleOptions .drawStyleOption.active');
    return active ? active.dataset.drawStyle : null;
  });
  check('切换起卦方法不会误改抽牌方式', styleAfterChip === 'manual', String(styleAfterChip));

  // The build stamp answers "is my phone on the new build?". It read
  // v69-coin-default while the code had moved on, which told visitors they were
  // stale when they were not, so it must track the release.
  const appBuild = await entryPage.$eval('#appBuildLabel', (el) => el.textContent.trim());
  const cacheVersion = fs.readFileSync(path.join(__dirname, '..', 'service-worker.js'), 'utf8').match(/CACHE_VERSION = "([^"]+)"/)[1];
  const releaseToken = (value) => ((value.match(/v\d+-[a-z0-9-]+/) || [''])[0]).replace(/-\d{8}$/, '');
  check('构建标记与缓存版本一致', releaseToken(appBuild) === releaseToken(cacheVersion), `build="${appBuild}" cache="${cacheVersion}"`);
  check('构建标记不是上一版遗留', !/v69/.test(appBuild), appBuild);
  await entryPage.close();

  // ── A. 单起卦 + 铜钱摇卦, manual toss then one-click ─────────────────────
  await page.goto(`${BASE}/tarot.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#questionOverlay', { timeout: 15000 });
  await page.click('[data-reading-mode="gua"]');
  await page.fill('#questionInput', '这段合作接下来会怎样？');
  await openSettingsForCoin(page);

  const hint = await page.$eval('#castModeHint', (el) => el.textContent.trim());
  check('起卦方法提示更新为铜钱说明', hint.includes('铜钱'), hint);
  const styleLabels = await page.$$eval('#drawStyleOptions .drawStyleOption', (nodes) => nodes.map((n) => n.textContent.trim()));
  check('单起卦下抽牌方式改为铜钱措辞', styleLabels.includes('亲手摇卦') && styleLabels.includes('一键起卦'), styleLabels.join('/'));

  await page.click('#questionConfirm');
  await page.waitForSelector('#coinOverlay:not([hidden])', { timeout: 10000 });
  check('单起卦打开摇卦舞台', true);

  const manualUsable = await page.$eval('#coinTossBtn', (el) => !el.hidden && !el.disabled);
  check('单起卦提供手动摇卦', manualUsable);
  const quickVisible = await page.$eval('#coinQuickBtn', (el) => !el.disabled);
  check('单起卦提供一键起卦', quickVisible);

  const stageReady = await page.evaluate(() => Boolean(window.coinCast && window.coinCast.stageReady()));
  check('三维铜钱舞台完成初始化', stageReady);
  await page.screenshot({ path: path.join(OUTPUT, 'coin-stage-idle.png') });

  // Manual toss: one line, and the first line must be a legal 6/7/8/9 value.
  await page.click('#coinTossBtn');
  await page.waitForFunction(() => document.getElementById('coinProgress').textContent.trim().startsWith('1 /'), { timeout: 12000 });
  const firstLine = await page.$eval('#coinYaoList li:first-child', (el) => el.textContent.replace(/\s+/g, ' ').trim());
  check('手动摇卦记录第一爻', /老阴|少阳|少阴|老阳/.test(firstLine), firstLine);
  const facesShown = await page.$$eval('#coinFaces span', (nodes) => nodes.map((n) => n.textContent));
  check('三枚铜钱面显示为字面/背面', facesShown.length === 3 && facesShown.every((t) => t === '字面' || t === '背面'), facesShown.join(','));
  await page.screenshot({ path: path.join(OUTPUT, 'coin-stage-one-line.png') });

  // One-click finishes the remaining five lines.
  await page.click('#coinQuickBtn');
  await page.waitForSelector('#settleOverlay.show', { timeout: 20000 });
  const lines = await page.evaluate(() => window.coinCast.getLines());
  check('六爻全部记录', Array.isArray(lines) && lines.length === 6, JSON.stringify(lines));
  check('每爻都是 6/7/8/9', Array.isArray(lines) && lines.every((v) => [6, 7, 8, 9].includes(v)), JSON.stringify(lines));

  const panelVisible = await page.$eval('#meihuaPanel', (el) => !el.hidden);
  check('结果页显示本卦面板', panelVisible);
  const badge = await page.$eval('#meihuaModeBadge', (el) => el.textContent.trim());
  check('结果页标注为铜钱摇卦', badge === '铜钱摇卦', badge);

  const structureMeta = await page.$eval('#guaStructureMeta', (el) => el.textContent.replace(/\s+/g, ' ').trim());
  check('结构摘要按三钱法呈现', structureMeta.includes('铜钱'), structureMeta);
  check('结构摘要不声称体用', !structureMeta.includes('体卦') && !structureMeta.includes('用卦') && !structureMeta.includes('体用关系'), structureMeta);

  const grid = await page.$eval('#meihuaGrid', (el) => el.textContent.replace(/\s+/g, ' ').trim());
  check('摘要卡不出现体·用', !grid.includes('体 · 用'), grid);

  const structureCards = await page.$$eval('#guaStructureGrid .guaMeaningCard .guaMeaningCardTop span:first-child', (nodes) => nodes.map((n) => n.textContent.trim()));
  check('三钱卦只给本卦与变卦，不给互卦', !structureCards.includes('互卦') && structureCards.includes('本卦') && structureCards.includes('变卦'), structureCards.join('/'));
  const structureBeforeAI = await page.evaluate(() => {
    const structure = document.getElementById('guaStructureSummary');
    const ai = document.getElementById('aiReading');
    return Boolean(structure.compareDocumentPosition(ai) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  check('先展示卦象结构，再展示 AI 解读', structureBeforeAI);
  const perHexagramSources = await page.$$eval('#guaStructureGrid .guaMeaningOriginal', (nodes) => nodes.map((node) => ({
    citation: node.querySelector('summary')?.textContent || '',
    original: node.querySelector('p')?.textContent.trim() || '',
    href: node.querySelector('a')?.href || '',
  })));
  check('每个卦象卡都标明《周易》出处与原文', perHexagramSources.length === 2 && perHexagramSources.every((item) => item.citation.includes('周易') && item.original.length > 5 && item.href.startsWith('https://zh.wikisource.org/')), JSON.stringify(perHexagramSources));

  const trace = await page.$eval('#meihuaTraceText', (el) => el.textContent);
  check('取数过程记录六爻与规则档案', trace.includes('铜钱摇卦') && trace.includes('coin-3q-1'), trace.split('\n')[0]);
  check('取数过程声明不取梅花体用', trace.includes('不取梅花体用与互卦'));

  const heading = await page.$eval('#meihuaBaseReading', (el) => el.textContent.replace(/\s+/g, ' ').trim());
  check('本卦解读非空', heading.length > 40, `length=${heading.length}`);

  const insightLines = await page.$$eval('#meihuaBaseReading .hexagramLine.moving', (nodes) => nodes.length);
  const expectedMoving = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('tarot-reading-history-v3') || '[]');
    const last = raw.find((item) => item.meihua && item.meihua.mode === 'coin');
    return last ? last.meihua.movingLines.length : -1;
  });
  check('六爻图标记的动爻数与记录一致', insightLines === expectedMoving, `figure=${insightLines} record=${expectedMoving}`);

  const saved = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('tarot-reading-history-v3') || '[]');
    const item = raw.find((entry) => entry.meihua && entry.meihua.mode === 'coin');
    if (!item) return null;
    return {
      mode: item.meihua.mode,
      profile: item.meihua.profile,
      lineValues: item.meihua.lineValues,
      movingLines: item.meihua.movingLines,
      movingLine: item.meihua.movingLine === undefined ? 'absent' : item.meihua.movingLine,
      body: item.meihua.body === undefined ? 'absent' : item.meihua.body,
      relation: item.meihua.relation === undefined ? 'absent' : item.meihua.relation,
      coinFaces: item.meihua.coinFaces,
    };
  });
  check('档案保存三钱规则档案', saved && saved.profile === 'coin-3q-1', JSON.stringify(saved && saved.profile));
  check('档案保存六爻数值', saved && Array.isArray(saved.lineValues) && saved.lineValues.length === 6, JSON.stringify(saved && saved.lineValues));
  check('档案保存动爻列表', saved && Array.isArray(saved.movingLines), JSON.stringify(saved && saved.movingLines));
  check('档案不写单动爻与体用', saved && saved.movingLine === 'absent' && saved.body === 'absent', JSON.stringify(saved));
  check('档案保留每次铜钱面', saved && Array.isArray(saved.coinFaces) && saved.coinFaces.length === 6, JSON.stringify(saved && saved.coinFaces));

  await page.screenshot({ path: path.join(OUTPUT, 'settlement-desktop.png'), fullPage: false });
  await page.evaluate(() => {
    const el = document.getElementById('settleOverlay');
    el.scrollTop = Math.min(el.scrollHeight, 900);
  });
  await page.screenshot({ path: path.join(OUTPUT, 'settlement-desktop-scrolled.png'), fullPage: false });

  // AI description must describe the coin method, not a 梅花 cast.
  const aiDescription = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('tarot-reading-history-v3') || '[]');
    const item = raw.find((entry) => entry.meihua && entry.meihua.mode === 'coin');
    return item ? item.meihua.modeLabel : null;
  });
  check('档案标注起卦方式', aiDescription === '铜钱摇卦', String(aiDescription));

  // ── B. 二合一 always casts and draws with one action ────────────────────
  const comboPage = await context.newPage();
  comboPage.on('pageerror', (error) => errors.push(`combo pageerror: ${error.message}`));
  comboPage.on('console', (message) => { if (message.type() === 'error') errors.push(`combo console: ${message.text()}`); });
  await comboPage.goto(`${BASE}/tarot.html`, { waitUntil: 'domcontentloaded' });
  await comboPage.waitForSelector('#questionOverlay', { timeout: 15000 });
  await comboPage.click('[data-reading-mode="combo"]');
  await comboPage.fill('#questionInput', '这段时间该先做什么？');
  await comboPage.click('#advancedSetup');
  await comboPage.waitForSelector('#setupOverlay:not([hidden])', { timeout: 8000 });
  await comboPage.selectOption('#castMode', 'coin');
  const comboDrawChoice = await comboPage.evaluate(() => {
    const el = document.getElementById('drawStyleOptions');
    return { hidden: el.hidden, display: getComputedStyle(el).display };
  });
  check('二合一隐藏独立的手动/快速选项', comboDrawChoice.hidden && comboDrawChoice.display === 'none', JSON.stringify(comboDrawChoice));
  const inheritedStyle = await comboPage.$eval('#drawStyleOptions [data-draw-style].active', (el) => el.dataset.drawStyle).catch(() => null);
  check('二合一不会暴露已保存的手动选择', inheritedStyle === 'manual', String(inheritedStyle));
  await comboPage.click('#settingsSheetDone');
  await comboPage.waitForSelector('#setupOverlay', { state: 'hidden', timeout: 8000 });
  const comboConfirm = await comboPage.$eval('#questionConfirm span', (el) => el.textContent.trim());
  check('二合一主操作明确为一次开始', comboConfirm === '开始二合一', comboConfirm);
  await comboPage.click('#questionConfirm');
  await comboPage.waitForSelector('#settleOverlay.show', { timeout: 30000 });
  const comboCoinStageSkipped = await comboPage.$eval('#coinOverlay', (el) => el.hidden);
  check('二合一铜钱直接一键成卦，不进入手摇页', comboCoinStageSkipped);
  const comboLines = await comboPage.evaluate(() => window.coinCast.getLines());
  check('二合一一键记录六爻', Array.isArray(comboLines) && comboLines.length === 6, JSON.stringify(comboLines));
  const comboRecord = await comboPage.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('tarot-reading-history-v3') || '[]');
    const item = raw.find((entry) => entry.readingMode === 'combo' && entry.meihua && entry.meihua.mode === 'coin');
    return item ? { cards: (item.cards || []).length, lines: item.meihua.lineValues.length, faces: item.meihua.coinFaces } : null;
  });
  check('二合一同时保存塔罗牌和六次三钱结果', comboRecord && comboRecord.cards > 0 && comboRecord.lines === 6, JSON.stringify(comboRecord));
  check('每次一键起卦都记录三枚铜钱正反面', comboRecord && Array.isArray(comboRecord.faces) && comboRecord.faces.length === 6 && comboRecord.faces.every((faces) => Array.isArray(faces) && faces.length === 3), JSON.stringify(comboRecord && comboRecord.faces));
  await comboPage.screenshot({ path: path.join(OUTPUT, 'combo-quick-settlement.png') });

  await comboPage.close();

  // ── B2. 一键起卦 must skip the shaking screen entirely ───────────────────
  const quickPage = await context.newPage();
  quickPage.on('pageerror', (error) => errors.push(`quick pageerror: ${error.message}`));
  quickPage.on('console', (message) => { if (message.type() === 'error') errors.push(`quick console: ${message.text()}`); });
  await quickPage.goto(`${BASE}/tarot.html`, { waitUntil: 'domcontentloaded' });
  await quickPage.waitForSelector('#questionOverlay', { timeout: 15000 });
  await quickPage.click('[data-reading-mode="gua"]');
  await quickPage.fill('#questionInput', '一键起一卦。');
  await openSettingsForCoin(quickPage, { drawStyle: 'quick' });
  const quickConfirmLabel = await quickPage.$eval('#questionConfirm span', (el) => el.textContent.trim());
  check('一键模式下主按钮改为「一键起卦」', quickConfirmLabel.includes('一键起卦'), quickConfirmLabel);
  await quickPage.click('#questionConfirm');
  await quickPage.waitForSelector('#settleOverlay.show', { timeout: 20000 });
  const stageNeverOpened = await quickPage.$eval('#coinOverlay', (el) => el.hidden);
  check('一键起卦不打开摇卦页', stageNeverOpened);
  const quickLines = await quickPage.evaluate(() => window.coinCast.getLines());
  check('一键起卦仍记录六爻', Array.isArray(quickLines) && quickLines.length === 6, JSON.stringify(quickLines));
  check('一键起卦每爻都是 6/7/8/9', Array.isArray(quickLines) && quickLines.every((v) => [6, 7, 8, 9].includes(v)), JSON.stringify(quickLines));
  const quickMeta = await quickPage.$eval('#guaStructureMeta', (el) => el.textContent.replace(/\s+/g, ' ').trim());
  check('一键起卦结果仍按三钱法呈现', quickMeta.includes('铜钱'), quickMeta);
  await quickPage.screenshot({ path: path.join(OUTPUT, 'quick-settlement.png') });

  // 二合一 with a non-coin casting method still completes both together.
  const comboQuickPage = await context.newPage();
  comboQuickPage.on('pageerror', (error) => errors.push(`combo quick pageerror: ${error.message}`));
  comboQuickPage.on('console', (message) => { if (message.type() === 'error') errors.push(`combo quick console: ${message.text()}`); });
  await comboQuickPage.goto(`${BASE}/tarot.html`, { waitUntil: 'domcontentloaded' });
  await comboQuickPage.waitForSelector('#questionOverlay', { timeout: 15000 });
  await comboQuickPage.click('[data-reading-mode="combo"]');
  await comboQuickPage.fill('#questionInput', '同时看牌和卦。');
  await comboQuickPage.click('#advancedSetup');
  await comboQuickPage.waitForSelector('#setupOverlay:not([hidden])', { timeout: 8000 });
  await comboQuickPage.selectOption('#castMode', 'time');
  await comboQuickPage.click('#settingsSheetDone');
  await comboQuickPage.waitForSelector('#setupOverlay', { state: 'hidden', timeout: 8000 });
  await comboQuickPage.click('#questionConfirm');
  await comboQuickPage.waitForSelector('#settleOverlay.show', { timeout: 30000 });
  const comboTimeRecord = await comboQuickPage.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('tarot-reading-history-v3') || '[]');
    const item = raw.find((entry) => entry.readingMode === 'combo' && entry.meihua && entry.meihua.mode === 'time');
    return item ? { mode: item.readingMode, cards: (item.cards || []).length, profile: item.meihua.profile } : null;
  });
  check('二合一按时间法也同步留下牌面与卦象', comboTimeRecord && comboTimeRecord.mode === 'combo' && comboTimeRecord.profile, JSON.stringify(comboTimeRecord));
  check('二合一按时间法确实抽到了牌面', comboTimeRecord && comboTimeRecord.cards > 0, JSON.stringify(comboTimeRecord));

  await quickPage.close();
  await comboQuickPage.close();

  // ── C. 单塔罗 must not be touched by the coin path ───────────────────────
  const tarotPage = await context.newPage();
  tarotPage.on('pageerror', (error) => errors.push(`tarot pageerror: ${error.message}`));
  tarotPage.on('console', (message) => { if (message.type() === 'error') errors.push(`tarot console: ${message.text()}`); });
  await tarotPage.goto(`${BASE}/tarot.html`, { waitUntil: 'domcontentloaded' });
  await tarotPage.waitForSelector('#questionOverlay', { timeout: 15000 });
  await tarotPage.click('[data-reading-mode="tarot"]');
  await tarotPage.fill('#questionInput', '先看牌面。');
  await tarotPage.click('#questionConfirm');
  await tarotPage.waitForTimeout(2500);
  const tarotCoinHidden = await tarotPage.$eval('#coinOverlay', (el) => el.hidden);
  check('单塔罗不进入摇卦舞台', tarotCoinHidden);

  await tarotPage.close();

  // ── D. 梅花路径仍然按时间起卦 ────────────────────────────────────────────
  const meihuaPage = await context.newPage();
  meihuaPage.on('pageerror', (error) => errors.push(`meihua pageerror: ${error.message}`));
  meihuaPage.on('console', (message) => { if (message.type() === 'error') errors.push(`meihua console: ${message.text()}`); });
  await meihuaPage.goto(`${BASE}/tarot.html`, { waitUntil: 'domcontentloaded' });
  await meihuaPage.waitForSelector('#questionOverlay', { timeout: 15000 });
  await meihuaPage.evaluate(() => { try { localStorage.removeItem('tarot-ui-preferences-v1'); } catch {} });
  await meihuaPage.reload({ waitUntil: 'domcontentloaded' });
  await meihuaPage.waitForSelector('#questionOverlay', { timeout: 15000 });
  await meihuaPage.click('[data-reading-mode="gua"]');
  await meihuaPage.click('#castMethodQuick [data-cast-method="time"]');
  await meihuaPage.fill('#questionInput', '按时间起一卦。');
  await meihuaPage.click('#questionConfirm');
  await meihuaPage.waitForSelector('#settleOverlay.show', { timeout: 15000 });
  const meihuaMode = await meihuaPage.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('tarot-reading-history-v3') || '[]');
    const item = raw.find((entry) => entry.meihua && entry.meihua.mode !== 'coin' && entry.meihua.mode !== 'none');
    return item ? { mode: item.meihua.mode, profile: item.meihua.profile, movingLine: item.meihua.movingLine, relation: item.meihua.relation } : null;
  });
  check('明确选择按时间后仍按梅花起卦', meihuaMode && meihuaMode.mode === 'time' && meihuaMode.profile === 'mh-ws-1', JSON.stringify(meihuaMode));
  check('梅花记录仍保留单动爻与体用', meihuaMode && Number.isInteger(meihuaMode.movingLine) && Boolean(meihuaMode.relation), JSON.stringify(meihuaMode));
  const meihuaMeta = await meihuaPage.$eval('#guaStructureMeta', (el) => el.textContent.replace(/\s+/g, ' ').trim());
  check('梅花结构摘要仍显示体用', meihuaMeta.includes('体卦') && meihuaMeta.includes('用卦'), meihuaMeta);
  const meihuaCards = await meihuaPage.$$eval('#guaStructureGrid .guaMeaningCard .guaMeaningCardTop span:first-child', (nodes) => nodes.map((n) => n.textContent.trim()));
  check('梅花仍显示互卦', meihuaCards.includes('互卦'), meihuaCards.join('/'));
  const meihuaSources = await meihuaPage.$$eval('#guaStructureGrid .guaMeaningOriginal', (nodes) => nodes.map((node) => ({
    citation: node.querySelector('summary')?.textContent || '',
    original: node.querySelector('p')?.textContent.trim() || '',
    href: node.querySelector('a')?.href || '',
  })));
  check('梅花本卦、互卦、变卦都有经文出处', meihuaSources.length === 3 && meihuaSources.every((item) => item.citation.includes('周易') && item.original.length > 5 && item.href.startsWith('https://zh.wikisource.org/')), JSON.stringify(meihuaSources));
  const meihuaStructureBeforeAI = await meihuaPage.evaluate(() => {
    const structure = document.getElementById('guaStructureSummary');
    const ai = document.getElementById('aiReading');
    return Boolean(structure.compareDocumentPosition(ai) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  check('梅花起卦也先看卦象，再看 AI 解读', meihuaStructureBeforeAI);

  await meihuaPage.close();

  // ── E. 移动端布局 ────────────────────────────────────────────────────────
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    serviceWorkers: 'block',
    reducedMotion: 'reduce',
  });
  await stubAI(mobile);
  const mobilePage = await mobile.newPage();
  mobilePage.on('pageerror', (error) => errors.push(`mobile pageerror: ${error.message}`));
  await mobilePage.goto(`${BASE}/tarot.html`, { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForSelector('#questionOverlay', { timeout: 15000 });
  await mobilePage.click('[data-reading-mode="gua"]');
  await openSettingsForCoin(mobilePage);
  await mobilePage.click('#questionConfirm');
  await mobilePage.waitForSelector('#coinOverlay:not([hidden])', { timeout: 10000 });
  await mobilePage.screenshot({ path: path.join(OUTPUT, 'coin-stage-mobile.png') });
  const overflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('移动端摇卦页无横向溢出', overflow <= 1, `overflow=${overflow}px`);
  // reduced motion must still produce six lines without waiting on animation
  await mobilePage.click('#coinQuickBtn');
  await mobilePage.waitForSelector('#settleOverlay.show', { timeout: 20000 });
  await mobilePage.waitForFunction(() => {
    const panel = document.getElementById('settlePanel');
    const rect = panel.getBoundingClientRect();
    return getComputedStyle(panel).display !== 'none' && rect.width > 0 && rect.height > 0 && panel.textContent.includes('卦象结构');
  }, { timeout: 8000 });
  await mobilePage.waitForTimeout(350);
  check('手机结果页先显示卦象与可读正文', await mobilePage.$eval('#guaStructureSummary', (el) => !el.hidden && el.getBoundingClientRect().height > 0));
  const reducedLines = await mobilePage.evaluate(() => window.coinCast.getLines());
  check('减少动态效果时仍能完成六爻', Array.isArray(reducedLines) && reducedLines.length === 6, JSON.stringify(reducedLines));
  await mobilePage.screenshot({ path: path.join(OUTPUT, 'settlement-mobile.png') });

  check('没有控制台或页面错误', errors.length === 0, errors.slice(0, 4).join(' | '));

  await mobilePage.close();
  // ── F. What the model actually receives for a 三钱 cast ──────────────────
  const coinPayload = aiRequests.find((body) => body && typeof body.meihua === 'string' && body.meihua.includes('coin-3q-1'));
  check('AI 请求带上三钱规则档案', Boolean(coinPayload));
  if (coinPayload) {
    const meihua = coinPayload.meihua;
    check('AI 载荷标注铜钱摇卦', meihua.includes('起卦方式：铜钱摇卦'), meihua.split('\n')[1]);
    check('AI 载荷给出六爻明细', /六爻（自初爻至上爻）：/.test(meihua));
    check('AI 载荷不声称梅花体用', !meihua.includes('体用：体') && !meihua.includes('互卦：'), meihua.slice(0, 80));
    check('AI 载荷声明不取互卦与体用', meihua.includes('不取互卦与体用'));
    check('AI 请求用结构化字段标明三钱规则档案', coinPayload.castProfile === 'coin-3q-1' && coinPayload.castMethod === 'three-coins');
    check('AI 载荷包含本卦原文和可追溯出处', meihua.includes('本卦《周易·') && meihua.includes('出处：https://zh.wikisource.org/'));
    check('AI 载荷携带六爻数值', coinPayload.meihua.includes('（字面记 2、背面记 3'), '');
    check('AI 载荷的 readingMode 正确', ['gua', 'combo'].includes(coinPayload.readingMode), String(coinPayload.readingMode));
  }
  const meihuaPayload = aiRequests.find((body) => body && typeof body.meihua === 'string' && body.meihua.includes('mh-ws-1'));
  if (meihuaPayload) {
    check('梅花载荷仍包含体用与互卦', meihuaPayload.meihua.includes('体用：体') && meihuaPayload.meihua.includes('互卦：'));
    check('梅花载荷不被写成三钱法', !meihuaPayload.meihua.includes('coin-3q-1'));
    check('AI 载荷包含互卦原文和独立出处', /互卦《周易·.+卦》卦辞：/.test(meihuaPayload.meihua) && meihuaPayload.meihua.includes('出处：https://zh.wikisource.org/'));
  }
  check('AI 请求只发往同源代理', aiRequests.length > 0 && [...aiRequestOrigins].every((origin) => origin === new URL(BASE).origin), [...aiRequestOrigins].join(','));
  check('未再指向私有 Codex AI 站点', ![...aiRequestOrigins].some((origin) => origin.includes('chatgpt.site')), [...aiRequestOrigins].join(','));

  await browser.close();
  return { failures, notes, errors };
}

run()
  .then(({ failures, notes, errors }) => {
    console.log(notes.join('\n'));
    const report = {
      status: failures.length ? 'failed' : 'passed',
      checks: notes.length,
      failed: failures.length,
      consoleErrors: errors.length,
      output: OUTPUT,
    };
    console.log(JSON.stringify(report, null, 2));
    process.exit(failures.length ? 1 : 0);
  })
  .catch((error) => {
    console.error(notes.join('\n'));
    console.error('RUN ERROR:', error && error.stack ? error.stack : error);
    // Leaving Chromium alive keeps the event loop busy and the run hangs instead
    // of reporting the failure; it also starves the next run of the machine.
    if (activeBrowser) activeBrowser.close().catch(() => {}).finally(() => process.exit(1));
    else process.exit(1);
  });
