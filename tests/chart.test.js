import test from "node:test";
import assert from "node:assert/strict";
import { computeYDomain, getLegendItems, sizeCanvasToDisplay } from "../src/chart.js";

// Duck-typed stand-in for a <canvas> element, just enough surface for
// sizeCanvasToDisplay: CSS box size, a mutable backing-store width/height,
// and a 2D context whose setTransform calls we can inspect. Avoids pulling
// in jsdom for one function.
function makeFakeCanvas(clientWidth, clientHeight, { initialWidth = 0, initialHeight = 0 } = {}) {
  let width = initialWidth;
  let height = initialHeight;
  const transformCalls = [];
  return {
    clientWidth,
    clientHeight,
    get width() {
      return width;
    },
    set width(v) {
      width = v;
    },
    get height() {
      return height;
    },
    set height(v) {
      height = v;
    },
    transformCalls,
    getContext: () => ({
      setTransform: (...args) => transformCalls.push(args),
    }),
  };
}

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

test("sizeCanvasToDisplay scales the backing store to CSS size x devicePixelRatio", () => {
  const canvas = makeFakeCanvas(400, 300);
  const result = sizeCanvasToDisplay(canvas, 2);
  assert.equal(canvas.width, 800);
  assert.equal(canvas.height, 600);
  assert.deepEqual(result, { width: 400, height: 300 });
  assert.deepEqual(canvas.transformCalls, [[2, 0, 0, 2, 0, 0]]);
});

test("sizeCanvasToDisplay floors the backing store at 1x1 for a zero-sized CSS box", () => {
  const canvas = makeFakeCanvas(0, 0);
  sizeCanvasToDisplay(canvas, 2);
  assert.equal(canvas.width, 1);
  assert.equal(canvas.height, 1);
});

test("sizeCanvasToDisplay skips reassigning width/height when already correctly sized", () => {
  // Reassigning canvas.width/height clears and reflows the backing store even
  // when set to the same value, so this only writes when the size actually
  // changed — verified here by making width/height setters detectable.
  const canvas = makeFakeCanvas(400, 300, { initialWidth: 800, initialHeight: 600 });
  let widthWrites = 0;
  let heightWrites = 0;
  let width = canvas.width;
  let height = canvas.height;
  Object.defineProperty(canvas, "width", {
    get: () => width,
    set: (v) => {
      widthWrites++;
      width = v;
    },
  });
  Object.defineProperty(canvas, "height", {
    get: () => height,
    set: (v) => {
      heightWrites++;
      height = v;
    },
  });
  sizeCanvasToDisplay(canvas, 2);
  assert.equal(widthWrites, 0);
  assert.equal(heightWrites, 0);
});

test("sizeCanvasToDisplay rounds fractional devicePixelRatio x CSS size to the nearest pixel", () => {
  const canvas = makeFakeCanvas(375, 100);
  sizeCanvasToDisplay(canvas, 2.5);
  assert.equal(canvas.width, Math.round(375 * 2.5));
  assert.equal(canvas.height, Math.round(100 * 2.5));
});
