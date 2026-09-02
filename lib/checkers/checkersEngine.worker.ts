import type { Board, CheckersMove, Color } from './types';
import { findBestMove } from './search';
import type { EngineOptions } from './difficulty';

// Worker message shapes -- not a wire protocol standard, internal to this
// app (per design spec §3). No UCI-style text protocol involved: this
// worker runs our own TS search directly, not an external engine binary.
export type WorkerRequest =
  | { type: 'getBestMove'; board: Board; turn: Color; options: EngineOptions }
  | { type: 'evaluate'; board: Board; turn: Color; depth: number }
  | { type: 'gradeMove'; board: Board; turn: Color; move: CheckersMove; depth: number };
export type WorkerResponse =
  | { type: 'bestMove'; move: CheckersMove }
  | { type: 'evaluation'; score: number }
  | { type: 'moveGrade'; bestScore: number; playedScore: number }
  // Every request must produce exactly one response. Without this variant a
  // throw inside the handler (or an unrecognized request) would simply
  // produce nothing, leaving the client's promise pending forever and its
  // queue wedged -- see checkersEngineClient.ts.
  | { type: 'error'; message: string };

// Safety-net time budget shared by the 'evaluate' and 'gradeMove' messages:
// both are always full-strength/single-best (randomness 0) regardless of
// what difficulty the opponent search left configured, per spec §3 -- this
// cap only matters if `depth` is unexpectedly large; normal grading depths
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
    } else if (request.type === 'gradeMove') {
      const result = findBestMove(request.board, request.turn, {
        maxDepth: request.depth,
        timeBudgetMs: EVALUATE_TIME_BUDGET_MS,
        randomness: 0,
      });
      // Match by FULL move equality (from/to/promotes/captures), not just
      // from/to -- this repo has a documented, rare case where two distinct
      // legal capture chains can share the same from/to while capturing
      // different pieces (see CLAUDE.md's useCheckersGame.ts conventions).
      // The caller always has the complete CheckersMove that was actually
      // played, so matching on the whole shape side-steps that ambiguity
      // entirely instead of guessing which candidate was meant.
      const played = result.candidates.find(
        (candidate) =>
          candidate.move.from === request.move.from &&
          candidate.move.to === request.move.to &&
          candidate.move.promotes === request.move.promotes &&
          candidate.move.captures.length === request.move.captures.length &&
          candidate.move.captures.every((square, i) => square === request.move.captures[i])
      );
      if (!played) {
        throw new Error('gradeMove: played move not found among search candidates');
      }
      const response: WorkerResponse = { type: 'moveGrade', bestScore: result.bestScore, playedScore: played.score };
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
