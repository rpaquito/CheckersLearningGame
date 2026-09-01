export interface MoveCandidate<T> {
  move: T;
  score: number; // from the perspective of whoever is choosing; higher is better
}

// Scales `randomness` (0-1) into a softmax temperature. At the top of the
// range (randomness 1), a real evaluation-scale gap between two candidates
// still leaves the weaker one a real (if minority) chance of being picked;
// near 0, even a small gap makes the weaker candidate's weight negligible.
const MAX_TEMPERATURE = 200;

// Picks one move out of the engine's top candidates, weighted toward better
// moves but not always the single best one -- this is what makes lower
// difficulties feel like an imperfect human instead of a depth-capped
// engine that still finds its best idea every time. `randomness` 0 always
// returns candidates[0] (the caller must have it sorted best-first);
// `random` is injectable for deterministic tests.
//
// Ported from Chess Sensei's lib/chess/selectMove.ts's selectWeightedMove,
// generalized from a UCI move string to a generic T -- the weighting
// algorithm itself is unchanged.
export function selectWeightedMove<T>(
  candidates: MoveCandidate<T>[],
  randomness: number,
  random: () => number = Math.random
): T {
  if (candidates.length <= 1 || randomness <= 0) {
    return candidates[0].move;
  }

  const temperature = randomness * MAX_TEMPERATURE;
  const bestScore = Math.max(...candidates.map((c) => c.score));
  const weights = candidates.map((c) => Math.exp((c.score - bestScore) / temperature));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  const draw = random() * totalWeight;
  let cumulative = 0;
  for (let i = 0; i < candidates.length; i++) {
    cumulative += weights[i];
    if (draw < cumulative) return candidates[i].move;
  }
  return candidates[candidates.length - 1].move;
}
