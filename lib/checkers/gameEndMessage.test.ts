import { describe, it, expect } from 'vitest';
import { describeGameEnd } from './gameEndMessage';

describe('describeGameEnd', () => {
  it('returns null for playing (game not over)', () => {
    expect(describeGameEnd('playing', 'local', 'b', 'b', 'pt')).toBeNull();
  });

  describe('no-moves, ai mode', () => {
    it('is a loss when the human is the side with no moves', () => {
      const result = describeGameEnd('no-moves', 'ai', 'b', 'b', 'pt');
      expect(result?.kind).toBe('lose');
    });

    it('is a win when the AI is the side with no moves', () => {
      const result = describeGameEnd('no-moves', 'ai', 'b', 'w', 'pt');
      expect(result?.kind).toBe('win');
    });
  });

  describe('no-moves, local mode', () => {
    it('is always a win (for whichever color is not stuck), never a loss perspective', () => {
      const blackStuck = describeGameEnd('no-moves', 'local', 'b', 'b', 'pt');
      const whiteStuck = describeGameEnd('no-moves', 'local', 'b', 'w', 'pt');
      expect(blackStuck?.kind).toBe('win');
      expect(whiteStuck?.kind).toBe('win');
      expect(blackStuck?.title).not.toBe(whiteStuck?.title);
    });
  });

  it('classifies draw-repetition as a draw', () => {
    const result = describeGameEnd('draw-repetition', 'local', 'b', 'b', 'pt');
    expect(result?.kind).toBe('draw');
    expect(result?.title).toBe('Empate por repetição de posição');
  });

  it('classifies draw-no-capture as a draw with distinct wording from draw-repetition', () => {
    const repetition = describeGameEnd('draw-repetition', 'local', 'b', 'b', 'pt');
    const noCapture = describeGameEnd('draw-no-capture', 'local', 'b', 'b', 'pt');
    expect(noCapture?.kind).toBe('draw');
    expect(noCapture?.title).not.toBe(repetition?.title);
  });

  describe('locale', () => {
    it('returns English text when locale is "en"', () => {
      const result = describeGameEnd('no-moves', 'ai', 'b', 'b', 'en');
      expect(result?.title).toBe('You lost — no moves available');
    });

    it('returns different text for pt vs en on the same inputs', () => {
      const pt = describeGameEnd('draw-repetition', 'local', 'b', 'b', 'pt');
      const en = describeGameEnd('draw-repetition', 'local', 'b', 'b', 'en');
      expect(en?.title).not.toBe(pt?.title);
    });
  });
});
