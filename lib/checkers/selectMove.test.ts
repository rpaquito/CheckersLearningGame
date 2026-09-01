import { describe, it, expect } from 'vitest';
import { selectWeightedMove } from './selectMove';

describe('selectWeightedMove', () => {
  it('always returns the single candidate when there is only one', () => {
    const move = selectWeightedMove([{ move: 'A', score: 20 }], 1, () => 0.999);
    expect(move).toBe('A');
  });

  it('always returns the best (first) candidate when randomness is 0', () => {
    const candidates = [
      { move: 'A', score: 100 },
      { move: 'B', score: -500 },
    ];
    // Even a random() that would favor the worse move at higher randomness
    // must not matter when randomness is 0.
    const move = selectWeightedMove(candidates, 0, () => 0.999);
    expect(move).toBe('A');
  });

  it('almost always returns the best candidate when randomness is very low', () => {
    const candidates = [
      { move: 'A', score: 100 },
      { move: 'B', score: 0 },
    ];
    const move = selectWeightedMove(candidates, 0.05, () => 0.99);
    expect(move).toBe('A');
  });

  it('can return a weaker candidate when randomness is high and the draw favors it', () => {
    const candidates = [
      { move: 'A', score: 100 },
      { move: 'B', score: 0 },
    ];
    const move = selectWeightedMove(candidates, 1, () => 0.9);
    expect(move).toBe('B');
  });
});
