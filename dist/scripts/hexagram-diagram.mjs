import { trigram } from './meihua-display.mjs';

const YAO_LABELS = Object.freeze({ yin: '阴', yang: '阳' });

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

// The source trigram arrays use traditional bottom -> top order.
// This display component always emits the six yao visually TOP -> BOTTOM.
export function hexagramLinesTopToBottom(meta) {
  if (!Number.isInteger(meta?.upper) || !Number.isInteger(meta?.lower)) return [];
  const upper = trigram(meta.upper).lines;
  const lower = trigram(meta.lower).lines;
  if (upper.length !== 3 || lower.length !== 3) return [];
  return [...upper].reverse().concat([...lower].reverse())
    .map((line) => (line === 1 ? 'yang' : 'yin'));
}

export function renderHexagramDiagram(meta, role, title) {
  const lines = hexagramLinesTopToBottom(meta);
  if (lines.length !== 6) return '';

  const label = `${role}：${title}；自上而下${lines.map((line) => YAO_LABELS[line]).join('、')}`;
  const rows = lines.map((line, index) => {
    const y = 8 + (index * 16);
    const strokes = line === 'yang'
      ? `<path d="M 8 ${y} H 64"/>`
      : `<path d="M 8 ${y} H 29 M 43 ${y} H 64"/>`;
    return `<g class="guaYao guaYao-${line}" aria-hidden="true">${strokes}</g>`;
  }).join('');

  return `<figure class="guaHexagramDiagram">
    <svg viewBox="0 0 72 96" role="img" aria-label="${escapeHTML(label)}" focusable="false">
      <g class="guaYaoMarks" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round">${rows}</g>
    </svg>
  </figure>`;
}
