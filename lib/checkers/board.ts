import type { Board, Color, Piece, Square } from './types';

export interface RowCol {
  row: number; // 0 (top) to 7 (bottom)
  col: number; // 0 (left) to 7 (right)
}

// Standard checkers board numbering: 32 dark squares, 4 per row, numbered
// row-major from the top. Verified against real checkers notation during
// design — see board.test.ts's "reproduces the real opening move" cases.
export function squareToRowCol(square: Square): RowCol {
  const idx = square - 1;
  const row = Math.floor(idx / 4);
  const k = idx % 4;
  const col = row % 2 === 0 ? 2 * k + 1 : 2 * k;
  return { row, col };
}

export function rowColToSquare(row: number, col: number): Square | null {
  if (row < 0 || row > 7 || col < 0 || col > 7) return null;
  const isDark = row % 2 === 0 ? col % 2 === 1 : col % 2 === 0;
  if (!isDark) return null;
  const k = row % 2 === 0 ? (col - 1) / 2 : col / 2;
  return row * 4 + k + 1;
}

export type Direction = 'nw' | 'ne' | 'sw' | 'se';

const DIRECTION_DELTAS: Record<Direction, { dr: number; dc: number }> = {
  nw: { dr: -1, dc: -1 },
  ne: { dr: -1, dc: 1 },
  sw: { dr: 1, dc: -1 },
  se: { dr: 1, dc: 1 },
};

export function neighbor(square: Square, direction: Direction): Square | null {
  const { row, col } = squareToRowCol(square);
  const { dr, dc } = DIRECTION_DELTAS[direction];
  return rowColToSquare(row + dr, col + dc);
}

export const ALL_DIRECTIONS: Direction[] = ['nw', 'ne', 'sw', 'se'];

// Black starts at the top (rows 0-2, squares 1-12) and advances south
// (toward row 7). White starts at the bottom (rows 5-7, squares 21-32) and
// advances north (toward row 0). Kings ignore this and use ALL_DIRECTIONS.
export const FORWARD_DIRECTIONS: Record<Color, Direction[]> = {
  b: ['se', 'sw'],
  w: ['ne', 'nw'],
};

export function isBackRowFor(square: Square, color: Color): boolean {
  const { row } = squareToRowCol(square);
  return color === 'b' ? row === 7 : row === 0;
}

export function createInitialBoard(): Board {
  const board: (Piece | null)[] = new Array(32).fill(null);
  for (let s = 1; s <= 12; s++) board[s - 1] = { color: 'b', kind: 'man' };
  for (let s = 21; s <= 32; s++) board[s - 1] = { color: 'w', kind: 'man' };
  return board;
}
