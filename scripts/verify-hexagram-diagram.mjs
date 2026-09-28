import assert from 'node:assert/strict';
import { HEXAGRAMS, hexagramMeta } from './meihua-display.mjs';
import { hexagramLinesTopToBottom, renderHexagramDiagram } from './hexagram-diagram.mjs';

const expectedLines = new Map([
  [7, ['yin', 'yin', 'yin', 'yin', 'yang', 'yin']],
  [8, ['yin', 'yang', 'yin', 'yin', 'yin', 'yin']],
]);

for (const [number, expected] of expectedLines) {
  const meta = HEXAGRAMS[number - 1];
  assert.deepEqual(hexagramLinesTopToBottom(meta), expected, `hexagram ${number} must display top -> bottom correctly`);
  const markup = renderHexagramDiagram(meta, number === 7 ? '本卦' : '变卦', `第${number}卦·${meta.name}`);
  assert.match(markup, /role="img" aria-label=/, `hexagram ${number} needs an accessible diagram name`);
  assert.equal((markup.match(/class="guaYao guaYao-/g) || []).length, 6, `hexagram ${number} must render six yao rows`);
}

for (const meta of HEXAGRAMS) {
  assert.equal(hexagramLinesTopToBottom(meta).length, 6, `hexagram ${meta.number} must resolve all six lines`);
  assert.equal(hexagramLinesTopToBottom(hexagramMeta(meta.upper, meta.lower)).length, 6);
}

assert.equal(renderHexagramDiagram({ upper: 0, lower: 0 }, '本卦', '未知卦'), '', 'invalid trigrams should not render a misleading diagram');
console.log('Hexagram diagrams verified: 7/8 match the requested TOP -> BOTTOM patterns; all 64 resolve.');
