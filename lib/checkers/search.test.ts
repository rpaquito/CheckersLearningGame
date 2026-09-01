import { describe, it, expect } from 'vitest';
import type { Board, Color, Piece } from './types';
import { createInitialBoard } from './board';
import { allLegalMoves, applyMove } from './moveGeneration';
import { evaluate } from './evaluate';
import { findBestMove } from './search';

function emptyBoard(): (Piece | null)[] {
  return new Array(32).fill(null);
}

function other(color: Color): Color {
  return color === 'b' ? 'w' : 'b';
}

// Deliberately NOT imported from search.ts: this is a from-scratch,
// unpruned reference minimax used to differentially test the real
// alpha-beta search. Sharing code with the implementation would let a bug
// hide in both. It must mirror search.ts's terminal-node convention exactly
// (the same large loss sentinel, offset by depthRemaining so a loss found
// sooner scores worse), because that convention is part of the contract the
// differential test is checking, not part of the algorithm under test.
const REFERENCE_LOSS_SCORE = -1_000_000;

function referenceMinimax(board: Board, turn: Color, depthRemaining: number): number {
  const moves = allLegalMoves(board, turn);
  if (moves.length === 0) return REFERENCE_LOSS_SCORE - depthRemaining;
  if (depthRemaining === 0) return evaluate(board, turn);
  let best = -Infinity;
  for (const move of moves) {
    const score = -referenceMinimax(applyMove(board, move), other(turn), depthRemaining - 1);
    if (score > best) best = score;
  }
  return best;
}

// Deterministic LCG so the sampled positions below are identical on every
// run -- a differential test that silently changes its own inputs each run
// is not a regression test.
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface SamplePosition {
  label: string;
  board: Board;
  turn: Color;
}

// Plays `plies` seeded-random legal moves from the opening and returns the
// resulting position. Deterministic for a given seed.
function playoutPosition(seed: number, plies: number): SamplePosition {
  const rng = makeRng(seed);
  let board: Board = createInitialBoard();
  let turn: Color = 'b';
  for (let i = 0; i < plies; i++) {
    const moves = allLegalMoves(board, turn);
    if (moves.length === 0) break;
    board = applyMove(board, moves[Math.floor(rng() * moves.length)]);
    turn = other(turn);
  }
  return { label: `seed ${seed} after ${plies} plies`, board, turn };
}

// Walks a random (but seeded) game from the opening, snapshotting positions
// along the way, so the differential test covers real reachable middlegame
// shapes -- including forced-capture positions -- rather than only
// hand-picked ones.
function samplePositionsFromPlayout(seed: number, every: number, count: number): SamplePosition[] {
  const rng = makeRng(seed);
  const out: SamplePosition[] = [];
  let board: Board = createInitialBoard();
  let turn: Color = 'b';
  for (let ply = 0; out.length < count && ply < 200; ply++) {
    const moves = allLegalMoves(board, turn);
    if (moves.length === 0) break;
    if (ply > 0 && ply % every === 0 && moves.length > 1) {
      out.push({ label: `seed ${seed} ply ${ply}`, board, turn });
    }
    board = applyMove(board, moves[Math.floor(rng() * moves.length)]);
    turn = other(turn);
  }
  return out;
}

function craftedPositions(): SamplePosition[] {
  const kingEndgame = emptyBoard();
  kingEndgame[13] = { color: 'b', kind: 'king' }; // square 14
  kingEndgame[8] = { color: 'b', kind: 'man' }; // square 9
  kingEndgame[22] = { color: 'w', kind: 'king' }; // square 23
  kingEndgame[25] = { color: 'w', kind: 'man' }; // square 26

  const kingsOnly = emptyBoard();
  kingsOnly[10] = { color: 'b', kind: 'king' }; // square 11
  kingsOnly[19] = { color: 'w', kind: 'king' }; // square 20
  kingsOnly[27] = { color: 'w', kind: 'king' }; // square 28

  const captureAvailable = emptyBoard();
  captureAvailable[9] = { color: 'b', kind: 'man' }; // square 10
  captureAvailable[13] = { color: 'w', kind: 'man' }; // square 14
  captureAvailable[20] = { color: 'w', kind: 'man' }; // square 21
  captureAvailable[24] = { color: 'b', kind: 'king' }; // square 25

  return [
    { label: 'initial position (black)', board: createInitialBoard(), turn: 'b' },
    { label: 'initial position (white)', board: createInitialBoard(), turn: 'w' },
    { label: 'king endgame (black)', board: kingEndgame, turn: 'b' },
    { label: 'king endgame (white)', board: kingEndgame, turn: 'w' },
    { label: 'kings only (black)', board: kingsOnly, turn: 'b' },
    { label: 'capture available (white)', board: captureAvailable, turn: 'w' },
  ];
}

