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
    const move = { from: 11, to: 15, captures: [], promotes: false };
    const next = applyMove(board, move);
    expect(inferMove(board, 'b', next)).toEqual(move);
  });

  it('infers a multi-jump capture move', () => {
    const board = emptyBoard();
    board[10] = { color: 'b', kind: 'man' }; // 11
    board[14] = { color: 'w', kind: 'man' }; // 15
    board[21] = { color: 'w', kind: 'man' }; // 22
    const move = { from: 11, to: 25, captures: [15, 22], promotes: false };
    const next = applyMove(board, move);
    expect(inferMove(board, 'b', next)).toEqual(move);
  });

  it('returns null when no legal move connects the two positions', () => {
    const board = createInitialBoard();
    const unrelated = emptyBoard();
    expect(inferMove(board, 'b', unrelated)).toBeNull();
  });
});
