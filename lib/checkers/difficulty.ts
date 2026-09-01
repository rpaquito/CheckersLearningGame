export type Difficulty = 'facil' | 'medio' | 'dificil';

export interface EngineOptions {
  maxDepth: number;
  timeBudgetMs: number;
  // 0 = always play the engine's single best-scoring candidate move. Above
  // 0, a weighted-random pick among the top-scoring root candidates (see
  // selectMove.ts) -- makes lower difficulties feel like an imperfect human
  // opponent instead of a depth-capped engine that still finds its best
  // idea every single time.
  randomness: number;
}

// Provisional numbers from the design spec (§3) -- write these as a first
// guess, then adjust based on how the AI actually plays/feels in manual
// testing. Not treated as final without playing a few games.
const DIFFICULTY_OPTIONS: Record<Difficulty, EngineOptions> = {
  facil: { maxDepth: 3, timeBudgetMs: 200, randomness: 0.8 },
  medio: { maxDepth: 6, timeBudgetMs: 600, randomness: 0.35 },
  dificil: { maxDepth: 10, timeBudgetMs: 1800, randomness: 0 },
};

export function difficultyToEngineOptions(difficulty: Difficulty): EngineOptions {
  return DIFFICULTY_OPTIONS[difficulty];
}
