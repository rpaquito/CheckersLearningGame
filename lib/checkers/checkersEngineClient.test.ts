import { describe, it, expect } from 'vitest';
import type { WorkerRequest, WorkerResponse } from './checkersEngine.worker';
import { createCheckersEngineClient } from './checkersEngineClient';
import { createInitialBoard } from './board';

// A minimal stand-in for the browser's Worker, shaped exactly like the
// subset of it checkersEngineClient.ts actually uses. Lets the test control
// exactly when each request "resolves" and inspect what was posted, without
// any real threading (jsdom has no functional Worker to exercise).
class FakeWorker {
  posted: WorkerRequest[] = [];
  private messageListeners: ((event: MessageEvent<WorkerResponse>) => void)[] = [];
  terminated = false;

  postMessage(message: WorkerRequest) {
    this.posted.push(message);
  }

  addEventListener(type: 'message', listener: (event: MessageEvent<WorkerResponse>) => void) {
    if (type === 'message') this.messageListeners.push(listener);
  }

  removeEventListener(type: 'message', listener: (event: MessageEvent<WorkerResponse>) => void) {
    if (type === 'message') this.messageListeners = this.messageListeners.filter((l) => l !== listener);
  }

  terminate() {
    this.terminated = true;
  }

  // Test helper: simulate the worker replying to the most recent request.
  respond(response: WorkerResponse) {
    for (const listener of this.messageListeners) {
      listener({ data: response } as MessageEvent<WorkerResponse>);
    }
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
});
