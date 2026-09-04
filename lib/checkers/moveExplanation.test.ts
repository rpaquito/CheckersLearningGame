import { describe, it, expect } from 'vitest';
import { explainMove, describeMoveQuality, materialFeel, describeMoveForToast } from './moveExplanation';
import { createInitialBoard } from './board';
import { applyMove } from './moveGeneration';
import type { Piece } from './types';

function emptyBoard(): (Piece | null)[] {
  return new Array(32).fill(null);
}

describe('explainMove', () => {
  it('describes a single capture', () => {
    const board = emptyBoard();
    board[10] = { color: 'b', kind: 'man' }; // 11
    board[14] = { color: 'w', kind: 'man' }; // 15
    const move = { from: 11, to: 18, captures: [15], promotes: false, path: [18] };
    const after = applyMove(board, move);
    const text = explainMove({ move, boardBeforeMove: board, boardAfterMove: after, moverColor: 'b', locale: 'pt' });
    expect(text).toBe('Captura uma peça.');
  });

  it('describes a multi-jump capture with the count', () => {
    const board = emptyBoard();
    board[10] = { color: 'b', kind: 'man' }; // 11
    board[14] = { color: 'w', kind: 'man' }; // 15
    board[21] = { color: 'w', kind: 'man' }; // 22
    const move = { from: 11, to: 29, captures: [15, 22], promotes: false, path: [18, 29] };
    const after = applyMove(board, move);
    const text = explainMove({ move, boardBeforeMove: board, boardAfterMove: after, moverColor: 'b', locale: 'pt' });
    expect(text).toBe('Captura 2 peças.');
  });

  it('describes a promotion', () => {
    const board = emptyBoard();
    board[24] = { color: 'b', kind: 'man' }; // 25
    const move = { from: 25, to: 29, captures: [], promotes: true, path: [29] };
    const after = applyMove(board, move);
    const text = explainMove({ move, boardBeforeMove: board, boardAfterMove: after, moverColor: 'b', locale: 'pt' });
    expect(text).toBe('Torna-se dama.');
  });

  it('warns when the move leaves the moved piece capturable (hangs a piece)', () => {
    const board = emptyBoard();
    board[10] = { color: 'b', kind: 'man' }; // 11
    board[17] = { color: 'w', kind: 'man' }; // 18
    const move = { from: 11, to: 15, captures: [], promotes: false, path: [15] };
    const after = applyMove(board, move);
    const text = explainMove({ move, boardBeforeMove: board, boardAfterMove: after, moverColor: 'b', locale: 'pt' });
    expect(text).toBe('Entrega uma peça -- o adversário pode capturar de volta.');
  });

  it('describes abandoning back-row defense', () => {
    const board = emptyBoard();
    // Square 1 is (row 0, col 1) -- black's own back row is white's
    // crowning row (row 0), per evaluate.ts's doc comment.
    board[0] = { color: 'b', kind: 'man' }; // 1
    const move = { from: 1, to: 6, captures: [], promotes: false, path: [6] }; // 6 is (row 1, col 2)
    const after = applyMove(board, move);
    const text = explainMove({ move, boardBeforeMove: board, boardAfterMove: after, moverColor: 'b', locale: 'pt' });
    expect(text).toBe('Abandona a defesa da última linha.');
  });

  it('describes occupying the center', () => {
    const board = emptyBoard();
    board[5] = { color: 'b', kind: 'man' }; // 6 is (row 1, col 2) -- not a center column
    const move = { from: 6, to: 10, captures: [], promotes: false, path: [10] }; // 10 is (row 2, col 3) -- a center column
    const after = applyMove(board, move);
    const text = explainMove({ move, boardBeforeMove: board, boardAfterMove: after, moverColor: 'b', locale: 'pt' });
    expect(text).toBe('Ocupa o centro do tabuleiro.');
  });

  it('falls back to a generic advance description', () => {
    const board = emptyBoard();
    board[20] = { color: 'b', kind: 'man' }; // 21
    const move = { from: 21, to: 25, captures: [], promotes: false, path: [25] };
    const after = applyMove(board, move);
    const text = explainMove({ move, boardBeforeMove: board, boardAfterMove: after, moverColor: 'b', locale: 'pt' });
    expect(text).toBe('Avança em direção à promoção.');
  });

  it('returns English phrases for locale "en"', () => {
    const board = emptyBoard();
    board[10] = { color: 'b', kind: 'man' }; // 11
    board[14] = { color: 'w', kind: 'man' }; // 15
    const move = { from: 11, to: 18, captures: [15], promotes: false, path: [18] };
    const after = applyMove(board, move);
    const text = explainMove({ move, boardBeforeMove: board, boardAfterMove: after, moverColor: 'b', locale: 'en' });
    expect(text).toBe('Captures a piece.');
  });
});

describe('describeMoveQuality', () => {
  it('labels boa/imprecisao/erro in Portuguese', () => {
    expect(describeMoveQuality('boa', 'pt')).toBe('Boa jogada!');
    expect(describeMoveQuality('imprecisao', 'pt')).toBe('Imprecisão.');
    expect(describeMoveQuality('erro', 'pt')).toBe('Erro.');
  });

  it('labels boa/imprecisao/erro in English', () => {
    expect(describeMoveQuality('boa', 'en')).toBe('Good move!');
    expect(describeMoveQuality('imprecisao', 'en')).toBe('Inaccuracy.');
    expect(describeMoveQuality('erro', 'en')).toBe('Mistake.');
  });
});

describe('materialFeel', () => {
  it('returns null for a small loss', () => {
    expect(materialFeel(10, 'pt')).toBeNull();
  });

  it('describes a loss near a man\'s value', () => {
    expect(materialFeel(90, 'pt')).toBe('quase perdeu uma peça');
  });

  it('describes a loss near a king\'s value', () => {
    expect(materialFeel(230, 'pt')).toBe('quase perdeu uma dama');
  });
});

describe('describeMoveForToast', () => {
  it('combines the quality label and the move explanation', () => {
    const board = emptyBoard();
    board[10] = { color: 'b', kind: 'man' }; // 11
    board[14] = { color: 'w', kind: 'man' }; // 15
    const move = { from: 11, to: 18, captures: [15], promotes: false, path: [18] };
    const after = applyMove(board, move);
    const text = describeMoveForToast({
      quality: 'boa',
      loss: 0,
      move,
      boardBeforeMove: board,
      boardAfterMove: after,
      moverColor: 'b',
      locale: 'pt',
    });
    expect(text).toBe('Boa jogada! Captura uma peça.');
  });

  it('appends a material-feel note when the loss is large', () => {
    const board = createInitialBoard();
    // 9-13 (not 11-15): 11-15 lands on square 15, a center column, which
    // would trip the center-occupation branch instead of the fallback this
    // test means to exercise -- 9-13 lands on square 13 (row 3, col 0), not
    // a center column, and neither endpoint is on black's own back row.
    const move = { from: 9, to: 13, captures: [], promotes: false, path: [13] };
    const after = applyMove(board, move);
    const text = describeMoveForToast({
      quality: 'erro',
      loss: 100,
      move,
      boardBeforeMove: board,
      boardAfterMove: after,
      moverColor: 'b',
      locale: 'pt',
    });
    expect(text).toBe('Erro. Avança em direção à promoção. Quase perdeu uma peça.');
  });
});
