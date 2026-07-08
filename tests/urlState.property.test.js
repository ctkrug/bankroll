import test from "node:test";
import fc from "fast-check";
import { serializeStateToQuery, parseStateFromQuery } from "../src/urlState.js";

// The example tests in urlState.test.js pin specific round-trip cases;
// this checks the round-trip property holds for every value in each
// field's valid domain, not just the hand-picked ones.
test("serializeStateToQuery -> parseStateFromQuery round-trips exactly for any in-domain state", () => {
  fc.assert(
    fc.property(
      fc.record({
        winProb: fc.double({ min: 0.01, max: 0.99, noNaN: true }),
        payoutRatio: fc.double({ min: 0.2, max: 5, noNaN: true }),
        betFraction: fc.double({ min: 0, max: 1, noNaN: true }),
        numPaths: fc.integer({ min: 1000, max: 10000 }),
        numBets: fc.integer({ min: 0, max: 500 }),
        useKelly: fc.boolean(),
      }),
      (state) => {
        const roundTripped = parseStateFromQuery(serializeStateToQuery(state));
        return (
          roundTripped.winProb === state.winProb &&
          roundTripped.payoutRatio === state.payoutRatio &&
          roundTripped.betFraction === state.betFraction &&
          roundTripped.numPaths === state.numPaths &&
          roundTripped.numBets === state.numBets &&
          roundTripped.useKelly === state.useKelly
        );
      }
    )
  );
});

test("parseStateFromQuery never throws and always returns in-domain values for arbitrary query strings", () => {
  fc.assert(
    fc.property(fc.string(), (search) => {
      const state = parseStateFromQuery(search);
      return (
        state.winProb >= 0.01 &&
        state.winProb <= 0.99 &&
        state.payoutRatio >= 0.2 &&
        state.payoutRatio <= 5 &&
        state.betFraction >= 0 &&
        state.betFraction <= 1 &&
        state.numPaths >= 1000 &&
        state.numPaths <= 10000 &&
        state.numBets >= 0 &&
        state.numBets <= 500 &&
        typeof state.useKelly === "boolean"
      );
    })
  );
});
