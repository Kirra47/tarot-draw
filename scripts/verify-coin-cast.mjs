// Deterministic checks for the coin-3q-1 profile.
// Every fixture below is hand-checkable against the King Wen table.
import assert from 'node:assert/strict';
import {
  COIN_PROFILE,
  coinLineFaceSum,
  coinLineIsMoving,
  coinLineIsYang,
  drawCoinFaces,
  structureFromCoinValues,
} from './coin-cast.mjs';
import { castByMode, hexagramMeta } from './meihua-display.mjs';
import { primaryHexagramInsight } from './meihua-insight.mjs';

const name = (cast, key = 'base') =>
  key === 'base'
    ? hexagramMeta(cast.upper, cast.lower).name
    : hexagramMeta(cast.changed.upper, cast.changed.lower).name;

// 1. Six static yang lines read as 乾为天 and change nothing.
const allYang = structureFromCoinValues([7, 7, 7, 7, 7, 7]);
assert.equal(allYang.profile, COIN_PROFILE);
assert.deepEqual(allYang.lines, [1, 1, 1, 1, 1, 1]);
assert.deepEqual(allYang.movingLines, []);
assert.deepEqual([allYang.upper, allYang.lower], [1, 1]);
assert.equal(name(allYang), '乾为天');
assert.equal(name(allYang, 'changed'), '乾为天');

// 2. Six static yin lines read as 坤为地.
const allYin = structureFromCoinValues([8, 8, 8, 8, 8, 8]);
assert.deepEqual([allYin.upper, allYin.lower], [8, 8]);
assert.equal(name(allYin), '坤为地');

// 3. 初/二/三爻 yang with 四/五/上爻 yin is 地天泰 (乾下坤上).
const tai = structureFromCoinValues([7, 7, 7, 8, 8, 8]);
assert.deepEqual([tai.upper, tai.lower], [8, 1]);
assert.equal(name(tai), '地天泰');
assert.equal(hexagramMeta(tai.upper, tai.lower).number, 11);

// 4. Two moving lines: 老阴 in 初爻 and 老阳 in 四爻.
const kuiCast = structureFromCoinValues([6, 7, 8, 9, 7, 8]);
assert.deepEqual(kuiCast.lines, [0, 1, 0, 1, 1, 0]);
assert.deepEqual(kuiCast.movingLines, [1, 4]);
assert.deepEqual([kuiCast.upper, kuiCast.lower], [2, 6]);
assert.equal(name(kuiCast), '泽水困');
assert.equal(hexagramMeta(kuiCast.upper, kuiCast.lower).number, 47);
// 初爻 0→1 and 四爻 1→0 gives 兑下坎上 = 水泽节.
assert.deepEqual(kuiCast.changedLines, [1, 1, 0, 0, 1, 0]);
assert.deepEqual([kuiCast.changed.upper, kuiCast.changed.lower], [6, 2]);
assert.equal(name(kuiCast, 'changed'), '水泽节');
assert.equal(hexagramMeta(kuiCast.changed.upper, kuiCast.changed.lower).number, 60);

// 5. A single 老阳 in 初爻 turns 乾为天 into 天风姤.
const gou = structureFromCoinValues([9, 7, 7, 7, 7, 7]);
assert.deepEqual(gou.movingLines, [1]);
assert.equal(name(gou), '乾为天');
assert.deepEqual([gou.changed.upper, gou.changed.lower], [1, 5]);
assert.equal(name(gou, 'changed'), '天风姤');
assert.equal(hexagramMeta(gou.changed.upper, gou.changed.lower).number, 44);

// 6. All six lines moving swaps 乾 and 坤 completely.
const flipYang = structureFromCoinValues([9, 9, 9, 9, 9, 9]);
assert.deepEqual(flipYang.movingLines, [1, 2, 3, 4, 5, 6]);
assert.equal(name(flipYang), '乾为天');
assert.equal(name(flipYang, 'changed'), '坤为地');
const flipYin = structureFromCoinValues([6, 6, 6, 6, 6, 6]);
assert.deepEqual(flipYin.lines, [0, 0, 0, 0, 0, 0]);
assert.deepEqual(flipYin.movingLines, [1, 2, 3, 4, 5, 6]);
assert.equal(name(flipYin), '坤为地');
assert.equal(name(flipYin, 'changed'), '乾为天');

// 7. Coin totals: three coins each worth 2 (字面) or 3 (背面).
assert.equal(coinLineFaceSum([0, 0, 0]), 6);
assert.equal(coinLineFaceSum([1, 0, 0]), 7);
assert.equal(coinLineFaceSum([1, 1, 0]), 8);
assert.equal(coinLineFaceSum([1, 1, 1]), 9);
assert.throws(() => coinLineFaceSum([0, 1]), RangeError);
assert.throws(() => coinLineFaceSum([0, 1, 2]), RangeError);

// 8. Moving/yang predicates match the traditional values.
assert.deepEqual([6, 7, 8, 9].map(coinLineIsYang), [false, true, false, true]);
assert.deepEqual([6, 7, 8, 9].map(coinLineIsMoving), [true, false, false, true]);

// 9. Invalid input is rejected rather than silently coerced.
for (const bad of [[], [7, 7, 7], [7, 7, 7, 7, 7], [7, 7, 7, 7, 7, 7, 7], [7, 7, 7, 7, 7, 5], [7, 7, 7, 7, 7, 'x'], null]) {
  assert.throws(() => structureFromCoinValues(bad), RangeError);
}

