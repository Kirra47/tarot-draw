import {
  PROFILE,
  TRIGRAMS,
  castCount,
  castTimeOrdinals,
  cycle,
  relation,
  structure,
} from '../books/meihua-yishu-wikisource/meihua-numeric-cast/scripts/meihua.mjs';

// The site only needs the compact, traceable labels here. Full source texts
// stay out of the client bundle; the result card links to a public Zhouyi text.
export const MEIHUA_PROFILE = PROFILE;
export const ZHOUYI_SOURCE_URL = 'https://ctext.org/book-of-changes/zh';
export const BRANCHES = Object.freeze(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']);
export const ORDINALS = Object.freeze(['', '初', '二', '三', '四', '五', '上']);
export const CAST_MODE_LABELS = Object.freeze({
  time: '抽牌时间',
  three: '三个数字',
  shooting: '射覆',
  object: '静物取象',
  person: '人物取象',
  lost: '失物占',
  sound: '声音占',
  count: '物数占',
  text: '测字起卦',
  omen: '外应记录',
});

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

function positiveInteger(value, name, max = 1000000) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > max) {
    throw new RangeError(`${name} must be an integer in 1..${max}`);
  }
  return number;
}

export function castThreeNumbers(numbers) {
  if (!Array.isArray(numbers) || numbers.length !== 3) {
    throw new RangeError('three numbers are required');
  }
  const [upperNumber, lowerNumber, movingNumber] = numbers.map((value, index) => positiveInteger(value, `number${index + 1}`));
  const upper = cycle(upperNumber, 8);
  const lower = cycle(lowerNumber, 8);
  const movingLine = cycle(movingNumber, 6);
  return {
    method: 'three-numbers',
    inputs: { upperNumber, lowerNumber, movingNumber },
    trace: { upperTotal: upperNumber, lowerTotal: lowerNumber, movingTotal: movingNumber },
    ...structure({ upper, lower, movingLine }),
  };
}

export function castText(text) {
  const value = String(text || '').trim();
  const chars = [...value].filter((char) => !/\s/u.test(char));
  if (chars.length < 2) throw new RangeError('text cast needs at least two characters');
  const upperCount = Math.floor(chars.length / 2);
  const lowerCount = chars.length - upperCount;
  const movingTotal = chars.length;
  const upper = cycle(upperCount, 8);
  const lower = cycle(lowerCount, 8);
  const movingLine = cycle(movingTotal, 6);
  return {
    method: 'text-count-split',
    inputs: { text: value, characterCount: chars.length, upperCount, lowerCount },
    trace: { upperTotal: upperCount, lowerTotal: lowerCount, movingTotal },
    ...structure({ upper, lower, movingLine }),
  };
}

