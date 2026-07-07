# ADR 0001: Vanilla JavaScript, no framework

## Status

Accepted

## Context

Bankroll's entire UI surface is a handful of sliders, a canvas fan chart, and a numeric readout.
There's no routing, no complex component tree, and no shared state beyond "the current scenario
inputs and the latest simulation result."

## Decision

Build the UI in vanilla JavaScript with the DOM API directly, rather than pulling in React, Vue,
or a similar framework.

## Consequences

- Zero framework runtime to ship, load, or keep patched — smaller bundle, faster first paint.
- No build step is required to run the site locally or in CI; `index.html` can be opened or
  served as-is.
- State management stays manual (a plain object plus direct DOM updates), which is appropriate
  at this scale but would need revisiting if the UI's complexity grows substantially (e.g. many
  interdependent panels or client-side routing).
