import type { Board, CheckersMove, Color, Square } from '@/lib/checkers/types';
import { createInitialBoard } from '@/lib/checkers/board';
import { allLegalMoves, applyMove } from '@/lib/checkers/moveGeneration';
import type { Locale, OpeningLine } from './types';

export interface ReplayedMove {
  board: Board;
  move: CheckersMove;
  notation: string;
  explanation: Record<Locale, string>;
}

function parseSquares(notation: string): { from: Square; to: Square } {
  const [fromStr, toStr] = notation.split('-');
  return { from: Number(fromStr), to: Number(toStr) };
}

/**
 * Replays an opening line from the initial position, move by move,
 * alternating turn starting with black (checkers' side to move first --
 * see lib/checkers/board.ts's numbering convention and CLAUDE.md). Both
 * the study mode (draw the board + show the explanation) and the practice
 * mode (compare the user's move against the expected {from,to}) consume
 * this, so neither has to reimplement line replay.
 *
 * Matches a move's notation against the position's actual legal moves
 * (`allLegalMoves`) by from/to only -- no capture ("x") notation needed,
 * since an opening's early moves practically never hit the documented,
 * rare from/to-ambiguous-capture-chain case (see CLAUDE.md's
 * useCheckersGame.ts conventions).
 *
 * Throws a descriptive error if any notation is illegal in the position
 * it's played in -- should never happen in production (data.test.ts
 * validates every real line in OPENINGS), but is a clear safety net for
 * badly-written content.
 */
export function replayLine(line: OpeningLine): ReplayedMove[] {
  let board: Board = createInitialBoard();
  let turn: Color = 'b';
  const result: ReplayedMove[] = [];

  for (const { notation, explanation } of line.moves) {
    const { from, to } = parseSquares(notation);
    const move = allLegalMoves(board, turn).find((m) => m.from === from && m.to === to);

    if (!move) {
      throw new Error(`Illegal move "${notation}" in line "${line.name.pt}" (turn: ${turn})`);
    }

    board = applyMove(board, move);
    result.push({ board, move, notation, explanation });
    turn = turn === 'b' ? 'w' : 'b';
  }

  return result;
}