const TRIGRAM_IMAGE = Object.freeze({
  1: { colors: ['白', '金色'], shapes: ['圆整', '坚硬'], materials: ['金属', '石质'], sizes: ['偏大', '有分量'], candidates: ['钟表', '金属器具', '圆形配件'], direction: '西北', scene: '高处、开阔处', sound: '清亮、带回响' },
  2: { colors: ['白', '浅色'], shapes: ['有缺口', '开口或弧形'], materials: ['金属', '硬质'], sizes: ['小巧', '边缘明显'], candidates: ['杯盏', '饰品', '带开口的器物'], direction: '西', scene: '低处、靠近边缘', sound: '清脆、短促' },
  3: { colors: ['红', '紫'], shapes: ['尖、薄', '外亮内空'], materials: ['塑料', '电子或发光材质'], sizes: ['轻薄', '中小'], candidates: ['屏幕', '灯具', '带文字的物件'], direction: '南', scene: '明亮处、靠近热源', sound: '急促、清晰' },
  4: { colors: ['青', '绿色'], shapes: ['长条', '向上或有棱角'], materials: ['木质', '纤维'], sizes: ['偏长', '有弹性'], candidates: ['笔杆', '木条', '带柄物件'], direction: '东', scene: '门边、通道或移动处', sound: '突然、震动感强' },
  5: { colors: ['青', '浅色'], shapes: ['细长', '弯曲或条带'], materials: ['木质', '布料'], sizes: ['细长', '轻'], candidates: ['绳带', '线缆', '细长工具'], direction: '东南', scene: '通风处、缝隙或高处', sound: '连续、摩擦感' },
  6: { colors: ['黑', '深蓝'], shapes: ['弯曲', '流线或不规则'], materials: ['液体', '玻璃或柔软材质'], sizes: ['小到中等', '有流动感'], candidates: ['瓶罐', '水杯', '黑色小物'], direction: '北', scene: '低处、阴暗处或近水处', sound: '低沉、断续' },
  7: { colors: ['黄', '棕'], shapes: ['方、厚', '有凸起或止挡'], materials: ['石质', '陶土'], sizes: ['厚实', '不易移动'], candidates: ['石块', '盒子', '摆件'], direction: '东北', scene: '角落、靠墙或静止处', sound: '闷、短而有阻力' },
  8: { colors: ['黄', '土色'], shapes: ['平面', '包裹或承托状'], materials: ['布料', '陶土或软质'], sizes: ['宽、稳', '中到大'], candidates: ['布包', '纸盒', '容器或日用品'], direction: '西南', scene: '地面、低处或室内中央', sound: '厚、缓、回声少' },
});

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function imageBlend(upper, lower) {
  const top = TRIGRAM_IMAGE[upper] || TRIGRAM_IMAGE[8];
  const bottom = TRIGRAM_IMAGE[lower] || TRIGRAM_IMAGE[8];
  return {
    color: unique([...top.colors, ...bottom.colors]).slice(0, 2).join(' / '),
    shape: unique([...top.shapes, ...bottom.shapes]).slice(0, 2).join('、'),
    material: unique([...top.materials, ...bottom.materials]).slice(0, 2).join(' / '),
    size: unique([...top.sizes, ...bottom.sizes]).slice(0, 2).join('、'),
    candidate: unique([...top.candidates, ...bottom.candidates]).slice(0, 3).join('、'),
    direction: unique([top.direction, bottom.direction]).join(' / '),
    scene: unique([top.scene, bottom.scene]).join('；'),
    sound: unique([top.sound, bottom.sound]).join('；'),
  };
}

