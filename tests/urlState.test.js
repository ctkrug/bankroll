import test from "node:test";
import assert from "node:assert/strict";
import { serializeStateToQuery, parseStateFromQuery, DEFAULT_STATE } from "../src/urlState.js";

test("serializeStateToQuery round-trips through parseStateFromQuery", () => {
  const state = { winProb: 0.62, payoutRatio: 2, betFraction: 0.15, numPaths: 5000, numBets: 200, useKelly: false };
  const query = serializeStateToQuery(state);
  assert.deepEqual(parseStateFromQuery(query), state);
});

test("serializeStateToQuery omits the kelly param when useKelly is false", () => {
  const query = serializeStateToQuery({ ...DEFAULT_STATE, useKelly: false });
  assert.equal(query.includes("kelly"), false);
});

test("serializeStateToQuery includes kelly=1 when useKelly is true", () => {
  const query = serializeStateToQuery({ ...DEFAULT_STATE, useKelly: true });
  assert.ok(query.includes("kelly=1"));
});

test("parseStateFromQuery falls back to defaults for an empty query string", () => {
  assert.deepEqual(parseStateFromQuery(""), DEFAULT_STATE);
});

test("parseStateFromQuery falls back to defaults for malformed numeric values", () => {
  const state = parseStateFromQuery("edge=not-a-number&bets=NaN");
  assert.equal(state.winProb, DEFAULT_STATE.winProb);
  assert.equal(state.numBets, DEFAULT_STATE.numBets);
});

test("parseStateFromQuery clamps out-of-range values into the valid domain", () => {
  const state = parseStateFromQuery("edge=5&bet=-3&paths=99999999");
  assert.equal(state.winProb, 0.99);
  assert.equal(state.betFraction, 0);
  assert.equal(state.numPaths, 10000);
});

test("parseStateFromQuery accepts a leading question mark", () => {
  const state = parseStateFromQuery("?edge=0.7");
  assert.equal(state.winProb, 0.7);
});

test("parseStateFromQuery clamps payoutRatio to the slider's own range (index.html max=5)", () => {
  const state = parseStateFromQuery("payout=9999999");
  assert.equal(state.payoutRatio, 5);
});

test("parseStateFromQuery clamps numBets to the slider's own range (index.html max=500)", () => {
  const state = parseStateFromQuery("bets=800");
  assert.equal(state.numBets, 500);
});
