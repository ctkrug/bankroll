// Scaffold entrypoint: proves the worker round-trip end to end. The real
// controls, fan-chart canvas, and risk-of-ruin readout are built out in the
// next phase against docs/DESIGN.md.
const statusEl = document.getElementById("boot-status");

const worker = new Worker("src/worker.js", { type: "module" });

worker.onmessage = (event) => {
  const { riskOfRuin, paths } = event.data;
  statusEl.textContent = `bankroll: ${paths.length} paths simulated — risk of ruin ${(riskOfRuin * 100).toFixed(1)}%`;
};

worker.postMessage({
  requestId: 1,
  numPaths: 10000,
  numBets: 100,
  winProb: 0.55,
  payoutRatio: 1,
  betFraction: 0.1,
});
