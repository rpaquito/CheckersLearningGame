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

// How many negamax nodes to visit between wall-clock checks. Date.now() is
// far too expensive to call at every node, and too coarse a granularity
// leaves the time budget unenforced for long stretches. 4096 nodes is well
// under a millisecond of search at this engine's node rate, so the budget is
// honoured to within roughly a millisecond while the check itself costs
// nothing measurable.
const NODES_PER_DEADLINE_CHECK = 4096;

// Thrown out of negamax when the time budget runs out mid-search, and caught
// only by findBestMove's iterative-deepening loop. A single pre-allocated
// instance: this is control flow, not an error condition, and it can be
// thrown thousands of times over a session.
class SearchAborted extends Error {
  constructor() {
    super('checkers search aborted: time budget exhausted');
    this.name = 'SearchAborted';
  }
}
const SEARCH_ABORTED = new SearchAborted();

interface SearchContext {
  // Infinity disables the abort entirely -- used for the depth-1 pass,
  // which must always complete so findBestMove can never return without a
  // fully-scored candidate list.
  deadline: number;
  nodesUntilCheck: number;
}

// Negamax with alpha-beta pruning. Returns a score from `turn`'s
// perspective (positive is good for `turn`). `depthRemaining` counts down
// to 0, at which point the position is scored by evaluate() rather than
// searched further.
//
// Throws SEARCH_ABORTED if `ctx.deadline` passes mid-search. Every partial
// result on the stack is discarded by that unwind -- the caller must not
// use anything computed by an aborted search (see findBestMove).
function negamax(
  board: Board,
  turn: Color,
  depthRemaining: number,
  alpha: number,
  beta: number,
  ctx: SearchContext
): number {
  if (--ctx.nodesUntilCheck <= 0) {
    ctx.nodesUntilCheck = NODES_PER_DEADLINE_CHECK;
    if (Date.now() >= ctx.deadline) throw SEARCH_ABORTED;
  }
  const moves = allLegalMoves(board, turn);
  if (moves.length === 0) {
    // `turn` has no legal moves -- they've lost (matches gameStatus.ts's
    // 'no-moves' rule). Checked before the depth===0 leaf case: a position
    // where the side to move has already lost is not a "position to
    // statically evaluate", it's a terminal node regardless of remaining depth.
    return LOSS_SCORE - depthRemaining;
  }
  if (depthRemaining === 0) {
    // `moves` is exactly allLegalMoves(board, turn) and evaluate()'s
    // mobility term needs allLegalMoves(board, color) for color === turn --
    // hand it over instead of letting it regenerate the same list at every
    // single leaf.
    return evaluate(board, turn, moves);
  }
  let best = -Infinity;
  for (const move of moves) {
    const nextBoard = applyMove(board, move);
    const nextTurn: Color = turn === 'b' ? 'w' : 'b';
    const score = -negamax(nextBoard, nextTurn, depthRemaining - 1, -beta, -alpha, ctx);
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
// candidate list is ever kept; a depth abandoned partway through -- whether
// because time ran out between two root moves or because negamax aborted
// mid-recursion -- is discarded so a partially-searched, artificially
// low/high score from an incomplete scan never wins over a shallower but
// complete one.
export function findBestMove(
  board: Board,
  turn: Color,
  options: EngineOptions,
  random: () => number = Math.random
): SearchResult {
  let rootMoves = allLegalMoves(board, turn);
  if (rootMoves.length === 0) {
    throw new Error('findBestMove called with no legal moves available');
  }

  // A single legal move is forced -- extremely common in checkers, where
  // captures are mandatory. There is nothing to choose between, so any
  // search is pure latency: the previous version ran the full maxDepth
  // here completely uncapped, because the between-root-moves deadline check
  // below can never fire with only one move to iterate over. The score is
  // the static evaluation of the position, not a searched one (see
  // CLAUDE.md on scores not being comparable across searches).
  if (rootMoves.length === 1) {
    const move = rootMoves[0];
    const score = evaluate(board, turn);
    return { move, bestScore: score, candidates: [{ move, score }] };
  }

  const deadline = Date.now() + options.timeBudgetMs;
  let candidates: MoveCandidate<CheckersMove>[] = rootMoves.map((move) => ({ move, score: -Infinity }));

  for (let depth = 1; depth <= options.maxDepth; depth++) {
    const ctx: SearchContext = {
      deadline: depth === 1 ? Infinity : deadline,
      nodesUntilCheck: NODES_PER_DEADLINE_CHECK,
    };
    const depthCandidates: MoveCandidate<CheckersMove>[] = [];
    let ranOutOfTime = false;
    try {
      for (const move of rootMoves) {
        if (depth > 1 && Date.now() >= deadline) {
          ranOutOfTime = true;
          break;
        }
        const nextBoard = applyMove(board, move);
        const nextTurn: Color = turn === 'b' ? 'w' : 'b';
        const score = -negamax(nextBoard, nextTurn, depth - 1, -Infinity, Infinity, ctx);
        depthCandidates.push({ move, score });
      }
    } catch (error) {
      if (error !== SEARCH_ABORTED) throw error;
      ranOutOfTime = true;
    }
    if (ranOutOfTime) break; // depthCandidates is incomplete -- throw it away entirely
    candidates = depthCandidates;
    // Search the previous depth's best move first at the next depth: a good
    // first move raises alpha immediately, so the rest of the root moves cut
    // off far sooner. Standard alpha-beta move ordering.
    rootMoves = [...depthCandidates].sort((a, b) => b.score - a.score).map((c) => c.move);
    if (Date.now() >= deadline) break;
  }

  candidates.sort((a, b) => b.score - a.score);
  const bestScore = candidates[0].score;
  const move = selectWeightedMove(candidates, options.randomness, random);
  return { move, bestScore, candidates };
}
