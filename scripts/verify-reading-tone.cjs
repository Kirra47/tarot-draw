// Run three focused, low-token regressions against the revised local CloudBase
// function. Never prints the API credential.
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const LOCAL_ORIGIN = 'https://tarot.test';
const guanToBoRecord = `规则档案：coin-3q-1（三钱法）
起卦方式：铜钱摇卦
本卦：第20卦·风地观（上巽下坤）
六爻（自初爻至上爻）：初爻少阴、二爻少阴、三爻少阴、四爻少阴、五爻老阳（动）、上爻少阳
动爻：九五（共1个）
爻辞：观我生，君子无咎。
变卦：第23卦·山地剥（三钱法不取互卦与体用）`;
const unfinishedToBiteRecord = `规则档案：coin-3q-1（三钱法）
起卦方式：铜钱摇卦
本卦：第64卦·火水未济（上离下坎）
六爻（自初爻至上爻）：初爻老阴（动）、二爻老阳（动）、三爻少阴、四爻少阳、五爻少阴、上爻少阳
动爻：初六、九二（共2个）
爻辞：初六：濡其尾，吝。九二：曳其轮，贞吉。
变卦：第21卦·火雷噬嗑（上离下震；三钱法不取互卦与体用）`;
const testCases = [
  {
    label: '火锅 vs 江西菜',
    question: '明天我们三人吃有庆肥牛火锅还是泰华的小江溪江西菜？',
    meihua: guanToBoRecord,
    validate(answer) {
      return {
        explicitChoiceAtStart: /有庆肥牛|火锅|小江溪|江西菜/.test(answer.slice(0, 120)),
        referencesActualMovingLine: /九五|五爻|观我生/.test(answer),
        referencesActualChangedHexagram: /剥/.test(answer),
      };
    },
  },
  {
    label: '初一 vs 初二 vs 初三',
    question: '我初中同学谈了一个初中认识的女朋友，我想知道他的女朋友他俩是初一、初二还是初三认识的？',
    meihua: unfinishedToBiteRecord,
    validate(answer) {
      const firstSentence = answer.split(/[。！？\n]/, 1)[0] || '';
      const firstChoice = firstSentence.match(/初[一二三]/)?.[0] || '';
      const sentences = answer.split(/[。！？\n]/);
      const rankingSentence = sentences.find((sentence) => /排序|排名|三项|三选项|三档|依次|强弱排/.test(sentence))
        || sentences.find((sentence) => /其次|次之|最强|最弱|[>＞→]/.test(sentence))
        || '';
      const ranked = [...new Set(rankingSentence.match(/初[一二三]/g) || [])];
      return {
        explicitGradeAtStart: Boolean(firstChoice),
        ranksAllThreeOptions: ranked.length === 3,
        referencesActualMovingLines: /初六|九二|初爻|二爻|濡其尾|曳其轮/.test(answer),
        referencesActualChangedHexagram: /噬嗑/.test(answer),
      };
    },
  },
  {
    label: '对方会不会主动联系',
    question: '我在意的那个人，未来一个月会不会主动联系我？',
    meihua: guanToBoRecord,
    validate(answer) {
      const firstSentence = answer.split(/[。！？\n]/, 1)[0] || '';
      return {
        explicitYesNoLean: /(?:偏向|倾向|更像|我断|断[:：]?|卦象看|卦象偏).{0,36}(?:会|不会)/.test(firstSentence)
          || /(?:会|不会).{0,18}(?:主动|联系)/.test(firstSentence),
        referencesActualMovingLine: /九五|五爻|观我生/.test(answer),
        referencesActualChangedHexagram: /剥/.test(answer),
      };
    },
  },
];

const evasiveAnswer = /问本人|只有当事人|私人经历|卦里看不出来|卦象无法告诉|无法判断|没有证据|需要现实核实|建议直接询问|不能判断他们是哪一年/u;
const assertedThirdPartyMind = /心念在|心里有你|(?:对方|他|她).{0,20}(?:在想|觉得|喜欢|想联系|心里|内心)/u;

function loadDotEnv() {
  let source = '';
  try {
    source = readFileSync(join(__dirname, '..', '.env'), 'utf8');
  } catch {
    return {};
  }
  return Object.fromEntries(source.split(/\r?\n/).flatMap((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return [];
    const separator = trimmed.indexOf('=');
    if (separator < 1) return [];
    const name = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    return [[name, value]];
  }));
}

function parseStream(raw) {
  let text = '';
  for (const line of raw.split('\n')) {
    if (!line.startsWith('data:')) continue;
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') continue;
    try {
      const chunk = JSON.parse(data);
      text += chunk.choices?.[0]?.delta?.content || '';
    } catch {}
  }
  return text.trim();
}

async function readAnswer(response) {
  const raw = await response.text();
  return { status: response.status, text: parseStream(raw), raw: raw.slice(0, 260).replace(/\s+/g, ' ') };
}

(async () => {
  const fileEnv = loadDotEnv();
  const env = (name) => process.env[name] || fileEnv[name] || '';
  const apiKey = env('DEEPSEEK_API_KEY');
  const model = env('DEEPSEEK_MODEL') || 'deepseek-flash';
  if (!apiKey) throw new Error('缺少 DeepSeek Key：请设置 DEEPSEEK_API_KEY 或在本地 .env 中配置。');
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = (input, options = {}) => nativeFetch(input, {
    ...options,
    signal: options.signal || AbortSignal.timeout(60000),
  });

  const { handleTarotReading } = await import('../cloudbase/tarot-ai/tarot-reading.mjs');
  const results = [];
  for (const testCase of testCases) {
    const body = {
      readingMode: 'gua',
      depth: 'brief',
      question: testCase.question,
      castProfile: 'coin-3q-1',
      castMethod: 'three-coins',
      castMode: 'coin',
      meihua: testCase.meihua,
    };
    const localRequest = new Request('https://tarot.test/tarot-api/tarot-reading', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: LOCAL_ORIGIN, host: 'tarot.test' },
      body: JSON.stringify(body),
    });
    const response = await readAnswer(await handleTarotReading(localRequest, {
      AI_PROVIDER: 'deepseek',
      DEEPSEEK_API_KEY: apiKey,
      DEEPSEEK_MODEL: model,
      TAROT_ALLOWED_ORIGINS: LOCAL_ORIGIN,
    }));
    const checks = {
      ...testCase.validate(response.text),
      noEvasiveRefusal: !evasiveAnswer.test(response.text),
      noAssertedThirdPartyMind: !assertedThirdPartyMind.test(response.text),
    };
    const passed = response.status === 200 && Boolean(response.text) && Object.values(checks).every(Boolean);
    results.push({ label: testCase.label, status: response.status, answer: response.text, checks, passed });
    console.log(`\n${testCase.label}｜${passed ? '通过' : '未通过'}：`);
    console.log(response.text || `[无可解析文本；HTTP ${response.status}] ${response.raw}`);
    console.log('检查：', JSON.stringify(checks));
  }
  console.log('\n汇总：', JSON.stringify({ model, passed: results.filter((result) => result.passed).length, total: results.length }, null, 2));
  if (results.some((result) => !result.passed)) process.exitCode = 1;
})().catch((error) => {
  console.error('生成测试失败：', error.message);
  process.exitCode = 1;
});
