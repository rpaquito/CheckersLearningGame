import { describe, it, expect } from 'vitest';
import type { Piece } from './types';
import { createInitialBoard } from './board';
import { allLegalMoves } from './moveGeneration';
import { findBestMove } from './search';

function emptyBoard(): (Piece | null)[] {
  return new Array(32).fill(null);
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
});
