const DEVICES = ['desktop', 'tablet', 'mobile'];
const LIMITS = {
  maxCards: 400,
  maxGap: 48,
  minRowHeight: 72,
  maxRowHeight: 220,
  maxRadius: 48,
  minPadding: 8,
  maxPadding: 48
};

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}
function finiteInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}
function cleanId(value) {
  return String(value ?? '').trim().slice(0, 180);
}
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function normalizeLayout(input) {
  const source = isObject(input) ? input : {};
  const settingsSource = isObject(source.settings) ? source.settings : {};
  const styleSource = isObject(source.style) ? source.style : {};
  const cardsSource = isObject(source.cards) ? source.cards : {};

  const defaults = {
    desktop: { columns: 12, gap: 14, rowHeight: 120 },
    tablet: { columns: 6, gap: 12, rowHeight: 115 },
    mobile: { columns: 1, gap: 12, rowHeight: 110 }
  };

  const settings = {};
  for (const device of DEVICES) {
    const raw = isObject(settingsSource[device]) ? settingsSource[device] : {};
    const fixedColumns = device === 'desktop' ? 12 : device === 'tablet' ? 6 : 1;
    settings[device] = {
      columns: fixedColumns,
      gap: clamp(finiteInt(raw.gap, defaults[device].gap), 0, LIMITS.maxGap),
      rowHeight: clamp(
        finiteInt(raw.rowHeight, defaults[device].rowHeight),
        LIMITS.minRowHeight,
        LIMITS.maxRowHeight
      )
    };
  }

  const order = Array.isArray(source.order)
    ? [...new Set(source.order.map(cleanId).filter(Boolean))].slice(0, LIMITS.maxCards)
    : [];

  const cards = {};
  for (const [rawId, rawCard] of Object.entries(cardsSource).slice(0, LIMITS.maxCards)) {
    const id = cleanId(rawId);
    if (!id || !isObject(rawCard)) continue;
    const card = {};
    for (const device of DEVICES) {
      if (!isObject(rawCard[device])) continue;
      const cols = settings[device].columns;
      card[device] = {
        colSpan: clamp(finiteInt(rawCard[device].colSpan, cols), 1, cols),
        rowSpan: clamp(finiteInt(rawCard[device].rowSpan, 2), 1, 6)
      };
    }
    cards[id] = card;
  }

  return {
    version: 10,
    order,
    settings,
    style: {
      cardRadius: clamp(finiteInt(styleSource.cardRadius, 24), 0, LIMITS.maxRadius),
      cardPadding: clamp(
        finiteInt(styleSource.cardPadding, 22),
        LIMITS.minPadding,
        LIMITS.maxPadding
      )
    },
    cards
  };
}

export function validateLayout(input) {
  if (!isObject(input)) return '布局数据格式不正确';
  const normalized = normalizeLayout(input);
  if (!Array.isArray(normalized.order)) return '布局顺序格式不正确';
  if (normalized.order.length > LIMITS.maxCards) return '布局项目数量过多';
  return '';
}

export function layoutSource(layout) {
  const normalized = normalizeLayout(layout);
  return `/* V10 可视化布局数据。由布局编辑器发布；不要在此存放密钥。 */\nwindow.AIPageLayout = ${JSON.stringify(normalized, null, 2)};\n`;
}
