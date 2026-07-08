import { kellyFraction } from "./sim.js";
import { sizeCanvasToDisplay, drawFanChart, getLegendItems } from "./chart.js";
import { parseStateFromQuery, serializeStateToQuery } from "./urlState.js";

const els = {
  winProb: document.getElementById("win-prob"),
  winProbValue: document.getElementById("win-prob-value"),
  payoutRatio: document.getElementById("payout-ratio"),
  payoutRatioValue: document.getElementById("payout-ratio-value"),
  betFraction: document.getElementById("bet-fraction"),
  betFractionValue: document.getElementById("bet-fraction-value"),
  numPaths: document.getElementById("num-paths"),
  numPathsValue: document.getElementById("num-paths-value"),
  numBets: document.getElementById("num-bets"),
  numBetsValue: document.getElementById("num-bets-value"),
  kellyToggle: document.getElementById("kelly-toggle"),
  kellyReadout: document.getElementById("kelly-readout"),
  canvas: document.getElementById("fan-canvas"),
  counterChip: document.getElementById("counter-chip"),
  ruinValue: document.getElementById("ruin-value"),
  legend: document.getElementById("legend"),
  computeTime: document.getElementById("compute-time"),
  sweep: document.getElementById("sweep"),
};

const state = parseStateFromQuery(window.location.search);
// When Kelly snap is active, betFraction must always mirror the Kelly
// fraction for the loaded edge — never trust a stale/hand-edited `bet=`
// query value, or the toggle and the slider could silently disagree.
if (state.useKelly) {
  state.betFraction = kellyFraction(state.winProb, state.payoutRatio);
}

const worker = new Worker("src/worker.js", { type: "module" });

let requestCounter = 0;
let highestRenderedFullId = 0;
let highestRenderedRuinOnlyId = 0;
let lastKellyRuin = null;
const pendingStartTimes = new Map();

function reflectStateToControls() {
  els.winProb.value = String(Math.round(state.winProb * 100));
  els.winProbValue.textContent = `${Math.round(state.winProb * 100)}%`;
  els.payoutRatio.value = String(state.payoutRatio);
  els.payoutRatioValue.textContent = `${state.payoutRatio.toFixed(1)} : 1`;
  els.betFraction.value = String(Math.round(state.betFraction * 100));
  els.betFractionValue.textContent = `${Math.round(state.betFraction * 100)}%`;
  els.numPaths.value = String(state.numPaths);
  els.numPathsValue.textContent = state.numPaths.toLocaleString();
  els.numBets.value = String(state.numBets);
  els.numBetsValue.textContent = String(state.numBets);
  els.kellyToggle.setAttribute("aria-checked", String(state.useKelly));
}

reflectStateToControls();

for (const item of getLegendItems()) {
  const li = document.createElement("li");
  const swatch = document.createElement("span");
  swatch.className = "swatch";
  swatch.style.background = item.color;
  li.appendChild(swatch);
  li.appendChild(document.createTextNode(item.label));
  els.legend.appendChild(li);
}

function syncUrl() {
  const query = serializeStateToQuery(state);
  history.replaceState(null, "", `?${query}`);
}

function triggerSweep() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  els.sweep.classList.remove("is-sweeping");
  // eslint-disable-next-line no-unused-expressions
  els.sweep.offsetWidth; // force reflow so re-adding the class restarts the animation
  els.sweep.classList.add("is-sweeping");
}

let previousRuinText = "";
function renderOdometer(container, text) {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const chars = text.split("");
  const isFirstRender = container.children.length === 0;

  if (isFirstRender || prefersReduced || previousRuinText.length !== chars.length) {
    container.innerHTML = "";
    for (const ch of chars) {
      const digit = document.createElement("span");
      digit.className = "counter-digit";
      const face = document.createElement("span");
      face.className = "counter-digit-face is-current";
      face.textContent = ch;
      digit.appendChild(face);
      container.appendChild(digit);
    }
    previousRuinText = text;
    return;
  }

  for (let i = 0; i < chars.length; i++) {
    if (previousRuinText[i] === chars[i]) continue;
    const digit = container.children[i];
    const oldFace = digit.querySelector(".counter-digit-face");
    oldFace.classList.remove("is-current");
    oldFace.classList.add("is-exiting");
    const newFace = document.createElement("span");
    newFace.className = "counter-digit-face is-entering";
    newFace.textContent = chars[i];
    digit.appendChild(newFace);
    requestAnimationFrame(() => {
      newFace.classList.remove("is-entering");
      newFace.classList.add("is-current");
    });
    setTimeout(() => oldFace.remove(), 260);
  }
  previousRuinText = text;
}

