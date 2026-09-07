import {
  PROFILE,
  TRIGRAMS,
  castTimeOrdinals,
  relation,
} from '../books/meihua-yishu-wikisource/meihua-numeric-cast/scripts/meihua.mjs';

// The site only needs the compact, traceable labels here. Full source texts
// stay out of the client bundle; the result card links to a public Zhouyi text.
export const MEIHUA_PROFILE = PROFILE;
export const ZHOUYI_SOURCE_URL = 'https://ctext.org/book-of-changes/zh';
export const BRANCHES = Object.freeze(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']);
export const ORDINALS = Object.freeze(['', '初', '二', '三', '四', '五', '上']);

// King Wen sequence. Each pair uses the same upper/lower numbering as the
// numeric-cast module, so the mapping remains inspectable instead of guessed.
const HEXAGRAM_ROWS = [
  [1, 1, '乾为天'], [8, 8, '坤为地'], [6, 4, '水雷屯'], [7, 6, '山水蒙'],
  [6, 1, '水天需'], [1, 6, '天水讼'], [8, 6, '地水师'], [6, 8, '水地比'],
  [5, 1, '风天小畜'], [1, 2, '天泽履'], [8, 1, '地天泰'], [1, 8, '天地否'],
  [1, 3, '天火同人'], [3, 1, '火天大有'], [8, 7, '地山谦'], [4, 8, '雷地豫'],
  [2, 4, '泽雷随'], [7, 5, '山风蛊'], [8, 2, '地泽临'], [5, 8, '风地观'],
  [3, 4, '火雷噬嗑'], [7, 3, '山火贲'], [7, 8, '山地剥'], [8, 4, '地雷复'],
  [1, 4, '天雷无妄'], [7, 1, '山天大畜'], [7, 4, '山雷颐'], [2, 5, '泽风大过'],
  [6, 6, '坎为水'], [3, 3, '离为火'], [2, 7, '泽山咸'], [4, 5, '雷风恒'],
  [1, 7, '天山遁'], [4, 1, '雷天大壮'], [3, 8, '火地晋'], [8, 3, '地火明夷'],
  [5, 3, '风火家人'], [3, 2, '火泽睽'], [6, 7, '水山蹇'], [4, 6, '雷水解'],
  [7, 2, '山泽损'], [5, 4, '风雷益'], [2, 1, '泽天夬'], [1, 5, '天风姤'],
  [2, 8, '泽地萃'], [8, 5, '地风升'], [2, 6, '泽水困'], [6, 5, '水风井'],
  [2, 3, '泽火革'], [3, 5, '火风鼎'], [4, 4, '震为雷'], [7, 7, '艮为山'],
  [5, 7, '风山渐'], [4, 2, '雷泽归妹'], [4, 3, '雷火丰'], [3, 7, '火山旅'],
  [5, 5, '巽为风'], [2, 2, '兑为泽'], [5, 6, '风水涣'], [6, 2, '水泽节'],
  [5, 2, '风泽中孚'], [4, 7, '雷山小过'], [6, 3, '水火既济'], [3, 6, '火水未济'],
];

export const HEXAGRAMS = Object.freeze(HEXAGRAM_ROWS.map(([upper, lower, name], index) => Object.freeze({
  number: index + 1,
  upper,
  lower,
  name,
})));

const HEXAGRAM_BY_PAIR = new Map(HEXAGRAMS.map((item) => [`${item.upper}-${item.lower}`, item]));

export function trigram(index) {
  return TRIGRAMS[index] || { name: '未知', element: '—', lines: [] };
}

export function hexagramMeta(upper, lower) {
  return HEXAGRAM_BY_PAIR.get(`${upper}-${lower}`) || {
    number: null,
    upper,
    lower,
    name: `${trigram(upper).name}${trigram(lower).name}`,
  };
}

export function movingLineLabel(line) {
  return `${ORDINALS[line] || `第${line}`}爻`;
}

export function hourBranch(hour) {
  const safeHour = Number.isFinite(Number(hour)) ? Number(hour) : 0;
  return ((Math.floor((safeHour + 1) / 2) % 12) + 12) % 12 + 1;
}

function chineseDigit(value) {
  return {
    零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5,
    六: 6, 七: 7, 八: 8, 九: 9,
  }[value];
}

function parseChineseNumber(raw) {
  const value = String(raw || '').replace(/[日号月闰]/g, '').trim();
  if (/^\d+$/.test(value)) return Number(value);
  if (!value) return NaN;
  if (value === '正') return 1;
  if (value === '冬') return 11;
  if (value === '腊') return 12;
  if (value.startsWith('初')) return parseChineseNumber(value.slice(1));
  if (value === '廿' || value === '二十') return 20;
  if (value.startsWith('廿')) return 20 + (chineseDigit(value.slice(1)) ?? 0);
  if (value === '卅' || value === '三十') return 30;
  if (value.startsWith('卅')) return 30 + (chineseDigit(value.slice(1)) ?? 0);
  if (value === '十') return 10;
  if (value.startsWith('十')) return 10 + (chineseDigit(value.slice(1)) ?? 0);
  const tenIndex = value.indexOf('十');
  if (tenIndex > 0) {
    const tens = chineseDigit(value[tenIndex - 1]);
    const ones = chineseDigit(value.slice(tenIndex + 1));
    if (tens !== undefined) return tens * 10 + (ones ?? 0);
  }
  if (value.length === 1 && chineseDigit(value) !== undefined) return chineseDigit(value);
  return NaN;
}

function formatTraditionalDate(yearName, monthLabel, dayLabel, leapMonth = false) {
  const month = String(monthLabel || '').replace('闰', '').replace('正', '一').replace('月', '');
  return `${yearName || ''}年${leapMonth ? '闰' : ''}${month}月${dayLabel || ''}`;
}

function localClock(date, timeZone) {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone,
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || date.getHours());
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || date.getMinutes());
  return { hour: hour === 24 ? 0 : hour, minute };
}

