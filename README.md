# Bankroll

**Set your edge. Run 10,000 futures. See your real risk of ruin.**

Bankroll is a live Monte-Carlo bankroll simulator for bettors, traders, and anyone who has ever
argued about bet sizing. Dial in your edge, win rate, and stake size, and watch 10,000 simulated
equity paths fan out in real time — with a running "risk of ruin" counter that reacts the instant
you move a slider. Nudge the Kelly fraction and watch the whole distribution reshape: tighter,
safer, or one hot streak from disaster.

This isn't a spreadsheet. It's the intuition a spreadsheet can't give you.

## Why

Most bettors and small traders reason about edge and bankroll management informally — "I have a
good win rate, so I should be fine." That reasoning ignores variance entirely. A positive-edge
strategy sized too aggressively can still go bust with high probability; the same edge sized by
the Kelly criterion can be nearly bulletproof. The only way to *feel* that difference is to see
thousands of possible futures side by side, not compute a single expected value.

Bankroll makes the variance visible. It's built for:

- **Sports bettors** sizing wagers against a perceived edge
- **Retail traders** stress-testing a position-sizing rule
- **Students of probability** who want quant intuition without the math department

## How it works

1. Set your **edge** (expected value per unit staked), **win probability**, and **bet size**
   (as a fraction of bankroll, or derived from the Kelly criterion).
2. A Web Worker runs **10,000 independent Monte-Carlo equity paths** off the main thread, so the
   UI never stutters even at high path counts.
3. The paths render as a live fan chart — the full distribution of outcomes, not just the mean.
4. A **risk of ruin** counter (percentage of paths that hit zero bankroll) updates continuously
   as you move any slider.
5. A **Kelly overlay** shows how the optimal fraction reshapes the fan — narrower, and with a
   dramatically lower ruin probability, at the same expected edge.

## Planned features

- Interactive sliders for edge, win rate, bet size, and number of bets per path
- Real-time 10,000-path Monte-Carlo fan chart rendered on `<canvas>`, computed in a Web Worker
- Live risk-of-ruin counter with smooth transitions on every input change
- Kelly-optimal bet size calculation with a toggle to overlay it against the manual setting
- Percentile bands (5th/25th/50th/75th/95th) drawn over the raw path fan
- Shareable state via URL query parameters
- Fully static, zero-backend deployment (works from any CDN or subpath)

## Stack

- **Vanilla JavaScript**, no framework — a Web Worker for the simulation engine, `<canvas>` for
  rendering
- Build tooling kept minimal (see `package.json`); no server component — ships as a static site
- Tests run under Node's built-in test runner against the pure simulation/statistics functions

## Status

Early scaffold. See [`docs/VISION.md`](docs/VISION.md) for the full design rationale and
[`docs/BACKLOG.md`](docs/BACKLOG.md) for the build plan.

## License

MIT — see [`LICENSE`](LICENSE).
