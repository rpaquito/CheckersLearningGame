import { describe, it, expect } from 'vitest';
import type { Piece } from './types';
import { createInitialBoard } from './board';
import { evaluate } from './evaluate';

function emptyBoard(): (Piece | null)[] {
  return new Array(32).fill(null);
}

describe('evaluate', () => {
  it('is zero for an empty board', () => {
    expect(evaluate(emptyBoard(), 'b')).toBe(0);
  });

  it('is exactly antisymmetric between the two colors on the same board', () => {
    // Every term evaluate() sums is signed by (piece.color === color ? 1 : -1),
    // and the mobility term is a plain difference of each side's own legal-
    // move count -- so evaluating the same board from the opposite color's
    // perspective must always negate the result, for any board: a + b === 0.
    // (Asserted as a sum rather than `w === -b` because the standard starting
    // position is perfectly symmetric and both evaluate to a computed +0;
    // `-0` from negating that +0 is a distinct value under `toBe`'s
    // `Object.is` comparison even though it's mathematically equal, so a
    // sum-to-zero check is used instead of the equivalent-but-brittle
    // negation form.)
    const board = createInitialBoard();
    expect(evaluate(board, 'w') + evaluate(board, 'b')).toBe(0);
  });

  it('values a king strictly higher than a man', () => {
    const withKing = emptyBoard();
    withKing[0] = { color: 'b', kind: 'king' }; // square 1
    const withMan = emptyBoard();
    withMan[0] = { color: 'b', kind: 'man' }; // square 1
    // A lone king is worth strictly more material than a lone man on the
    // same square, and is never LESS mobile (kings move in all 4
    // directions, men in 2) -- so this holds regardless of the exact
    // positional-term magnitudes.
    expect(evaluate(withKing, 'b')).toBeGreaterThan(evaluate(withMan, 'b'));
  });

  it('favors the color with a decisive material advantage', () => {
    const board = emptyBoard();
    board[0] = { color: 'b', kind: 'man' }; // square 1
    board[3] = { color: 'b', kind: 'man' }; // square 4
    board[6] = { color: 'b', kind: 'man' }; // square 7
    board[27] = { color: 'w', kind: 'man' }; // square 28
    // Black has 3 men to white's 1 -- a 200+ material edge that no
    // plausible combination of this evaluator's small positional/mobility
    // terms (each worth single digits per piece) can overcome.
    expect(evaluate(board, 'b')).toBeGreaterThan(0);
  });

  it('rewards a man staying on its own back row over advancing one row forward', () => {
    const onBackRow = emptyBoard();
    onBackRow[0] = { color: 'b', kind: 'man' }; // square 1: row 0, col 1 (black's back row, non-center column)
    const advancedOne = emptyBoard();
    advancedOne[5] = { color: 'b', kind: 'man' }; // square 6: row 1, col 2 (one row forward, still non-center)
    // Back-row bonus (8) exceeds the one-row advancement bonus (2) gained by
    // moving forward, and both squares are non-center columns (so the
    // center-column bonus is 0 for both, not a confound); the mobility
    // difference between a lone man on these two squares is at most ±2,
    // which can't overturn a 6-point margin.
    expect(evaluate(onBackRow, 'b')).toBeGreaterThan(evaluate(advancedOne, 'b'));
  });
});
