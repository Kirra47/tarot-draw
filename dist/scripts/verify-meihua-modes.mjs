import assert from 'node:assert/strict';
import {
  CAST_MODE_LABELS,
  castByMode,
} from './meihua-display.mjs';

const moment = new Date('2026-09-07T13:14:15+08:00');
// 'coin' is the 三钱法 profile: it casts from six tossed lines rather than from
// numbers or the moment, and it is asserted separately below.
const expectedModes = ['time', 'three', 'shooting', 'object', 'person', 'lost', 'sound', 'count', 'text', 'omen', 'coin'];
assert.deepEqual(Object.keys(CAST_MODE_LABELS), expectedModes);

const time = castByMode({ mode: 'time', moment });
assert.equal(time.method, 'time-ordinals');
assert.equal(time.modeLabel, '抽牌时间');

const three = castByMode({ mode: 'three', moment, numbers: [17, 26, 8] });
assert.equal(three.method, 'three-numbers');
assert.deepEqual(three.sourceInput, { numbers: [17, 26, 8] });
assert.equal(three.trace.upperTotal, 17);
assert.equal(three.movingLine, 2);

for (const mode of ['shooting', 'object', 'person', 'lost', 'omen']) {
  const value = castByMode({ mode, moment, text: '桌边一个圆形硬质物件' });
  assert.equal(value.mode, mode);
  assert.equal(value.method, 'time-ordinals', `${mode} keeps the time cast explicit until a documented object-count rule is selected`);
  assert.ok(value.observation?.features?.length >= 3, `${mode} should expose observation features`);
  assert.equal(value.sourceInput.text, '桌边一个圆形硬质物件');
}

const sound = castByMode({ mode: 'sound', moment, count: 3 });
assert.equal(sound.method, 'count-time');
assert.equal(sound.sourceInput.count, 3);
assert.equal(sound.observation.features[0].value, '3');

const count = castByMode({ mode: 'count', moment, count: 12 });
assert.equal(count.sourceInput.count, 12);
assert.equal(count.observation.features[0].value, '12');

const text = castByMode({ mode: 'text', moment, text: '行路' });
assert.equal(text.method, 'text-count-split');
assert.equal(text.observation.features[0].value, '行路');

assert.throws(() => castByMode({ mode: 'three', moment, numbers: [1, 2] }), /three numbers/);
assert.throws(() => castByMode({ mode: 'sound', moment, count: 0 }), /integer/);
assert.throws(() => castByMode({ mode: 'text', moment, text: '行' }), /at least two/);

// 三钱法 stays a separate profile and must not be dressed up as a 梅花 cast.
const coin = castByMode({ mode: 'coin', moment, coinValues: [6, 7, 8, 9, 7, 8] });
assert.equal(coin.mode, 'coin');
assert.equal(coin.method, 'three-coins');
assert.equal(coin.profile, 'coin-3q-1');
assert.equal(coin.modeLabel, '铜钱摇卦');
assert.deepEqual(coin.sourceInput, { coinValues: [6, 7, 8, 9, 7, 8] });
assert.deepEqual(coin.movingLines, [1, 4]);
assert.equal(coin.movingLine, undefined, '三钱法 has no single moving line');
assert.equal(coin.body, undefined, '三钱法 does not claim 体用');
assert.equal(coin.use, undefined, '三钱法 does not claim 体用');
assert.equal(coin.relation, null, 'no 体用 relation is claimed for 三钱法');
assert.equal(coin.observation, undefined, '物象取象 does not apply to 三钱法');
assert.equal(coin.trace.movingTotal, 2);
assert.throws(() => castByMode({ mode: 'coin', moment, coinValues: [7, 7, 7] }), /six coin lines/);
assert.throws(() => castByMode({ mode: 'coin', moment }), /six coin lines/);

console.log(JSON.stringify({
  status: 'passed',
  modes: expectedModes.length,
  meihuaModes: expectedModes.length - 1,
  coinProfile: coin.profile,
  explicitNumbers: three.sourceInput.numbers,
  observationModes: 5,
}));
