import test from "node:test";
import assert from "node:assert/strict";
import { buildResponse } from "../src/worker.js";

const baseParams = { numPaths: 30, numBets: 10, winProb: 0.55, payoutRatio: 1, betFraction: 0.1 };

test("buildResponse in full mode returns a bounded raw sample, riskOfRuin, and percentile bands", () => {
  const response = buildResponse({ requestId: 7, ...baseParams });
  assert.equal(response.requestId, 7);
  assert.equal(response.mode, "full");
  assert.ok(response.rawSamples.length <= 30);
  assert.ok(response.rawSamples.length > 0);
  assert.equal(response.rawSamples[0].length, 11);
  assert.equal(typeof response.riskOfRuin, "number");
  assert.deepEqual(Object.keys(response.percentiles), ["5", "25", "50", "75", "95"]);
});

test("buildResponse never sends the full column-major buffer, only a bounded sample", () => {
  const response = buildResponse({ requestId: 9, ...baseParams, numPaths: 5000 });
  assert.ok(response.rawSamples.length < 5000);
  assert.equal(response.columns, undefined);
});

test("buildResponse in ruinOnly mode returns a scalar with no paths or percentiles", () => {
  const response = buildResponse({ requestId: 8, mode: "ruinOnly", ...baseParams });
  assert.equal(response.mode, "ruinOnly");
  assert.equal(typeof response.riskOfRuin, "number");
  assert.equal(response.rawSamples, undefined);
  assert.equal(response.percentiles, undefined);
});

test("buildResponse echoes back the requestId it was given", () => {
  const response = buildResponse({ requestId: "abc-123", ...baseParams });
  assert.equal(response.requestId, "abc-123");
});
