import { describe, it, expect } from 'vitest';
import { createInitialBoard } from './board';
import { simpleMovesFrom } from './moveGeneration';
import type { Piece } from './types';

export function emptyBoard(): (Piece | null)[] {
  return new Array(32).fill(null);
}

describe('simpleMovesFrom', () => {
  it('a black man on square 11 has two forward targets at the start of the game (15 and 16 are both empty)', () => {
    const board = createInitialBoard();
    const moves = simpleMovesFrom(board, 11);
    expect(moves.map((m) => m.to).sort((a, b) => a - b)).toEqual([15, 16]);
    expect(moves.every((m) => m.captures.length === 0 && !m.promotes)).toBe(true);
  });

  it('a black man on the edge (square 12) has only one forward target', () => {
    const board = createInitialBoard();
    expect(simpleMovesFrom(board, 12)).toEqual([
      { from: 12, to: 16, captures: [], promotes: false },
    ]);
  });

  it('a king can move in all four diagonal directions when they are all empty', () => {
    const board = emptyBoard();
    board[15] = { color: 'b', kind: 'king' }; // square 16
    const moves = simpleMovesFrom(board, 16);
    expect(moves.map((m) => m.to).sort((a, b) => a - b)).toEqual([11, 12, 19, 20]);
  });

  it('returns no moves for an empty square', () => {
    const board = emptyBoard();
    expect(simpleMovesFrom(board, 11)).toEqual([]);
  });

  it('a simple move onto the back row sets promotes: true', () => {
    const board = emptyBoard();
    board[26] = { color: 'b', kind: 'man' }; // square 27
    // square 27 -> 31 or 32 (row 7, black's back row)
    const moves = simpleMovesFrom(board, 27);
    expect(moves.every((m) => m.promotes)).toBe(true);
  });
});
