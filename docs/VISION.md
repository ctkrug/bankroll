# Vision — Bankroll

## The problem

Anyone staking money on a repeated positive-edge proposition — a sports bettor, a systematic
trader, a poker player moving up in stakes — has to answer one question they usually answer by
gut feel: *how much of my bankroll should I risk per bet?* The math behind that question (the
Kelly criterion, and the variance a betting strategy actually produces) is well understood, but
it's locked in spreadsheets and academic papers. Nobody *feels* the difference between "10% of
bankroll per bet" and "the Kelly-optimal 4%" until they've lived through both, and living through
either takes months or years of real money on the line.

A single expected-value number ("+5% per bet on average") actively hides the danger: a
positive-edge strategy sized too aggressively can go bust with high probability even though its
expected value looks great on paper. The only way to make that visible is to show the *spread* of
outcomes, not just the mean.

## Who it's for

- **Sports bettors** who have a perceived edge and are guessing at stake sizing
- **Retail/systematic traders** stress-testing a position-sizing rule before risking real capital
- **Poker players and students of probability** who want intuition for variance and ruin, not a
  textbook derivation

None of these people want to read a paper on the Kelly criterion. They want to move a slider and
see their future.

## The core idea

Run the bet **10,000 times, independently, in parallel simulated universes**, all starting from
the same bankroll, same edge, same win rate. Plot every one of those 10,000 equity curves at
once as a fan chart. The width of the fan *is* the risk. The fraction of the fan that hits zero
*is* the risk of ruin. Moving the bet-size slider redraws the fan and updates the ruin counter in
real time, so cause and effect are inseparable in the user's mind — bigger bets, wider fan, higher
ruin, immediately, visibly, every time.

The Kelly criterion isn't introduced as a formula — it's introduced as a *toggle* that reshapes
the fan chart the user is already looking at, at the same edge. That's the "aha": same expected
value, dramatically different risk of ruin, purely from sizing.

## Key design decisions

- **Simulation runs in a Web Worker**, not the main thread. 10,000 paths × up to a few hundred
  bets per path is enough arithmetic that doing it synchronously would stall slider dragging —
  and stalled sliders would kill the "live" feeling that's the entire point of the product.
- **Ruin is a threshold, not exact zero.** Fractional (proportional) betting decays bankroll
  multiplicatively, so it approaches zero asymptotically and floating-point math never lands on
  an exact 0. `RUIN_THRESHOLD` in `src/sim.js` treats "close enough to broke" as ruined.
- **Pure functions for the math, isolated from the worker and the DOM** (`src/sim.js`). This
  keeps the core simulation testable under Node's built-in test runner without a browser, and
  reusable if the rendering layer changes later.
- **No backend, no build step required to run it.** The whole thing ships as static files
  (`index.html` + `src/*.js` + `src/styles.css`) so it can be hosted from any static host or
  subpath (`apps.charliekrug.com/bankroll`) with zero infrastructure.
- **Kelly is a first-class input, not a footnote.** The UI treats "size manually" and "size by
  Kelly fraction" as two modes of the same slider, not a separate calculator bolted on the side.

## What "v1 done" looks like

- Sliders for edge (win probability + payout ratio), bet size, number of bets per path, and
  number of simulated paths, all live-updating the simulation.
- A fan chart rendering all simulated equity paths, redrawn within a frame or two of any slider
  change.
- A prominent, continuously-updating risk-of-ruin readout.
- A Kelly-fraction toggle/overlay that shows the optimal sizing against the manual setting at the
  same edge, and lets the user snap to it.
- Percentile bands (5th/25th/50th/75th/95th) overlaid on the raw path fan so the distribution
  reads clearly even at 10,000 overlapping lines.
- The full experience (sliders → 10k-path simulation → fan chart → ruin counter) working
  smoothly on both a 1440px desktop and a 390px phone screen, per `docs/DESIGN.md`.
- Green CI (tests + lint) on every push, and the site deployable as a static bundle with no
  server-side component.
