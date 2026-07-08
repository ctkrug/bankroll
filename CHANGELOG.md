# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Initial repository scaffold: README, MIT license, `.gitignore`.
- Core Monte-Carlo and Kelly-fraction simulation math (`src/sim.js`).
- Web Worker wiring to run simulations off the main thread (`src/worker.js`).
- Minimal UI scaffold proving the worker round-trip (`index.html`, `src/main.js`).
- Design direction and token brief (`docs/DESIGN.md`).
- Project vision (`docs/VISION.md`) and build backlog (`docs/BACKLOG.md`).
- CI workflow running tests and lint on push/PR.
- Live equity fan chart on `<canvas>`, with percentile bands (5/25/50/75/95) and a legend
  (`src/chart.js`).
- Full control panel: win probability, payout ratio, bet size, path count, and bets-per-path
  sliders, all driving the simulation live.
- Kelly-optimal fraction display, a "Snap to Kelly" toggle, and a side-by-side manual-vs-Kelly
  risk-of-ruin comparison.
- Odometer-style risk-of-ruin counter with a danger-flash chip and a fan-chart recompute
  scanline sweep, both disabled under `prefers-reduced-motion`.
- Shareable simulation state via URL query parameters (`src/urlState.js`).
- Two-column blueprint/technical layout (desktop) and stacked hero-first layout (phone) per
  `docs/DESIGN.md`, with themed sliders, toggle, and focus states throughout.
- `docs/ARCHITECTURE.md` codebase map.

### Changed
- `runMonteCarlo`/`computePercentiles` switched to column-major storage for the path set, roughly
  halving full-recompute latency by turning percentile extraction into a contiguous slice instead
  of a scattered gather.
- The worker now samples raw paths down to a bounded set before responding, and sends results as
  transferables, so the ~8MB full path buffer never crosses the main-thread boundary.

### Fixed
- `parseStateFromQuery` clamped `payoutRatio`/`numBets` to a wider range than their sliders'
  actual `min`/`max` in `index.html`, so an out-of-range shared URL left the slider rendered
  clamped at its own max while the adjacent label (driven from state) showed the real, larger
  value until that slider was next dragged.
- The main thread had no `worker.onerror` handler, so a simulation worker load failure left the
  page silently stuck on its initial dash forever with no chart and no explanation.
