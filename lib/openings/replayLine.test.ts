import { describe, expect, it } from 'vitest';
import { replayLine } from './replayLine';
import type { OpeningLine } from './types';

describe('replayLine', () => {
  it('replays a short line move by move, returning board/move/notation/explanation', () => {
    const line: OpeningLine = {
      name: { pt: 'Linha de teste', en: 'Test line' },
      moves: [
        { notation: '11-15', explanation: { pt: 'Ocupa o centro.', en: 'Occupies the center.' } },
        { notation: '23-19', explanation: { pt: 'Resposta simétrica.', en: 'Symmetric reply.' } },
      ],
    };

    const result = replayLine(line);

    expect(result).toHaveLength(2);
    expect(result[0].notation).toBe('11-15');
    expect(result[0].move).toEqual({ from: 11, to: 15, captures: [], promotes: false, path: [15] });
    expect(result[0].explanation).toEqual({ pt: 'Ocupa o centro.', en: 'Occupies the center.' });
    expect(result[0].board[14]).toEqual({ color: 'b', kind: 'man' }); // square 15, index 14
    expect(result[0].board[10]).toBeNull(); // square 11, now vacated

    expect(result[1].notation).toBe('23-19');
    expect(result[1].move).toEqual({ from: 23, to: 19, captures: [], promotes: false, path: [19] });
    expect(result[1].board[18]).toEqual({ color: 'w', kind: 'man' }); // square 19
  });

  it('throws a descriptive error for an illegal move', () => {
    const line: OpeningLine = {
      name: { pt: 'Linha inválida', en: 'Invalid line' },
      moves: [{ notation: '11-20', explanation: { pt: 'Lance impossível.', en: 'Impossible move.' } }],
    };

    expect(() => replayLine(line)).toThrow(/11-20/);
  });
});
