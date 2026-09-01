import { describe, it, expect } from 'vitest';
import type { WorkerRequest, WorkerResponse } from './checkersEngine.worker';
import { createCheckersEngineClient, type WorkerErrorLike } from './checkersEngineClient';
import { createInitialBoard } from './board';

// A minimal stand-in for the browser's Worker, shaped exactly like the
// subset of it checkersEngineClient.ts actually uses. Lets the test control
// exactly when each request "resolves" and inspect what was posted, without
// any real threading (jsdom has no functional Worker to exercise).
class FakeWorker {
  posted: WorkerRequest[] = [];
  private messageListeners: ((event: MessageEvent<WorkerResponse>) => void)[] = [];
  private errorListeners: ((event: WorkerErrorLike) => void)[] = [];
  terminated = false;
  // When set, postMessage throws it -- stands in for a structured-clone
  // failure or a worker that is already dead.
  throwOnPost: Error | null = null;

  postMessage(message: WorkerRequest) {
    if (this.throwOnPost) throw this.throwOnPost;
    this.posted.push(message);
  }

  addEventListener(type: 'message', listener: (event: MessageEvent<WorkerResponse>) => void): void;
  addEventListener(type: 'error', listener: (event: WorkerErrorLike) => void): void;
  addEventListener(type: 'message' | 'error', listener: (event: never) => void) {
    if (type === 'message') this.messageListeners.push(listener as (event: MessageEvent<WorkerResponse>) => void);
    if (type === 'error') this.errorListeners.push(listener as (event: WorkerErrorLike) => void);
  }

  removeEventListener(type: 'message', listener: (event: MessageEvent<WorkerResponse>) => void): void;
  removeEventListener(type: 'error', listener: (event: WorkerErrorLike) => void): void;
  removeEventListener(type: 'message' | 'error', listener: (event: never) => void) {
    if (type === 'message') this.messageListeners = this.messageListeners.filter((l) => l !== listener);
    if (type === 'error') this.errorListeners = this.errorListeners.filter((l) => l !== listener);
  }

  terminate() {
    this.terminated = true;
  }

  // Test helper: simulate the worker replying to the most recent request.
  respond(response: WorkerResponse) {
    for (const listener of [...this.messageListeners]) {
      listener({ data: response } as MessageEvent<WorkerResponse>);
    }
  }

  // Test helper: simulate the browser's Worker 'error' event (script failed
  // to load, or the worker threw past its own handlers).
  fireError(message: string) {
    for (const listener of [...this.errorListeners]) listener({ message });
  }

  get messageListenerCount() {
    return this.messageListeners.length;
  }
}

