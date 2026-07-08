import test from "node:test";
import fc from "fast-check";
import {
  kellyFraction,
  simulatePath,
  runMonteCarlo,
  computePercentiles,
  DEFAULT_PERCENTILES,
} from "../src/sim.js";

// Property-based tests for the pure simulation/statistics math. Example-based
// tests in sim.test.js pin specific worked cases; these check invariants that
// must hold across the whole input domain, which is where a hand-picked
// fixture is most likely to miss a boundary case.

test("kellyFraction is always clamped to [0, 1] across the whole valid domain", () => {
  fc.assert(
    fc.property(
      fc.double({ min: 0.01, max: 0.99, noNaN: true }),
      fc.double({ min: 0.01, max: 20, noNaN: true }),
      (winProb, payoutRatio) => {
        const f = kellyFraction(winProb, payoutRatio);
        return f >= 0 && f <= 1;
      }
    )
  );
});

test("kellyFraction is 0 at or below the breakeven win probability for a given payout", () => {
  // Breakeven: p * b = (1 - p), i.e. p = 1 / (1 + b). At or below that, the
  // bet has no or negative edge, so Kelly must never suggest staking anything.
  fc.assert(
    fc.property(fc.double({ min: 0.01, max: 20, noNaN: true }), (payoutRatio) => {
      const breakeven = 1 / (1 + payoutRatio);
      const belowBreakeven = Math.max(0.001, breakeven - 0.01);
      return kellyFraction(belowBreakeven, payoutRatio) === 0;
    })
  );
});

test("simulatePath never produces a negative or NaN bankroll, for any inputs", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 200 }),
      fc.double({ min: 0, max: 1, noNaN: true }),
      fc.double({ min: 0.01, max: 20, noNaN: true }),
      fc.double({ min: 0, max: 1, noNaN: true }),
      fc.integer({ min: -(2 ** 31), max: 2 ** 31 - 1 }),
      (numBets, winProb, payoutRatio, betFraction, seed) => {
        let s = seed || 1;
        const rng = () => {
          s = (s * 1103515245 + 12345) & 0x7fffffff;
          return s / 0x7fffffff;
        };
        const path = simulatePath(numBets, winProb, payoutRatio, betFraction, rng);
        return path.length === numBets + 1 && path.every((v) => Number.isFinite(v) && v >= 0);
      }
    )
  );
});

test("simulatePath, once ruined, never recovers", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 100 }),
      fc.double({ min: 0, max: 1, noNaN: true }),
      fc.double({ min: 0.01, max: 20, noNaN: true }),
      fc.double({ min: 0, max: 1, noNaN: true }),
      fc.integer({ min: -(2 ** 31), max: 2 ** 31 - 1 }),
      (numBets, winProb, payoutRatio, betFraction, seed) => {
        let s = seed || 1;
        const rng = () => {
          s = (s * 1103515245 + 12345) & 0x7fffffff;
          return s / 0x7fffffff;
        };
        const path = simulatePath(numBets, winProb, payoutRatio, betFraction, rng);
        const firstZero = path.findIndex((v) => v === 0);
        if (firstZero === -1) return true;
        return path.slice(firstZero).every((v) => v === 0);
      }
    )
  );
});

test("runMonteCarlo's riskOfRuin is always a valid probability", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 50 }),
      fc.integer({ min: 0, max: 60 }),
      fc.double({ min: 0, max: 1, noNaN: true }),
      fc.double({ min: 0.01, max: 20, noNaN: true }),
      fc.double({ min: 0, max: 1, noNaN: true }),
      (numPaths, numBets, winProb, payoutRatio, betFraction) => {
        const { riskOfRuin, columns } = runMonteCarlo({ numPaths, numBets, winProb, payoutRatio, betFraction });
        return (
          riskOfRuin >= 0 &&
          riskOfRuin <= 1 &&
          !Number.isNaN(riskOfRuin) &&
          Array.from(columns).every((v) => Number.isFinite(v) && v >= 0)
        );
      }
    ),
    { numRuns: 50 }
  );
});

test("computePercentiles bands are non-decreasing across ascending percentiles at every step", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 30 }),
      fc.integer({ min: 1, max: 20 }),
      fc.double({ min: 0, max: 1, noNaN: true }),
      fc.double({ min: 0.01, max: 20, noNaN: true }),
      fc.double({ min: 0, max: 1, noNaN: true }),
      (numPaths, numBets, winProb, payoutRatio, betFraction) => {
        const result = runMonteCarlo({ numPaths, numBets, winProb, payoutRatio, betFraction });
        const bands = computePercentiles(result, DEFAULT_PERCENTILES);
        for (let step = 0; step < result.numSteps; step++) {
          let prevValue = -Infinity;
          for (const p of DEFAULT_PERCENTILES) {
            const value = bands.get(p)[step];
            if (value < prevValue) return false;
            prevValue = value;
          }
        }
        return true;
      }
    ),
    { numRuns: 50 }
  );
});
