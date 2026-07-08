import { runMonteCarlo, estimateRiskOfRuin, computePercentiles, samplePaths } from "./sim.js";

// The full 10,000-path column-major buffer (~8MB at the default 100 bets)
// never leaves the worker — only a bounded sample of raw lines plus the
// percentile bands cross postMessage, so the message payload stays small
// and roughly constant regardless of how many paths were simulated.
const MAX_SAMPLED_RAW_LINES = 400;

// The worker takes one message per simulation request and posts back a
// sampled path set plus summary stats. Keeping the whole 10k-path run — and
// the percentile-band sort over it — off the main thread is what lets the
// sliders stay responsive while dragging.
//
// `buildResponse` is exported (rather than only living inside onmessage) so
// it can be unit tested under Node without a real Worker/self context.
export function buildResponse(data) {
  const { mode = "full", requestId, numPaths, numBets, winProb, payoutRatio, betFraction } = data;
  const params = { numPaths, numBets, winProb, payoutRatio, betFraction };

  if (mode === "ruinOnly") {
    return { requestId, mode, riskOfRuin: estimateRiskOfRuin(params) };
  }

  const result = runMonteCarlo(params);
  const percentiles = Object.fromEntries(computePercentiles(result));
  const rawSamples = samplePaths(result.columns, result.numPaths, result.numSteps, MAX_SAMPLED_RAW_LINES);
  return { requestId, mode, riskOfRuin: result.riskOfRuin, rawSamples, percentiles };
}

if (typeof self !== "undefined" && typeof self.postMessage === "function") {
  self.onmessage = (event) => {
    const response = buildResponse(event.data);
    const transferables =
      response.mode === "full"
        ? [...response.rawSamples.map((p) => p.buffer), ...Object.values(response.percentiles).map((p) => p.buffer)]
        : [];
    self.postMessage(response, transferables);
  };
}
