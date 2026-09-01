import type { Board, Color } from './types';
import { evalLoss, classifyMove, type MoveQuality } from './moveClassification';

// Both evaluate() calls below MUST share this exact depth -- CLAUDE.md's
// "Search scores are mate-distance-relative and NOT normalized across
// searches" section: two evaluate()/findBestMove() calls are only
// comparable when they completed the same maxDepth. This is deliberately
// NOT tied to any Difficulty/EngineOptions -- grading strength is its own
// concern, independent of both the opponent's configured difficulty and
// SUGGESTION_ENGINE_OPTIONS's suggestion strength (see difficulty.ts).
// 8 is a first guess (deep enough to see most tactics, shallow enough that
// two sequential grading calls stay well under a second combined on
// realistic hardware) -- provisional, same "verify by playing" caveat as
// difficulty.ts's numbers.
export const GRADE_DEPTH = 8;

export interface MoveGrade {
  quality: MoveQuality;
  loss: number;
}

// Structurally compatible with CheckersEngineClient's evaluate() method,
// but declared locally so callers/tests don't need the whole engine-client
// shape (getBestMove, terminate) just to grade a move.
export interface Evaluator {
  evaluate: (board: Board, color: Color, depth: number) => Promise<number>;
}

// Grades a move that was already applied to the board. `boardBeforeMove`/
// `moverColor` describe the position the mover chose from; `boardAfterMove`/
// `opponentColor` describe the resulting position from the OTHER side's
// perspective (evaluate()'s antisymmetry -- see evaluate.ts's doc comment --
// means negating that score gives the played move's value from the mover's
// own perspective).
export async function gradeMove(
  engine: Evaluator,
  boardBeforeMove: Board,
  moverColor: Color,
  boardAfterMove: Board,
  opponentColor: Color,
): Promise<MoveGrade> {
  const bestEval = await engine.evaluate(boardBeforeMove, moverColor, GRADE_DEPTH);
  const opponentEval = await engine.evaluate(boardAfterMove, opponentColor, GRADE_DEPTH);
  const playedEval = -opponentEval;
  const loss = evalLoss(bestEval, playedEval);
  return { quality: classifyMove(loss), loss };
}
