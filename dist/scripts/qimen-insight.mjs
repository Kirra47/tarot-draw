// 奇门资料层：依据用户提供的《神奇之门》整理为可复核的“时家奇门·拆补法”
// 说明：节气交接时刻需要万年历校准；本站用近似节气日做观照，不把它当作精密历书。

export const QIMEN_PROFILE = 'shenqi-zhimen-time-family-chaibu-v1';
export const QIMEN_SOURCE = Object.freeze({
  id: 'shenqi-zhimen-pdf',
  title: '完整版《神奇之门》',
  author: '张志春',
  year: '1998（序文语境；PDF 容器 2007）',
  note: '采用书中“时家奇门、无闰拆补法”的规则骨架；原书不同流派与例外不在此处混算。',
});

export const QIMEN_STEMS = Object.freeze(['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']);
export const QIMEN_BRANCHES = Object.freeze(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']);
export const QIMEN_RING = Object.freeze([1, 8, 3, 4, 9, 2, 7, 6]);
export const QIMEN_GRID_ORDER = Object.freeze([4, 9, 2, 3, 5, 7, 8, 1, 6]);

export const QIMEN_PALACES = Object.freeze({
  1: Object.freeze({ number: 1, trigram: '坎', direction: '北', element: '水' }),
  2: Object.freeze({ number: 2, trigram: '坤', direction: '西南', element: '土' }),
  3: Object.freeze({ number: 3, trigram: '震', direction: '东', element: '木' }),
  4: Object.freeze({ number: 4, trigram: '巽', direction: '东南', element: '木' }),
  5: Object.freeze({ number: 5, trigram: '中', direction: '中央', element: '土' }),
  6: Object.freeze({ number: 6, trigram: '乾', direction: '西北', element: '金' }),
  7: Object.freeze({ number: 7, trigram: '兑', direction: '西', element: '金' }),
  8: Object.freeze({ number: 8, trigram: '艮', direction: '东北', element: '土' }),
  9: Object.freeze({ number: 9, trigram: '离', direction: '南', element: '火' }),
});

export const QIMEN_STARS = Object.freeze({
  1: Object.freeze({ name: '天蓬', element: '水', meaning: '流动、风险、隐伏' }),
  2: Object.freeze({ name: '天芮', element: '土', meaning: '承载、学习、问题' }),
  3: Object.freeze({ name: '天冲', element: '木', meaning: '行动、推进、震动' }),
  4: Object.freeze({ name: '天辅', element: '木', meaning: '辅助、学习、沟通' }),
  5: Object.freeze({ name: '天禽', element: '土', meaning: '中枢、整合、承接' }),
  6: Object.freeze({ name: '天心', element: '金', meaning: '判断、修正、照料' }),
  7: Object.freeze({ name: '天柱', element: '金', meaning: '表达、阻力、支撑' }),
  8: Object.freeze({ name: '天任', element: '土', meaning: '承担、稳定、积累' }),
  9: Object.freeze({ name: '天英', element: '火', meaning: '显现、表达、光明' }),
});

export const QIMEN_DOORS = Object.freeze({
  1: Object.freeze({ name: '休门', element: '水', meaning: '休整、沟通、恢复' }),
  8: Object.freeze({ name: '生门', element: '土', meaning: '生长、资源、推进' }),
  3: Object.freeze({ name: '伤门', element: '木', meaning: '行动、竞争、摩擦' }),
  4: Object.freeze({ name: '杜门', element: '木', meaning: '收束、隐藏、边界' }),
  9: Object.freeze({ name: '景门', element: '火', meaning: '呈现、文书、名声' }),
  2: Object.freeze({ name: '死门', element: '土', meaning: '停止、收尾、静置' }),
  5: Object.freeze({ name: '死门', element: '土', meaning: '中宫寄坤，收尾、静置' }),
  7: Object.freeze({ name: '惊门', element: '金', meaning: '消息、提醒、惊动' }),
  6: Object.freeze({ name: '开门', element: '金', meaning: '开放、机会、行动' }),
});

export const QIMEN_GODS = Object.freeze(['值符', '腾蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天']);

// 书中阳遁、阴遁歌的结构化版本；数组顺序固定为上元、中元、下元。
const TERM_RULES = Object.freeze({
  冬至: Object.freeze({ dun: '阳遁', numbers: [1, 7, 4] }),
  小寒: Object.freeze({ dun: '阳遁', numbers: [2, 8, 5] }),
  大寒: Object.freeze({ dun: '阳遁', numbers: [3, 9, 6] }),
  立春: Object.freeze({ dun: '阳遁', numbers: [8, 5, 2] }),
  雨水: Object.freeze({ dun: '阳遁', numbers: [9, 6, 3] }),
  惊蛰: Object.freeze({ dun: '阳遁', numbers: [1, 7, 4] }),
  春分: Object.freeze({ dun: '阳遁', numbers: [3, 9, 6] }),
  清明: Object.freeze({ dun: '阳遁', numbers: [4, 1, 7] }),
  谷雨: Object.freeze({ dun: '阳遁', numbers: [5, 2, 8] }),
  立夏: Object.freeze({ dun: '阳遁', numbers: [4, 1, 7] }),
  小满: Object.freeze({ dun: '阳遁', numbers: [5, 2, 8] }),
  芒种: Object.freeze({ dun: '阳遁', numbers: [6, 3, 9] }),
  夏至: Object.freeze({ dun: '阴遁', numbers: [9, 3, 6] }),
  小暑: Object.freeze({ dun: '阴遁', numbers: [8, 2, 5] }),
  大暑: Object.freeze({ dun: '阴遁', numbers: [7, 1, 4] }),
  立秋: Object.freeze({ dun: '阴遁', numbers: [2, 5, 8] }),
  处暑: Object.freeze({ dun: '阴遁', numbers: [1, 4, 7] }),
  白露: Object.freeze({ dun: '阴遁', numbers: [9, 3, 6] }),
  秋分: Object.freeze({ dun: '阴遁', numbers: [7, 1, 4] }),
  寒露: Object.freeze({ dun: '阴遁', numbers: [6, 9, 3] }),
  霜降: Object.freeze({ dun: '阴遁', numbers: [5, 8, 2] }),
  立冬: Object.freeze({ dun: '阴遁', numbers: [6, 9, 3] }),
  小雪: Object.freeze({ dun: '阴遁', numbers: [5, 8, 2] }),
  大雪: Object.freeze({ dun: '阴遁', numbers: [4, 7, 1] }),
});

// 只用节气日的近似值，展示时明确标记 approximate。
const SOLAR_TERM_DATES = Object.freeze([
  ['小寒', 1, 6], ['大寒', 1, 20], ['立春', 2, 4], ['雨水', 2, 19],
  ['惊蛰', 3, 6], ['春分', 3, 21], ['清明', 4, 5], ['谷雨', 4, 20],
  ['立夏', 5, 6], ['小满', 5, 21], ['芒种', 6, 6], ['夏至', 6, 21],
  ['小暑', 7, 7], ['大暑', 7, 23], ['立秋', 8, 7], ['处暑', 8, 23],
  ['白露', 9, 8], ['秋分', 9, 23], ['寒露', 10, 8], ['霜降', 10, 23],
  ['立冬', 11, 7], ['小雪', 11, 22], ['大雪', 12, 7], ['冬至', 12, 22],
]);

const HIDDEN_JIA = Object.freeze({
  0: Object.freeze({ name: '甲子', stem: '戊' }),
  10: Object.freeze({ name: '甲戌', stem: '己' }),
  20: Object.freeze({ name: '甲申', stem: '庚' }),
  30: Object.freeze({ name: '甲午', stem: '辛' }),
  40: Object.freeze({ name: '甲辰', stem: '壬' }),
  50: Object.freeze({ name: '甲寅', stem: '癸' }),
});

const GROUND_STEM_ORDER = Object.freeze(['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙']);
const HOUR_STEM_START = Object.freeze([0, 2, 4, 6, 8]);
const YUAN_NAMES = Object.freeze(['上元', '中元', '下元']);
const YUAN_GROUPS = Object.freeze({
  上元: Object.freeze([0, 3, 6, 9]), // 子、卯、午、酉
  中元: Object.freeze([2, 5, 8, 11]), // 寅、巳、申、亥
  下元: Object.freeze([1, 4, 7, 10]), // 丑、辰、未、戌
});
const TRIGRAM_TO_PALACE = Object.freeze({ 乾: 6, 兑: 7, 离: 9, 震: 3, 巽: 4, 坎: 1, 艮: 8, 坤: 2 });

function mod(value, size) {
  return ((value % size) + size) % size;
}

function dateParts(moment, timeZone) {
  const date = moment instanceof Date ? moment : new Date(moment);
  const zone = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(date);
    const get = (type, fallback) => Number(parts.find((part) => part.type === type)?.value || fallback);
    return { year: get('year', date.getFullYear()), month: get('month', date.getMonth() + 1), day: get('day', date.getDate()), hour: get('hour', date.getHours()), minute: get('minute', date.getMinutes()), timeZone: zone };
  } catch {
    return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(), hour: date.getHours(), minute: date.getMinutes(), timeZone: zone };
  }
}

