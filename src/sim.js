// Pure Monte-Carlo bankroll simulation math. No DOM, no worker plumbing —
// kept isolated here so it can run identically in the worker and in tests.

/**
 * Kelly fraction for a binary bet: probability `p` of winning, paying out
 * `b` units per unit staked on a win, -1 unit on a loss.
 * f* = (bp - q) / b, where q = 1 - p. Clamped to [0, 1] (never bet negative
 * or leverage beyond full bankroll).
 */
export function kellyFraction(winProb, payoutRatio) {
  const q = 1 - winProb;
  const f = (payoutRatio * winProb - q) / payoutRatio;
  return Math.max(0, Math.min(1, f));
}

// Below this fraction of starting bankroll, a path is considered ruined.
// Fractional betting decays multiplicatively and never hits exact 0, so
// ruin needs a threshold rather than an equality check.
const RUIN_THRESHOLD = 1e-6;

/**
 * Simulate one equity path of `numBets` sequential wagers, staking
 * `betFraction` of current bankroll each time, starting from bankroll 1.0.
 * Returns the bankroll after each bet (length numBets + 1, path[0] === 1).
 * A path that decays below RUIN_THRESHOLD is clamped to 0 and stays there.
 */
export function simulatePath(numBets, winProb, payoutRatio, betFraction, rng = Math.random) {
  const path = new Float64Array(numBets + 1);
  path[0] = 1;
  for (let i = 0; i < numBets; i++) {
    const prev = path[i];
    if (prev <= RUIN_THRESHOLD) {
      path[i + 1] = 0;
      continue;
    }
    const stake = prev * betFraction;
    const won = rng() < winProb;
    path[i + 1] = won ? prev + stake * payoutRatio : prev - stake;
  }
  return path;
}

/**
 * Run `numPaths` independent simulations and return { paths, riskOfRuin }.
 * riskOfRuin is the fraction of paths whose final bankroll is at or below
 * RUIN_THRESHOLD (see simulatePath for why this isn't a strict 0 check).
 */
export function runMonteCarlo({ numPaths, numBets, winProb, payoutRatio, betFraction, rng = Math.random }) {
  const paths = new Array(numPaths);
  let ruinCount = 0;
  for (let i = 0; i < numPaths; i++) {
    const path = simulatePath(numBets, winProb, payoutRatio, betFraction, rng);
    if (path[path.length - 1] <= RUIN_THRESHOLD) ruinCount++;
    paths[i] = path;
  }
  return { paths, riskOfRuin: ruinCount / numPaths };
}

/**
 * Same simulation as runMonteCarlo but discards each path immediately after
 * checking it for ruin. Used for the Kelly-vs-manual comparison readout,
 * which only needs the scalar riskOfRuin and would otherwise double the
 * per-recompute allocation of a second full 10,000-path array set.
 */
export function estimateRiskOfRuin({ numPaths, numBets, winProb, payoutRatio, betFraction, rng = Math.random }) {
  let ruinCount = 0;
  for (let i = 0; i < numPaths; i++) {
    const path = simulatePath(numBets, winProb, payoutRatio, betFraction, rng);
    if (path[path.length - 1] <= RUIN_THRESHOLD) ruinCount++;
  }
  return ruinCount / numPaths;
}

// Default percentile bands drawn over the raw fan (5th/25th/50th/75th/95th).
export const DEFAULT_PERCENTILES = [5, 25, 50, 75, 95];

/**
 * Compute percentile bands across a set of equal-length equity paths, one
 * value per percentile per time step. Returns a Map from percentile number
 * to a Float64Array of length numBets + 1, so the fan chart can draw a
 * distinct line per band without re-sorting on every redraw of the raw fan.
 * Uses nearest-rank interpolation between the two closest sorted samples.
 */
export function computePercentiles(paths, percentiles = DEFAULT_PERCENTILES) {
  if (paths.length === 0) {
    return new Map(percentiles.map((p) => [p, new Float64Array(0)]));
  }
  const numSteps = paths[0].length;
  const bands = new Map(percentiles.map((p) => [p, new Float64Array(numSteps)]));
  const column = new Float64Array(paths.length);
  for (let step = 0; step < numSteps; step++) {
    for (let i = 0; i < paths.length; i++) {
      column[i] = paths[i][step];
    }
    column.sort();
    for (const p of percentiles) {
      const rank = (p / 100) * (column.length - 1);
      const lower = Math.floor(rank);
      const upper = Math.ceil(rank);
      const weight = rank - lower;
      const value = column[lower] + (column[upper] - column[lower]) * weight;
      bands.get(p)[step] = value;
    }
  }
  return bands;
}
