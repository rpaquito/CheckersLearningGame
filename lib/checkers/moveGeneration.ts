import { ALL_DIRECTIONS, FORWARD_DIRECTIONS, isBackRowFor, neighbor, type Direction } from './board';
import type { Board, CheckersMove, Piece, Square } from './types';

function directionsFor(piece: Piece): Direction[] {
  return piece.kind === 'king' ? ALL_DIRECTIONS : FORWARD_DIRECTIONS[piece.color];
}

export function simpleMovesFrom(board: Board, square: Square): CheckersMove[] {
  const piece = board[square - 1];
  if (!piece) return [];
  const moves: CheckersMove[] = [];
  for (const dir of directionsFor(piece)) {
    const to = neighbor(square, dir);
    if (to !== null && board[to - 1] === null) {
      moves.push({
        from: square,
        to,
        captures: [],
        promotes: piece.kind === 'man' && isBackRowFor(to, piece.color),
      });
    }
  }
  return moves;
}
