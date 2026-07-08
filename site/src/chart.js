// Canvas rendering for the equity fan chart. DOM/canvas calls live here,
// separated from src/sim.js's pure math and kept thin enough that the only
// untested logic is "draw this rect" — the scale math itself is exported as
// a plain function so it can run under Node without a canvas.

const PERCENTILE_STYLE = {
  5: { color: "rgba(64, 196, 255, 0.35)", width: 1, label: "5th / 95th percentile" },
  95: { color: "rgba(64, 196, 255, 0.35)", width: 1, label: null },
  25: { color: "rgba(64, 196, 255, 0.6)", width: 1.5, label: "25th / 75th percentile" },
  75: { color: "rgba(64, 196, 255, 0.6)", width: 1.5, label: null },
  50: { color: "#ff8a3d", width: 2.5, label: "median" },
};

const RAW_LINE_COLOR = "rgba(64, 196, 255, 0.05)";
const RUIN_LINE_COLOR = "rgba(255, 92, 108, 0.06)";
const FLOOR = 1e-3;

/**
 * Resizes a canvas's backing store to devicePixelRatio x its CSS box size
 * and scales the drawing context so all subsequent draw calls can be made
 * in CSS pixel units. Returns the CSS size so the caller can pass it to
 * drawFanChart without re-measuring.
 */
export function sizeCanvasToDisplay(canvas, dpr = window.devicePixelRatio || 1) {
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  const targetWidth = Math.max(1, Math.round(cssWidth * dpr));
  const targetHeight = Math.max(1, Math.round(cssHeight * dpr));
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width: cssWidth, height: cssHeight };
}

/**
 * Log-scaled y-domain spanning every value across the given percentile
 * bands, floored at FLOOR so a ruined (0-valued) path doesn't send log10 to
 * -Infinity. Pure function so the scale math is testable without a canvas.
 */
export function computeYDomain(bands, floor = FLOOR) {
  let min = Infinity;
  let max = -Infinity;
  const arrays = bands instanceof Map ? bands.values() : Object.values(bands);
  for (const arr of arrays) {
    for (const v of arr) {
      const clamped = Math.max(v, floor);
      if (clamped < min) min = clamped;
      if (clamped > max) max = clamped;
    }
  }
  if (!Number.isFinite(min)) min = floor;
  if (!Number.isFinite(max) || max <= min) max = min * 10;
  return { min, max };
}

function makeScales(widthCss, heightCss, numSteps, yDomain) {
  const logMin = Math.log10(yDomain.min);
  const logMax = Math.log10(yDomain.max);
  const logSpan = logMax - logMin || 1;
  return {
    toX: (step) => (numSteps <= 1 ? 0 : (step / (numSteps - 1)) * widthCss),
    toY: (value) => {
      const clamped = Math.max(value, FLOOR);
      const t = (Math.log10(clamped) - logMin) / logSpan;
      return heightCss - t * heightCss;
    },
  };
}

function strokePath(ctx, values, toX, toY) {
  ctx.beginPath();
  for (let i = 0; i < values.length; i++) {
    const x = toX(i);
    const y = toY(values[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

/**
 * Draws the raw path fan plus the percentile bands over it. `paths` is
 * already a bounded, pre-sampled array of Float64Arrays (the worker samples
 * before sending, so the postMessage payload stays small regardless of how
 * many paths were simulated); `percentileBands` is the Map/object from
 * computePercentiles.
 */
export function drawFanChart(ctx, { width, height, paths, percentileBands }) {
  ctx.clearRect(0, 0, width, height);
  if (paths.length === 0) return;

  const numSteps = paths[0].length;
  const yDomain = computeYDomain(percentileBands);
  const { toX, toY } = makeScales(width, height, numSteps, yDomain);

  ctx.lineWidth = 1;
  for (const path of paths) {
    ctx.strokeStyle = path.at(-1) <= FLOOR ? RUIN_LINE_COLOR : RAW_LINE_COLOR;
    strokePath(ctx, path, toX, toY);
  }

  const entries = percentileBands instanceof Map ? percentileBands.entries() : Object.entries(percentileBands);
  for (const [key, values] of entries) {
    const style = PERCENTILE_STYLE[key];
    if (!style) continue;
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.width;
    strokePath(ctx, values, toX, toY);
  }
}

/** Legend entries for the percentile bands, in display order. */
export function getLegendItems() {
  return Object.values(PERCENTILE_STYLE)
    .filter((style) => style.label)
    .map((style) => ({ label: style.label, color: style.color }));
}
