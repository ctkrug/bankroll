# Backlog — Bankroll

Stories are marked `[ ]` (not started). Each has verifiable acceptance criteria — concrete
checks, not vibes. Epic 1's first story is the wow moment; it lands before anything else.

## Epic 1 — Live Monte-Carlo fan chart (the wow moment)

- [x] **1.1 Wow moment: dragging bet size live-redraws the fan and the ruin counter**
  - Dragging the bet-size slider triggers a new 10,000-path simulation and a full fan-chart
    redraw within 2 animation frames (no visible stutter on a mid-range laptop).
  - The risk-of-ruin counter updates to match the new simulation's ruin percentage every time
    the slider value changes, with no stale reads.
  - Setting bet size to a small value (e.g. 1% of bankroll) and a large value (e.g. 50%) at the
    same edge produces visibly different fan widths and different displayed ruin percentages.

- [x] **1.2 Edge and win-rate controls drive the simulation**
  - Two controls exist: win probability (0–100%) and payout ratio (e.g. even money vs 2:1), and
    changing either re-runs the simulation.
  - Setting win probability below the breakeven rate for the given payout ratio (negative edge)
    results in a risk-of-ruin reading that increases as more bets are simulated per path.
  - Invalid combinations (e.g. win probability set to 0% or 100%) do not crash the simulation or
    freeze the UI.

- [x] **1.3 Adjustable path count and bets-per-path**
  - A control sets the number of simulated paths (default 10,000, selectable down to e.g. 1,000
    for low-power devices) and the number of bets per path (default 100).
  - Reducing path count visibly reduces computation time (measurable via a console timer or
    on-screen indicator) without changing the shape of the risk-of-ruin estimate by more than a
    few percentage points at 1,000+ paths.

- [x] **1.4 Fan chart renders crisply on canvas at any size**
  - The chart canvas is sized to `devicePixelRatio × CSS pixel size` so lines are crisp on retina
    displays (verified by inspecting canvas backing-store dimensions vs CSS dimensions).
  - Resizing the browser window (or rotating a phone) triggers a re-render at the new size with
    no stretching or blurring of existing content.

## Epic 2 — Kelly criterion overlay

- [x] **2.1 Kelly-optimal fraction is computed and displayed**
  - Given the current win probability and payout ratio, the Kelly-optimal bet fraction is
    computed via `kellyFraction()` and displayed as a labeled percentage next to the manual
    bet-size slider.
  - For a negative-edge scenario, the displayed Kelly fraction is 0% (never negative).

- [x] **2.2 "Snap to Kelly" toggle sets bet size to the Kelly fraction**
  - Activating the toggle sets the bet-size slider to the current Kelly-optimal value and
    re-runs the simulation.
  - Manually moving the bet-size slider afterward deactivates the toggle (the two controls never
    silently fight each other).

- [x] **2.3 Side-by-side ruin comparison: manual sizing vs Kelly sizing**
  - The UI shows both the risk of ruin at the user's current manual bet size and the risk of
    ruin at the Kelly-optimal size for the same edge, without requiring a second simulation run
    triggered by the user.
  - At the same edge, the Kelly-sized risk of ruin is always less than or equal to a manual size
    materially larger than Kelly (spot-checked against at least one worked example in a test).

## Epic 3 — Distribution clarity and design polish

- [x] **3.1 Percentile bands overlay the raw path fan**
  - 5th/25th/50th/75th/95th percentile lines are computed per time step across all simulated
    paths and drawn distinctly (e.g. bolder stroke) over the raw fan.
  - A legend identifies each percentile line's meaning.

- [x] **3.2 Shareable state via URL query parameters**
  - Changing any control updates the URL's query string (e.g. `?edge=0.55&bet=0.1`) without a
    full page reload.
  - Loading the page with a query string pre-fills the controls and runs the matching simulation
    on load.

- [x] **3.3 Design polish pass matches docs/DESIGN.md at desktop and phone widths**
  - The page is checked and adjusted at 390×844, 768×1024, and 1440×900: no horizontal scroll,
    no overlapping elements, fan chart remains the dominant visual element at every width.
  - Every interactive control (sliders, toggle, buttons) has a themed hover, focus-visible, and
    active state — no unstyled native widgets remain.

- [x] **3.4 Reduced motion and accessibility pass**
  - With `prefers-reduced-motion: reduce` set, the digit-roll and scanline animations are
    replaced with instant value updates; the simulation and readouts still function.
  - All sliders are operable via keyboard (arrow keys) and have visible focus outlines; the
    risk-of-ruin readout is in an ARIA live region so screen readers announce updates.

## Epic 4 — Ship hardening

- [x] **4.1 Input validation for edge-case slider values**
  - Setting bet size to 0% never divides by zero or produces `NaN` anywhere in the simulation
    output.
  - Setting number of bets per path to 0 returns a flat path at the starting bankroll with 0%
    risk of ruin, not an error.

- [x] **4.2 Static deploy readiness under a subpath**
  - All asset references (`src/...`, fonts, favicon) use relative paths, verified by serving the
    built site from a non-root path (e.g. `/bankroll/`) locally and confirming no 404s in the
    console.
  - `npm test` and `npm run lint` both pass with no build step required to serve the site.
