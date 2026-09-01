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
  | { type: 'evaluation'; score: number }
  // Every request must produce exactly one response. Without this variant a
  // throw inside the handler (or an unrecognized request) would simply
  // produce nothing, leaving the client's promise pending forever and its
  // queue wedged -- see checkersEngineClient.ts.
  | { type: 'error'; message: string };

// Safety-net time budget for the 'evaluate' message (move-quality grading):
// it's always full-strength/single-best (randomness 0) regardless of what
// difficulty the opponent search left configured, per spec §3 -- this cap
// only matters if `depth` is unexpectedly large; normal grading depths
// (6-10) resolve well under it.
const EVALUATE_TIME_BUDGET_MS = 5000;

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  // Every path out of this handler must post exactly one response,
  // including the failure paths: the client serializes requests behind a
  // `busy` flag that only clears when a response arrives, so a silently
  // swallowed throw would lock the engine for the rest of the session.
  try {
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
    } else {
      const unknownType = (request as { type?: unknown }).type;
      throw new Error(`unrecognized worker request type: ${String(unknownType)}`);
    }
  } catch (error) {
    const response: WorkerResponse = { type: 'error', message: String(error) };
    self.postMessage(response);
  }
};
