// 八宅资料层：把用户提供的《八宅风水简介》整理成“坐向—宅卦—四吉四凶”
// 的可核对提示。它是传统文化资料，不是建筑安全、健康或投资建议。

export const BAZHAI_PROFILE = 'bazhai-brief-direction-v1';
export const BAZHAI_SOURCE = Object.freeze({
  id: 'bazhai-fengshui-brief-docx',
  title: '八宅风水简介',
  author: 'yangjie（文档作者元数据）',
  year: '2014（文档创建时间）',
  note: '采用文档中可复核的坐向、八卦、东/西四宅和四吉四凶框架；文档中的历史与秘传说法不作为规则。',
});

export const BAZHAI_DIRECTIONS = Object.freeze([
  Object.freeze({ value: '北', label: '北', palace: 1, trigram: '坎', element: '水' }),
  Object.freeze({ value: '东北', label: '东北', palace: 8, trigram: '艮', element: '土' }),
  Object.freeze({ value: '东', label: '东', palace: 3, trigram: '震', element: '木' }),
  Object.freeze({ value: '东南', label: '东南', palace: 4, trigram: '巽', element: '木' }),
  Object.freeze({ value: '南', label: '南', palace: 9, trigram: '离', element: '火' }),
  Object.freeze({ value: '西南', label: '西南', palace: 2, trigram: '坤', element: '土' }),
  Object.freeze({ value: '西', label: '西', palace: 7, trigram: '兑', element: '金' }),
  Object.freeze({ value: '西北', label: '西北', palace: 6, trigram: '乾', element: '金' }),
]);

const OPPOSITE = Object.freeze({ 北: '南', 南: '北', 东: '西', 西: '东', 东北: '西南', 西南: '东北', 东南: '西北', 西北: '东南' });
const DIRECTION_META = Object.freeze(Object.fromEntries(BAZHAI_DIRECTIONS.map((item) => [item.value, item])));
const EAST_GROUP = new Set(['坎', '离', '震', '巽']);

// 常见八宅表的四吉四凶方向。原文只要求“计算四吉位和四凶位”，
// 方向表在本站作为明确标注的“常见排法”，不冒充 DOCX 逐字内容。
const HOUSE_POSITIONS = Object.freeze({
  坎: Object.freeze({ 生气: '东南', 天医: '东', 延年: '南', 伏位: '北', 五鬼: '东北', 六煞: '西北', 祸害: '西', 绝命: '西南' }),
  离: Object.freeze({ 生气: '东', 天医: '东南', 延年: '北', 伏位: '南', 五鬼: '西南', 六煞: '西', 祸害: '东北', 绝命: '西北' }),
  震: Object.freeze({ 生气: '南', 天医: '北', 延年: '东南', 伏位: '东', 五鬼: '西北', 六煞: '东北', 祸害: '西南', 绝命: '西' }),
  巽: Object.freeze({ 生气: '北', 天医: '南', 延年: '东', 伏位: '东南', 五鬼: '西', 六煞: '西南', 祸害: '西北', 绝命: '东北' }),
  乾: Object.freeze({ 生气: '西', 天医: '东北', 延年: '西南', 伏位: '西北', 五鬼: '东', 六煞: '东南', 祸害: '北', 绝命: '南' }),
  坤: Object.freeze({ 生气: '东北', 天医: '西', 延年: '西北', 伏位: '西南', 五鬼: '东南', 六煞: '南', 祸害: '东', 绝命: '北' }),
  艮: Object.freeze({ 生气: '西南', 天医: '西北', 延年: '西', 伏位: '东北', 五鬼: '南', 六煞: '东', 祸害: '北', 绝命: '东南' }),
  兑: Object.freeze({ 生气: '西北', 天医: '西南', 延年: '东北', 伏位: '西', 五鬼: '东南', 六煞: '南', 祸害: '东', 绝命: '北' }),
});

const STAR_MEANINGS = Object.freeze({
  生气: '生长、机会与推进', 天医: '照料、修复与支持', 延年: '稳定、协作与长线', 伏位: '守成、安静与回到基础',
  五鬼: '变化、突发与分心', 六煞: '情绪、关系与流动', 祸害: '口舌、琐碎与消耗', 绝命: '高波动、切断与重置',
});

function directionMeta(value) {
  return DIRECTION_META[String(value || '').trim()] || null;
}

export function deriveBazhai({ facingDirection = '' } = {}) {
  const facing = directionMeta(facingDirection);
  if (!facing) {
    return {
      status: 'needs-input', profile: BAZHAI_PROFILE, source: BAZHAI_SOURCE,
      directions: BAZHAI_DIRECTIONS, note: '八宅需要房屋主要朝向；未提供时只展示规则说明，不替你猜坐向。',
    };
  }
  const sittingDirection = OPPOSITE[facing.value];
  const sitting = directionMeta(sittingDirection);
  const houseTrigram = sitting.trigram;
  const group = EAST_GROUP.has(houseTrigram) ? '东四宅' : '西四宅';
  const positionMap = HOUSE_POSITIONS[houseTrigram];
  const positions = Object.freeze(Object.fromEntries(Object.entries(positionMap).map(([name, direction]) => [name, Object.freeze({ name, direction, meaning: STAR_MEANINGS[name] })])));
  return {
    status: 'ok', profile: BAZHAI_PROFILE, source: BAZHAI_SOURCE,
    facing: Object.freeze({ ...facing, direction: facing.value }), sitting: Object.freeze({ ...sitting, direction: sitting.value }),
    houseTrigram, group, positions,
    auspicious: Object.freeze(['生气', '天医', '延年', '伏位'].map((name) => positions[name])),
    inauspicious: Object.freeze(['五鬼', '六煞', '祸害', '绝命'].map((name) => positions[name])),
    advice: Object.freeze({
      good: '传统资料建议：四吉位宜门、主房、书房、客厅、卧室；位置宜较高、方正、整洁。',
      bad: '传统资料建议：四凶位可放厕所、灶、储藏、排水等低处；避免把床、主门、神位设在此处。',
    }),
    note: '这是常见八宅排法的资料观照；命卦、宅向测量误差与不同流派会改变结果，请以实际测量和专业建筑判断为准。',
  };
}

export function describeBazhai(value) {
  if (!value || value.status !== 'ok') return value?.note || '';
  const good = value.auspicious.map((item) => `${item.name}${item.direction}`).join('、');
  const bad = value.inauspicious.map((item) => `${item.name}${item.direction}`).join('、');
  return [
    `资料层：${value.source.title}（${value.source.author}）· ${value.profile}`,
    `朝向：${value.facing.direction}；坐向：${value.sitting.direction}；宅卦：${value.houseTrigram}宅（${value.group}）。`,
    `四吉位：${good}。`,
    `四凶位：${bad}。`,
    value.advice.good,
    value.advice.bad,
    value.note,
  ].join('\n');
}
