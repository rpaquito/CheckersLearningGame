import { describe, it, expect } from 'vitest';
import { candidatesForTarget, resolveCandidates, narrowCandidates } from './moveDisambiguation';
import { legalMovesFrom } from './moveGeneration';
import type { CheckersMove, Piece } from './types';

function fakeMove(overrides: Partial<CheckersMove>): CheckersMove {
  return { from: 1, to: 1, captures: [], promotes: false, path: [1], ...overrides };
}

describe('candidatesForTarget', () => {
  it('returns only the moves that land on the given square', () => {
    const moves = [fakeMove({ to: 8 }), fakeMove({ to: 22 }), fakeMove({ to: 8, captures: [5], path: [8] })];
    expect(candidatesForTarget(moves, 8)).toHaveLength(2);
    expect(candidatesForTarget(moves, 8).every((m) => m.to === 8)).toBe(true);
  });
});

describe('resolveCandidates', () => {
  it('resolves immediately when only one candidate remains', () => {
    const move = fakeMove({ to: 8 });
    expect(resolveCandidates([move], 0)).toEqual({ status: 'resolved', move });
  });

  it('reports the next distinguishing squares when two candidates diverge at the first hop', () => {
    const a = fakeMove({ to: 8, path: [15, 8] });
    const b = fakeMove({ to: 8, path: [31, 8] });
    expect(resolveCandidates([a, b], 0)).toEqual({ status: 'ambiguous', nextTargets: [15, 31], candidates: [a, b] });
  });

  it('reports a single forced next square when candidates are still tied at this depth', () => {
    const a = fakeMove({ to: 8, path: [15, 24, 8] });
    const b = fakeMove({ to: 8, path: [15, 31, 8] });
    // Both share path[0] === 15 -- the choice hasn't opened up yet, but
    // there's still more than one candidate, so this must stay 'ambiguous'
    // (never silently resolve to either one just because the next click
    // target happens to be a single square).
    expect(resolveCandidates([a, b], 0)).toEqual({ status: 'ambiguous', nextTargets: [15], candidates: [a, b] });
  });
});

describe('narrowCandidates', () => {
  it('filters down to candidates whose path matches the chosen square at the given index', () => {
    const a = fakeMove({ to: 8, path: [15, 24, 8] });
    const b = fakeMove({ to: 8, path: [15, 31, 8] });
    expect(narrowCandidates([a, b], 1, 24)).toEqual([a]);
    expect(narrowCandidates([a, b], 1, 31)).toEqual([b]);
  });
});

describe('disambiguation against a real ambiguous position', () => {
  // Real, engine-verified position (found via brute-force search over
  // king-heavy endgames, the same method the original reviewer used to
  // first prove this bug class exists). Black king on square 22, white
  // men on 11, 18, 26, 27, 19. Two DISTINCT legal capture chains from 22
  // both land on square 8 -- a short one capturing [18, 11] and a long
  // one capturing [26, 27, 19, 11] -- and two more both return to square
  // 22 itself (from === to), capturing all four white pieces in a
  // different order each way. This is CLAUDE.md's documented "from/to
  // alone can't disambiguate a capture chain" scenario, made real.
  function ambiguousBoard(): (Piece | null)[] {
    const board: (Piece | null)[] = new Array(32).fill(null);
    board[21] = { color: 'b', kind: 'king' }; // 22
    for (const s of [11, 18, 26, 27, 19]) board[s - 1] = { color: 'w', kind: 'man' };
    return board;
  }

  it('resolves the short route when the player narrows toward it', () => {
    const allMoves = legalMovesFrom(ambiguousBoard(), 'b', 22);
    const candidates = candidatesForTarget(allMoves, 8);
    expect(candidates).toHaveLength(2);

    const first = resolveCandidates(candidates, 0);
    expect(first.status).toBe('ambiguous');
    if (first.status !== 'ambiguous') throw new Error('expected ambiguous');
    expect(first.nextTargets.slice().sort((x, y) => x - y)).toEqual([15, 31]);

    const narrowed = narrowCandidates(candidates, 0, 15);
    const second = resolveCandidates(narrowed, 1);
    expect(second).toEqual({
      status: 'resolved',
      move: { from: 22, to: 8, captures: [18, 11], promotes: false, path: [15, 8] },
    });
  });

  it('resolves the long route when the player narrows toward it instead', () => {
    const allMoves = legalMovesFrom(ambiguousBoard(), 'b', 22);
    const candidates = candidatesForTarget(allMoves, 8);
    const narrowed = narrowCandidates(candidates, 0, 31);
    const resolved = resolveCandidates(narrowed, 1);
    expect(resolved).toEqual({
      status: 'resolved',
      move: { from: 22, to: 8, captures: [26, 27, 19, 11], promotes: false, path: [31, 24, 15, 8] },
    });
  });

  it('also disambiguates the two chains that loop back to the origin square (from === to)', () => {
    const allMoves = legalMovesFrom(ambiguousBoard(), 'b', 22);
    const candidates = candidatesForTarget(allMoves, 22);
    expect(candidates).toHaveLength(2);
    const first = resolveCandidates(candidates, 0);
    expect(first.status).toBe('ambiguous');
    if (first.status !== 'ambiguous') throw new Error('expected ambiguous');
    expect(first.nextTargets.slice().sort((x, y) => x - y)).toEqual([15, 31]);
  });
});
