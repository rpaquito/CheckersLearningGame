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
  /** The sequence of squares the piece actually LANDED on, in order --
   * intermediate capture landings followed by the final `to`. Always ends
   * with `to` (`path[path.length - 1] === to`). For a simple (non-
   * capturing) move, `path = [to]` (a single hop). This is the complete,
   * unambiguous identity of a route: two capture chains that capture
   * different pieces can never have the same `path`, even if they happen
   * to share the same final `to`. See lib/checkers/moveDisambiguation.ts. */
  path: Square[];
}

export type GameStatus =
  | 'playing'
  | 'no-moves'        // side to move has zero legal moves -> they lose
  | 'draw-repetition'
  | 'draw-no-capture';
