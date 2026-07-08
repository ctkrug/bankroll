# Contributing

Bankroll is a small static site with no build step for the app itself. To work on it locally:

```sh
npm install      # installs devDependencies (needed for npm test)
npm test         # runs the sim/Kelly test suite
npm run lint     # syntax-checks the source files
npm start        # serves the site at http://localhost:8080
```

## Guidelines

- Keep the simulation math in `src/sim.js` free of DOM and worker dependencies so it stays
  testable under Node's built-in test runner.
- Any UI change should be checked against `docs/DESIGN.md` (tokens, layout intent, motion) before
  it's considered done.
- New behavior gets a test in `tests/`; new stories get acceptance criteria in
  `docs/BACKLOG.md` before they're built, not after.
