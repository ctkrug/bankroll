# ADR 0002: Static site, no backend

## Status

Accepted

## Context

Every input to the simulation (edge, win rate, bet size, path count) is supplied by the user in
their own browser, and the simulation itself is pure arithmetic with no external data dependency.
There's nothing here that requires a server: no persistence, no auth, no shared state across
users.

## Decision

Ship Bankroll as a fully static site — `index.html` plus JavaScript modules and CSS, no backend,
no database, no build step required to serve it. All asset references use relative paths so the
site works when hosted at a subpath (e.g. `apps.charliekrug.com/bankroll`), not just at a domain
root.

## Consequences

- Zero hosting cost and zero server-side attack surface — the site is just files behind a CDN or
  static file server.
- Shareable state (a planned feature, see `docs/BACKLOG.md` story 3.2) must live in the URL query
  string rather than a database, since there's nowhere server-side to store it.
- If a future feature needs persistence across devices or users (e.g. saved scenarios with
  accounts), that would require introducing a backend and revisiting this decision.
