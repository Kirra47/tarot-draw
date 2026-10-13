// Does the boot watchdog actually fire when the app fails to boot, and stay
// quiet when it boots normally? Both directions matter.
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:8888';
const fs = require('node:fs');
const html = fs.readFileSync('D:/codex/tarot-draw/tarot.html', 'utf8');
const timeoutMs = Number((html.match(/noticeTimer=setTimeout\(show,(\d+)\)/) || [, '0'])[1]);
if (!timeoutMs) throw new Error('boot watchdog timeout not found');
const appBuild = (html.match(/const APP_BUILD='([^']+)'/) || [, ''])[1];
const token = (appBuild.match(/v\d+-[a-z0-9-]+/) || [''])[0];
function loadChromium() {
  for (const id of ['playwright', 'playwright-core', 'D:/npm-global/node_modules/openclaw/node_modules/playwright-core']) {
    try { return require(id).chromium; } catch {}
  }
  throw new Error('no playwright');
}
const rows = [];
const fails = [];
const check = (l, ok, d = '') => { rows.push(`  ${ok ? 'ok  ' : 'FAIL'} ${l}${ok || !d ? '' : ` — ${d}`}`); if (!ok) fails.push(l); };
(async () => {
  const browser = await loadChromium().launch({ headless: true, executablePath: CHROME, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });

  // (a) healthy boot must NOT raise the notice
  const ok = await browser.newContext({ viewport: { width: 1200, height: 900 }, serviceWorkers: 'block' });
  const p1 = await ok.newPage();
  await p1.goto(`${BASE}/tarot.html`, { waitUntil: 'domcontentloaded' });
  await p1.waitForSelector('#questionOverlay', { timeout: 30000 });
  await p1.waitForTimeout(timeoutMs + 500);
  const healthy = await p1.evaluate(() => Boolean(document.getElementById('bootNotice')));
  check('正常启动时不报警', !healthy, healthy ? 'notice appeared on a healthy boot' : '');

  // (b) a page whose script never runs must raise it
  const bad = await browser.newContext({ viewport: { width: 1200, height: 900 }, serviceWorkers: 'block' });
  const p2 = await bad.newPage();
  // Kill only the module. The classic head script still runs — that is the whole
  // point of it being classic, and it is the realistic failure: a stale worker
  // serves a module that no longer has the exports the page imports.
  await p2.route('**/tarot.html', async (route) => {
    const res = await route.fetch();
    let body = await res.text();
    body = body.replace(/<script\s+type="module"[\s\S]*?<\/script>/g, '');
    await route.fulfill({ response: res, body, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } });
  });
  await p2.goto(`${BASE}/tarot.html`, { waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(timeoutMs + 500);
  const dead = await p2.evaluate(() => {
    const el = document.getElementById('bootNotice');
    return el ? { text: el.innerText.replace(/\s+/g, ' ').trim().slice(0, 90), hasBtn: Boolean(document.getElementById('bootReload')) } : null;
  });
  check('启动失败时给出可见提示', Boolean(dead && dead.hasBtn), JSON.stringify(dead));
  check('提示说明初始化延迟且不建议清站点数据', Boolean(dead && dead.text.includes('页面仍在启动') && dead.text.includes('本地观测记录不会因此清除') && !dead.text.includes('清除本站数据')), JSON.stringify(dead));
  check('提示里带构建号便于定位', Boolean(dead && token && dead.text.includes(token)), `expect "${token}" in "${dead ? dead.text : ''}"`);
  await p2.screenshot({ path: 'D:/codex/tarot-draw/output/boot-watchdog.png' });
  // A delayed module boot must dismiss a notice that has already appeared.
  await p2.evaluate(() => document.querySelector('.readingModeOption')?.setAttribute('aria-checked', 'true'));
  await p2.waitForFunction(() => !document.getElementById('bootNotice'), null, { timeout: 2000 });
  check('应用晚启动后自动收起提示', await p2.evaluate(() => !document.getElementById('bootNotice')));
  check('看门狗版本与页面构建标记一致', Boolean(token) && html.includes(`var BUILD='${token}'`), `token=${token}`);

  await browser.close();
  console.log(rows.join('\n'));
  console.log(JSON.stringify({ status: fails.length ? 'failed' : 'passed', checks: rows.length, failed: fails.length }, null, 2));
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log(rows.join('\n')); console.error('ERR', e && e.stack ? e.stack : e.message); process.exit(1); });
