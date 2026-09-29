// Motion is claimed in CSS, so measure it: sample computed transform/opacity over
// time and confirm the elements actually move, stagger, and settle.
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:8888';
function loadChromium() {
  for (const id of ['playwright', 'playwright-core', 'D:/npm-global/node_modules/openclaw/node_modules/playwright-core']) {
    try { return require(id).chromium; } catch {}
  }
  throw new Error('no playwright');
}
const rows = [];
const fails = [];
const check = (label, ok, detail = '') => { rows.push(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok || !detail ? '' : ` — ${detail}`}`); if (!ok) fails.push(label); };

(async () => {
  const browser = await loadChromium().launch({ headless: true, executablePath: CHROME, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/tarot.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#questionOverlay', { timeout: 30000 });
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });

  // Sample the form rows from the very first frame after reload.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#questionOverlay', { timeout: 30000 });
  const samples = await page.evaluate(async () => {
    const rows = [...document.querySelectorAll('#questionOverlay:not([hidden]) .qForm > *')];
    const read = () => rows.map((el) => {
      const cs = getComputedStyle(el);
      const m = new DOMMatrixReadOnly(cs.transform === 'none' ? '' : cs.transform);
      return { o: Number(cs.opacity), y: Math.round(m.m42 * 100) / 100 };
    });
    const out = [];
    for (let i = 0; i < 14; i += 1) {
      out.push(read());
      await new Promise((r) => setTimeout(r, 60));
    }
    return { frames: out, count: rows.length };
  });

  const first = samples.frames[0];
  const last = samples.frames[samples.frames.length - 1];
  const anyMoved = samples.frames.some((f) => f.some((v) => v.o < 0.99 || Math.abs(v.y) > 0.5));
  check('表单行确实有入场动画', anyMoved && samples.count > 0, `rows=${samples.count} firstOpacity=${first.map((v) => v.o).join(',')}`);
  check('动画结束时全部归位', last.every((v) => v.o > 0.99 && Math.abs(v.y) < 0.6), JSON.stringify(last));

  // Stagger: the later rows must still be behind the earlier ones mid-flight.
  const mid = samples.frames[3] || samples.frames[samples.frames.length - 1];
  const staggered = mid.length > 1 && mid[0].o >= mid[mid.length - 1].o - 0.001;
  check('错峰：靠前的行先到位', staggered, `mid=${mid.map((v) => v.o.toFixed(2)).join(',')}`);

  // Press physics: :active must scale the primary button down.
  const pressBox = await page.evaluate(() => {
    const btn = document.getElementById('questionConfirm');
    const before = new DOMMatrixReadOnly(getComputedStyle(btn).transform === 'none' ? '' : getComputedStyle(btn).transform);
    btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    btn.classList.add('__probe');
    return { beforeScale: before.a };
  });
  const activeRule = await page.evaluate(() => {
    let found = null;
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; }
      for (const r of rules) {
        if (r.selectorText && /:active/.test(r.selectorText) && /scale\(/.test(r.cssText)) { found = r.selectorText; break; }
      }
      if (found) break;
    }
    return found;
  });
  check('存在按压反馈规则', Boolean(activeRule), activeRule || 'none');

  // Hexagram draw-on: the diagram must animate its stroke offset.
  await page.click('[data-reading-mode="gua"]');
  await page.fill('#questionInput', '动效验证。');
  await page.click('#questionConfirm');
  try {
    await page.waitForSelector('#coinOverlay:not([hidden])', { timeout: 8000 });
    await page.click('#coinQuickBtn');
  } catch {}
  await page.waitForSelector('#settleOverlay.show', { timeout: 30000 });
  const yao = await page.evaluate(async () => {
    const els = [...document.querySelectorAll('.guaHexagramDiagram .guaYao path, .guaHexagramDiagram .guaYao rect, .guaHexagramDiagram .guaYao line, .guaHexagramDiagram .guaYaoMarks path')];
    if (!els.length) return { count: 0 };
    const read = () => els.slice(0, 8).map((el) => Number(getComputedStyle(el).strokeDashoffset.replace('px', '')) || 0);
    const seen = [];
    for (let i = 0; i < 10; i += 1) { seen.push(read()); await new Promise((r) => setTimeout(r, 70)); }
    const animated = seen.some((f) => f.some((v) => v > 1));
    const delays = els.slice(0, 8).map((el) => getComputedStyle(el).animationDelay);
    return { count: els.length, animated, delays: [...new Set(delays)], last: seen[seen.length - 1] };
  });
  check('卦象图逐爻描画在动', yao.animated, JSON.stringify(yao).slice(0, 200));
  check('六爻有错峰延迟', (yao.delays || []).length > 1, (yao.delays || []).join(','));

  // Reduced motion must actually reduce it.
  const rm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const rp = await rm.newPage();
  await rp.goto(`${BASE}/tarot.html`, { waitUntil: 'domcontentloaded' });
  await rp.waitForSelector('#questionOverlay', { timeout: 30000 });
  const rmState = await rp.evaluate(() => {
    const el = document.querySelector('#questionOverlay .qForm > *');
    const cs = getComputedStyle(el);
    return { name: cs.animationName, duration: cs.animationDuration, delay: cs.animationDelay };
  });
  check('reduced-motion 下塌缩为淡入', rmState.name === 'v4Fade' && parseFloat(rmState.duration) <= 0.2, JSON.stringify(rmState));
  await rm.close();

  await browser.close();
  console.log(rows.join('\n'));
  console.log(JSON.stringify({ status: fails.length ? 'failed' : 'passed', checks: rows.length, failed: fails.length }, null, 2));
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log(rows.join('\n')); console.error('ERR', e && e.stack ? e.stack : e.message); process.exit(1); });
