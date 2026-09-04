import type { CheckersMove, Square } from './types';

// Turns a click sequence into a resolved move, using nothing but
// CheckersMove[] arrays -- no Board, no React, fully independent of how
// (or whether) a UI ever calls it. See CLAUDE.md's "Known design
// constraint for the future board UI" entry and design spec
// docs/superpowers/specs/2026-09-04-capture-chain-disambiguation-design.md
// for why this exists: two legal capture chains from the same square can
// share a final `to` while capturing different pieces along the way, and
// `path` (see types.ts) is what makes each route provably distinct.

/** Legal moves from a square that land on a specific clicked destination. */
export function candidatesForTarget(moves: CheckersMove[], to: Square): CheckersMove[] {
  return moves.filter((m) => m.to === to);
}

export type MoveResolution =
  | { status: 'resolved'; move: CheckersMove }
  | { status: 'ambiguous'; nextTargets: Square[]; candidates: CheckersMove[] };

/**
 * Given a set of candidate moves already narrowed to a shared destination
 * (or a shared path prefix beyond that), decides whether the choice is
 * already unique or what squares to offer next to narrow it further.
 * `chosenPrefixLength` is how many entries of each candidate's `path`
 * have already been fixed by earlier clicks (0 on the very first click,
 * before anything has been chosen).
 */
export function resolveCandidates(candidates: CheckersMove[], chosenPrefixLength: number): MoveResolution {
  if (candidates.length === 1) return { status: 'resolved', move: candidates[0] };
  const nextTargets = Array.from(new Set(candidates.map((c) => c.path[chosenPrefixLength])));
  return { status: 'ambiguous', nextTargets, candidates };
}

/**
 * Filters candidates down to the ones whose path continues through the
 * square the player just clicked, at the given prefix index. The caller
 * re-runs resolveCandidates on the result with `index + 1`.
 */
export function narrowCandidates(candidates: CheckersMove[], index: number, chosenSquare: Square): CheckersMove[] {
  return candidates.filter((c) => c.path[index] === chosenSquare);
}
