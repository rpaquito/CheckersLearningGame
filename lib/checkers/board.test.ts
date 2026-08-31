// lib/checkers/board.test.ts
import { describe, it, expect } from 'vitest';
import {
  squareToRowCol,
  rowColToSquare,
  neighbor,
  createInitialBoard,
  isBackRowFor,
} from './board';

describe('squareToRowCol / rowColToSquare', () => {
  it('maps square 1 to row 0, col 1', () => {
    expect(squareToRowCol(1)).toEqual({ row: 0, col: 1 });
  });

  it('maps square 32 to row 7, col 6', () => {
    expect(squareToRowCol(32)).toEqual({ row: 7, col: 6 });
  });

  it('round-trips every square 1-32', () => {
    for (let s = 1; s <= 32; s++) {
      const { row, col } = squareToRowCol(s);
      expect(rowColToSquare(row, col)).toBe(s);
    }
  });

  it('returns null for a light (non-playable) square', () => {
    expect(rowColToSquare(0, 0)).toBeNull();
  });

  it('returns null out of bounds', () => {
    expect(rowColToSquare(-1, 1)).toBeNull();
    expect(rowColToSquare(8, 1)).toBeNull();
  });
});

describe('neighbor', () => {
  it('reproduces the real opening move 11-15 (black, southwest)', () => {
    expect(neighbor(11, 'sw')).toBe(15);
  });

  it('reproduces the real opening reply 23-19 (white, northeast)', () => {
    expect(neighbor(23, 'ne')).toBe(19);
  });

  it('returns null off the edge of the board', () => {
    expect(neighbor(1, 'nw')).toBeNull();
  });
});

describe('createInitialBoard', () => {
  it('places 12 black men on squares 1-12, empty middle, 12 white men on 21-32', () => {
    const board = createInitialBoard();
    for (let s = 1; s <= 12; s++) expect(board[s - 1]).toEqual({ color: 'b', kind: 'man' });
    for (let s = 13; s <= 20; s++) expect(board[s - 1]).toBeNull();
    for (let s = 21; s <= 32; s++) expect(board[s - 1]).toEqual({ color: 'w', kind: 'man' });
  });
});

describe('isBackRowFor', () => {
  it('row 7 (squares 29-32) is black\'s back row', () => {
    expect(isBackRowFor(30, 'b')).toBe(true);
    expect(isBackRowFor(11, 'b')).toBe(false);
  });

  it('row 0 (squares 1-4) is white\'s back row', () => {
    expect(isBackRowFor(2, 'w')).toBe(true);
    expect(isBackRowFor(23, 'w')).toBe(false);
  });
});
