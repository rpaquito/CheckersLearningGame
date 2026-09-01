import { describe, it, expect } from 'vitest';
import { describeGameEnd } from './gameEndMessage';

describe('describeGameEnd', () => {
  it('returns null for playing (game not over)', () => {
    expect(describeGameEnd('playing', 'local', 'b', 'b')).toBeNull();
  });

  describe('no-moves, ai mode', () => {
    it('is a loss when the human is the side with no moves', () => {
      const result = describeGameEnd('no-moves', 'ai', 'b', 'b');
      expect(result?.kind).toBe('lose');
    });

    it('is a win when the AI is the side with no moves', () => {
      const result = describeGameEnd('no-moves', 'ai', 'b', 'w');
      expect(result?.kind).toBe('win');
    });
  });

  describe('no-moves, local mode', () => {
    it('is always a win (for whichever color is not stuck), never a loss perspective', () => {
      const blackStuck = describeGameEnd('no-moves', 'local', 'b', 'b');
      const whiteStuck = describeGameEnd('no-moves', 'local', 'b', 'w');
      expect(blackStuck?.kind).toBe('win');
      expect(whiteStuck?.kind).toBe('win');
      expect(blackStuck?.title).not.toBe(whiteStuck?.title);
    });
  });

  it('classifies draw-repetition as a draw', () => {
    const result = describeGameEnd('draw-repetition', 'local', 'b', 'b');
    expect(result?.kind).toBe('draw');
    expect(result?.title).toContain('repetição');
  });

  it('classifies draw-no-capture as a draw with distinct wording from draw-repetition', () => {
    const repetition = describeGameEnd('draw-repetition', 'local', 'b', 'b');
    const noCapture = describeGameEnd('draw-no-capture', 'local', 'b', 'b');
    expect(noCapture?.kind).toBe('draw');
    expect(noCapture?.title).not.toBe(repetition?.title);
  });
});
