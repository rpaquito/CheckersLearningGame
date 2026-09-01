import type { Board, CheckersMove, Color } from './types';
import { findBestMove } from './search';
import type { EngineOptions } from './difficulty';

// Worker message shapes -- not a wire protocol standard, internal to this
// app (per design spec §3). No UCI-style text protocol involved: this
// worker runs our own TS search directly, not an external engine binary.
export type WorkerRequest =
  | { type: 'getBestMove'; board: Board; turn: Color; options: EngineOptions }
  | { type: 'evaluate'; board: Board; turn: Color; depth: number };
export type WorkerResponse =
  | { type: 'bestMove'; move: CheckersMove }
  | { type: 'evaluation'; score: number };

// Safety-net time budget for the 'evaluate' message (move-quality grading):
// it's always full-strength/single-best (randomness 0) regardless of what
// difficulty the opponent search left configured, per spec §3 -- this cap
// only matters if `depth` is unexpectedly large; normal grading depths
// (6-10) resolve well under it.
const EVALUATE_TIME_BUDGET_MS = 5000;

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  if (request.type === 'getBestMove') {
    const result = findBestMove(request.board, request.turn, request.options);
    const response: WorkerResponse = { type: 'bestMove', move: result.move };
    self.postMessage(response);
  } else if (request.type === 'evaluate') {
    const result = findBestMove(request.board, request.turn, {
      maxDepth: request.depth,
      timeBudgetMs: EVALUATE_TIME_BUDGET_MS,
      randomness: 0,
    });
    const response: WorkerResponse = { type: 'evaluation', score: result.bestScore };
    self.postMessage(response);
  }
};
