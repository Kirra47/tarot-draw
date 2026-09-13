import assert from 'node:assert/strict';
import { deriveBazhai } from './bazhai-insight.mjs';
import { deriveQimenCast } from './qimen-insight.mjs';

const shenqiExample = deriveQimenCast({
  moment: new Date('1995-06-11T09:30:00+08:00'),
  calendar: { timeZone: 'Asia/Shanghai' },
});
assert.equal(shenqiExample.day.name, '癸酉');
assert.equal(shenqiExample.fuTou.name, '己巳');
assert.equal(shenqiExample.yuan.name, '中元');
assert.equal(shenqiExample.dun, '阳遁');
assert.equal(shenqiExample.ju, 3);
assert.equal(shenqiExample.hour.name, '丁巳');
assert.equal(shenqiExample.xunHead.name, '甲寅');
assert.equal(shenqiExample.valueFu.name, '天任');
assert.equal(shenqiExample.valueFu.palace, 9);
assert.equal(shenqiExample.valueShi.name, '生门');
assert.equal(shenqiExample.valueShi.palace, 2);
assert.equal(Object.keys(shenqiExample.palaceGrid).length, 9);

const bazhaiExample = deriveBazhai({ facingDirection: '东' });
assert.equal(bazhaiExample.status, 'ok');
assert.equal(bazhaiExample.facing.direction, '东');
assert.equal(bazhaiExample.sitting.direction, '西');
assert.equal(bazhaiExample.houseTrigram, '兑');
assert.equal(bazhaiExample.group, '西四宅');
assert.equal(bazhaiExample.positions.生气.direction, '西北');
assert.equal(bazhaiExample.positions.绝命.direction, '北');

console.log(JSON.stringify({
  qimen: {
    day: shenqiExample.day.name,
    term: shenqiExample.solarTerm.name,
    chart: `${shenqiExample.dun}${shenqiExample.ju}局`,
    valueFu: `${shenqiExample.valueFu.name}${shenqiExample.valueFu.palace}宫`,
    valueShi: `${shenqiExample.valueShi.name}${shenqiExample.valueShi.palace}宫`,
    palaceCount: Object.keys(shenqiExample.palaceGrid).length,
  },
  bazhai: {
    facing: bazhaiExample.facing.direction,
    sitting: bazhaiExample.sitting.direction,
    house: `${bazhaiExample.houseTrigram}宅 · ${bazhaiExample.group}`,
  },
}, null, 2));