function dayKey(year, month, day) {
  return Date.UTC(year, month - 1, day);
}

function solarTermForDate(parts) {
  const current = dayKey(parts.year, parts.month, parts.day);
  const candidates = SOLAR_TERM_DATES.flatMap(([name, month, day]) => [
    { name, year: parts.year, month, day, key: dayKey(parts.year, month, day) },
    ...(month === 12 ? [{ name, year: parts.year - 1, month, day, key: dayKey(parts.year - 1, month, day) }] : []),
  ]).filter((item) => item.key <= current).sort((a, b) => a.key - b.key);
  const latest = candidates.at(-1) || { name: '冬至', year: parts.year - 1, month: 12, day: 22, key: dayKey(parts.year - 1, 12, 22) };
  return { ...latest, ...TERM_RULES[latest.name], approximate: true, display: `${latest.year}年${latest.month}月${latest.day}日左右` };
}

// JDN + 49 reproduces the commonly used 甲子日 index (2000-01-01 = 戊午).
function dayGanzhi(parts) {
  const jdn = Math.floor(dayKey(parts.year, parts.month, parts.day) / 86400000) + 2440588;
  const index = mod(jdn + 49, 60);
  return { index, stemIndex: index % 10, branchIndex: index % 12, name: `${QIMEN_STEMS[index % 10]}${QIMEN_BRANCHES[index % 12]}` };
}

