import { runMonteCarlo } from "./sim.js";

// The worker takes one message per simulation request and posts back the
// full path set plus summary stats. Keeping the whole 10k-path run off the
// main thread is what lets the sliders stay responsive.
self.onmessage = (event) => {
  const { numPaths, numBets, winProb, payoutRatio, betFraction, requestId } = event.data;
  const { paths, riskOfRuin } = runMonteCarlo({ numPaths, numBets, winProb, payoutRatio, betFraction });
  self.postMessage({ requestId, paths, riskOfRuin });
};
