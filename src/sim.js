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
