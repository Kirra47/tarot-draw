import assert from 'node:assert/strict';
import {
  CAST_MODE_LABELS,
  castByMode,
} from './meihua-display.mjs';

const moment = new Date('2026-09-07T13:14:15+08:00');
const expectedModes = ['time', 'three', 'shooting', 'object', 'person', 'lost', 'sound', 'count', 'text', 'omen'];
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

console.log(JSON.stringify({ status: 'passed', modes: expectedModes.length, explicitNumbers: three.sourceInput.numbers, observationModes: 5 }));
