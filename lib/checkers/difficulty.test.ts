import { describe, it, expect } from 'vitest';
import { difficultyToEngineOptions, SUGGESTION_ENGINE_OPTIONS } from './difficulty';

describe('difficultyToEngineOptions', () => {
  it('returns facil options', () => {
    expect(difficultyToEngineOptions('facil')).toEqual({ maxDepth: 3, timeBudgetMs: 200, randomness: 0.8 });
  });

  it('returns medio options', () => {
    expect(difficultyToEngineOptions('medio')).toEqual({ maxDepth: 6, timeBudgetMs: 600, randomness: 0.35 });
  });

  it('returns dificil options with zero randomness (always the best move)', () => {
    expect(difficultyToEngineOptions('dificil')).toEqual({ maxDepth: 10, timeBudgetMs: 1800, randomness: 0 });
  });
});

describe('SUGGESTION_ENGINE_OPTIONS', () => {
  it('is a full-strength, deterministic configuration independent of any Difficulty', () => {
    expect(SUGGESTION_ENGINE_OPTIONS).toEqual({ maxDepth: 10, timeBudgetMs: 1800, randomness: 0 });
  });
});
