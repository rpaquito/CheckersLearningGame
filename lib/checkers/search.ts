import type { Board, CheckersMove, Color } from './types';
import { allLegalMoves, applyMove } from './moveGeneration';
import { evaluate } from './evaluate';
import type { EngineOptions } from './difficulty';
import { selectWeightedMove, type MoveCandidate } from './selectMove';

export interface SearchResult {
  move: CheckersMove; // possibly a randomness-weighted pick, not always bestScore's move
  bestScore: number; // the single best candidate's score -- always objective, for grading/UI, unaffected by randomness
  candidates: MoveCandidate<CheckersMove>[]; // every root move, ranked best-first
}

// Large enough to dominate any real evaluate()-scale comparison. Subtracting
// depthRemaining below makes a loss found with MORE depth still unexplored
// (i.e. one that happens SOONER, in fewer real moves) score worse than one
// found only after depth is nearly exhausted (happens LATER) -- so the
// search prefers delaying its own forced losses and hastening the
// opponent's, the same "mate distance" sensitivity a chess engine has.
const LOSS_SCORE = -1_000_000;

// Negamax with alpha-beta pruning. Returns a score from `turn`'s
// perspective (positive is good for `turn`). `depthRemaining` counts down
// to 0, at which point the position is scored by evaluate() rather than
// searched further.
function negamax(board: Board, turn: Color, depthRemaining: number, alpha: number, beta: number): number {
  const moves = allLegalMoves(board, turn);
  if (moves.length === 0) {
    // `turn` has no legal moves -- they've lost (matches gameStatus.ts's
    // 'no-moves' rule). Checked before the depth===0 leaf case: a position
    // where the side to move has already lost is not a "position to
    // statically evaluate", it's a terminal node regardless of remaining depth.
    return LOSS_SCORE - depthRemaining;
  }
  if (depthRemaining === 0) {
    return evaluate(board, turn);
  }
  let best = -Infinity;
  for (const move of moves) {
    const nextBoard = applyMove(board, move);
    const nextTurn: Color = turn === 'b' ? 'w' : 'b';
    const score = -negamax(nextBoard, nextTurn, depthRemaining - 1, -beta, -alpha);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break; // beta cutoff
  }
  return best;
}

// Iterative deepening from depth 1 up to options.maxDepth, stopping early
// once options.timeBudgetMs elapses -- except depth 1 always completes in
// full regardless of the time budget, guaranteeing a valid result even
// under an extremely tight budget. Only a FULLY completed depth's
// candidate list is ever kept; a depth abandoned partway through (because
// time ran out mid-scan) is discarded so a partially-searched, artificially
// low/high score from an incomplete scan never wins over a shallower but
// complete one.
export function findBestMove(
  board: Board,
  turn: Color,
  options: EngineOptions,
  random: () => number = Math.random
): SearchResult {
  const rootMoves = allLegalMoves(board, turn);
  if (rootMoves.length === 0) {
    throw new Error('findBestMove called with no legal moves available');
  }

  const deadline = Date.now() + options.timeBudgetMs;
  let candidates: MoveCandidate<CheckersMove>[] = rootMoves.map((move) => ({ move, score: -Infinity }));

  for (let depth = 1; depth <= options.maxDepth; depth++) {
    const depthCandidates: MoveCandidate<CheckersMove>[] = [];
    let ranOutOfTime = false;
    for (const move of rootMoves) {
      if (depth > 1 && Date.now() >= deadline) {
        ranOutOfTime = true;
        break;
      }
      const nextBoard = applyMove(board, move);
      const nextTurn: Color = turn === 'b' ? 'w' : 'b';
      const score = -negamax(nextBoard, nextTurn, depth - 1, -Infinity, Infinity);
      depthCandidates.push({ move, score });
    }
    if (ranOutOfTime) break;
    candidates = depthCandidates;
    if (Date.now() >= deadline) break;
  }

  candidates.sort((a, b) => b.score - a.score);
  const bestScore = candidates[0].score;
  const move = selectWeightedMove(candidates, options.randomness, random);
  return { move, bestScore, candidates };
}
