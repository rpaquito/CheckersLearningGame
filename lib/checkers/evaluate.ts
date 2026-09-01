import type { Board, CheckersMove, Color } from './types';
import { squareToRowCol, isBackRowFor } from './board';
import { allLegalMoves } from './moveGeneration';

const MAN_VALUE = 100;
const KING_VALUE = 275;
const BACK_ROW_BONUS = 8;
const CENTER_COLUMN_BONUS = 4;
const ADVANCEMENT_WEIGHT = 2;
const MOBILITY_WEIGHT = 1;
const CENTER_COLUMNS = new Set([3, 4]);

// Returns a score from `color`'s perspective: positive favors `color`,
// negative favors the opponent, zero is balanced. Combines material (the
// dominant term, man=100/king=275 per spec §3) with light positional terms
// documented there: back-row retention (a real checkers opening principle
// -- keeping men on your own back row delays the opponent's kinging),
// center-column control, advancement toward promotion, and mobility
// (legal move count) as a tie-breaker only, weighted far below material.
// Every term is signed identically by each piece's color relative to
// `color`, and the mobility term is a plain difference of each side's own
// move count -- so evaluate(board, other-color) === -evaluate(board, color)
// always (see evaluate.test.ts's antisymmetry test).
//
// `ownMoves` is an optional optimization, not part of the score: pass
// allLegalMoves(board, color) when the caller already has it (search.ts's
// negamax always does at a leaf) and this skips regenerating it. Omitting
// it is always correct -- passing anything OTHER than color's real legal
// move list is not.
export function evaluate(board: Board, color: Color, ownMoves?: readonly CheckersMove[]): number {
  const opponent: Color = color === 'b' ? 'w' : 'b';
  let score = 0;
  for (let s = 1; s <= 32; s++) {
    const piece = board[s - 1];
    if (!piece) continue;
    const sign = piece.color === color ? 1 : -1;
    score += sign * (piece.kind === 'king' ? KING_VALUE : MAN_VALUE);
    const { row, col } = squareToRowCol(s);
    if (piece.kind === 'man') {
      // isBackRowFor(square, X) means "square is X's crowning row" (see
      // board.ts/board.test.ts) -- a man can never actually sit on its OWN
      // crowning row (it promotes to king the instant it arrives there, per
      // moveGeneration.ts). "Own back row" in the checkers-strategy sense
      // (the row a man starts on, worth defending to delay the opponent's
      // kinging) is therefore the OPPONENT's crowning row.
      const ownColorOpponent: Color = piece.color === 'b' ? 'w' : 'b';
      if (isBackRowFor(s, ownColorOpponent)) score += sign * BACK_ROW_BONUS;
      const advancement = piece.color === 'b' ? row : 7 - row;
      score += sign * advancement * ADVANCEMENT_WEIGHT;
    }
    if (CENTER_COLUMNS.has(col)) score += sign * CENTER_COLUMN_BONUS;
  }
  const ownMoveCount = (ownMoves ?? allLegalMoves(board, color)).length;
  score += MOBILITY_WEIGHT * (ownMoveCount - allLegalMoves(board, opponent).length);
  return score;
}