function hourBranchIndex(parts, calendar) {
  if (Number.isInteger(calendar?.hourBranch) && calendar.hourBranch >= 1 && calendar.hourBranch <= 12) return calendar.hourBranch - 1;
  const hour = parts.hour === 24 ? 0 : parts.hour;
  return mod(Math.floor((hour + 1) / 2), 12);
}

function hourGanzhi(dayStemIndex, branchIndex) {
  const start = HOUR_STEM_START[dayStemIndex % 5];
  const stemIndex = mod(start + branchIndex, 10);
  const sexagenaryIndex = Array.from({ length: 60 }, (_, index) => index).find((index) => index % 10 === stemIndex && index % 12 === branchIndex) ?? 0;
  return { stemIndex, branchIndex, sexagenaryIndex, name: `${QIMEN_STEMS[stemIndex]}${QIMEN_BRANCHES[branchIndex]}` };
}

function yuanForBranch(branchIndex) {
  const name = YUAN_NAMES.find((candidate) => YUAN_GROUPS[candidate].includes(branchIndex)) || '上元';
  return { name, index: YUAN_NAMES.indexOf(name) };
}

function fuTouForDay(index) {
  const candidates = Array.from({ length: 60 }, (_, candidate) => candidate)
    .filter((candidate) => candidate % 10 === 0 || candidate % 10 === 5);
  const fuTouIndex = candidates.reduce((best, candidate) => {
    const distance = mod(index - candidate, 60);
    const bestDistance = mod(index - best, 60);
    return distance < bestDistance ? candidate : best;
  }, candidates[0]);
  return { index: fuTouIndex, name: `${QIMEN_STEMS[fuTouIndex % 10]}${QIMEN_BRANCHES[fuTouIndex % 12]}`, branchIndex: fuTouIndex % 12 };
}

function moveNumeric(start, steps, direction = 1) {
  return mod(start - 1 + steps * direction, 9) + 1;
}

function canonicalPalace(palace) {
  return palace === 5 ? 2 : palace;
}

function ringIndex(palace) {
  return QIMEN_RING.indexOf(canonicalPalace(palace));
}