// 10. Exhaustive invariant sweep over all 4^6 = 4096 outcomes.
let cases = 0;
let multiMoving = 0;
for (let mask = 0; mask < 4096; mask += 1) {
  let rest = mask;
  const values = [];
  for (let i = 0; i < 6; i += 1) {
    values.push([6, 7, 8, 9][rest % 4]);
    rest = Math.floor(rest / 4);
  }
  const cast = structureFromCoinValues(values);
  // Every line value maps to a yin/yang bit and back consistently.
  assert.deepEqual(cast.lines, values.map((v) => (coinLineIsYang(v) ? 1 : 0)));
  // Moving lines are exactly the 6/9 positions, bottom-up.
  assert.deepEqual(
    cast.movingLines,
    values.map((v, i) => (coinLineIsMoving(v) ? i + 1 : 0)).filter(Boolean),
  );
  // The changed hexagram flips exactly the moving lines.
  assert.deepEqual(
    cast.changedLines,
    cast.lines.map((v, i) => (cast.movingLines.includes(i + 1) ? 1 - v : v)),
  );
  // A line never moves back to itself in the changed hexagram.
  if (cast.movingLines.length) assert.notDeepEqual(cast.changedLines, cast.lines);
  // No moving lines means the changed hexagram is identical.
  if (!cast.movingLines.length) assert.deepEqual(cast.changedLines, cast.lines);
  // Every derived trigram must resolve to a real trigram index.
  for (const index of [cast.upper, cast.lower, cast.changed.upper, cast.changed.lower]) {
    assert.ok(Number.isInteger(index) && index >= 1 && index <= 8, `bad trigram index ${index}`);
  }
  // Hexagram lookups must always land on one of the 64.
  assert.ok(hexagramMeta(cast.upper, cast.lower).number, 'base hexagram unresolved');
  assert.ok(hexagramMeta(cast.changed.upper, cast.changed.lower).number, 'changed hexagram unresolved');
  if (cast.movingLines.length > 1) multiMoving += 1;
  cases += 1;
}
assert.equal(cases, 4096);
assert.ok(multiMoving > 0, 'expected outcomes with several moving lines');

// 11. A toss always yields a legal total, and 字面/背面 both appear over time.
const seen = new Set();
for (let i = 0; i < 500; i += 1) {
  const faces = drawCoinFaces();
  assert.equal(faces.length, 3);
  assert.ok(faces.every((f) => f === 0 || f === 1));
  seen.add(coinLineFaceSum(faces));
}
assert.ok(seen.size >= 3, `expected several totals, saw ${[...seen].join(',')}`);

// 12. The result panel must resolve a 本卦 for 三钱 casts, including several
// moving lines and none at all — 梅花's single-moving-line gate must not blank it.
const moment = new Date('2026-09-26T10:00:00+08:00');
const manyMoving = castByMode({ mode: 'coin', moment, coinValues: [6, 7, 8, 9, 7, 8] });
const manyInsight = primaryHexagramInsight(manyMoving);
assert.ok(manyInsight, '三钱 cast must produce a 本卦 insight');
assert.equal(manyInsight.name, '泽水困');
assert.equal(manyInsight.number, 47);
assert.deepEqual(manyInsight.movingLines, [1, 4]);
assert.equal(manyInsight.moving.position, '初爻、四爻');
assert.equal(manyInsight.moving.title, '初爻、四爻同动');
assert.deepEqual(
  manyInsight.lines.map((line) => (line.moving ? 1 : 0)),
  [1, 0, 0, 1, 0, 0],
  'the six-line figure must mark exactly the moving lines',
);
assert.ok(manyInsight.classical.movingYao.includes('臀困于株木'), '初爻 爻辞 missing');
assert.ok(manyInsight.classical.movingYao.includes('来徐徐'), '四爻 爻辞 missing');
assert.equal(manyInsight.relation, '', '三钱 casts carry no 体用 relation');
assert.ok(manyInsight.change.includes('水泽节'), 'changed hexagram missing from the change note');

const noMoving = primaryHexagramInsight(castByMode({ mode: 'coin', moment, coinValues: [7, 7, 7, 8, 8, 8] }));
assert.ok(noMoving, 'a 六爻皆静 三钱 cast must still resolve');
assert.equal(noMoving.name, '地天泰');
assert.deepEqual(noMoving.movingLines, []);
assert.equal(noMoving.moving.title, '六爻皆静');
assert.equal(noMoving.classical.movingYao, '', 'no moving line means no 爻辞');
assert.ok(noMoving.change.includes('没有发动之爻'));

// A 梅花 cast keeps its single moving line and is never mistaken for 三钱.
const meihua = castByMode({ mode: 'three', moment, numbers: [5, 7, 8] });
const meihuaInsight = primaryHexagramInsight(meihua);
assert.deepEqual(meihuaInsight.movingLines, [meihua.movingLine]);
assert.equal(meihuaInsight.moving.position, `${['', '初', '二', '三', '四', '五', '上'][meihua.movingLine]}爻`);
assert.ok(meihuaInsight.classical.movingYao.length > 0);
// A 梅花 cast with no usable moving line is still rejected.
assert.equal(primaryHexagramInsight({ upper: 1, lower: 1, changed: { upper: 1, lower: 1 }, relation: null }), null);

console.log(JSON.stringify({
  status: 'passed',
  profile: COIN_PROFILE,
  fixtures: 9,
  exhaustiveCases: cases,
  outcomesWithSeveralMovingLines: multiMoving,
  lineTotalsSeen: [...seen].sort(),
  coinInsightCases: 2,
}));