export function traditionalCalendar(date = new Date()) {
  const current = date instanceof Date ? date : new Date(date);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  try {
    const formatter = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
      year: 'numeric', month: 'long', day: 'numeric', timeZone,
    });
    const parts = formatter.formatToParts(current);
    const yearName = parts.find((part) => part.type === 'yearName')?.value || '';
    const monthLabel = parts.find((part) => part.type === 'month')?.value || '';
    const dayLabel = parts.find((part) => part.type === 'day')?.value || '';
    const month = parseChineseNumber(monthLabel);
    const day = parseChineseNumber(dayLabel);
    const branch = BRANCHES.indexOf(yearName.slice(-1)) + 1;
    if (!yearName || !Number.isInteger(branch) || branch < 1 || !Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day) || day < 1 || day > 30) {
      throw new Error('无法从设备历法读取完整农历日期');
    }
    const clock = localClock(current, timeZone);
    const leapMonth = monthLabel.startsWith('闰');
    return {
      status: 'ok', timeZone, yearName, yearBranch: branch, yearBranchName: yearName.slice(-1),
      month, monthLabel, day, dayLabel, leapMonth,
      hour: clock.hour, minute: clock.minute, hourBranch: hourBranch(clock.hour),
      hourBranchName: BRANCHES[hourBranch(clock.hour) - 1],
      display: formatTraditionalDate(yearName, monthLabel, dayLabel, leapMonth),
      note: '按设备本地时区与农历日期取数；23点后的日界仍以设备当天显示为准。',
    };
  } catch {
    const year = current.getFullYear();
    const month = current.getMonth() + 1;
    const day = Math.min(30, current.getDate());
    const clock = { hour: current.getHours(), minute: current.getMinutes() };
    const branch = ((year - 4) % 12 + 12) % 12 + 1;
    return {
      status: 'fallback', timeZone, yearName: `${year}年`, yearBranch: branch,
      yearBranchName: BRANCHES[branch - 1], month, monthLabel: `${month}月`, day,
      dayLabel: String(day), leapMonth: false, hour: clock.hour, minute: clock.minute,
      hourBranch: hourBranch(clock.hour), hourBranchName: BRANCHES[hourBranch(clock.hour) - 1],
      display: `${year}年${month}月${day}日`,
      note: '设备未提供农历接口，已用公历简式完成演示；正式使用建议在支持农历的浏览器中重算。',
    };
  }
}

export function castFromMoment(date = new Date()) {
  const calendar = traditionalCalendar(date);
  const cast = castTimeOrdinals({
    yearBranch: calendar.yearBranch,
    month: calendar.month,
    day: calendar.day,
    hourBranch: calendar.hourBranch,
    calendarStatus: calendar.status,
    timeZone: calendar.timeZone,
    calendarDisplay: calendar.display,
    yearBranchName: calendar.yearBranchName,
    hourBranchName: calendar.hourBranchName,
  });
  return { ...cast, calendar, relation: relation(cast.body, cast.use) };
}

export function describeTrigram(index) {
  const item = trigram(index);
  return `${item.name} · ${item.element}`;
}
