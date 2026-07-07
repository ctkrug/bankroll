import test from "node:test";
import assert from "node:assert/strict";
import { kellyFraction, simulatePath, runMonteCarlo } from "../src/sim.js";

test("kellyFraction returns 0 for a coin-flip with no edge", () => {
  assert.equal(kellyFraction(0.5, 1), 0);
});

test("kellyFraction returns a positive fraction for a positive-edge bet", () => {
  // p=0.6, b=1 -> f* = (1*0.6 - 0.4) / 1 = 0.2
  assert.ok(Math.abs(kellyFraction(0.6, 1) - 0.2) < 1e-9);
});

test("kellyFraction clamps to 0 for a strictly negative-edge bet", () => {
  assert.equal(kellyFraction(0.2, 1), 0);
});

test("simulatePath always wins with winProb = 1", () => {
  const path = simulatePath(50, 1, 1, 0.1, () => 0.999);
  for (let i = 1; i < path.length; i++) {
    assert.ok(path[i] > path[i - 1]);
  }
});

test("simulatePath always loses with winProb = 0 and clamps at ruin", () => {
  const path = simulatePath(50, 0, 1, 0.5, () => 0.001);
  assert.equal(path.at(-1), 0);
  // once ruined, bankroll stays at 0 for the rest of the path
  const firstZero = path.findIndex((v) => v === 0);
  assert.ok(path.slice(firstZero).every((v) => v === 0));
});

test("runMonteCarlo reports 100% ruin for a guaranteed-loss scenario", () => {
  const { riskOfRuin } = runMonteCarlo({
    numPaths: 50,
    numBets: 20,
    winProb: 0,
    payoutRatio: 1,
    betFraction: 0.5,
  });
  assert.equal(riskOfRuin, 1);
});

test("runMonteCarlo reports 0% ruin for a guaranteed-win scenario", () => {
  const { riskOfRuin } = runMonteCarlo({
    numPaths: 50,
    numBets: 20,
    winProb: 1,
    payoutRatio: 1,
    betFraction: 0.5,
  });
  assert.equal(riskOfRuin, 0);
});

test("runMonteCarlo returns one path per requested run", () => {
  const { paths } = runMonteCarlo({
    numPaths: 25,
    numBets: 10,
    winProb: 0.5,
    payoutRatio: 1,
    betFraction: 0.1,
  });
  assert.equal(paths.length, 25);
  assert.equal(paths[0].length, 11);
});
