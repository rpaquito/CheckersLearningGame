export type Square = number; // 1-32, standard checkers board numbering

export type Color = 'b' | 'w';
export type PieceKind = 'man' | 'king';

export interface Piece {
  color: Color;
  kind: PieceKind;
}

// Length 32, index = square - 1. Only the 32 dark squares of an 8x8 board
// are represented — light squares never hold a piece in checkers.
export type Board = ReadonlyArray<Piece | null>;

export interface CheckersMove {
  from: Square;
  to: Square;
  captures: Square[]; // squares of captured pieces, in order, [] if a simple move
  promotes: boolean;  // true if this move ends with the piece becoming a king
}

export type GameStatus =
  | 'playing'
  | 'no-moves'        // side to move has zero legal moves -> they lose
  | 'draw-repetition'
  | 'draw-no-capture';
