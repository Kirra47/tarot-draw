// Profile coin-3q-1. Three-coin (三钱) casting, kept separate from the
// mh-ws-1 梅花易数 profile on purpose: the two systems read different data.
//
// Each of the six lines is decided by tossing three coins. A coin shows 字面
// (counts 2) or 背面 (counts 3), so one line totals 6, 7, 8 or 9:
//   6 老阴 (moving yin)   7 少阳 (static yang)
//   8 少阴 (static yin)   9 老阳 (moving yang)
//
// Arrays list lines from bottom (初爻) to top (上爻), matching the mh-ws-1
// convention so the two profiles can share hexagram lookups.
import { TRIGRAMS } from '../books/meihua-yishu-wikisource/meihua-numeric-cast/scripts/meihua.mjs';

export const COIN_PROFILE = 'coin-3q-1';
export const COIN_LINE_VALUES = Object.freeze([6, 7, 8, 9]);
export const COIN_LINE_LABELS = Object.freeze({
  6: '老阴',
  7: '少阳',
  8: '少阴',
  9: '老阳',
});
// 字面 counts 2, 背面 counts 3. Index is the number of 背面 among the three coins.
const COIN_FACE_SUMS = Object.freeze([6, 7, 8, 9]);

function trigramIndex(lines) {
  const index = TRIGRAMS.findIndex((item) => item && item.lines.every((value, i) => value === lines[i]));
  if (index < 1) throw new RangeError(`unknown trigram for lines ${lines.join('')}`);
  return index;
}

// 初/二/三爻 form the lower trigram; 四/五/上爻 form the upper trigram.
export function pairTrigrams(lines) {
  return { lower: trigramIndex(lines.slice(0, 3)), upper: trigramIndex(lines.slice(3, 6)) };
}

export function coinLineIsYang(value) {
  return value === 7 || value === 9;
}

export function coinLineIsMoving(value) {
  return value === 6 || value === 9;
}

export function coinLineFaceSum(faces) {
  if (!Array.isArray(faces) || faces.length !== 3) throw new RangeError('three coins are required');
  const total = faces.reduce((sum, face, index) => {
    if (face !== 0 && face !== 1) throw new RangeError(`coin${index + 1} must be 0 (字面) or 1 (背面)`);
    return sum + 2 + face;
  }, 0);
  if (!COIN_FACE_SUMS.includes(total)) throw new RangeError(`unexpected coin total: ${total}`);
  return total;
}

export function structureFromCoinValues(values) {
  if (!Array.isArray(values) || values.length !== 6) {
    throw new RangeError('six coin lines are required');
  }
  const lineValues = values.map((value, index) => {
    const number = Number(value);
    if (!COIN_LINE_VALUES.includes(number)) {
      throw new RangeError(`line${index + 1} must be one of 6, 7, 8 or 9`);
    }
    return number;
  });

  const lines = lineValues.map((value) => (coinLineIsYang(value) ? 1 : 0));
  const movingLines = lineValues.reduce(
    (list, value, index) => (coinLineIsMoving(value) ? [...list, index + 1] : list),
    [],
  );
  const changedLines = lines.map((value, index) => (movingLines.includes(index + 1) ? 1 - value : value));
  const base = pairTrigrams(lines);
  const changed = pairTrigrams(changedLines);

  return {
    profile: COIN_PROFILE,
    method: 'three-coins',
    // The page only records a cast that carries `inputs`, so the six tossed
    // values take that slot the way numbers or ordinals do for 梅花 casts.
    inputs: { coinValues: [...lineValues] },
    lineValues,
    lines,
    movingLines,
    changedLines,
    upper: base.upper,
    lower: base.lower,
    changed: { upper: changed.upper, lower: changed.lower },
    trace: {
      lineValues: [...lineValues],
      movingLines: [...movingLines],
      movingTotal: movingLines.length,
    },
  };
}

// One toss of three coins, kept here so the page and the checks agree.
export function drawCoinFaces(random = Math.random) {
  return [0, 1, 2].map(() => (random() < 0.5 ? 0 : 1));
}
