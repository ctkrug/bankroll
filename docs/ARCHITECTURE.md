# Architecture — Bankroll

A concise map of the codebase for anyone (including a future build/QA pass) picking this up cold.

## Data flow

```
slider input (main.js)
  -> state updated, URL query synced, worker.postMessage()
       -> src/worker.js: runMonteCarlo + computePercentiles + samplePaths (src/sim.js)
       <- { riskOfRuin, rawSamples, percentiles }  (transferred, not cloned)
  -> main.js: redraws canvas (src/chart.js), rolls the ruin counter, triggers the sweep
```

Every slider change also fires a cheap, separate `ruinOnly` worker request (only when the *edge*
— win probability or payout ratio — actually changed) to drive the "ruin at Kelly" comparison
readout, independent of whatever bet size the user has manually selected.

## Modules

- **`src/sim.js`** — pure Monte-Carlo math, no DOM/worker plumbing. Runs identically under Node
  tests and inside the worker.
  - `kellyFraction(winProb, payoutRatio)` — Kelly-optimal bet fraction, clamped to `[0, 1]`.
  - `simulatePath(...)` — one equity path as a `Float64Array`; used directly by
    `estimateRiskOfRuin` and by tests.
  - `runMonteCarlo({...})` — the core simulation. Returns `{ columns, numPaths, numSteps,
    riskOfRuin }` where `columns` is a **column-major** flat `Float64Array`
    (`columns[step * numPaths + i]` = path `i`'s bankroll at `step`). Column-major, not one
    `Float64Array` per path, because percentile extraction (below) needs "every path's value at
    step S" as a contiguous slice — the array-of-paths layout made that a ~10,000-way scattered
    gather and was the single biggest cost in a slider-drag recompute.
  - `extractPath` / `samplePaths` — pull individual (or an evenly-spaced sample of) path
    trajectories back out of a column-major buffer, for rendering.
  - `estimateRiskOfRuin({...})` — same simulation, discards paths, returns only the scalar. Used
    for the Kelly comparison so it doesn't pay for a second full path/percentile allocation.
  - `computePercentiles({ columns, numPaths, numSteps }, percentiles)` — per-time-step percentile
    bands (default 5/25/50/75/95), nearest-rank interpolated. Sorts a *copy* of each step's
    column, never `columns` itself (sorting in place would scramble path identity for every other
    step).

- **`src/worker.js`** — the Web Worker entry point. `buildResponse(data)` is exported standalone
  (testable under Node without a `self`/Worker context) and does the actual work; `self.onmessage`
  is only wired up when a worker global exists. The full column-major buffer (~8MB at 10,000
  paths × 100 bets) never leaves the worker — only a bounded sample (≤400 lines) of raw
  trajectories plus the percentile bands cross `postMessage`, passed as **transferables** to avoid
  a structured-clone copy.

- **`src/chart.js`** — `<canvas>` rendering. `sizeCanvasToDisplay` handles devicePixelRatio-aware
  sizing (crisp on retina, recomputed on resize). `computeYDomain` (log-scaled, since fractional
  betting is multiplicative) and `getLegendItems` are pure and unit-tested; `drawFanChart` is the
  thin, untested-by-design layer that turns pre-sampled paths + percentile bands into `ctx` calls.

- **`src/urlState.js`** — pure `serializeStateToQuery` / `parseStateFromQuery` pair for the
  shareable-link feature. Malformed or out-of-range query values fall back to `DEFAULT_STATE`
  field-by-field rather than rejecting the whole URL. Each field's clamp range must match its
  slider's `min`/`max` in `index.html` exactly — a wider clamp lets a shared URL produce state a
  slider can't visually represent (it renders pinned at its own max while the label, driven from
  state rather than the input, shows the real value). `tests/urlState-sliderSync.test.js` reads
  `index.html` at test time and asserts this, so a slider range change without a matching clamp
  update fails the suite instead of drifting silently.

- **`src/main.js`** — DOM wiring only: reads/writes the sliders, owns `state`, debounces worker
  requests to one in flight per animation frame (`scheduleSimulation`), renders the odometer-style
  risk-of-ruin counter and the recompute "sweep" animation, and keeps the URL in sync via
  `history.replaceState`. `worker.onerror` surfaces a danger-styled message in place of the
  compute-time readout if the worker fails to load, so a module-worker-unsupported browser or a
  misconfigured subpath deploy degrades to a visible error instead of a silently stuck page.

- **`src/styles.css`** — the blueprint/technical direction from `docs/DESIGN.md`: tokens, themed
  range sliders and toggle switch, the two-column desktop / stacked-phone layout, and a
  `prefers-reduced-motion` block that disables the digit-roll and sweep animations.

## Performance notes

A full recompute at the default 10,000 paths × 100 bets is meaningfully heavier than a single
animation frame in this project's dev/CI sandbox (measured several hundred ms in a headless,
containerized browser) — real, non-containerized browser hardware should do better, and the
adjustable path-count control (down to 1,000) is the documented escape hatch for slower devices,
where a full recompute drops to tens of ms. `scheduleSimulation`'s per-frame debounce means rapid
dragging never queues up more than one pending request, so the UI stays responsive even when a
single recompute takes longer than 16ms.

## Running it

- `npm start` — serves the static site at `http://localhost:8080` (no build step).
- `npm test` — runs `tests/*.test.js` under Node's built-in test runner.
- `npm run lint` — `node --check`s every `src/*.js` module.