function updateRuinCounter(riskOfRuin) {
  const pct = Math.round(riskOfRuin * 100);
  renderOdometer(els.ruinValue, `${pct}%`);
  els.counterChip.classList.toggle("is-danger", pct >= 25);
}

function renderKellyReadout() {
  const kFraction = kellyFraction(state.winProb, state.payoutRatio);
  const ruinText = lastKellyRuin === null ? "—" : `${Math.round(lastKellyRuin * 100)}%`;
  els.kellyReadout.textContent = `Kelly-optimal ${(kFraction * 100).toFixed(1)}% · ruin at Kelly ${ruinText}`;
}

function currentCanvasSize() {
  return sizeCanvasToDisplay(els.canvas);
}

let lastPaths = null;
let lastPercentileBands = null;

function redrawChart() {
  if (!lastPaths || !lastPercentileBands) return;
  const { width, height } = currentCanvasSize();
  const ctx = els.canvas.getContext("2d");
  drawFanChart(ctx, { width, height, paths: lastPaths, percentileBands: lastPercentileBands });
}

// Without this, a worker load failure (unsupported module workers, a 404 on
// a misconfigured subpath deploy) leaves the page silently stuck on its
// initial dash forever — no chart, no error, no clue why. Surface it.
worker.onerror = (event) => {
  console.error("Simulation worker failed:", event.message || event);
  els.computeTime.textContent = "Simulation engine failed to load — try reloading the page.";
  els.computeTime.classList.add("is-error");
  els.ruinValue.textContent = "ERR";
  els.counterChip.classList.add("is-danger");
};

// scheduleSimulation's rAF gate only limits how often a request is *sent* to
// one per frame — it says nothing about how long the worker takes to answer
// one. At the default 10,000 paths a full recompute can take several hundred
// ms (see docs/ARCHITECTURE.md perf notes), which is many frames' worth of
// slider "input" events. Without in-flight tracking, every one of those
// frames fires another postMessage, and since the worker processes its
// mailbox strictly in order, a 2-3 second drag can queue dozens of full
// simulations that then all have to run — one at a time — before the chart
// catches up to where the slider actually stopped, several seconds later.
// Track in-flight state per mode and coalesce to a single trailing rerun
// (using whatever `state` is *current* when the in-flight job finishes)
// instead of draining a backlog of stale intermediate frames.
let fullRequestInFlight = false;
let fullRerunPending = false;
let ruinOnlyRequestInFlight = false;
let ruinOnlyRerunPending = false;

worker.onmessage = (event) => {
  const data = event.data;
  if (data.mode === "full") {
    fullRequestInFlight = false;
    if (data.requestId >= highestRenderedFullId) {
      highestRenderedFullId = data.requestId;
      const meta = pendingStartTimes.get(data.requestId);
      pendingStartTimes.delete(data.requestId);
      lastPaths = data.rawSamples;
      lastPercentileBands = data.percentiles;
      redrawChart();
      updateRuinCounter(data.riskOfRuin);
      triggerSweep();
      if (meta) {
        const elapsed = performance.now() - meta.start;
        els.computeTime.textContent = `${meta.numPaths.toLocaleString()} paths simulated in ${elapsed.toFixed(0)}ms`;
      }
    }
    if (fullRerunPending) {
      fullRerunPending = false;
      sendFullRequest();
    }
  } else if (data.mode === "ruinOnly") {
    ruinOnlyRequestInFlight = false;
    if (data.requestId >= highestRenderedRuinOnlyId) {
      highestRenderedRuinOnlyId = data.requestId;
      lastKellyRuin = data.riskOfRuin;
      renderKellyReadout();
    }
    if (ruinOnlyRerunPending) {
      ruinOnlyRerunPending = false;
      sendRuinOnlyRequestIfEdgeChanged();
    }
  }
};