function shiftedRing(basePalace, anchorPalace, targetPalace) {
  const baseIndex = ringIndex(basePalace);
  const anchorIndex = ringIndex(anchorPalace);
  const targetIndex = ringIndex(targetPalace);
  if (baseIndex < 0 || anchorIndex < 0 || targetIndex < 0) return canonicalPalace(targetPalace);
  return QIMEN_RING[mod(targetIndex + baseIndex - anchorIndex, QIMEN_RING.length)];
}

function buildGround(ju, dun) {
  const direction = dun === '阳遁' ? 1 : -1;
  return Object.fromEntries(GROUND_STEM_ORDER.map((stem, index) => [moveNumeric(ju, index, direction), stem]));
}

function fixedStarName(palace) {
  return QIMEN_STARS[palace]?.name || QIMEN_STARS[2].name;
}

function fixedDoorName(palace) {
  return QIMEN_DOORS[palace]?.name || QIMEN_DOORS[2].name;
}

function buildStars(anchorPalace, targetPalace) {
  const anchor = canonicalPalace(anchorPalace);
  const target = canonicalPalace(targetPalace);
  const stars = {};
  QIMEN_RING.forEach((base) => { stars[shiftedRing(base, anchor, target)] = fixedStarName(base); });
  // 天禽在中五寄坤二，随二宫天盘一起转动。
  stars[5] = stars[2] ? `${stars[2]}（中五寄坤）` : '天禽（中五寄坤）';
  return stars;
}

function buildDoors(anchorPalace, targetPalace) {
  const anchor = canonicalPalace(anchorPalace);
  const target = canonicalPalace(targetPalace);
  const doors = {};
  QIMEN_RING.forEach((base) => { doors[shiftedRing(base, anchor, target)] = fixedDoorName(base); });
  return doors;
}

function buildGods(targetPalace, dun) {
  const gods = {};
  const target = canonicalPalace(targetPalace);
  const start = ringIndex(target);
  const direction = dun === '阳遁' ? 1 : -1;
  QIMEN_GODS.forEach((god, index) => { gods[QIMEN_RING[mod(start + direction * index, QIMEN_RING.length)]] = god; });
  return gods;
}

function meihuaPalaceLink(meihua) {
  if (!meihua) return null;
  const upper = TRIGRAM_TO_PALACE[meihua.upper && typeof meihua.upper === 'string' ? meihua.upper : ''];
  const lower = TRIGRAM_TO_PALACE[meihua.lower && typeof meihua.lower === 'string' ? meihua.lower : ''];
  // meihua stores numeric trigrams; map indices used by the local rule core.
  const numericMap = { 1: 6, 2: 7, 3: 9, 4: 3, 5: 4, 6: 1, 7: 8, 8: 2 };
  const upperNumber = Number.isInteger(Number(meihua.upper)) ? numericMap[Number(meihua.upper)] : upper;
  const lowerNumber = Number.isInteger(Number(meihua.lower)) ? numericMap[Number(meihua.lower)] : lower;
  return { upperPalace: upperNumber || null, lowerPalace: lowerNumber || null };
}

