---
title: "Building Bankroll: making 10,000 Monte-Carlo paths feel live in the browser"
published: false
tags: javascript, webdev, dataviz, performance
---

I bet on sports occasionally, and like most people who do, I used to size my bets by feel. The
math that says how much you *should* stake (the Kelly criterion, and the risk of ruin that comes
with betting more than it) is well understood, but it lives in spreadsheets and papers. You never
actually feel the difference between "10% of my bankroll per bet" and "the Kelly-optimal 4%" until
it is your money on the line.

So I built [Bankroll](https://apps.charliekrug.com/bankroll/): set your win probability, payout
ratio, and bet size, and it runs 10,000 Monte-Carlo equity paths and draws them as a fan chart,
with a risk-of-ruin counter that updates the instant you move a slider. It is a static page, no
backend, no account. Here are the two decisions that made it interesting to build.

## 1. Column-major storage for the path set

The naive layout for 10,000 simulated paths of 100 bets each is an array of 10,000 `Float64Array`s.
That is fine to generate, but the chart does not want "one path at a time." To draw the percentile
bands (the 5th/25th/50th/75th/95th lines), you need *every path's value at a single time step*, for
every step. With an array-of-paths, that is a 10,000-way scattered gather: one cache-cold read per
path, per step, per redraw.

I flipped it. The whole run is one flat `Float64Array` in column-major order, so
`columns[step * numPaths + i]` is path `i`'s bankroll at `step`. Now "every path's value at step S"
is a contiguous slice you can copy and sort directly. That one change roughly halved the
full-recompute time in my measurements, because the percentile pass stopped thrashing the cache.
Pulling an individual path back out for the raw fan is the slower direction now, but you only render
a bounded sample of a few hundred lines, so it does not matter.

One trap worth calling out: to compute percentiles you sort each step's column, and you have to sort
a *copy*. Sorting the shared buffer in place would scramble which value belongs to which path at
that step, quietly corrupting every other path's trajectory for the raw fan.

## 2. Coalescing worker requests instead of queuing them

The simulation runs in a Web Worker so the sliders stay responsive. My first version debounced work
to one request per animation frame, which felt right until I actually dragged a slider for a few
seconds.

The problem: a full 10,000-path recompute takes longer than a single frame, and a Worker processes
its message queue strictly in order. So a three-second drag posted dozens of full simulations, and
the worker then had to grind through every stale intermediate frame before it ever reached the state
the slider actually stopped at. The chart lagged for several seconds after I let go.

The fix was to stop thinking about it as a queue. I track an in-flight flag per request type, and if
a request arrives while one is running, I do not enqueue it, I just set a "rerun pending" bit. When
the in-flight job finishes, I fire exactly one more request using whatever the current slider state
is. No backlog, no stale frames, and the chart snaps to where you actually stopped. A Playwright
repro that used to show ~8 seconds of lag after a drag now settles immediately.

## What I would do differently

Computing percentiles by fully sorting each step's column is more work than needed. I only want five
fixed quantiles, so a `quickselect` (partial selection) per percentile would beat a full sort,
especially at high path counts. I also lean on `Float64Array.prototype.sort` being numeric by
default (unlike `Array.prototype.sort`), which is correct but easy to forget. If I pushed path counts
higher, I would move the whole engine to WebAssembly.

The whole thing is vanilla JavaScript, no framework, and the simulation math is a pure module with
no DOM or worker dependencies so it tests cleanly under Node.

Live demo: [apps.charliekrug.com/bankroll](https://apps.charliekrug.com/bankroll/)
Source: [github.com/ctkrug/bankroll](https://github.com/ctkrug/bankroll)

If you size bets or positions against an edge, I would genuinely like to know whether the risk-of-ruin
number matches your intuition or breaks it.