// The Kelly-vs-manual comparison only depends on winProb/payoutRatio (the
// edge), not on bet size, path count, or bets-per-path — so it's skipped
// unless the edge actually changed. Dragging the bet-size slider (the wow
// moment) would otherwise pay for a second full 10,000-path simulation on
// every frame for a number that hasn't moved.
let lastKellyEdgeKey = null;

function sendFullRequest() {
  if (fullRequestInFlight) {
    fullRerunPending = true;
    return;
  }
  fullRequestInFlight = true;
  const betFraction = state.useKelly ? kellyFraction(state.winProb, state.payoutRatio) : state.betFraction;
  const fullRequestId = ++requestCounter;
  pendingStartTimes.set(fullRequestId, { start: performance.now(), numPaths: state.numPaths });
  worker.postMessage({
    requestId: fullRequestId,
    mode: "full",
    numPaths: state.numPaths,
    numBets: state.numBets,
    winProb: state.winProb,
    payoutRatio: state.payoutRatio,
    betFraction,
  });
}

function sendRuinOnlyRequestIfEdgeChanged() {
  const edgeKey = `${state.winProb}:${state.payoutRatio}:${state.numPaths}:${state.numBets}`;
  if (edgeKey === lastKellyEdgeKey) return;
  if (ruinOnlyRequestInFlight) {
    ruinOnlyRerunPending = true;
    return;
  }
  lastKellyEdgeKey = edgeKey;
  ruinOnlyRequestInFlight = true;
  const kellyOnlyRequestId = ++requestCounter;
  worker.postMessage({
    requestId: kellyOnlyRequestId,
    mode: "ruinOnly",
    numPaths: state.numPaths,
    numBets: state.numBets,
    winProb: state.winProb,
    payoutRatio: state.payoutRatio,
    betFraction: kellyFraction(state.winProb, state.payoutRatio),
  });
}

function requestSimulation() {
  sendFullRequest();
  sendRuinOnlyRequestIfEdgeChanged();
}

let frameScheduled = false;
function scheduleSimulation() {
  if (frameScheduled) return;
  frameScheduled = true;
  requestAnimationFrame(() => {
    frameScheduled = false;
    requestSimulation();
  });
}

els.winProb.addEventListener("input", () => {
  state.winProb = Number(els.winProb.value) / 100;
  els.winProbValue.textContent = `${els.winProb.value}%`;
  if (state.useKelly) state.betFraction = kellyFraction(state.winProb, state.payoutRatio);
  reflectStateToControls();
  renderKellyReadout();
  syncUrl();
  scheduleSimulation();
});

els.payoutRatio.addEventListener("input", () => {
  state.payoutRatio = Number(els.payoutRatio.value);
  els.payoutRatioValue.textContent = `${state.payoutRatio.toFixed(1)} : 1`;
  if (state.useKelly) state.betFraction = kellyFraction(state.winProb, state.payoutRatio);
  reflectStateToControls();
  renderKellyReadout();
  syncUrl();
  scheduleSimulation();
});

els.betFraction.addEventListener("input", () => {
  state.betFraction = Number(els.betFraction.value) / 100;
  state.useKelly = false;
  els.betFractionValue.textContent = `${els.betFraction.value}%`;
  els.kellyToggle.setAttribute("aria-checked", "false");
  syncUrl();
  scheduleSimulation();
});

els.numPaths.addEventListener("input", () => {
  state.numPaths = Number(els.numPaths.value);
  els.numPathsValue.textContent = state.numPaths.toLocaleString();
  syncUrl();
  scheduleSimulation();
});

els.numBets.addEventListener("input", () => {
  state.numBets = Number(els.numBets.value);
  els.numBetsValue.textContent = String(state.numBets);
  syncUrl();
  scheduleSimulation();
});

els.kellyToggle.addEventListener("click", () => {
  state.useKelly = !state.useKelly;
  if (state.useKelly) {
    state.betFraction = kellyFraction(state.winProb, state.payoutRatio);
  }
  reflectStateToControls();
  syncUrl();
  scheduleSimulation();
});

window.addEventListener("resize", () => {
  redrawChart();
});

renderKellyReadout();
requestSimulation();
