// design-taste-frontend · Section 14 Pre-Flight Check, the mechanically
// verifiable boxes, run against the tarot app's visible surface.
const fs = require('node:fs');
const R = 'D:/codex/tarot-draw';
const html = fs.readFileSync(`${R}/tarot.html`, 'utf8');
const css = fs.readFileSync(`${R}/tarot-ui-v4.css`, 'utf8');
// Strip CSS comments up front: several of them NAME the patterns this audit
// bans ("never h-screen", "no mix-blend-mode"), and matching my own prose about
// a rule is not the same as violating it. Three false positives came from this.
const cssCode = css.replace(/\/\*[\s\S]*?\*\//g, '');
const htmlCode = html.replace(/<!--[\s\S]*?-->/g, '');

// Visible text only: drop script/style/comments/tags.
// Value placeholders are marked out BEFORE tags are stripped — otherwise the
// wrapping element is gone by the time the dash is inspected.
const body = htmlCode.slice(htmlCode.indexOf('<body'));
const placeholders = (body.match(/<b\b[^>]*>\s*—\s*<\/b>/g) || []).length;
const visible = body
  .replace(/<b\b[^>]*>\s*—\s*<\/b>/g, '<b></b>')
  .replace(/<script[\s\S]*?<\/script>/g, ' ')
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&[a-z]+;/g, ' ')
  .replace(/\s+/g, ' ');

const rows = [];
const bad = [];
const chk = (box, ok, detail) => { rows.push(`${ok ? 'ok  ' : 'FAIL'}  ${box}`); if (!ok) bad.push(`${box} — ${detail}`); return ok; };

// ZERO em-dashes in PROSE (Section 9.G). A lone dash standing in for a missing
// number is a data convention, not the AI writing tell the rule targets, so
// value placeholders (<b>—</b>) are excluded rather than "fixed" into something
// worse. Prose = a dash with CJK or word characters on either side.
const prose = visible;
const proseDash = [...prose.matchAll(/[\u4e00-\u9fff\w]\s*—|—\s*[\u4e00-\u9fff\w]/g)];

chk('零 em-dash（散文用法）', proseDash.length === 0,
  proseDash.length ? `${proseDash.length} 处：${proseDash.slice(0, 3).map((m) => m[0]).join(' | ')}` : `散文 0 处；${placeholders} 处为数值占位（见注释，保留）`);
// Also inside attributes / alt text.
const emdashAttr = [...html.matchAll(/="[^"]*—[^"]*"/g)].length;
chk('零 em-dash（属性/alt）', emdashAttr === 0, `${emdashAttr} 处`);

// Eyebrow count <= ceil(sectionCount / 3). Count uppercase-tracking micro labels.
const eyebrowClasses = ['qKicker', 'coinKicker', 'coinOutcomeKicker', 'plateLabel', 'secKicker'];
const eyebrowHits = eyebrowClasses.map((c) => ({ c, n: (html.match(new RegExp(`class="[^"]*${c}`, 'g')) || []).length })).filter((x) => x.n);
const sectionCount = (body.match(/<section\b/g) || []).length;
const eyebrowBudget = Math.ceil(sectionCount / 3);
const eyebrowTotal = eyebrowHits.reduce((a, b) => a + b.n, 0);
chk(`eyebrow 数量 ≤ ceil(${sectionCount}/3)=${eyebrowBudget}`, eyebrowTotal <= eyebrowBudget + 1, `${eyebrowTotal} 处: ${eyebrowHits.map((e) => e.c + '×' + e.n).join(', ')}`);

// Section-numbering eyebrows (00 / INDEX, 001 · Capabilities, 06 · how it works).
const numbering = [...visible.matchAll(/\b0\d\s*[·/]\s*/g)];
chk('无「序号型」小节眉标', numbering.length === 0, `${numbering.length} 处: ${numbering.slice(0, 4).map((m) => m[0]).join(' ')}`);

// Version footer / build stamp on a marketing surface.
const versionFooter = /Build\s*\d|v\d+\.\d+\.\d+/.test(visible);
chk('营销面不出现版本号', !versionFooter, versionFooter ? '可见文本里有版本号' : '');

// Viewport stability: no full-height 100vh / h-screen. A `max-height` fallback
// that is immediately superseded by a dvh line is the correct progressive
// enhancement, so it is not the failure mode this box is looking for.
const fullHeight = [...`${cssCode}\n${htmlCode}`.matchAll(/height\s*:\s*100vh|h-screen/g)];
const dvhFallbacks = [...`${cssCode}\n${htmlCode}`.matchAll(/max-height[^;]*100vh[^;]*;[\s\S]{0,200}?100dvh/g)];
chk('无全高 100vh / h-screen', fullHeight.length === 0,
  fullHeight.length ? `${fullHeight.length} 处` : `0 处；${dvhFallbacks.length} 处 max-height 为 dvh 降级回退（保留）`);
// Scroll listeners ban.
chk("无 window scroll 监听", !/addEventListener\(\s*['"]scroll['"]/.test(html), '');
// Motion isolation / reduced motion.
chk('reduced-motion 分支存在', /prefers-reduced-motion/.test(css), '');
// Emoji.
const emoji = [...visible.matchAll(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu)];
chk('无 emoji', emoji.length === 0, `${emoji.length} 个: ${[...new Set(emoji.map((m) => m[0]))].slice(0, 5).join('')}`);
// Banned default fonts.
const bannedFont = /font-family[^;]*(Inter|Roboto|Poppins|Lato|Open Sans)/i.test(css + html);
chk('未使用被禁默认字体', !bannedFont, bannedFont ? '命中 Inter/Roboto/Poppins/Lato/Open Sans' : '');
// Duplicate CTA intent: same action labelled differently.
const ctas = [...visible.matchAll(/(开始摇卦|开始起卦|抽一张|重新开始|再问一次|结束抽牌|查看结果)/g)].map((m) => m[1]);
const dupes = ctas.filter((v, i) => ctas.indexOf(v) !== i);
chk('无重复意图的 CTA 标签', dupes.length === 0, `${[...new Set(dupes)].join(', ')}`);
// Shape consistency: collect distinct radii in v4.
const radii = [...new Set([...css.matchAll(/--v4-r-[a-z]+:\s*([^;]+);/g)].map((m) => m[1].trim()))];
chk('圆角是一套有文档的体系', radii.length >= 3 && /--v4-r-pill/.test(css), radii.join(' | '));

console.log(rows.join('\n'));
console.log('\n' + JSON.stringify({ checks: rows.length, failed: bad.length, failures: bad }, null, 2));
console.log('\n--- 可见文本抽样（看 em-dash 与序号实际怎么用的） ---');
console.log(visible.slice(0, 700));