describe('createCheckersEngineClient', () => {
  it('posts a getBestMove request and resolves with the response move', async () => {
    const worker = new FakeWorker();
    const client = createCheckersEngineClient(() => worker);
    const board = createInitialBoard();
    const move = { from: 11, to: 15, captures: [], promotes: false };

    const promise = client.getBestMove(board, 'b', { maxDepth: 3, timeBudgetMs: 200, randomness: 0 });
    expect(worker.posted).toEqual([{ type: 'getBestMove', board, turn: 'b', options: { maxDepth: 3, timeBudgetMs: 200, randomness: 0 } }]);
    worker.respond({ type: 'bestMove', move });

    expect(await promise).toEqual(move);
  });

  it('posts an evaluate request and resolves with the response score', async () => {
    const worker = new FakeWorker();
    const client = createCheckersEngineClient(() => worker);
    const board = createInitialBoard();

    const promise = client.evaluate(board, 'w', 8);
    expect(worker.posted).toEqual([{ type: 'evaluate', board, turn: 'w', depth: 8 }]);
    worker.respond({ type: 'evaluation', score: 42 });

    expect(await promise).toBe(42);
  });

  it('serializes concurrent requests so the second is not posted until the first resolves', async () => {
    const worker = new FakeWorker();
    const client = createCheckersEngineClient(() => worker);
    const board = createInitialBoard();

    const firstPromise = client.getBestMove(board, 'b', { maxDepth: 1, timeBudgetMs: 100, randomness: 0 });
    const secondPromise = client.evaluate(board, 'w', 4);

    // Only the first request has been posted so far -- the second is
    // queued behind it, not sent concurrently.
    expect(worker.posted).toHaveLength(1);
    expect(worker.posted[0].type).toBe('getBestMove');

    worker.respond({ type: 'bestMove', move: { from: 11, to: 15, captures: [], promotes: false } });
    await firstPromise;

    // Now that the first resolved, the second's request should have gone out.
    expect(worker.posted).toHaveLength(2);
    expect(worker.posted[1].type).toBe('evaluate');

    worker.respond({ type: 'evaluation', score: 7 });
    expect(await secondPromise).toBe(7);
  });

  it('terminates the underlying worker', () => {
    const worker = new FakeWorker();
    const client = createCheckersEngineClient(() => worker);
    client.terminate();
    expect(worker.terminated).toBe(true);
  });

  it('rejects the in-flight request on a worker error event and un-wedges the queue', async () => {
    const worker = new FakeWorker();
    const client = createCheckersEngineClient(() => worker);
    const board = createInitialBoard();

    const failing = client.getBestMove(board, 'b', { maxDepth: 3, timeBudgetMs: 200, randomness: 0 });
    expect(worker.posted).toHaveLength(1);

    worker.fireError('worker script failed to load');
    await expect(failing).rejects.toThrow(/worker script failed to load/);

    // The queue must still work: `busy` was cleared, so a fresh request goes
    // out instead of queueing behind a request that will never settle.
    const next = client.evaluate(board, 'w', 4);
    expect(worker.posted).toHaveLength(2);
    worker.respond({ type: 'evaluation', score: 5 });
    expect(await next).toBe(5);
  });

  it('rejects immediately when the worker failed to load before any request was posted', async () => {
    const worker = new FakeWorker();
    const client = createCheckersEngineClient(() => worker);
    const board = createInitialBoard();

    // A real Worker whose script fails to load fires 'error' shortly after
    // construction -- i.e. with nothing in flight. Nothing may be posted
    // into it afterwards, or the request would hang forever.
    worker.fireError('Failed to load worker script');

    await expect(client.getBestMove(board, 'b', { maxDepth: 3, timeBudgetMs: 200, randomness: 0 })).rejects.toThrow(
      /Failed to load worker script/
    );
    expect(worker.posted).toHaveLength(0);
  });

  it("rejects on a {type:'error'} response and un-wedges the queue", async () => {
    const worker = new FakeWorker();
    const client = createCheckersEngineClient(() => worker);
    const board = createInitialBoard();

    const failing = client.getBestMove(board, 'b', { maxDepth: 3, timeBudgetMs: 200, randomness: 0 });
    worker.respond({ type: 'error', message: 'Error: boom inside the search' });
    await expect(failing).rejects.toThrow(/boom inside the search/);

    const next = client.evaluate(board, 'w', 4);
    expect(worker.posted).toHaveLength(2);
    worker.respond({ type: 'evaluation', score: 9 });
    expect(await next).toBe(9);
  });

  it('rejects when postMessage itself throws, rather than wedging the queue', async () => {
    const worker = new FakeWorker();
    const client = createCheckersEngineClient(() => worker);
    const board = createInitialBoard();

    worker.throwOnPost = new Error('could not be cloned');
    await expect(client.getBestMove(board, 'b', { maxDepth: 3, timeBudgetMs: 200, randomness: 0 })).rejects.toThrow(
      /could not be cloned/
    );

    worker.throwOnPost = null;
    const next = client.evaluate(board, 'w', 4);
    expect(worker.posted).toHaveLength(1);
    worker.respond({ type: 'evaluation', score: 3 });
    expect(await next).toBe(3);
  });

  it('settles (rejects) an in-flight request when terminate() is called mid-flight', async () => {
    const worker = new FakeWorker();
    const client = createCheckersEngineClient(() => worker);
    const board = createInitialBoard();

    const inFlight = client.getBestMove(board, 'b', { maxDepth: 3, timeBudgetMs: 200, randomness: 0 });
    const queued = client.evaluate(board, 'w', 4);
    expect(worker.posted).toHaveLength(1); // the second is still queued

    client.terminate();

    await expect(inFlight).rejects.toThrow(/terminated/);
    await expect(queued).rejects.toThrow(/terminated/); // queued-but-never-posted settles too
    expect(worker.posted).toHaveLength(1); // nothing was posted to the dead worker
    await expect(client.getBestMove(board, 'b', { maxDepth: 1, timeBudgetMs: 1, randomness: 0 })).rejects.toThrow(
      /terminated/
    );
  });

  it('leaves no message listener behind once a request settles', async () => {
    const worker = new FakeWorker();
    const client = createCheckersEngineClient(() => worker);
    const board = createInitialBoard();

    const first = client.getBestMove(board, 'b', { maxDepth: 1, timeBudgetMs: 10, randomness: 0 });
    expect(worker.messageListenerCount).toBe(1);
    worker.respond({ type: 'bestMove', move: { from: 11, to: 15, captures: [], promotes: false } });
    await first;
    expect(worker.messageListenerCount).toBe(0);

    const second = client.evaluate(board, 'w', 2);
    worker.respond({ type: 'error', message: 'nope' });
    await expect(second).rejects.toThrow(/nope/);
    expect(worker.messageListenerCount).toBe(0);
  });
});