export function observationProfile({ mode, upper, lower, material = '', count = null }) {
  const image = imageBlend(upper, lower);
  const base = { mode, title: CAST_MODE_LABELS[mode] || '物象观测', features: [] };
  if (mode === 'shooting' || mode === 'object') {
    return {
      ...base,
      lead: mode === 'shooting' ? '这是隐藏物品的候选物象，用于射覆核对。' : '这是眼前物品的候选物象，用于观物取象。',
      features: [
        { label: '颜色倾向', value: image.color },
        { label: '形状轮廓', value: image.shape },
        { label: '材质触感', value: image.material },
        { label: '大小手感', value: image.size },
        { label: '候选物品', value: image.candidate },
      ],
      certainty: '候选提示，不代表已经直接看见实物。',
    };
  }
  if (mode === 'person') {
    return {
      ...base,
      lead: '从人物外在取象，优先观察衣着、姿态和身边物件。',
      features: [
        { label: '衣着色调', value: image.color },
        { label: '姿态轮廓', value: image.shape },
        { label: '身边物件', value: image.material },
        { label: '可能携带', value: image.candidate },
        { label: '环境方向', value: `${image.direction} · ${image.scene}` },
      ],
      certainty: '人物取象只提供可核对的外在特征线索。',
    };
  }
  if (mode === 'lost') {
    return {
      ...base,
      lead: '失物占优先给出寻找方向、环境和物品状态线索。',
      features: [
        { label: '方位倾向', value: image.direction },
        { label: '附近环境', value: image.scene },
        { label: '物品形态', value: `${image.shape} · ${image.size}` },
        { label: '材质倾向', value: image.material },
        { label: '先找这些位置', value: image.candidate },
      ],
      certainty: '先按线索核查现实位置，不把卦象当作定位证明。',
    };
  }
  if (mode === 'sound') {
    return {
      ...base,
      lead: '声音占把次数作为数，同时保留声音的听感线索。',
      features: [
        { label: '声音次数', value: count ? String(count) : '已记录' },
        { label: '声音性质', value: image.sound },
        { label: '方位倾向', value: image.direction },
        { label: '象意提示', value: image.candidate },
      ],
      certainty: '声音取象需要保留次数、停顿和现场描述。',
    };
  }
  if (mode === 'count') {
    return {
      ...base,
      lead: '物数占以物品数量取数，再以当下时支配下卦。',
      features: [
        { label: '物品数量', value: count ? String(count) : '已记录' },
        { label: '数量卦象', value: `${trigram(upper).name} · ${trigram(lower).name}` },
        { label: '形态线索', value: `${image.shape} · ${image.material}` },
        { label: '可核对物象', value: image.candidate },
      ],
      certainty: '数量本身必须可复核，不能由模型补数。',
    };
  }
  if (mode === 'text') {
    return {
      ...base,
      lead: '测字起卦按字数分组；字义只作为问题语境，不代替卦数。',
      features: [
        { label: '输入文字', value: material || '已记录' },
        { label: '字形取数', value: `上${trigram(upper).name} · 下${trigram(lower).name}` },
        { label: '象意提示', value: image.candidate },
      ],
      certainty: '当前采用字数分组简式；单字笔画法保留为后续规则版本。',
    };
  }
  if (mode === 'omen') {
    return {
      ...base,
      lead: '外应是辅助记录：把起卦当下突然出现的人、声、方向或颜色留档，再与卦象交叉核对。',
      features: [
        { label: '现场记录', value: material || '未填写' },
        { label: '颜色与形态', value: `${image.color} · ${image.shape}` },
        { label: '声音与动静', value: image.sound },
        { label: '方向与场景', value: `${image.direction} · ${image.scene}` },
        { label: '交叉核对', value: image.candidate },
      ],
      certainty: '外应只作辅助线索，需以现场可复核事实为准。',
    };
  }
  return null;
}

export function castByMode({ mode = 'time', moment = new Date(), numbers = [], text = '', count = null } = {}) {
  if (!CAST_MODE_LABELS[mode]) throw new RangeError(`unknown cast mode: ${mode}`);
  const calendar = traditionalCalendar(moment);
  let cast;
  let sourceInput = {};
  if (mode === 'three') {
    cast = castThreeNumbers(numbers);
    sourceInput = { numbers: [cast.inputs.upperNumber, cast.inputs.lowerNumber, cast.inputs.movingNumber] };
  } else if (mode === 'sound' || mode === 'count') {
    const value = positiveInteger(count, mode === 'sound' ? 'soundCount' : 'objectCount');
    cast = castCount({ count: value, hourBranch: calendar.hourBranch });
    sourceInput = { count: value, hourBranch: calendar.hourBranch };
  } else if (mode === 'text') {
    cast = castText(text);
    sourceInput = { text: String(text).trim() };
  } else if (mode === 'shooting' || mode === 'object' || mode === 'person' || mode === 'lost' || mode === 'omen') {
    cast = castFromMoment(moment);
    sourceInput = { text: String(text).trim() };
  } else {
    cast = castFromMoment(moment);
  }
  const value = { ...cast, mode, modeLabel: CAST_MODE_LABELS[mode], calendar, sourceInput, relation: relation(cast.body, cast.use) };
  const observation = observationProfile({ mode, upper: value.upper, lower: value.lower, material: sourceInput.text || '', count: sourceInput.count || null });
  if (observation) value.observation = observation;
  return value;
}

export function describeTrigram(index) {
  const item = trigram(index);
  return `${item.name} · ${item.element}`;
}