describe('findBestMove', () => {
  it('returns a legal move from the initial position', () => {
    const board = createInitialBoard();
    const result = findBestMove(board, 'b', { maxDepth: 2, timeBudgetMs: 1000, randomness: 0 });
    const legal = allLegalMoves(board, 'b');
    expect(legal).toContainEqual(result.move);
  });

  it('is deterministic when randomness is 0 (same board, same result every call)', () => {
    const board = createInitialBoard();
    const options = { maxDepth: 3, timeBudgetMs: 1000, randomness: 0 };
    const first = findBestMove(board, 'b', options);
    const second = findBestMove(board, 'b', options);
    expect(second.move).toEqual(first.move);
    expect(second.bestScore).toBe(first.bestScore);
  });

  it('looks ahead far enough to avoid hanging a piece to an immediate recapture', () => {
    // Black man at square 9 has exactly two legal quiet moves: 9->13 (safe)
    // and 9->14 (walks into white's man at 18, which can then jump 18 over
    // 14 landing back at the now-empty 9 -- a clean loss of a man for
    // nothing). At maxDepth >= 2 the search sees white's reply and must
    // prefer 9->13.
    const board = emptyBoard();
    board[8] = { color: 'b', kind: 'man' }; // square 9
    board[17] = { color: 'w', kind: 'man' }; // square 18
    const result = findBestMove(board, 'b', { maxDepth: 4, timeBudgetMs: 2000, randomness: 0 });
    expect(result.move).toEqual({ from: 9, to: 13, captures: [], promotes: false });
  });

  it('respects the time budget and returns promptly even with a large maxDepth', () => {
    const board = createInitialBoard();
    const start = Date.now();
    const result = findBestMove(board, 'b', { maxDepth: 12, timeBudgetMs: 50, randomness: 0 });
    const elapsedMs = Date.now() - start;
    expect(elapsedMs).toBeLessThan(2000); // generous margin over the 50ms budget
    expect(allLegalMoves(board, 'b')).toContainEqual(result.move);
  });

  it('returns a forced (single-legal-move) position immediately, without searching', () => {
    // Full opening material, but black has exactly one legal move: the man
    // on 18 must capture white's man on 22 (landing on the vacated 25).
    // Every other jump is blocked and captures are mandatory, so no quiet
    // move is legal either. Searching this is pure wasted latency -- and it
    // is precisely the case the old between-root-moves deadline check could
    // never interrupt, since with one root move it never ran at all.
    const board = createInitialBoard().slice() as (Piece | null)[];
    board[11] = null; // square 12 -- relocated
    board[17] = { color: 'b', kind: 'man' }; // square 18
    board[24] = null; // square 25 -- the landing square
    expect(allLegalMoves(board, 'b')).toHaveLength(1);

    const start = Date.now();
    const result = findBestMove(board, 'b', { maxDepth: 20, timeBudgetMs: 5000, randomness: 0 });
    const elapsedMs = Date.now() - start;

    expect(result.move).toEqual({ from: 18, to: 25, captures: [22], promotes: false });
    expect(result.candidates).toHaveLength(1);
    expect(elapsedMs).toBeLessThan(200); // a depth-20 search of this position takes many seconds
  });

  it('enforces the time budget from inside the search, not only between root moves', () => {
    // maxDepth 20 is far beyond what fits in 600ms. Before the in-negamax
    // node-counter deadline check, whichever depth happened to be running
    // when the budget expired ran to completion no matter how long it took
    // -- this exact position measured 1142ms against its 600ms budget, and
    // real `dificil` searches (1800ms budget) were measured overshooting to
    // 4248ms. The overshoot is now bounded by one node-check interval.
    const { board, turn } = playoutPosition(1, 12);
    expect(allLegalMoves(board, turn).length).toBeGreaterThan(1); // not the forced-move path
    const start = Date.now();
    const result = findBestMove(board, turn, { maxDepth: 20, timeBudgetMs: 600, randomness: 0 });
    const elapsedMs = Date.now() - start;

    expect(elapsedMs).toBeLessThan(900); // 600ms budget + generous slack for a slow machine
    expect(allLegalMoves(board, turn)).toContainEqual(result.move);
    expect(result.bestScore).toBeGreaterThan(-Infinity); // a completed depth was kept
  });

  // Regression guard for the alpha-beta bounds themselves. Alpha-beta is
  // only an optimization: for the same depth it must return EXACTLY the
  // score a plain exhaustive minimax returns. Swapping the child call's
  // window (`-alpha, -beta` instead of `-beta, -alpha`) still produces
  // plausible-looking moves on most positions, which is why the earlier
  // tests here would not catch it -- this one compares numbers against an
  // independent reference and does.
  it('returns exactly the same score as an independent unpruned minimax (differential test)', () => {
    const DEPTH = 3; // deep enough for pruning to matter, shallow enough for the reference to finish
    const positions = [
      ...craftedPositions(),
      ...samplePositionsFromPlayout(12345, 3, 8),
      ...samplePositionsFromPlayout(98765, 5, 8),
    ];

    let compared = 0;
    for (const { label, board, turn } of positions) {
      // A position with a single forced move is not interesting here (and
      // findBestMove short-circuits it without searching, by design).
      if (allLegalMoves(board, turn).length < 2) continue;
      const expected = referenceMinimax(board, turn, DEPTH);
      const actual = findBestMove(board, turn, { maxDepth: DEPTH, timeBudgetMs: 60_000, randomness: 0 }).bestScore;
      expect(actual, `score mismatch at: ${label}`).toBe(expected);
      compared++;
    }
    expect(compared).toBeGreaterThanOrEqual(15); // the sampling above really did produce positions
  });

  // Regression guard for the `LOSS_SCORE - depthRemaining` mate-distance
  // sentinel's SIGN. Black man 21 / black man 22 / white man 29:
  //   21->25 blocks white's only square (29's jump over 25 lands on 22,
  //          which is occupied) -- white has zero legal moves at once.
  //   22->26 is a waiting move: white is forced to play 29->25, black must
  //          then capture 21x25 (landing 30), and white is out of pieces.
  // Both win; the first wins two plies sooner and must therefore score
  // strictly higher. Flip the sentinel's sign and the slower win wins.
  it('prefers the faster of two forced wins and scores it strictly higher', () => {
    const board = emptyBoard();
    board[20] = { color: 'b', kind: 'man' }; // square 21
    board[21] = { color: 'b', kind: 'man' }; // square 22
    board[28] = { color: 'w', kind: 'man' }; // square 29

    const result = findBestMove(board, 'b', { maxDepth: 6, timeBudgetMs: 60_000, randomness: 0 });

    expect(result.move).toEqual({ from: 21, to: 25, captures: [], promotes: false });

    const fast = result.candidates.find((c) => c.move.from === 21 && c.move.to === 25);
    const slow = result.candidates.find((c) => c.move.from === 22 && c.move.to === 26);
    expect(fast).toBeDefined();
    expect(slow).toBeDefined();
    // Both lines are wins (scores near the +1_000_000 win sentinel)...
    expect(fast!.score).toBeGreaterThan(900_000);
    expect(slow!.score).toBeGreaterThan(900_000);
    // ...but the faster one must score strictly higher.
    expect(fast!.score).toBeGreaterThan(slow!.score);
    expect(result.bestScore).toBe(fast!.score);
  });
});
