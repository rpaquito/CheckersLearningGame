import type { Board, CheckersMove, Color } from './types';
import { evalLoss, classifyMove, type MoveQuality } from './moveClassification';

// Grading strength is its own concern, independent of both the opponent's
// configured Difficulty and SUGGESTION_ENGINE_OPTIONS's suggestion strength
// (see difficulty.ts). 8 is a first guess (deep enough to see most tactics,
// shallow enough that a single grading search stays well under a second on
// realistic hardware) -- provisional, same "verify by playing" caveat as
// difficulty.ts's numbers.
export const GRADE_DEPTH = 8;

export interface MoveGrade {
  quality: MoveQuality;
  loss: number;
}

// Structurally compatible with CheckersEngineClient's gradeMove() method,
// but declared locally so callers/tests don't need the whole engine-client
// shape (getBestMove, evaluate, terminate) just to grade a move.
export interface Grader {
  gradeMove: (
    board: Board,
    turn: Color,
    move: CheckersMove,
    depth: number
  ) => Promise<{ bestScore: number; playedScore: number }>;
}

// Grades a move by running ONE search from the position it was played from,
// then reading both the best available score and the played move's own
// score out of that SAME search's candidate list. This is deliberately
// different from an earlier, broken design that ran two separate
// evaluate() searches -- one on the before-board, one on the after-board --
// and negated the second. That design violated this repo's own
// "Search scores are mate-distance-relative and NOT normalized across
// searches" rule (see CLAUDE.md): two independent searches from two
// different root positions are NOT the comparable case that rule
// describes, even at the same fixed depth -- a depth-8 search from the
// after-position is really 9 plies deep from the original root, and
// search.ts's single-legal-move short-circuit returns a STATIC evaluate()
// instead of a searched score, further skewing the comparison. Measured
// against the real engine, that combination scored real blunders as "Boa
// jogada!" more often than not.
//
// The fix: `engine.gradeMove` runs exactly one `findBestMove` call on
// `boardBeforeMove` and returns both `bestScore` (the top candidate's
// score) and `playedScore` (the specific move that was played, looked up
// within that same search's `candidates` array). Both numbers come from
// the same search at the same depth from the same root, so they're
// directly comparable -- no negation, no cross-search normalization needed.
//
// The played move is matched by FULL move equality (from/to/promotes/
// captures), not just from/to: this repo has a documented, rare case where
// two distinct legal capture chains can share the same from/to while
// capturing different pieces (see CLAUDE.md's useCheckersGame.ts
// conventions). Matching the whole move shape -- which the caller always
// has, since it's the move that was actually played -- side-steps that
// ambiguity entirely. That matching happens inside the worker (see
// checkersEngine.worker.ts's 'gradeMove' handler); this function only
// consumes the result.
export async function gradeMove(
  engine: Grader,
  boardBeforeMove: Board,
  moverColor: Color,
  move: CheckersMove
): Promise<MoveGrade> {
  const { bestScore, playedScore } = await engine.gradeMove(boardBeforeMove, moverColor, move, GRADE_DEPTH);
  const loss = evalLoss(bestScore, playedScore);
  return { quality: classifyMove(loss), loss };
}
