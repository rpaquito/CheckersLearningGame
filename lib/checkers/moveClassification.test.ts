import { describe, it, expect } from 'vitest';
import { evalLoss, classifyMove } from './moveClassification';

describe('evalLoss', () => {
  it('is zero when the played move matches the best move', () => {
    expect(evalLoss(50, 50)).toBe(0);
  });

  it('is the difference when the played move is worse', () => {
    expect(evalLoss(50, 10)).toBe(40);
  });

  it('never goes negative when the played move is better than the reference', () => {
    expect(evalLoss(50, 80)).toBe(0);
  });
});

describe('classifyMove', () => {
  it('classifies 0 loss as a good move', () => {
    expect(classifyMove(0)).toBe('boa');
  });

  it('classifies exactly 15 loss as a good move', () => {
    expect(classifyMove(15)).toBe('boa');
  });

  it('classifies 16 loss as an imprecision', () => {
    expect(classifyMove(16)).toBe('imprecisao');
  });

  it('classifies exactly 50 loss as an imprecision', () => {
    expect(classifyMove(50)).toBe('imprecisao');
  });

  it('classifies 51 loss as a mistake', () => {
    expect(classifyMove(51)).toBe('erro');
  });

  it('throws for a negative loss', () => {
    expect(() => classifyMove(-1)).toThrow(RangeError);
  });
});
