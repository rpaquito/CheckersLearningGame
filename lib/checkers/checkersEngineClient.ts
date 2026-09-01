import type { Board, CheckersMove, Color } from './types';
import type { EngineOptions } from './difficulty';
import type { WorkerRequest, WorkerResponse } from './checkersEngine.worker';

export interface CheckersEngineClient {
  getBestMove: (board: Board, turn: Color, options: EngineOptions) => Promise<CheckersMove>;
  evaluate: (board: Board, turn: Color, depth: number) => Promise<number>;
  terminate: () => void;
}

// The subset of the browser's real Worker interface this file actually
// uses -- lets tests inject a fake in place of a real thread (see
// checkersEngineClient.test.ts's FakeWorker; jsdom has no functional Worker
// to exercise otherwise).
export interface WorkerLike {
  postMessage(message: WorkerRequest): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<WorkerResponse>) => void): void;
  removeEventListener(type: 'message', listener: (event: MessageEvent<WorkerResponse>) => void): void;
  terminate(): void;
}

function createRealWorker(): WorkerLike {
  // Module worker: Turbopack/webpack bundle our own checkersEngine.worker.ts
  // source directly, same as the main app bundle -- no external/public
  // asset needed (unlike Chess Sensei's prebuilt Stockfish WASM binary,
  // loaded via a plain string path to a static file).
  return new Worker(new URL('./checkersEngine.worker.ts', import.meta.url)) as unknown as WorkerLike;
}

// Serializes every request through the one worker: only one request's
// message listener is ever active at a time, so a response can never be
// delivered to the wrong caller. Without this, concurrent
// getBestMove()/evaluate() calls (e.g. the AI's own-move request racing a
// move-quality check) could cross-resolve, handing the wrong caller an
// answer meant for someone else -- same reasoning as Chess Sensei's
// stockfishClient.ts, simpler here since there's no UCI text protocol or
// WASM-load readiness handshake to also serialize around.
//
// This is a plain queue of pending tasks plus a `busy` flag, not a chain of
// `.then()` calls on a shared promise. That distinction matters: `p.then()`
// always defers its callback by at least one microtask, even when `p` is
// already resolved, so chaining every request onto a running "queue
// promise" would delay the very first request's postMessage() by a tick it
// has no reason to wait for -- and callers (this file's own tests included)
// synchronously inspect what's been posted right after calling
// getBestMove()/evaluate(), with no intervening await. Draining the queue
// from inside runNext() -- called synchronously both when a request is
// enqueued into an idle queue and again, synchronously, the moment the
// previous request's response arrives -- keeps posting synchronous
// wherever nothing legitimately needs to wait.
export function createCheckersEngineClient(createWorker: () => WorkerLike = createRealWorker): CheckersEngineClient {
  const worker = createWorker();
  const queue: (() => void)[] = [];
  let busy = false;

  function runNext() {
    if (busy) return;
    const next = queue.shift();
    if (!next) return;
    busy = true;
    next();
  }

  function enqueue<T>(start: (resolve: (value: T) => void) => void): Promise<T> {
    return new Promise<T>((resolve) => {
      queue.push(() => {
        start((value) => {
          resolve(value);
          busy = false;
          runNext();
        });
      });
      runNext();
    });
  }

  async function getBestMove(board: Board, turn: Color, options: EngineOptions): Promise<CheckersMove> {
    return enqueue<CheckersMove>((resolve) => {
      const onMessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.type === 'bestMove') {
          worker.removeEventListener('message', onMessage);
          resolve(event.data.move);
        }
      };
      worker.addEventListener('message', onMessage);
      worker.postMessage({ type: 'getBestMove', board, turn, options });
    });
  }

  async function evaluate(board: Board, turn: Color, depth: number): Promise<number> {
    return enqueue<number>((resolve) => {
      const onMessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.type === 'evaluation') {
          worker.removeEventListener('message', onMessage);
          resolve(event.data.score);
        }
      };
      worker.addEventListener('message', onMessage);
      worker.postMessage({ type: 'evaluate', board, turn, depth });
    });
  }

  function terminate() {
    worker.terminate();
  }

  return { getBestMove, evaluate, terminate };
}
