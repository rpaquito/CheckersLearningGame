import type { Board, CheckersMove, Color } from './types';
import type { EngineOptions } from './difficulty';
import type { WorkerRequest, WorkerResponse } from './checkersEngine.worker';

export interface CheckersEngineClient {
  getBestMove: (board: Board, turn: Color, options: EngineOptions) => Promise<CheckersMove>;
  evaluate: (board: Board, turn: Color, depth: number) => Promise<number>;
  terminate: () => void;
}

// The `error` event a real Worker fires when the script fails to load or
// throws past its own handlers. Only `message` is ever read here.
export interface WorkerErrorLike {
  message?: string;
}

// The subset of the browser's real Worker interface this file actually
// uses -- lets tests inject a fake in place of a real thread (see
// checkersEngineClient.test.ts's FakeWorker; jsdom has no functional Worker
// to exercise otherwise).
export interface WorkerLike {
  postMessage(message: WorkerRequest): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<WorkerResponse>) => void): void;
  addEventListener(type: 'error', listener: (event: WorkerErrorLike) => void): void;
  removeEventListener(type: 'message', listener: (event: MessageEvent<WorkerResponse>) => void): void;
  removeEventListener(type: 'error', listener: (event: WorkerErrorLike) => void): void;
  terminate(): void;
}

function createRealWorker(): WorkerLike {
  // Module worker: Turbopack/webpack bundle our own checkersEngine.worker.ts
  // source directly, same as the main app bundle -- no external/public
  // asset needed (unlike Chess Sensei's prebuilt Stockfish WASM binary,
  // loaded via a plain string path to a static file).
  return new Worker(new URL('./checkersEngine.worker.ts', import.meta.url)) as unknown as WorkerLike;
}

function toError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error(String(cause));
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
//
// EVERY path must settle its promise and clear `busy`. A queue whose head
// never settles is a permanently locked engine with no recovery short of a
// page reload, so worker `error` events, `{type:'error'}` responses, a
// throwing postMessage(), and terminate() all reject rather than silently
// leaving the request in flight.
export function createCheckersEngineClient(createWorker: () => WorkerLike = createRealWorker): CheckersEngineClient {
  const worker = createWorker();
  // Each queued entry carries its own `fail` so terminate() can settle even
  // the requests that were never posted.
  const queue: { run: () => void; fail: (error: Error) => void }[] = [];
  let inFlight: { fail: (error: Error) => void } | null = null;
  let busy = false;
  let terminated = false;
  // Set only when an `error` event arrives with NOTHING in flight, which in
  // practice means the worker script never loaded (that error fires soon
  // after construction, before the first request goes out). Without
  // latching it, the first request would post into a worker that does not
  // exist and hang forever -- there is no timeout to save it. An error
  // DURING a request is not latched: the worker was alive enough to be
  // messaged, so only that request fails and the next one may still work.
  let workerFailure: Error | null = null;

  function runNext() {
    if (busy || terminated) return;
    const next = queue.shift();
    if (!next) return;
    busy = true;
    next.run();
  }

  const onWorkerError = (event: WorkerErrorLike) => {
    const error = new Error(`checkers engine worker failed: ${event?.message ?? 'unknown error'}`);
    if (inFlight) inFlight.fail(error);
    else workerFailure = error;
  };
  worker.addEventListener('error', onWorkerError);

  // `extract` returns the value for a response this request is waiting for,
  // and undefined for anything else. The 'error' response type is handled
  // centrally below, so extractors only deal with success shapes.
  function enqueue<T>(payload: WorkerRequest, extract: (response: WorkerResponse) => { value: T } | undefined): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (terminated) {
        reject(new Error('checkers engine client has been terminated'));
        return;
      }
      let settled = false;

      const onMessage = (event: MessageEvent<WorkerResponse>) => {
        const response = event.data;
        if (response.type === 'error') {
          fail(new Error(`checkers engine worker error: ${response.message}`));
          return;
        }
        const hit = extract(response);
        if (hit) succeed(hit.value);
      };

      function settle(act: () => void) {
        if (settled) return;
        settled = true;
        worker.removeEventListener('message', onMessage);
        inFlight = null;
        busy = false;
        act();
        runNext();
      }
      function succeed(value: T) {
        settle(() => resolve(value));
      }
      function fail(error: Error) {
        settle(() => reject(error));
      }

      const entry = {
        fail,
        run: () => {
          if (workerFailure) {
            fail(workerFailure);
            return;
          }
          inFlight = { fail };
          worker.addEventListener('message', onMessage);
          try {
            worker.postMessage(payload);
          } catch (error) {
            // A synchronously-throwing postMessage() (structured-clone
            // failure, a dead worker) must not leave `busy` stuck true.
            fail(toError(error));
          }
        },
      };

      queue.push(entry);
      runNext();
    });
  }

  async function getBestMove(board: Board, turn: Color, options: EngineOptions): Promise<CheckersMove> {
    return enqueue<CheckersMove>({ type: 'getBestMove', board, turn, options }, (response) =>
      response.type === 'bestMove' ? { value: response.move } : undefined
    );
  }

  async function evaluate(board: Board, turn: Color, depth: number): Promise<number> {
    return enqueue<number>({ type: 'evaluate', board, turn, depth }, (response) =>
      response.type === 'evaluation' ? { value: response.score } : undefined
    );
  }

  function terminate() {
    if (terminated) return;
    terminated = true;
    worker.removeEventListener('error', onWorkerError);
    worker.terminate();
    // Drain the queue BEFORE settling anything: each fail() calls runNext(),
    // which must not post a fresh request into a worker that is already gone.
    const queued = queue.splice(0, queue.length);
    const pending = inFlight;
    inFlight = null;
    busy = false;
    const reason = new Error('checkers engine client has been terminated');
    pending?.fail(reason);
    for (const entry of queued) entry.fail(reason);
  }

  return { getBestMove, evaluate, terminate };
}
