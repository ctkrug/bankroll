import { runMonteCarlo, estimateRiskOfRuin, computePercentiles } from "./sim.js";

// The worker takes one message per simulation request and posts back the
// full path set plus summary stats. Keeping the whole 10k-path run — and
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

  const { paths, riskOfRuin } = runMonteCarlo(params);
  const percentiles = Object.fromEntries(computePercentiles(paths));
  return { requestId, mode, paths, riskOfRuin, percentiles };
}

if (typeof self !== "undefined" && typeof self.postMessage === "function") {
  self.onmessage = (event) => {
    self.postMessage(buildResponse(event.data));
  };
}
