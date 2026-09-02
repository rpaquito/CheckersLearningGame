import type { Board, Color, Piece, PieceKind, Square } from './types';
import { rowColToSquare } from './board';

export interface DemoPieceSpec {
  row: number;
  col: number;
  color: Color;
  kind: PieceKind;
}

/**
 * Resolves a (row, col) pair to its checkers square number -- used
 * throughout this module instead of hand-typed square numbers, which
 * CLAUDE.md flags as an error-prone pattern that has already caused real
 * defects elsewhere in this codebase. Throws for a light (non-playable)
 * square so a mistaken coordinate fails loudly at import time, not
 * silently as a missing piece a demo page would otherwise render wrong.
 */
export function squareAt(row: number, col: number): Square {
  const square = rowColToSquare(row, col);
  if (square === null) throw new Error(`squareAt: (${row}, ${col}) is not a playable dark square`);
  return square;
}

/** Builds a 32-square Board from row/col piece specs -- see squareAt. */
export function buildBoard(pieces: DemoPieceSpec[]): Board {
  const board: (Piece | null)[] = new Array(32).fill(null);
  for (const { row, col, color, kind } of pieces) {
    board[squareAt(row, col) - 1] = { color, kind };
  }
  return board;
}

export interface DemoPosition {
  board: Board;
  square: Square;
}

// -- /aprender/pecas ------------------------------------------------------

/** A lone black man with both forward diagonals open. */
export const MAN_MOVEMENT_DEMO: DemoPosition = {
  board: buildBoard([{ row: 3, col: 2, color: 'b', kind: 'man' }]),
  square: squareAt(3, 2),
};

/** A lone black king -- moves in all four diagonal directions, not just
 * forward. */
export const KING_MOVEMENT_DEMO: DemoPosition = {
  board: buildBoard([{ row: 4, col: 3, color: 'b', kind: 'king' }]),
  square: squareAt(4, 3),
};

/** A black man one diagonal step from black's crowning row (row 7) --
 * either legal landing square promotes it. */
export const PROMOTION_DEMO: DemoPosition = {
  board: buildBoard([{ row: 6, col: 1, color: 'b', kind: 'man' }]),
  square: squareAt(6, 1),
};

// -- /aprender/regras-especiais --------------------------------------------

/** A black man that can jump one white man -- capturing is mandatory once
 * available, so this piece's only legal move is the jump (not any
 * hypothetical simple move it might otherwise have). */
export const MANDATORY_CAPTURE_DEMO: DemoPosition = {
  board: buildBoard([
    { row: 2, col: 1, color: 'b', kind: 'man' },
    { row: 3, col: 2, color: 'w', kind: 'man' },
  ]),
  square: squareAt(2, 1),
};

/** A black man that captures two white men in one turn via a chained
 * double jump, both hops in the 'se' direction. */
export const MULTI_JUMP_DEMO: DemoPosition = {
  board: buildBoard([
    { row: 0, col: 1, color: 'b', kind: 'man' },
    { row: 1, col: 2, color: 'w', kind: 'man' },
    { row: 3, col: 4, color: 'w', kind: 'man' },
  ]),
  square: squareAt(0, 1),
};

// -- /aprender/fim-de-jogo --------------------------------------------------

/** A black man boxed in by the board edge and a white man -- zero legal
 * moves: no simple move (both forward diagonals are occupied or
 * off-board), no capture (the only possible capture's landing square is
 * off-board). */
export const NO_LEGAL_MOVES_DEMO: DemoPosition = {
  board: buildBoard([
    { row: 6, col: 7, color: 'b', kind: 'man' },
    { row: 7, col: 6, color: 'w', kind: 'man' },
  ]),
  square: squareAt(6, 7),
};
