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
