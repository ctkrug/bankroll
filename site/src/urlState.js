// Pure query-string <-> simulation-state conversion, kept separate from the
// DOM so it's testable under Node and so main.js only has to call two
// functions rather than hand-roll URLSearchParams parsing inline.

export const DEFAULT_STATE = {
  winProb: 0.55,
  payoutRatio: 1,
  betFraction: 0.1,
  numPaths: 10000,
  numBets: 100,
  useKelly: false,
};

function clampNumber(value, min, max, fallback) {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/**
 * Serialize simulation state to a query string (no leading "?"). Always
 * writes every numeric control so a shared link is fully self-describing;
 * `kelly` is only written when active, since its absence already means off.
 */
export function serializeStateToQuery(state) {
  const params = new URLSearchParams();
  params.set("edge", String(state.winProb));
  params.set("payout", String(state.payoutRatio));
  params.set("bet", String(state.betFraction));
  params.set("paths", String(state.numPaths));
  params.set("bets", String(state.numBets));
  if (state.useKelly) params.set("kelly", "1");
  return params.toString();
}

/**
 * Parse a query string (with or without a leading "?") back into
 * simulation state. Missing or malformed values fall back to
 * DEFAULT_STATE field-by-field rather than rejecting the whole string, so a
 * hand-edited or partial URL degrades gracefully instead of crashing.
 *
 * Clamp ranges here must match each control's min/max in index.html: a
 * value inside this range but outside the slider's own range would leave
 * the slider rendering clamped at its native max while the label next to
 * it (driven by state, not the input) shows the real, larger value.
 */
export function parseStateFromQuery(search) {
  const params = new URLSearchParams(search);
  return {
    winProb: clampNumber(parseFloat(params.get("edge")), 0.01, 0.99, DEFAULT_STATE.winProb),
    payoutRatio: clampNumber(parseFloat(params.get("payout")), 0.2, 5, DEFAULT_STATE.payoutRatio),
    betFraction: clampNumber(parseFloat(params.get("bet")), 0, 1, DEFAULT_STATE.betFraction),
    numPaths: clampNumber(parseFloat(params.get("paths")), 1000, 10000, DEFAULT_STATE.numPaths),
    numBets: clampNumber(parseFloat(params.get("bets")), 0, 500, DEFAULT_STATE.numBets),
    useKelly: params.get("kelly") === "1",
  };
}
