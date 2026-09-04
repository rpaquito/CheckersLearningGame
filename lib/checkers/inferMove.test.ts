import { describe, it, expect } from 'vitest';
import { createInitialBoard } from './board';
import { applyMove } from './moveGeneration';
import { inferMove } from './inferMove';
import type { Piece } from './types';

function emptyBoard(): (Piece | null)[] {
  return new Array(32).fill(null);
}

describe('inferMove', () => {
  it('infers a simple move between two consecutive positions', () => {
    const board = createInitialBoard();
    const move = { from: 11, to: 15, captures: [], promotes: false, path: [15] };
    const next = applyMove(board, move);
    expect(inferMove(board, 'b', next)).toEqual(move);
  });

  it('infers a single (non-chained) capture move', () => {
    // Same board setup as moveGeneration.test.ts's "captures a single
    // adjacent enemy man" case: black man 11, white man 15, landing 18.
    const board = emptyBoard();
    board[10] = { color: 'b', kind: 'man' }; // 11
    board[14] = { color: 'w', kind: 'man' }; // 15
    const move = { from: 11, to: 18, captures: [15], promotes: false, path: [18] };
    const next = applyMove(board, move);
    expect(inferMove(board, 'b', next)).toEqual(move);
  });

  it('infers a move that promotes the piece, including promotes: true', () => {
    // Geometry verified (same as moveGeneration.test.ts's "a simple move
    // onto the back row" case): square 27 is {row:6,col:5}; neighbor(27,
    // 'sw')=31, which is row 7 -- black's back row -- so this simple move
    // promotes. The piece kind at `to` (king) differs from what left `from`
    // (man), exercising boardsEqual's kind comparison.
    const board = emptyBoard();
    board[26] = { color: 'b', kind: 'man' }; // square 27
    const move = { from: 27, to: 31, captures: [], promotes: true, path: [31] };
    const next = applyMove(board, move);
    expect(inferMove(board, 'b', next)).toEqual(move);
    expect(next[30]).toEqual({ color: 'b', kind: 'king' });
  });

  it('infers a multi-jump capture move', () => {
    const board = emptyBoard();
    board[10] = { color: 'b', kind: 'man' }; // 11
    board[14] = { color: 'w', kind: 'man' }; // 15
    board[21] = { color: 'w', kind: 'man' }; // 22
    const move = { from: 11, to: 25, captures: [15, 22], promotes: false, path: [18, 25] };
    const next = applyMove(board, move);
    expect(inferMove(board, 'b', next)).toEqual(move);
  });

  it('returns null when no legal move connects the two positions', () => {
    const board = createInitialBoard();
    const unrelated = emptyBoard();
    expect(inferMove(board, 'b', unrelated)).toBeNull();
  });
});
