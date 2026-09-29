// Verify the toss end to end. One session, exactly six tosses:
//   1    screenshots + the preparing / air / falling / settled states
//   2-4  the rotation audit: does the resting orientation equal the result?
//   5-6  completed, then the final result must appear
const fs = require('node:fs');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:8888';
const OUT = 'D:/codex/tarot-draw/output/coin-toss';
function loadChromium() {
  for (const id of ['playwright', 'playwright-core', 'D:/npm-global/node_modules/openclaw/node_modules/playwright-core']) {
    try { return require(id).chromium; } catch {}
  }
  throw new Error('no playwright');
}
const rows = [];
const fails = [];
const chk = (l, ok, d = '') => { rows.push(`  ${ok ? 'ok  ' : 'FAIL'} ${l}${ok || !d ? '' : ` — ${d}`}`); if (!ok) fails.push(l); };
const TOSS_SETTLE = 2000;
const HOLD = 700;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await loadChromium().launch({ headless: true, executablePath: CHROME, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 140)));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|Failed to fetch/.test(m.text())) errors.push(m.text().slice(0, 140)); });

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
  chk('摇卦页打开', true);
  chk('3D 画布已渲染', await page.evaluate(() => { const c = document.getElementById('coinCanvas'); return Boolean(c && c.width > 0); }));

  const readState = () => page.evaluate(() => {
    const stage = window.__tarotCoinStage;
    const norm = (x) => { const t = ((x % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); return Math.min(t, Math.PI * 2 - t); };
    return {
      status: document.getElementById('coinStatus').textContent.trim(),
      detail: document.getElementById('coinOutcomeDetail').textContent.trim(),
      outcome: document.getElementById('coinOutcomeText').textContent.trim(),
      filled: document.querySelectorAll('#coinYaoList .coinYao[data-filled="true"]').length,
      names: [...document.querySelectorAll('#coinYaoList .coinYao[data-filled="true"] .coinYaoName')].map((n) => n.textContent.trim()),
      labels: [...document.querySelectorAll('#coinFaces span')].map((s) => s.textContent.trim()),
      btnEnabled: !document.getElementById('coinTossBtn').disabled,
      stageState: stage && stage.state ? stage.state() : 'no-handle',
      restX: stage && stage.coinRotations ? stage.coinRotations().map((r) => Number(norm(r[0]).toFixed(3))) : null,
      rotY: stage && stage.coinRotations ? stage.coinRotations().map((r) => Number(r[1].toFixed(3))) : null,
    };
  });

  /* The panel appends 「　动爻」 to the detail for a moving line, so parse the
     three faces out rather than splitting on the separator and hoping. */
  const parseFaces = (detail) => (detail.match(/[字背]/g) || []).slice(0, 3);
  const px2rot = (detail, restX) => {
    const faces = parseFaces(detail);
    if (faces.length !== 3 || !restX) return { ok: false, why: `unparsed: ${detail} / ${restX}` };
    const bad = faces.filter((f, i) => Math.abs(restX[i] - (f === '背' ? Math.PI : 0)) > 0.02);
    return { ok: bad.length === 0, why: `${detail} → ${restX.join(',')}` };
  };

  /* Poll for a state instead of sampling at a fixed time. The click itself costs
     tens of milliseconds, which is enough to skip a 150ms phase entirely. */
  const waitForState = async (want, budget = 2600) => {
    const t0 = Date.now();
    let seen = 'none';
    while (Date.now() - t0 < budget) {
      seen = (await readState()).stageState;
      if (want.includes(seen)) return seen;
      await page.waitForTimeout(30);
    }
    return seen;
  };

  // ── toss 1: the four beats, driven by the state machine not by the clock ──
  await page.click('#coinTossBtn');
  const seenPreparing = await waitForState(['preparing'], 400);
  chk('蓄力态进入 preparing', seenPreparing === 'preparing', seenPreparing);
  await page.screenshot({ path: `${OUT}/01-preparing.png` });

  const seenTossing = await waitForState(['tossing'], 1500);
  chk('抛起态进入 tossing', seenTossing === 'tossing', seenTossing);
  await page.screenshot({ path: `${OUT}/02-air.png` });

  const seenFalling = await waitForState(['falling'], 1500);
  chk('下落态进入 falling', seenFalling === 'falling', seenFalling);
  await page.screenshot({ path: `${OUT}/03-falling.png` });

  /* Settle fires at TOSS_MS, which is later than the last landing, so wait for
     the RECORD rather than for a duration. */
  await page.waitForFunction(() => document.querySelectorAll('#coinYaoList .coinYao[data-filled="true"]').length >= 1,
    null, { timeout: 4000 });
  await page.screenshot({ path: `${OUT}/04-settled.png` });
  const settled = await readState();
  chk('落定态进入 settling/revealed', /settling|revealed/.test(settled.stageState), settled.stageState);
  chk('一次摇出后记录一爻', settled.filled === 1, `filled=${settled.filled}`);
  chk('结果面板显示三枚正反', parseFaces(settled.detail).length === 3, settled.detail);
  chk('本爻名与类型正确', /初爻/.test(settled.outcome), settled.outcome);

  const first = px2rot(settled.detail, settled.restX);
  chk('第 1 次落定朝向 == 结果', first.ok, first.why);

  await page.waitForTimeout(1100);          // hold expires, reset lands
  const reset = await readState();
  chk('结果停留后复位为待摇姿态', reset.status.includes('待摇'), reset.status);
  chk('复位后按钮重新启用', reset.btnEnabled === true);
  chk('复位后三枚回到中性面', reset.labels.every((l) => l === '字面'), reset.labels.join(','));
  chk('复位后文案指向下一爻', /二爻/.test(reset.status), reset.status);

  // ── tosses 2 and 3: two more rotation audits ─────────────────────────────
  const audit = [];
  for (const n of [2, 3]) {
    await page.click('#coinTossBtn');
    await page.waitForTimeout(TOSS_SETTLE + 250);
    const s = await readState();
    const verdict = px2rot(s.detail, s.restX);
    audit.push(s.detail);
    chk(`第 ${n} 次落定朝向 == 结果`, verdict.ok, verdict.why);
    await page.waitForTimeout(HOLD + 400);
  }

  // ── tosses 4, 5, 6 ──────────────────────────────────────────────────────
  for (const n of [4, 5]) {
    await page.click('#coinTossBtn');
    await page.waitForTimeout(TOSS_SETTLE + HOLD + 500);
  }
  const five = await readState();
  chk('五次后已记录五爻', five.filled === 5, `filled=${five.filled}`);

  /* Read the on-screen order HERE, with five lines filled and the coin sheet
     still open. Measuring it after the sixth toss reads zeros: the sheet is
     hidden by then, every rect collapses to 0, and a stable sort falls back to
     DOM order — which is exactly how this check reported a false failure. */
  const order = await page.evaluate(() => {
    const ol = document.getElementById('coinYaoList');
    const items = [...document.querySelectorAll('#coinYaoList .coinYao')];
    return {
      flexDir: getComputedStyle(ol).flexDirection,
      sheet: [...document.querySelectorAll('link[rel=stylesheet]')].map((l) => l.href).find((h) => h.includes('tarot-ui-v4')),
      visual: items
        .map((li) => ({ name: li.querySelector('.coinYaoName').textContent.trim(), top: li.getBoundingClientRect().top }))
        .sort((a, b) => a.top - b.top)
        .map((x) => x.name),
    };
  });
  chk('六爻屏上自下而上（初爻最低、上爻最高）',
    order.visual[order.visual.length - 1] === '初爻' && order.visual[0] === '上爻',
    `${order.flexDir} · ${order.sheet || 'no v4 sheet'} · ${order.visual.join(',')}`);

  await page.click('#coinTossBtn');
  await page.waitForTimeout(TOSS_SETTLE + 400);
  const six = await readState();
  chk('六次摇完共六爻', six.filled === 6, `filled=${six.filled}`);
  chk('六爻含初爻与上爻', six.names.includes('初爻') && six.names.includes('上爻'), six.names.join(','));
  await page.screenshot({ path: `${OUT}/05-six-lines.png` });

  await page.waitForTimeout(3000);
  const final = await page.evaluate(() => ({
    settleShown: document.getElementById('settleOverlay').classList.contains('show'),
    coinHidden: document.getElementById('coinOverlay').hidden,
  }));
  chk('第 6 次后进入最终结果', final.settleShown === true, JSON.stringify(final));
  await page.screenshot({ path: `${OUT}/06-result.png` });

  chk('全程无脚本错误', errors.length === 0, errors.slice(0, 2).join(' | '));

  await browser.close();
  console.log(rows.join('\n'));
  console.log(JSON.stringify({ status: fails.length ? 'failed' : 'passed', checks: rows.length, failed: fails.length, audited: audit.map((a) => a.detail) }, null, 2));
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log(rows.join('\n')); console.error('ERR', e && e.stack ? e.stack : e.message); process.exit(1); });
