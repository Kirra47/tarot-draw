// Check the LIVE cloud function's tone, not the local one.
// The path must match index.js API_PATH exactly. An earlier version of this file
// used a truncated URL copied out of a log line that sliced urls to 90 chars,
// and reported a confident 404 as a pass.
const ENDPOINT = 'https://peas47-d0g4dt5f002ccf6ba-1309640856.ap-shanghai.app.tcloudbase.com/tarot-api/tarot-reading';
const ORIGIN = 'https://peas47-d0g4dt5f002ccf6ba-1309640856.tcloudbaseapp.com';
const cases = [
  { label: '射覆', body: { readingMode: 'gua', question: '猜猜我手里握着啥', castMode: 'meihua', depth: 'brief', meihua: '本次起卦记录：射覆，数字 4、4、4，得本卦第51卦震为雷（上震下震），四爻动，互卦水山蹇，变卦地雷复；体震木、用震木，比和。' } },
  { label: '事实题', body: { readingMode: 'gua', question: '对方周六有空吗', castMode: 'meihua', depth: 'brief', meihua: '本次起卦记录：按时间起卦，得本卦第63卦水火既济，初爻动，互卦火水未济，变卦水火未济；体坎水、用离火。' } },
];
const BANNED = ['仅凭', '无法确认', '下面只能', '不是事实结论', '不能假装看见', '不能替你断定'];
(async () => {
  let bad = 0;
  for (const c of cases) {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: ORIGIN },
      body: JSON.stringify(c.body),
    });
    const raw = await r.text();
    let text = '';
    for (const line of raw.split('\n')) {
      if (!line.startsWith('data:')) continue;
      const p = line.slice(5).trim();
      if (!p || p === '[DONE]') continue;
      try { const j = JSON.parse(p); const d = j.choices && j.choices[0] && j.choices[0].delta; if (d && d.content) text += d.content; } catch {}
    }
    const clean = text.replace(/\s+/g, ' ').trim();
    const hits = BANNED.filter((b) => clean.includes(b));
    /* An empty body contains none of the banned phrases, so "no hits" alone is a
       vacuous pass. A 404 once slipped through exactly that way. Require real
       text before the tone assertion means anything. */
    const gotText = r.status === 200 && clean.length >= 60;
    if (!gotText || hits.length) bad += 1;
    console.log(`\n【${c.label}】 status=${r.status} ${clean.length} 字`);
    console.log(`  开场：${clean.slice(0, 60) || '(空响应)'}`);
    console.log(`  命中套话：${!gotText ? `无法判定 — ${raw.slice(0, 80).replace(/\s+/g, ' ')}` : (hits.length ? hits.join('、') : '无')}`);
  }
  console.log(bad === 0 ? '\n  ok   线上语气已更新' : `\n  FAIL ${bad} 个用例未通过`);
  process.exit(bad === 0 ? 0 : 1);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
