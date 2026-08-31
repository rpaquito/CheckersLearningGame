import type { Board, Color, GameStatus } from './types';
import { allLegalMoves } from './moveGeneration';

// 40 full moves (80 plies) with no capture by either side — the commonly-
// cited simplified version of checkers' no-progress rule. Informational,
// not a tournament-federation-verified threshold — see design spec §2 and
// CLAUDE.md.
export const NO_CAPTURE_DRAW_PLIES = 80;

export function boardKey(board: Board, turn: Color): string {
  return board.map((p) => (p ? `${p.color}${p.kind === 'king' ? 'K' : 'm'}` : '-')).join('') + turn;
}

export function computeStatus(
  board: Board,
  turn: Color,
  plySinceLastCapture: number,
  positionCounts: ReadonlyMap<string, number>,
  positionKey: string,
): GameStatus {
  if (allLegalMoves(board, turn).length === 0) return 'no-moves';
  if (plySinceLastCapture >= NO_CAPTURE_DRAW_PLIES) return 'draw-no-capture';
  if ((positionCounts.get(positionKey) ?? 0) >= 3) return 'draw-repetition';
  return 'playing';
}
