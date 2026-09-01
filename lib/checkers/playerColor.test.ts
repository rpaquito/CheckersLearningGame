import { describe, it, expect } from 'vitest';
import { resolvePlayerColor } from './playerColor';

describe('resolvePlayerColor', () => {
  it('returns b unchanged', () => {
    expect(resolvePlayerColor('b')).toBe('b');
  });

  it('returns w unchanged', () => {
    expect(resolvePlayerColor('w')).toBe('w');
  });

  it('resolves random to b when the draw is below 0.5', () => {
    expect(resolvePlayerColor('random', () => 0.2)).toBe('b');
  });

  it('resolves random to w when the draw is 0.5 or above', () => {
    expect(resolvePlayerColor('random', () => 0.7)).toBe('w');
  });
});
