import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseStateFromQuery } from "../src/urlState.js";

// Guards against the exact bug this pinned down once already: parseStateFromQuery's
// clamp ranges silently drifting from the sliders' real min/max in index.html, which
// leaves a shared URL producing state a slider can't visually represent. Rather than
// duplicating the bounds as separate literals (which can drift again the same way),
// this reads index.html itself so a future slider range change is checked against
// the actual markup, not a second hand-maintained copy of the numbers.
const indexHtml = readFileSync(
  fileURLToPath(new URL("../index.html", import.meta.url)),
  "utf8"
);

function sliderRange(id) {
  const re = new RegExp(`id="${id}"[^>]*\\bmin="([^"]+)"[^>]*\\bmax="([^"]+)"`);
  const match = indexHtml.match(re);
  assert.ok(match, `expected to find a range input#${id} with min/max in index.html`);
  return { min: parseFloat(match[1]), max: parseFloat(match[2]) };
}

const CASES = [
  { sliderId: "win-prob", param: "edge", field: "winProb", scale: 1 / 100 },
  { sliderId: "payout-ratio", param: "payout", field: "payoutRatio", scale: 1 },
  { sliderId: "bet-fraction", param: "bet", field: "betFraction", scale: 1 / 100 },
  { sliderId: "num-paths", param: "paths", field: "numPaths", scale: 1 },
  { sliderId: "num-bets", param: "bets", field: "numBets", scale: 1 },
];

for (const { sliderId, param, field, scale } of CASES) {
  test(`parseStateFromQuery clamps ${field} to the #${sliderId} slider's own min/max`, () => {
    const { min, max } = sliderRange(sliderId);
    const expectedMin = min * scale;
    const expectedMax = max * scale;

    const high = parseStateFromQuery(`${param}=${expectedMax * 1000 + 1}`);
    const low = parseStateFromQuery(`${param}=${expectedMin - Math.abs(expectedMin || 1) * 1000 - 1}`);

    assert.equal(high[field], expectedMax, `${field} should clamp to the slider's max`);
    assert.equal(low[field], expectedMin, `${field} should clamp to the slider's min`);
  });
}
