// lib/checkers/gameStatus.test.ts
import { describe, it, expect } from 'vitest';
import { computeStatus, boardKey, NO_CAPTURE_DRAW_PLIES } from './gameStatus';
import { createInitialBoard } from './board';
import type { Piece } from './types';

function emptyBoard(): (Piece | null)[] {
  return new Array(32).fill(null);
}

describe('computeStatus', () => {
  it('is "playing" at the start of the game', () => {
    const board = createInitialBoard();
    expect(computeStatus(board, 'b', 0, new Map(), boardKey(board, 'b'))).toBe('playing');
  });

  it('is "no-moves" when the side to move has zero legal moves', () => {
    const board = emptyBoard();
    board[0] = { color: 'b', kind: 'man' }; // 1 — the only black piece
    board[4] = { color: 'w', kind: 'man' }; // 5 — blocks the simple move; capture is off-board
    board[5] = { color: 'w', kind: 'man' }; // 6 — blocks the simple move
    board[9] = { color: 'w', kind: 'man' }; // 10 — blocks the capture landing square behind 6
    expect(computeStatus(board, 'b', 0, new Map(), boardKey(board, 'b'))).toBe('no-moves');
  });

  it('is "draw-no-capture" once the no-capture ply counter reaches the threshold', () => {
    const board = createInitialBoard();
    const key = boardKey(board, 'b');
    expect(computeStatus(board, 'b', NO_CAPTURE_DRAW_PLIES, new Map(), key)).toBe('draw-no-capture');
    expect(computeStatus(board, 'b', NO_CAPTURE_DRAW_PLIES - 1, new Map(), key)).toBe('playing');
  });

  it('is "draw-repetition" once a position has occurred 3 times', () => {
    const board = createInitialBoard();
    const key = boardKey(board, 'b');
    const counts = new Map([[key, 3]]);
    expect(computeStatus(board, 'b', 0, counts, key)).toBe('draw-repetition');
  });
});

describe('boardKey', () => {
  it('differs by turn and matches for equal positions', () => {
    const board = createInitialBoard();
    expect(boardKey(board, 'b')).not.toBe(boardKey(board, 'w'));
    expect(boardKey(board, 'b')).toBe(boardKey(createInitialBoard(), 'b'));
  });
});
