# Design — Bankroll

## Aesthetic direction

**Blueprint/technical.** Bankroll is a quant instrument, not a game or a toy — it should read
like a trading terminal crossed with an engineering blueprint: deep navy-ink background, fine
cyan gridlines, crosshair cursors, monospace numerics. The fan chart is drawn like a technical
schematic of thousands of possible futures, not a friendly infographic. Confidence through
precision, not warmth.

This direction is chosen deliberately against the "soft-depth glassy dark" and "dark gray cards"
look that's common in the portfolio to date — blueprint gives Bankroll its own visual family
(cyan-on-navy, grid-first, monospace-numeric) rather than another purple/violet dark dashboard.

## Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0a1420` | page background (deep blueprint navy) |
| `--surface-1` | `#0f1e2e` | panel background |
| `--surface-2` | `#152a3f` | raised panel / card background |
| `--text` | `#e8f4fb` | primary text |
| `--text-muted` | `#7a94a8` | secondary text, labels |
| `--accent` | `#40c4ff` | primary accent — cyan, gridlines, primary data series |
| `--accent-support` | `#ff8a3d` | support accent — Kelly overlay line, warnings |
| `--success` | `#3ddc97` | positive outcomes, survived paths |
| `--danger` | `#ff5c6c` | risk-of-ruin counter, ruined paths |
| Display font | `"JetBrains Mono"` (Google Fonts), fallback `ui-monospace, "SF Mono", monospace` | headings, wordmark, the risk-of-ruin counter |
| UI font | `"Inter"` (Google Fonts), fallback `system-ui, sans-serif` | body copy, labels, controls |
| Spacing unit | `8px` scale (8/16/24/32/48/64) | all margins/padding |
| Corner radius | `4px` panels, `2px` controls — sharp, drafting-table edges, never pill-shaped | |
| Shadow/glow | subtle `0 0 24px rgba(64,196,255,0.08)` glow on active panels; no drop shadows (flat blueprint, not skeuomorphic depth) | |
| Motion | UI transitions 150ms ease-out; the risk-of-ruin counter and fan chart redraw at 60–120ms tick on slider drag | |

Background carries a **fine cyan grid** (1px lines, ~24px pitch, 4% opacity) over the base navy,
plus a soft vignette darkening the corners — the "graph paper" that makes it read as technical
instrumentation rather than a flat color fill.

## Layout intent

**Desktop (1440×900):** two-column split. Left column (~30%, `--surface-1`) holds the control
panel — edge, win rate, bet size / Kelly toggle sliders, path count, bets-per-path — stacked
vertically with generous label spacing. Right column (~70%) is the hero: the fan chart fills the
full height, with the risk-of-ruin counter overlaid top-right in large monospace digits on a
`--surface-2` chip, and percentile band legend along the bottom edge.

**Phone (390×844):** single column, stacked top-to-bottom. The fan chart hero comes first
(≥60vh, full width) so it's the first thing seen; the risk-of-ruin counter sits as a fixed chip
pinned to the top of the chart. Controls scroll below in a single column, full-width sliders with
large touch targets (≥44px).

The fan chart (the viz) is always the largest single element on screen at every breakpoint — it
is the wow moment, so it never shares top billing with the controls.

## Signature detail

The **risk-of-ruin counter** is the signature flourish: oversized monospace digits (like a
terminal readout) that visibly tick/roll when the value changes, with a hairline cyan
"scanning" sweep animation across the fan chart on every recompute — reinforcing that a live
instrument just re-measured the future, not just redrawn a static chart.

## Juice plan (interactive feedback, not a game, but every input must feel alive)

- **Slider drag → recompute**: debounced to animation-frame granularity; the fan chart redraws
  incrementally so dragging feels continuous, never a stutter-then-snap.
- **Risk-of-ruin counter tick**: digit-roll transition (60–100ms per digit) whenever the value
  changes, plus a brief `--danger` flash on the counter chip when ruin crosses above 25%.
- **Fan chart sweep**: a thin cyan scanline animates left-to-right across the chart on each
  recompute (120ms), reinforcing "instrument just re-measured."
  Respect `prefers-reduced-motion`: replace the digit-roll and scanline with an instant value
  swap; keep all functional interactivity.
- No sound — this is an instrument, not a game; a silent, precise readout matches the direction.

Every future build/QA pass follows this file. Changes to direction or tokens get their own
commit explaining why.