export function deriveQimenCast({ moment = new Date(), calendar = null, meihua = null } = {}) {
  const parts = dateParts(moment, calendar?.timeZone);
  const term = solarTermForDate(parts);
  const day = dayGanzhi(parts);
  const fuTou = fuTouForDay(day.index);
  const yuan = yuanForBranch(fuTou.branchIndex);
  const ju = term.numbers[yuan.index];
  const dun = term.dun;
  const groundByPalace = buildGround(ju, dun);
  const hourBranch = hourBranchIndex(parts, calendar);
  const hour = hourGanzhi(day.stemIndex, hourBranch);
  const xunHeadIndex = Math.floor(hour.sexagenaryIndex / 10) * 10;
  const xunHead = HIDDEN_JIA[xunHeadIndex] || HIDDEN_JIA[0];
  const xunPalace = Object.entries(groundByPalace).find(([, stem]) => stem === xunHead.stem)?.[0];
  const xunPalaceNumber = Number(xunPalace || ju);
  const hourStemPalace = Number(Object.entries(groundByPalace).find(([, stem]) => stem === QIMEN_STEMS[hour.stemIndex])?.[0] || ju);
  const valueFuPalace = canonicalPalace(hourStemPalace);
  const direction = dun === '阳遁' ? 1 : -1;
  const steps = mod(hourBranch - (xunHeadIndex % 12), 12) * direction;
  // 值使从旬首所在宫起数；旬首落中五时保留“五”作为首位（随后才寄坤二）。
  const valueShiPalace = moveNumeric(xunPalaceNumber, Math.abs(steps), direction);
  const stars = buildStars(xunPalaceNumber, valueFuPalace);
  // 门盘先以旬首时刻为起点，再按时支移动值使；随后把全门盘平移到该宫。
  const baseDoors = buildDoors(xunPalaceNumber, valueShiPalace);
  const gods = buildGods(valueFuPalace, dun);
  const link = meihuaPalaceLink(meihua);
  const grid = Object.freeze(Object.fromEntries(Object.keys(QIMEN_PALACES).map((key) => {
    const palace = Number(key);
    const meta = QIMEN_PALACES[palace];
    return [palace, Object.freeze({
      palace,
      ...meta,
      groundStem: groundByPalace[palace] || (palace === 5 ? groundByPalace[2] : '—'),
      star: stars[palace] || '—',
      door: baseDoors[palace] || (palace === 5 ? baseDoors[2] || '—' : '—'),
      god: gods[palace] || (palace === 5 ? gods[2] || '—' : '—'),
    })];
  })));
  const valueFuName = QIMEN_STARS[xunPalaceNumber]?.name || (xunPalaceNumber === 5 ? '天禽' : '—');
  const valueShiName = fixedDoorName(xunPalaceNumber);
  return {
    status: 'ok',
    profile: QIMEN_PROFILE,
    source: QIMEN_SOURCE,
    calendar: { ...parts, hourBranch: hourBranch + 1, hourBranchName: QIMEN_BRANCHES[hourBranch] },
    solarTerm: { name: term.name, display: term.display, approximate: term.approximate },
    day: { ...day, branchName: QIMEN_BRANCHES[day.branchIndex] },
    fuTou,
    yuan,
    dun,
    ju,
    hour: { ...hour, branchName: QIMEN_BRANCHES[hour.branchIndex] },
    xunHead: { ...xunHead, index: xunHeadIndex, palace: xunPalaceNumber },
    groundByPalace,
    valueFu: { name: valueFuName, palace: valueFuPalace },
    valueShi: { name: valueShiName, startPalace: xunPalaceNumber, palace: valueShiPalace },
    palaceGrid: grid,
    gridOrder: QIMEN_GRID_ORDER,
    meihuaLink: link,
    notes: [
      '本站采用《神奇之门》所述无闰拆补法的规则骨架。',
      '节气交接时刻以常用节气日近似，未接入逐分钟万年历；临界日请人工复核。',
      '九宫、九星、八门、八神是传统象类，用于反思线索，不是事实证明或确定预言。',
    ],
  };
}

export function qimenPalaceForTrigram(index) {
  const map = { 1: 6, 2: 7, 3: 9, 4: 3, 5: 4, 6: 1, 7: 8, 8: 2 };
  return map[Number(index)] || null;
}

export function describeQimen(value) {
  if (!value || value.status !== 'ok') return '';
  const link = value.meihuaLink;
  const linkText = link?.upperPalace && link?.lowerPalace
    ? `梅花上卦对应${link.upperPalace}宫、下卦对应${link.lowerPalace}宫。`
    : '';
  return [
    `资料层：${value.source.title}（${value.source.author}）· ${value.profile}`,
    `节气：${value.solarTerm.name}（${value.solarTerm.display}，${value.solarTerm.approximate ? '近似日' : '已校准'}）；${value.dun}${value.ju}局；${value.yuan.name}（符头${value.fuTou?.name || '—'}）。`,
    `日课：${value.day.name}；时课：${value.hour.name}；旬首：${value.xunHead.name}（藏${value.xunHead.stem}，${value.xunHead.palace}宫）。`,
    `值符：${value.valueFu.name}落${value.valueFu.palace}宫；值使：${value.valueShi.name}落${value.valueShi.palace}宫。`,
    linkText,
    '传统象类只作为问题的观察角度；节气边界与流派差异请保留人工复核。',
  ].filter(Boolean).join('\n');
}
