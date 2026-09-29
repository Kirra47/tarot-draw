// Final live state of the coin.
const B = 'https://peas47-d0g4dt5f002ccf6ba-1309640856.tcloudbaseapp.com/tarot';
const get = async (p) => (await fetch(B + p, { headers: { 'cache-control': 'no-cache' } })).text();
(async () => {
  const t = await get('/scripts/coin-stage.mjs');
  const body = t.match(/const glyphs = \[(.*?)\];/s);
  const glyphs = body ? [...body[1].matchAll(/'([^']+)',\s*(\d+),\s*(\d+)/g)].map((m) => ({ ch: m[1], x: +m[2], y: +m[3] })) : [];
  const slot = (g) => (g.y < 400 ? '上' : g.y > 700 ? '下' : g.x > 700 ? '右' : '左');
  console.log('  铜钱铸字（按上下右左排序读）:');
  for (const g of [...glyphs].sort((a, b) => ['上', '下', '右', '左'].indexOf(slot(a)) - ['上', '下', '右', '左'].indexOf(slot(b)))) {
    console.log(`    ${slot(g)} : ${g.ch}`);
  }
  console.log('    读作 → ' + [...glyphs].sort((a, b) => ['上', '下', '右', '左'].indexOf(slot(a)) - ['上', '下', '右', '左'].indexOf(slot(b))).map((g) => g.ch).join(''));
  const m = t.match(/bumpScale: ([0-9.]+), metalness: ([0-9.]+), roughness: ([0-9.]+)/);
  console.log('  材质: bumpScale ' + m[1] + ' / metalness ' + m[2] + ' / roughness ' + m[3]);
  console.log('  三枚共用同一套贴图: ' + ((t.match(/= makeTextures\(/g) || []).length === 2 ? '是' : '否'));
  const h = await get('/tarot.html');
  console.log('  构建标记: ' + h.match(/APP_BUILD='([^']+)'/)[1]);
  const sw = await get('/service-worker.js');
  console.log('  缓存版本: ' + sw.match(/CACHE_VERSION = "([^"]+)"/)[1]);
  console.log('  v4 样式表已预缓存: ' + /tarot-ui-v4\.css/.test(sw));
})().catch((e) => console.log('ERR ' + e.message));
