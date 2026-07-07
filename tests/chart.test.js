import test from "node:test";
import assert from "node:assert/strict";
import { computeYDomain, getLegendItems } from "../src/chart.js";

test("computeYDomain spans the min and max across all bands", () => {
  const bands = new Map([
    [5, Float64Array.from([0.5, 1, 2])],
    [95, Float64Array.from([1, 4, 9])],
  ]);
  const domain = computeYDomain(bands);
  assert.equal(domain.min, 0.5);
  assert.equal(domain.max, 9);
});

test("computeYDomain floors zero/ruined values so log10 stays finite", () => {
  const bands = new Map([[5, Float64Array.from([0, 0, 0])]]);
  const domain = computeYDomain(bands, 1e-3);
  assert.equal(domain.min, 1e-3);
  assert.ok(Number.isFinite(Math.log10(domain.min)));
});

test("computeYDomain accepts a plain object as well as a Map", () => {
  const domain = computeYDomain({ 50: Float64Array.from([1, 2, 3]) });
  assert.equal(domain.min, 1);
  assert.equal(domain.max, 3);
});

test("computeYDomain widens a degenerate (all-equal) domain so log-scale math doesn't divide by zero", () => {
  const bands = new Map([[50, Float64Array.from([2, 2, 2])]]);
  const domain = computeYDomain(bands);
  assert.ok(domain.max > domain.min);
});

test("getLegendItems returns one entry per distinct percentile pair, not one per band", () => {
  const items = getLegendItems();
  assert.equal(items.length, 3);
  assert.deepEqual(
    items.map((i) => i.label),
    ["5th / 95th percentile", "25th / 75th percentile", "median"]
  );
});
