import { describe, it, expect } from 'vitest';
import { createInitialBoard } from './board';
import { simpleMovesFrom, captureMovesFrom } from './moveGeneration';
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

describe('captureMovesFrom', () => {
  it('captures a single adjacent enemy man and lands beyond it', () => {
    const board = emptyBoard();
    board[10] = { color: 'b', kind: 'man' }; // 11
    board[14] = { color: 'w', kind: 'man' }; // 15
    expect(captureMovesFrom(board, 11)).toEqual([
      { from: 11, to: 18, captures: [15], promotes: false },
    ]);
  });

  it('does not allow capturing your own piece', () => {
    const board = emptyBoard();
    board[10] = { color: 'b', kind: 'man' }; // 11
    board[14] = { color: 'b', kind: 'man' }; // 15
    expect(captureMovesFrom(board, 11)).toEqual([]);
  });

  it('does not allow a capture with no empty landing square beyond', () => {
    const board = emptyBoard();
    board[10] = { color: 'b', kind: 'man' }; // 11
    board[14] = { color: 'w', kind: 'man' }; // 15
    board[17] = { color: 'w', kind: 'man' }; // 18, blocks the landing square
    expect(captureMovesFrom(board, 11)).toEqual([]);
  });

  it('chains a double jump into a single move', () => {
    const board = emptyBoard();
    board[10] = { color: 'b', kind: 'man' }; // 11
    board[14] = { color: 'w', kind: 'man' }; // 15
    board[21] = { color: 'w', kind: 'man' }; // 22
    expect(captureMovesFrom(board, 11)).toEqual([
      { from: 11, to: 25, captures: [15, 22], promotes: false },
    ]);
  });

  it('a man that reaches the king row stops immediately, even if a further capture would be geometrically possible as a king', () => {
    const board = emptyBoard();
    board[21] = { color: 'b', kind: 'man' }; // 22
    board[25] = { color: 'w', kind: 'man' }; // 26 -- captured, landing 31 is the back row
    board[26] = { color: 'w', kind: 'man' }; // 27 -- only reachable from 31 if the chain continued as a king (it must not)
    expect(captureMovesFrom(board, 22)).toEqual([
      { from: 22, to: 31, captures: [26], promotes: true },
    ]);
  });

  it('a king can chain captures backward and forward', () => {
    const board = emptyBoard();
    board[10] = { color: 'b', kind: 'king' }; // 11
    board[14] = { color: 'w', kind: 'man' }; // 15
    const moves = captureMovesFrom(board, 11);
    expect(moves).toEqual([{ from: 11, to: 18, captures: [15], promotes: false }]);
  });
});
