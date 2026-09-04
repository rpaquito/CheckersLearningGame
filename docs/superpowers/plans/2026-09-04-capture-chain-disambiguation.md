# Capture-Chain Disambiguation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `useCheckersGame.makeMove` able to distinguish two legal capture chains that share a final square but capture different pieces, and give `/jogar` a minimal, board-native way to let the player pick between them in that rare case — closing the gap CLAUDE.md has documented since the rules-engine phase as deferred.

**Architecture:** `CheckersMove` gains a required `path: Square[]` field (the sequence of landing squares a route actually visits) computed by `moveGeneration.ts`'s existing recursive capture search — this makes every route's identity provably unique. A new, board-agnostic pure module (`lib/checkers/moveDisambiguation.ts`) turns a click sequence into a resolved move using nothing but `CheckersMove[]` arrays. `useCheckersGame.makeMove` changes from `(from, to) => boolean` to `(move: CheckersMove) => boolean`, matching by full route identity instead of guessing. `/jogar` gains a small `pendingChoice` state slice that only ever activates when the engine proves a click is genuinely ambiguous; every other click keeps today's exact one-click interaction and single-slide animation.

**Tech Stack:** TypeScript, React, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-04-capture-chain-disambiguation-design.md`

## Global Constraints

- No change to `CheckersBoard`, `InteractiveDemo`, `OpeningStudy`, `OpeningPractice`, or animation logic — none of them are affected by this feature (confirmed in the spec by grep: none call `useCheckersGame`, and the ambiguity can't arise in their curated positions).
- Every normal (unambiguous) move keeps today's exact one-click interaction and single-slide animation. The `pendingChoice` UI only ever activates when 2+ legal moves from the same square share a clicked destination.
- `path[path.length - 1] === to` always. For a simple move, `path = [to]`. `path.length === captures.length` for every capture move (one landing square per capture).
- `CheckersMove` is only ever constructed in `lib/checkers/moveGeneration.ts` (verified by grep for its required `promotes:` field) — every other file only consumes `CheckersMove` values, so making `path` required there is a type-level ripple everywhere else, never a logic change.
- `useCheckersGame.makeMove` has exactly one real caller, `app/jogar/page.tsx` (verified by grep) — its signature can change without touching any other production file.

---

## Task 1: `CheckersMove` gains a required `path` field, threaded through the engine and every consumer

**Files:**
- Modify: `lib/checkers/types.ts`
- Modify: `lib/checkers/moveGeneration.ts`
- Test: `lib/checkers/moveGeneration.test.ts`
- Modify (mechanical, `path` field only — see Step 6): `lib/checkers/inferMove.test.ts`, `lib/checkers/search.test.ts`, `lib/checkers/gradeMove.test.ts`, `lib/checkers/moveExplanation.test.ts`, `lib/checkers/checkersEngineClient.test.ts`, `lib/openings/replayLine.test.ts`, `components/CheckersBoard/CheckersBoard.test.tsx`

**Interfaces:**
- Produces: `CheckersMove.path: Square[]` (required). Consumed by Task 2 (`moveDisambiguation.ts`) and Task 3 (`useCheckersGame.makeMove`'s new matching logic).

- [ ] **Step 1: Add the field to the type (this alone breaks the build — expected)**

In `lib/checkers/types.ts`, replace:

```ts
export interface CheckersMove {
  from: Square;
  to: Square;
  captures: Square[]; // squares of captured pieces, in order, [] if a simple move
  promotes: boolean;  // true if this move ends with the piece becoming a king
}
```

with:

```ts
export interface CheckersMove {
  from: Square;
  to: Square;
  captures: Square[]; // squares of captured pieces, in order, [] if a simple move
  promotes: boolean;  // true if this move ends with the piece becoming a king
  /** The sequence of squares the piece actually LANDED on, in order --
   * intermediate capture landings followed by the final `to`. Always ends
   * with `to` (`path[path.length - 1] === to`). For a simple (non-
   * capturing) move, `path = [to]` (a single hop). This is the complete,
   * unambiguous identity of a route: two capture chains that capture
   * different pieces can never have the same `path`, even if they happen
   * to share the same final `to`. See lib/checkers/moveDisambiguation.ts. */
  path: Square[];
}
```

- [ ] **Step 2: Confirm the build is now broken (RED)**

Run: `npx tsc --noEmit`
Expected: many errors — `Property 'path' is missing in type '{ from: ...; }'` at every `CheckersMove` object literal across the project. This is the whole point of making `path` required: the compiler is now the checklist of every site that needs it, so nothing gets missed.

- [ ] **Step 3: Implement `path` in `moveGeneration.ts`**

Replace `simpleMovesFrom`:

```ts
export function simpleMovesFrom(board: Board, square: Square): CheckersMove[] {
  const piece = board[square - 1];
  if (!piece) return [];
  const moves: CheckersMove[] = [];
  for (const dir of directionsFor(piece)) {
    const to = neighbor(square, dir);
    if (to !== null && board[to - 1] === null) {
      moves.push({
        from: square,
        to,
        captures: [],
        promotes: piece.kind === 'man' && isBackRowFor(to, piece.color),
        path: [to],
      });
    }
  }
  return moves;
}
```

Replace `ChainResult`, `captureChainsFrom`, and `captureMovesFrom`:

```ts
interface ChainResult {
  to: Square;
  captures: Square[];
  promotes: boolean;
  path: Square[];
}

function captureChainsFrom(
  workingBoard: (Piece | null)[],
  color: Color,
  kind: PieceKind,
  current: Square,
  capturedSoFar: readonly Square[],
  pathSoFar: readonly Square[],
): ChainResult[] {
  const directions = kind === 'king' ? ALL_DIRECTIONS : FORWARD_DIRECTIONS[color];
  const results: ChainResult[] = [];

  for (const dir of directions) {
    const mid = neighbor(current, dir);
    if (mid === null) continue;
    const midPiece = workingBoard[mid - 1];
    if (!midPiece || midPiece.color === color) continue;
    if (capturedSoFar.includes(mid)) continue; // can't capture the same piece twice

    const landing = neighbor(mid, dir);
    if (landing === null) continue;
    if (workingBoard[landing - 1] !== null) continue;

    const nowCaptured = [...capturedSoFar, mid];
    const nowPath = [...pathSoFar, landing];
    const justPromoted = kind === 'man' && isBackRowFor(landing, color);

    if (justPromoted) {
      // A man reaching the king row stops immediately — it does not
      // continue capturing in the same turn as a newly-crowned king. See
      // design spec §2/§12 and CLAUDE.md's "promotion mid-chain" note.
      results.push({ to: landing, captures: nowCaptured, promotes: true, path: nowPath });
      continue;
    }

    // Temporarily relocate the piece for the recursive lookahead. Captured
    // pieces stay on the working board (matches official rules: they're
    // only removed once the whole move finishes), but the moving piece
    // itself must vacate `current` so a chain that loops back through its
    // own trail sees the correct occupancy.
    const savedCurrent = workingBoard[current - 1];
    workingBoard[current - 1] = null;
    workingBoard[landing - 1] = savedCurrent;
    const further = captureChainsFrom(workingBoard, color, kind, landing, nowCaptured, nowPath);
    workingBoard[landing - 1] = null;
    workingBoard[current - 1] = savedCurrent;

    if (further.length === 0) {
      results.push({ to: landing, captures: nowCaptured, promotes: false, path: nowPath });
    } else {
      results.push(...further);
    }
  }

  return results;
}

export function captureMovesFrom(board: Board, square: Square): CheckersMove[] {
  const piece = board[square - 1];
  if (!piece) return [];
  const working = board.slice() as (Piece | null)[];
  return captureChainsFrom(working, piece.color, piece.kind, square, [], []).map((r) => ({
    from: square,
    to: r.to,
    captures: r.captures,
    promotes: r.promotes,
    path: r.path,
  }));
}
```

`applyMove`, `hasAnyCapture`, `legalMovesFrom`, and `allLegalMoves` are unchanged — none of them construct or need `path` themselves.

- [ ] **Step 4: Update `moveGeneration.test.ts`'s existing assertions and add explicit `path` coverage**

Every `toEqual`/`applyMove(...)` call in this file that constructs or expects a `CheckersMove` shape needs `path` added. Apply these exact replacements (each is a single field addition, values computed and verified against the real engine before writing this plan):

Replace:
```ts
    expect(simpleMovesFrom(board, 12)).toEqual([
      { from: 12, to: 16, captures: [], promotes: false },
    ]);
```
with:
```ts
    expect(simpleMovesFrom(board, 12)).toEqual([
      { from: 12, to: 16, captures: [], promotes: false, path: [16] },
    ]);
```

Replace:
```ts
    expect(simpleMovesFrom(board, 21)).toEqual([
      { from: 21, to: 17, captures: [], promotes: false },
    ]);
```
with:
```ts
    expect(simpleMovesFrom(board, 21)).toEqual([
      { from: 21, to: 17, captures: [], promotes: false, path: [17] },
    ]);
```

Replace:
```ts
    expect(captureMovesFrom(board, 11)).toEqual([
      { from: 11, to: 18, captures: [15], promotes: false },
    ]);
```
with:
```ts
    expect(captureMovesFrom(board, 11)).toEqual([
      { from: 11, to: 18, captures: [15], promotes: false, path: [18] },
    ]);
```

Replace:
```ts
    expect(captureMovesFrom(board, 11)).toEqual([
      { from: 11, to: 25, captures: [15, 22], promotes: false },
    ]);
```
with:
```ts
    expect(captureMovesFrom(board, 11)).toEqual([
      { from: 11, to: 25, captures: [15, 22], promotes: false, path: [18, 25] },
    ]);
```

Replace:
```ts
    expect(captureMovesFrom(board, 22)).toEqual([
      { from: 22, to: 31, captures: [26], promotes: true },
    ]);
```
with:
```ts
    expect(captureMovesFrom(board, 22)).toEqual([
      { from: 22, to: 31, captures: [26], promotes: true, path: [31] },
    ]);
```

Replace:
```ts
    expect(captureMovesFrom(board, 18)).toEqual([
      { from: 18, to: 2, captures: [15, 7], promotes: false },
    ]);
```
with:
```ts
    expect(captureMovesFrom(board, 18)).toEqual([
      { from: 18, to: 2, captures: [15, 7], promotes: false, path: [11, 2] },
    ]);
```

Replace:
```ts
    const next = applyMove(board, { from: 11, to: 18, captures: [15], promotes: false });
```
with:
```ts
    const next = applyMove(board, { from: 11, to: 18, captures: [15], promotes: false, path: [18] });
```

Replace:
```ts
    const next = applyMove(board, { from: 22, to: 31, captures: [26], promotes: true });
```
with:
```ts
    const next = applyMove(board, { from: 22, to: 31, captures: [26], promotes: true, path: [31] });
```

Replace:
```ts
    applyMove(board, { from: 11, to: 15, captures: [], promotes: false });
```
with:
```ts
    applyMove(board, { from: 11, to: 15, captures: [], promotes: false, path: [15] });
```

Replace:
```ts
    expect(() => applyMove(board, { from: 1, to: 5, captures: [], promotes: false })).toThrow();
```
with:
```ts
    expect(() => applyMove(board, { from: 1, to: 5, captures: [], promotes: false, path: [5] })).toThrow();
```

Then add one new, explicit test to the `captureMovesFrom` describe block (after the "chains a double jump" test), making the `path` invariant its own assertion rather than only an incidental part of an existing one:

```ts
  it("a capture chain's path records every intermediate landing square, ending in `to`", () => {
    const board = emptyBoard();
    board[10] = { color: 'b', kind: 'man' }; // 11
    board[14] = { color: 'w', kind: 'man' }; // 15
    board[21] = { color: 'w', kind: 'man' }; // 22
    const [move] = captureMovesFrom(board, 11);
    expect(move.path).toEqual([18, 25]);
    expect(move.path[move.path.length - 1]).toBe(move.to);
  });
```

- [ ] **Step 5: Run `moveGeneration.test.ts` and `applyMove`'s tests, verify green**

Run: `npm run test -- moveGeneration`
Expected: PASS, including the new `path` test.

- [ ] **Step 6: Fix the `path` field into every other test file that constructs a `CheckersMove`**

Each of these is a single-field addition to an existing object literal — no logic changes, no new assertions. Every value below is either a trivial single-hop move (`path: [to]`, true for any move whose `captures` array has length ≤ 1) or was computed and verified against the real engine before this plan was written (the two multi-capture cases: `captures: [15, 22]` → `path: [18, 25]`, and `captures: [15, 7]` → `path: [11, 2]`).

**`lib/checkers/inferMove.test.ts`** — these are compared via `toEqual` against `inferMove`'s real output (which comes from `allLegalMoves`), so exact values matter:

Replace `const move = { from: 11, to: 15, captures: [], promotes: false };` with `const move = { from: 11, to: 15, captures: [], promotes: false, path: [15] };`

Replace `const move = { from: 11, to: 18, captures: [15], promotes: false };` with `const move = { from: 11, to: 18, captures: [15], promotes: false, path: [18] };`

Replace `const move = { from: 27, to: 31, captures: [], promotes: true };` with `const move = { from: 27, to: 31, captures: [], promotes: true, path: [31] };`

Replace `const move = { from: 11, to: 25, captures: [15, 22], promotes: false };` with `const move = { from: 11, to: 25, captures: [15, 22], promotes: false, path: [18, 25] };`

**`lib/checkers/search.test.ts`** — compared via `toEqual`/`toContainEqual` against real `findBestMove` output, all three are single-hop:

Replace `expect(result.move).toEqual({ from: 9, to: 13, captures: [], promotes: false });` with `expect(result.move).toEqual({ from: 9, to: 13, captures: [], promotes: false, path: [13] });`

Replace `expect(result.move).toEqual({ from: 18, to: 25, captures: [22], promotes: false });` with `expect(result.move).toEqual({ from: 18, to: 25, captures: [22], promotes: false, path: [25] });`

Replace `expect(result.move).toEqual({ from: 21, to: 25, captures: [], promotes: false });` with `expect(result.move).toEqual({ from: 21, to: 25, captures: [], promotes: false, path: [25] });`

**`lib/checkers/gradeMove.test.ts`** — the `blunderMove`/`betterMove` pair is compared via `toContainEqual` against real `allLegalMoves` output (both are single-hop simple moves):

Replace `const move: CheckersMove = { from: 11, to: 15, captures: [], promotes: false };` with `const move: CheckersMove = { from: 11, to: 15, captures: [], promotes: false, path: [15] };`

Replace `const blunderMove: CheckersMove = { from: 5, to: 9, captures: [], promotes: false };` with `const blunderMove: CheckersMove = { from: 5, to: 9, captures: [], promotes: false, path: [9] };`

Replace `const betterMove: CheckersMove = { from: 6, to: 9, captures: [], promotes: false };` with `const betterMove: CheckersMove = { from: 6, to: 9, captures: [], promotes: false, path: [9] };`

**`lib/checkers/moveExplanation.test.ts`** — these moves are only ever passed as opaque input to text-generation functions (never compared structurally), so `path` here only needs to satisfy the type, not match a real board:

Replace `const move = { from: 11, to: 18, captures: [15], promotes: false };` (appears 3 times, at the "describes a single capture", "returns English phrases", and inside `describeMoveForToast`'s first test) with `const move = { from: 11, to: 18, captures: [15], promotes: false, path: [18] };` in each place.

Replace `const move = { from: 11, to: 29, captures: [15, 22], promotes: false };` with `const move = { from: 11, to: 29, captures: [15, 22], promotes: false, path: [18, 29] };`

Replace `const move = { from: 25, to: 29, captures: [], promotes: true };` with `const move = { from: 25, to: 29, captures: [], promotes: true, path: [29] };`

Replace `const move = { from: 11, to: 15, captures: [], promotes: false };` with `const move = { from: 11, to: 15, captures: [], promotes: false, path: [15] };`

Replace `const move = { from: 1, to: 6, captures: [], promotes: false }; // 6 is (row 1, col 2)` with `const move = { from: 1, to: 6, captures: [], promotes: false, path: [6] }; // 6 is (row 1, col 2)`

Replace `const move = { from: 6, to: 10, captures: [], promotes: false }; // 10 is (row 2, col 3) -- a center column` with `const move = { from: 6, to: 10, captures: [], promotes: false, path: [10] }; // 10 is (row 2, col 3) -- a center column`

Replace `const move = { from: 21, to: 25, captures: [], promotes: false };` (appears twice) with `const move = { from: 21, to: 25, captures: [], promotes: false, path: [25] };` in each place.

Replace `const move = { from: 9, to: 13, captures: [], promotes: false };` with `const move = { from: 9, to: 13, captures: [], promotes: false, path: [13] };`

**`lib/checkers/checkersEngineClient.test.ts`** — passed through a fake worker, never inspected structurally (3 occurrences, all identical):

Replace every `{ from: 11, to: 15, captures: [], promotes: false }` with `{ from: 11, to: 15, captures: [], promotes: false, path: [15] }`.

**`lib/openings/replayLine.test.ts`** — compared via `toEqual` against real `replayLine` output:

Replace `expect(result[0].move).toEqual({ from: 11, to: 15, captures: [], promotes: false });` with `expect(result[0].move).toEqual({ from: 11, to: 15, captures: [], promotes: false, path: [15] });`

Replace `expect(result[1].move).toEqual({ from: 23, to: 19, captures: [], promotes: false });` with `expect(result[1].move).toEqual({ from: 23, to: 19, captures: [], promotes: false, path: [19] });`

**`components/CheckersBoard/CheckersBoard.test.tsx`** — a prop value and two `applyMove` inputs, never inspected structurally:

Replace `suggestedMove={{ from: 11, to: 15, captures: [], promotes: false }}` with `suggestedMove={{ from: 11, to: 15, captures: [], promotes: false, path: [15] }}`

Replace `const move = { from: 11, to: 15, captures: [], promotes: false };` with `const move = { from: 11, to: 15, captures: [], promotes: false, path: [15] };`

Replace `const move = { from: 11, to: 18, captures: [15], promotes: false };` with `const move = { from: 11, to: 18, captures: [15], promotes: false, path: [18] };`

- [ ] **Step 7: Verify the whole project compiles and every test passes**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run test`
Expected: 100% passing (this includes `useCheckersGame.test.ts` still passing UNCHANGED at this point — Task 3 is what rewrites that file's `makeMove` call sites; this task does not touch `useCheckersGame.ts` or its test at all, since none of its `CheckersMove` object literals needed a `path` field added by grep — confirm this is still true by re-running the grep: `grep -n "captures:" lib/checkers/useCheckersGame.test.ts` should show nothing, since that file never constructs a `CheckersMove` literal itself).

- [ ] **Step 8: Commit**

```bash
git add lib/checkers/types.ts lib/checkers/moveGeneration.ts lib/checkers/moveGeneration.test.ts lib/checkers/inferMove.test.ts lib/checkers/search.test.ts lib/checkers/gradeMove.test.ts lib/checkers/moveExplanation.test.ts lib/checkers/checkersEngineClient.test.ts lib/openings/replayLine.test.ts components/CheckersBoard/CheckersBoard.test.tsx
git commit -m "feat: add path field to CheckersMove, threaded through the engine

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PSoURGNKX7i2buwPDDsGQC"
git push origin main
```

---

## Task 2: New `lib/checkers/moveDisambiguation.ts` module

**Files:**
- Create: `lib/checkers/moveDisambiguation.ts`
- Test: `lib/checkers/moveDisambiguation.test.ts`

**Interfaces:**
- Consumes: `CheckersMove` (`lib/checkers/types.ts`, with `path` from Task 1), `legalMovesFrom` (`lib/checkers/moveGeneration.ts`, for the integration test only).
- Produces: `candidatesForTarget(moves: CheckersMove[], to: Square): CheckersMove[]`, `MoveResolution` (`{status:'resolved', move} | {status:'ambiguous', nextTargets: Square[], candidates: CheckersMove[]}`), `resolveCandidates(candidates: CheckersMove[], chosenPrefixLength: number): MoveResolution`, `narrowCandidates(candidates: CheckersMove[], index: number, chosenSquare: Square): CheckersMove[]`. Consumed by Task 4 (`app/jogar/page.tsx`).

- [ ] **Step 1: Write the failing tests**

Create `lib/checkers/moveDisambiguation.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- moveDisambiguation`
Expected: FAIL with "Cannot find module './moveDisambiguation'" (the module doesn't exist yet).

- [ ] **Step 3: Implement the module**

Create `lib/checkers/moveDisambiguation.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- moveDisambiguation`
Expected: PASS, all 8 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/checkers/moveDisambiguation.ts lib/checkers/moveDisambiguation.test.ts
git commit -m "feat: add lib/checkers/moveDisambiguation.ts

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PSoURGNKX7i2buwPDDsGQC"
git push origin main
```

---

## Task 3: `useCheckersGame.makeMove` takes a `CheckersMove`, not `(from, to)`

**Files:**
- Modify: `lib/checkers/useCheckersGame.ts`
- Test: `lib/checkers/useCheckersGame.test.ts`
- Modify: `CLAUDE.md`

**Interfaces:**
- Produces: `UseCheckersGameResult.makeMove: (move: CheckersMove) => boolean` (was `(from: Square, to: Square) => boolean`). Consumed by Task 4 (`app/jogar/page.tsx`).

- [ ] **Step 1: Update the interface and implementation**

In `lib/checkers/useCheckersGame.ts`, replace:

```ts
export interface UseCheckersGameResult {
  state: CheckersGameState;
  legalMovesFrom: (square: Square) => Square[];
  makeMove: (from: Square, to: Square) => boolean;
  reset: () => void;
}
```

with:

```ts
export interface UseCheckersGameResult {
  state: CheckersGameState;
  legalMovesFrom: (square: Square) => Square[];
  makeMove: (move: CheckersMove) => boolean;
  reset: () => void;
}
```

Replace the `makeMove` implementation:

```ts
  const makeMove = useCallback((from: Square, to: Square): boolean => {
    const current = gameRef.current;
    // Tie-break, documented (see CLAUDE.md): if a piece has multiple legal
    // capture chains that share the same final `to` but capture different
    // pieces (rare -- needs 3+ simultaneous routes, endgame-only), the
    // first one found wins, deterministically. No disambiguation UI yet.
    const move = legalMovesFromEngine(current.board, current.turn, from).find((m) => m.to === to);
    if (!move) return false;
    const nextBoard = applyMove(current.board, move) as (Piece | null)[];
    const nextTurn: Color = current.turn === 'b' ? 'w' : 'b';
    const nextPlySinceLastCapture = move.captures.length > 0 ? 0 : current.plySinceLastCapture + 1;
    const key = boardKey(nextBoard, nextTurn);
    const counts = new Map(current.positionCounts);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    const next: PersistedGame = {
      board: nextBoard,
      turn: nextTurn,
      lastMove: move,
      plySinceLastCapture: nextPlySinceLastCapture,
      positionCounts: Array.from(counts.entries()),
    };
    gameRef.current = next; // stays fresh even if called again before a re-render
    setGame(next);
    return true;
  }, []);
```

with:

```ts
  const makeMove = useCallback((move: CheckersMove): boolean => {
    const current = gameRef.current;
    // Re-derives legal moves from the CURRENT state (never trusts the
    // caller blindly -- guards against a stale closure the same way the
    // old (from, to) version did) and matches on the full move shape,
    // `path` included. `path` makes every route provably unique (see
    // types.ts), so unlike the old `.find(m => m.to === to)` version,
    // this can never silently substitute a different legal route that
    // happens to share the same `to` -- see CLAUDE.md's "Known design
    // constraint for the future board UI" entry, closed by this change.
    const candidates = legalMovesFromEngine(current.board, current.turn, move.from);
    const matched = candidates.find(
      (m) =>
        m.to === move.to &&
        m.promotes === move.promotes &&
        m.captures.length === move.captures.length &&
        m.captures.every((c, i) => c === move.captures[i]) &&
        m.path.length === move.path.length &&
        m.path.every((p, i) => p === move.path[i]),
    );
    if (!matched) return false;
    const nextBoard = applyMove(current.board, matched) as (Piece | null)[];
    const nextTurn: Color = current.turn === 'b' ? 'w' : 'b';
    const nextPlySinceLastCapture = matched.captures.length > 0 ? 0 : current.plySinceLastCapture + 1;
    const key = boardKey(nextBoard, nextTurn);
    const counts = new Map(current.positionCounts);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    const next: PersistedGame = {
      board: nextBoard,
      turn: nextTurn,
      lastMove: matched,
      plySinceLastCapture: nextPlySinceLastCapture,
      positionCounts: Array.from(counts.entries()),
    };
    gameRef.current = next; // stays fresh even if called again before a re-render
    setGame(next);
    return true;
  }, []);
```

- [ ] **Step 2: Rewrite every `makeMove` call site in the test file**

Replace the full contents of `lib/checkers/useCheckersGame.test.ts`:

```ts
// lib/checkers/useCheckersGame.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCheckersGame, clearSavedGame, STORAGE_KEY } from './useCheckersGame';
import type { Piece } from './types';

describe('useCheckersGame', () => {
  beforeEach(() => {
    clearSavedGame();
  });

  it('starts with the standard initial position and black to move', () => {
    const { result } = renderHook(() => useCheckersGame(false));
    expect(result.current.state.turn).toBe('b');
    expect(result.current.state.status).toBe('playing');
    expect(result.current.state.board[10]).toEqual({ color: 'b', kind: 'man' }); // square 11
  });

  it('makeMove applies a legal move and flips the turn', () => {
    const { result } = renderHook(() => useCheckersGame(false));
    act(() => {
      expect(result.current.makeMove({ from: 11, to: 15, captures: [], promotes: false, path: [15] })).toBe(true);
    });
    expect(result.current.state.turn).toBe('w');
    expect(result.current.state.board[10]).toBeNull();
    expect(result.current.state.board[14]).toEqual({ color: 'b', kind: 'man' });
    expect(result.current.state.lastMove).toEqual({ from: 11, to: 15, captures: [], promotes: false, path: [15] });
  });

  it('makeMove rejects an illegal move and returns false', () => {
    const { result } = renderHook(() => useCheckersGame(false));
    act(() => {
      // 20 is not a real diagonal neighbor of 11 -- no legal move matches this shape.
      expect(result.current.makeMove({ from: 11, to: 20, captures: [], promotes: false, path: [20] })).toBe(false);
    });
    expect(result.current.state.turn).toBe('b');
  });

  it('legalMovesFrom reflects the mandatory-capture rule', () => {
    const { result } = renderHook(() => useCheckersGame(false));
    act(() => {
      result.current.makeMove({ from: 11, to: 15, captures: [], promotes: false, path: [15] });
    });
    act(() => {
      // NOT 23-19 -- that's the real checkers "exchange" line: 15 and 19 end
      // up diagonally adjacent with an open landing square, which would
      // hand black a mandatory capture and defeat the point of this test.
      // 24-20 is a genuinely quiet reply, nowhere near black's man at 15.
      result.current.makeMove({ from: 24, to: 20, captures: [], promotes: false, path: [20] });
    });
    // Black to move again with no forced capture -- square 9 has its normal simple moves.
    expect(result.current.legalMovesFrom(9).sort((a, b) => a - b)).toEqual([13, 14]);
  });

  it('state.mandatoryCaptureSquares contains exactly the one black piece that must capture', () => {
    // Sequence verified directly against the engine (moveGeneration.ts) via
    // a scripted run before writing this assertion: 11-15, 22-18 leaves
    // black to move with 12 pieces on the board (1-10, 12, 15), and only
    // square 15 has a legal (forced) capture -- 15x22 landing on 18's
    // square after capturing white's man there. Every other black piece
    // (including 9, 10, 12) has no capture available, so they must sit out.
    const { result } = renderHook(() => useCheckersGame(false));
    act(() => {
      expect(result.current.makeMove({ from: 11, to: 15, captures: [], promotes: false, path: [15] })).toBe(true);
    });
    act(() => {
      result.current.makeMove({ from: 22, to: 18, captures: [], promotes: false, path: [18] });
    });
    expect(result.current.state.turn).toBe('b');
    expect(result.current.state.mandatoryCaptureSquares).toEqual([15]);
  });

  it('reset returns to the initial position', () => {
    const { result } = renderHook(() => useCheckersGame(false));
    act(() => {
      result.current.makeMove({ from: 11, to: 15, captures: [], promotes: false, path: [15] });
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.state.turn).toBe('b');
    expect(result.current.state.board[10]).toEqual({ color: 'b', kind: 'man' });
  });

  it('persists to localStorage when persist=true and reloads on next mount', () => {
    const first = renderHook(() => useCheckersGame(true));
    act(() => {
      first.result.current.makeMove({ from: 11, to: 15, captures: [], promotes: false, path: [15] });
    });
    first.unmount();
    // Confirms the hook actually persists under the real, documented
    // storage key (not just "some key") -- STORAGE_KEY is otherwise only
    // ever imported, never asserted against.
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    const second = renderHook(() => useCheckersGame(true));
    expect(second.result.current.state.turn).toBe('w');
    expect(second.result.current.state.board[14]).toEqual({ color: 'b', kind: 'man' });
  });

  it('never writes the fresh initial game to localStorage while hydrating a real saved game', () => {
    // Regression test for the hydration race documented in CLAUDE.md: the
    // persistence effect must never fire with a pre-hydration closure value.
    // A stale write here (turn: 'b', the fresh starting position) instead of
    // the real hydrated save (turn: 'w', after 11-15) is exactly how a real
    // saved game gets silently clobbered if the tab closes at the wrong
    // moment -- see "useCheckersGame persistence follows the SSR-hydration-
    // safe pattern from day one" in CLAUDE.md.
    const first = renderHook(() => useCheckersGame(true));
    act(() => {
      first.result.current.makeMove({ from: 11, to: 15, captures: [], promotes: false, path: [15] });
    });
    first.unmount();

    // Spying on the `window.localStorage` instance directly doesn't
    // intercept calls under jsdom (its Storage instances don't route method
    // calls through instance-own properties the way vi.spyOn needs) --
    // Storage.prototype is the spy target that actually observes real calls.
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    renderHook(() => useCheckersGame(true));

    const writesToStorageKey = setItemSpy.mock.calls.filter(([key]) => key === STORAGE_KEY);
    expect(writesToStorageKey.length).toBeGreaterThan(0);
    for (const [, value] of writesToStorageKey) {
      const written = JSON.parse(value as string);
      expect(written.turn).toBe('w');
    }
    setItemSpy.mockRestore();
  });

  it('falls back to a fresh initial game when localStorage holds structurally-invalid JSON', () => {
    // Syntactically valid JSON (JSON.parse succeeds) but the wrong shape: a
    // 3-element board instead of 32. Without the shape check this reaches
    // setGame and then crashes later during render (computeStatus ->
    // allLegalMoves -> board[s-1] access assumes a 32-length board).
    window.localStorage.setItem(STORAGE_KEY, '{"board": [1,2,3], "turn": "b"}');
    const { result } = renderHook(() => useCheckersGame(true));
    expect(result.current.state.turn).toBe('b');
    expect(result.current.state.status).toBe('playing');
    expect(result.current.state.board[10]).toEqual({ color: 'b', kind: 'man' }); // square 11
    expect(result.current.state.board.length).toBe(32);
  });

  it('makeMove returns the correct result for every call, not just the first', () => {
    const { result } = renderHook(() => useCheckersGame(false));
    act(() => {
      expect(result.current.makeMove({ from: 11, to: 15, captures: [], promotes: false, path: [15] })).toBe(true);
    });
    act(() => {
      // white's known-quiet reply, see Task 8's plan comment
      expect(result.current.makeMove({ from: 24, to: 20, captures: [], promotes: false, path: [20] })).toBe(true);
    });
    act(() => {
      // 99 is never a real square target -- illegal
      expect(result.current.makeMove({ from: 11, to: 99, captures: [], promotes: false, path: [99] })).toBe(false);
    });
    act(() => {
      // fourth call -- still correct
      expect(result.current.makeMove({ from: 9, to: 13, captures: [], promotes: false, path: [13] })).toBe(true);
    });
  });

  it('makeMove disambiguates two capture chains that share a final square but capture different pieces', () => {
    // Same real, engine-verified ambiguous position as
    // lib/checkers/moveDisambiguation.test.ts: black king on 22, white men
    // on 11, 18, 26, 27, 19. Loaded via localStorage hydration (the hook
    // has no other way to start from an arbitrary position) -- same
    // technique the "falls back to a fresh initial game" test above
    // already uses.
    function ambiguousPersistedGame() {
      const board: (Piece | null)[] = new Array(32).fill(null);
      board[21] = { color: 'b', kind: 'king' }; // 22
      for (const s of [11, 18, 26, 27, 19]) board[s - 1] = { color: 'w', kind: 'man' };
      return { board, turn: 'b' as const, lastMove: null, plySinceLastCapture: 0, positionCounts: [] };
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ambiguousPersistedGame()));
    const shortRoute = renderHook(() => useCheckersGame(true));
    act(() => {
      expect(
        shortRoute.result.current.makeMove({ from: 22, to: 8, captures: [18, 11], promotes: false, path: [15, 8] }),
      ).toBe(true);
    });
    // Short route captured 18 and 11 -- 26/27/19 are untouched.
    expect(shortRoute.result.current.state.board[25]).toEqual({ color: 'w', kind: 'man' }); // 26 survives
    expect(shortRoute.result.current.state.board[26]).toEqual({ color: 'w', kind: 'man' }); // 27 survives
    expect(shortRoute.result.current.state.board[18]).toEqual({ color: 'w', kind: 'man' }); // 19 survives
    expect(shortRoute.result.current.state.board[10]).toBeNull(); // 11 captured
    expect(shortRoute.result.current.state.board[17]).toBeNull(); // 18 captured

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ambiguousPersistedGame()));
    const longRoute = renderHook(() => useCheckersGame(true));
    act(() => {
      expect(
        longRoute.result.current.makeMove({
          from: 22,
          to: 8,
          captures: [26, 27, 19, 11],
          promotes: false,
          path: [31, 24, 15, 8],
        }),
      ).toBe(true);
    });
    // Long route captured all four white pieces.
    expect(longRoute.result.current.state.board[25]).toBeNull(); // 26 captured
    expect(longRoute.result.current.state.board[26]).toBeNull(); // 27 captured
    expect(longRoute.result.current.state.board[18]).toBeNull(); // 19 captured
    expect(longRoute.result.current.state.board[10]).toBeNull(); // 11 captured
    expect(longRoute.result.current.state.board[17]).toEqual({ color: 'w', kind: 'man' }); // 18 survives here
  });
});
```

- [ ] **Step 3: Run the tests to verify they pass**

Run: `npm run test -- useCheckersGame`
Expected: PASS, all 11 tests (10 rewritten + 1 new).

- [ ] **Step 4: Update CLAUDE.md's now-obsolete tie-break paragraph**

Find the entry titled `` `makeMove`'s return value is now reliable on every call — and its tie-break is documented, not solved `` in `CLAUDE.md`. Its second paragraph currently reads:

> Separately, `makeMove(from, to)` cannot disambiguate two distinct legal
> capture chains that happen to share the same final `to` square while
> capturing different pieces along the way (possible in checkers — a king
> with 3+ available routes to the same landing square). This is rare
> (verified via brute-force search: needs 3+ simultaneous routes, only seen
> in synthetic king-heavy endgame positions, never in 34k+ plies of random
> play from the opening) and is resolved by taking the first match found —
> deterministic, but not driven by any explicit choice. A capture chain can
> also legally return to its own origin square (`from === to`) for a king
> looping back through several jumps. Neither case has a UI resolution yet
> — if/when it needs one, step-by-step landing-square selection (the way
> real checkers UIs work) is the natural fix, requiring the board component
> to expose per-hop choices rather than a single final destination.

Replace it with:

> **Fixed**, in a later phase (see "Capture-chain disambiguation" below):
> `CheckersMove` gained a `path: Square[]` field recording every landing
> square a route visits, making each route's identity provably unique even
> when two chains share the same final `to` or one loops back to its own
> origin square (`from === to`). `makeMove` now takes a full `CheckersMove`
> and matches on it exactly — there is no longer a representation ambiguous
> enough for a wrong route to be silently substituted.

Also retitle the entry itself, from:

```
### `makeMove`'s return value is now reliable on every call — and its tie-break is documented, not solved
```

to:

```
### `makeMove`'s return value is reliable on every call, and its route-identity ambiguity is fixed
```

- [ ] **Step 5: Commit**

```bash
git add lib/checkers/useCheckersGame.ts lib/checkers/useCheckersGame.test.ts CLAUDE.md
git commit -m "feat: change useCheckersGame.makeMove to take a full CheckersMove

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PSoURGNKX7i2buwPDDsGQC"
git push origin main
```

---

## Task 4: `/jogar` gets a `pendingChoice` flow for the rare ambiguous case

**Files:**
- Modify: `app/jogar/page.tsx`

**Interfaces:**
- Consumes: `candidatesForTarget`/`resolveCandidates`/`narrowCandidates`/`MoveResolution` (Task 2), `makeMove(move: CheckersMove)` (Task 3).

- [ ] **Step 1: Add the new import**

In `app/jogar/page.tsx`, add this import alongside the existing `moveGeneration` import:

```tsx
import { candidatesForTarget, narrowCandidates, resolveCandidates } from '@/lib/checkers/moveDisambiguation';
```

- [ ] **Step 2: Add the `pendingChoice` state**

Find:

```tsx
  const { state, legalMovesFrom, makeMove, reset } = useCheckersGame(true);
  const [selected, setSelected] = useState<Square | null>(null);
```

Replace with:

```tsx
  const { state, legalMovesFrom, makeMove, reset } = useCheckersGame(true);
  const [selected, setSelected] = useState<Square | null>(null);
  // Only ever set when a clicked destination genuinely has 2+ distinct
  // legal routes (rare -- needs a king with 3+ simultaneous capture
  // routes, see CLAUDE.md's "Capture-chain disambiguation" entry). Every
  // normal move resolves in one click and never touches this state.
  const [pendingChoice, setPendingChoice] = useState<{
    from: Square;
    candidates: CheckersMove[];
    prefixLength: number;
    nextTargets: Square[];
  } | null>(null);
```

- [ ] **Step 3: Update the AI-move effect**

Find:

```tsx
      .then((move) => {
        if (cancelled) return;
        if (!makeMove(move.from, move.to)) {
          console.error('[jogar] engine returned a move the game rejected:', move);
          setEngineError(true);
        }
      })
```

Replace with:

```tsx
      .then((move) => {
        if (cancelled) return;
        if (!makeMove(move)) {
          console.error('[jogar] engine returned a move the game rejected:', move);
          setEngineError(true);
        }
      })
```

- [ ] **Step 4: Update `legalTargets` and rewrite `handleSquareClick`**

Find:

```tsx
  const legalTargets = selected !== null ? legalMovesFrom(selected) : [];

  function handleSquareClick(square: Square) {
    if (state.isGameOver) return;
    if (isAiMode && state.turn === aiColor) return;

    if (selected !== null && legalTargets.includes(square)) {
      if (learningModeEnabled) {
        pendingGradeRef.current = { boardBeforeMove: state.board, moverColor: state.turn };
      }
      const playedMove = legalMovesFromEngine(state.board, state.turn, selected).find((m) => m.to === square);
      makeMove(selected, square);
      setSelected(null);
      if (playedMove) {
        if (playedMove.promotes) {
          hapticKinged();
        } else if (playedMove.captures.length > 0) {
          hapticCapture();
        } else {
          hapticMove();
        }
      }
      return;
    }

    const piece = state.board[square - 1];
    if (piece && piece.color === state.turn) {
      setSelected((prev) => (prev === square ? null : square));
    } else {
      setSelected(null);
    }
  }
```

Replace with:

```tsx
  const legalTargets = pendingChoice
    ? pendingChoice.nextTargets
    : selected !== null
      ? legalMovesFrom(selected)
      : [];

  function commitMove(move: CheckersMove) {
    if (learningModeEnabled) {
      pendingGradeRef.current = { boardBeforeMove: state.board, moverColor: state.turn };
    }
    const ok = makeMove(move);
    if (ok) {
      if (move.promotes) {
        hapticKinged();
      } else if (move.captures.length > 0) {
        hapticCapture();
      } else {
        hapticMove();
      }
    }
  }

  function handleSquareClick(square: Square) {
    if (state.isGameOver) return;
    if (isAiMode && state.turn === aiColor) return;

    if (pendingChoice) {
      if (pendingChoice.nextTargets.includes(square)) {
        const narrowed = narrowCandidates(pendingChoice.candidates, pendingChoice.prefixLength, square);
        const resolution = resolveCandidates(narrowed, pendingChoice.prefixLength + 1);
        if (resolution.status === 'resolved') {
          commitMove(resolution.move);
          setPendingChoice(null);
          setSelected(null);
        } else {
          setPendingChoice({
            from: pendingChoice.from,
            candidates: narrowed,
            prefixLength: pendingChoice.prefixLength + 1,
            nextTargets: resolution.nextTargets,
          });
        }
        return;
      }
      // Click outside the current narrowed choices -- cancel and fall
      // through to normal selection handling below.
      setPendingChoice(null);
    }

    // Recomputed fresh here rather than reusing the outer `legalTargets`
    // const: while `pendingChoice` was active a moment ago, that const
    // still reflects the (now-cancelled) narrowed target list from this
    // same render, not the real full legal-move list for `selected`.
    const currentTargets = selected !== null ? legalMovesFrom(selected) : [];
    if (selected !== null && currentTargets.includes(square)) {
      const allMoves = legalMovesFromEngine(state.board, state.turn, selected);
      const candidates = candidatesForTarget(allMoves, square);
      const resolution = resolveCandidates(candidates, 0);
      if (resolution.status === 'resolved') {
        commitMove(resolution.move);
        setSelected(null);
      } else {
        setPendingChoice({ from: selected, candidates, prefixLength: 0, nextTargets: resolution.nextTargets });
      }
      return;
    }

    const piece = state.board[square - 1];
    if (piece && piece.color === state.turn) {
      setSelected((prev) => (prev === square ? null : square));
    } else {
      setSelected(null);
    }
  }
```

- [ ] **Step 5: Clear `pendingChoice` on reset**

Find:

```tsx
  function doReset() {
    reset();
    setSelected(null);
    setEngineError(false);
    setGameEndOpen(false);
  }
```

Replace with:

```tsx
  function doReset() {
    reset();
    setSelected(null);
    setPendingChoice(null);
    setEngineError(false);
    setGameEndOpen(false);
  }
```

- [ ] **Step 6: Type-check, lint, and run the full test suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

Run: `npm run test`
Expected: 100% passing. `/jogar` has no dedicated test file (an established precedent in this repo, per CLAUDE.md's "`/jogar/page.tsx` has no dedicated test file" entry) — this step confirms no other test broke.

- [ ] **Step 7: Manual verification with the dev server**

Run `npm run dev`, then using a browser tool, confirm the NORMAL (unambiguous) path is completely unaffected — this is the important check, since the ambiguous case is essentially unreachable through real play:

1. Play a few ordinary moves (simple moves and captures) in both local two-player and vs-computer mode. Each should still commit in exactly one click, with the same slide/capture-fade animation as before.
2. Trigger a multi-jump capture (e.g. reach a position with a double-jump available) and confirm it still resolves in one click, landing at the final square with a single slide animation — not stepwise.
3. Trigger a promotion and confirm the haptic/visual feedback is unchanged.
4. Confirm Learning Mode's move-quality toast still appears after a human move (exercises `commitMove`'s `pendingGradeRef` wiring).

There is no realistic way to reach the ambiguous branch through normal play (it requires a synthetic king-heavy endgame not reachable from the opening) — Task 2's and Task 3's automated tests are the real verification for that path; this manual pass exists only to confirm the refactor didn't regress the common case.

- [ ] **Step 8: Commit**

```bash
git add app/jogar/page.tsx
git commit -m "feat: add pendingChoice disambiguation flow to /jogar

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PSoURGNKX7i2buwPDDsGQC"
git push origin main
```

---

## Task 5: Final verification and CLAUDE.md cleanup

**Files:** Modify: `CLAUDE.md`

- [ ] **Step 1: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Lint the whole project**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Run the full test suite**

Run: `npm run test`
Expected: 100% passing.

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: build succeeds (re-confirms `/jogar`'s `useSearchParams()`/`Suspense` boundary is still intact).

- [ ] **Step 5: Mark the historical CLAUDE.md entry**

Find the entry titled `` Known design constraint for the future board UI: `from`/`to` alone can't always disambiguate a capture chain `` in `CLAUDE.md`. Replace its title with:

```
### Known design constraint for the future board UI: `from`/`to` alone can't always disambiguate a capture chain (fixed)
```

And add this paragraph immediately after the entry's existing text:

> **Fixed** in the capture-chain-disambiguation phase: `CheckersMove` gained
> a `path: Square[]` field (see the `` `makeMove`'s return value... `` entry
> above), and `app/jogar/page.tsx` gained a `pendingChoice` state slice that
> activates only when `lib/checkers/moveDisambiguation.ts` proves a clicked
> destination is genuinely ambiguous — the player clicks through the
> distinguishing squares until only one route remains, which then commits
> automatically. Every unambiguous move (the overwhelming majority, every
> normal multi-jump capture included) keeps the exact one-click interaction
> and single-slide animation this entry originally described as unaffected.

- [ ] **Step 6: Commit and push**

```bash
git add CLAUDE.md
git status
git commit -m "docs: close out the capture-chain disambiguation CLAUDE.md entries

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PSoURGNKX7i2buwPDDsGQC"
git push origin main
```

---

## Self-Review Notes

- **Spec coverage:** §3 (`path` field) → Task 1. §4 (`moveDisambiguation.ts`) → Task 2. §5 (`makeMove` signature) → Task 3. §6 (`/jogar` state machine) → Task 4. §7 (testing — engine `path` coverage, pure-function unit tests, hook-level end-to-end ambiguity test, `/jogar` manual verification) → each task's own steps. §8 (CLAUDE.md migration notes) → Task 3 Step 4 and Task 5 Step 5.
- **Placeholder scan:** no TBD/TODO; every step has literal, complete code, and every `path` value used across all 13 modified files was either trivially derived (`path: [to]` for any single-hop/simple move) or computed and independently verified against the real engine before this plan was written (the two moveGeneration.test.ts/inferMove.test.ts multi-capture cases, and the four-route ambiguous position used in Task 2 and Task 3).
- **Type consistency:** `CheckersMove.path: Square[]` (Task 1) is consumed identically by `moveDisambiguation.ts` (Task 2, `candidatesForTarget`/`resolveCandidates`/`narrowCandidates` all operate on `c.path`) and by `useCheckersGame.makeMove`'s new matching logic (Task 3, `m.path.every(...)`). `pendingChoice`'s shape in Task 4 (`{from, candidates, prefixLength, nextTargets}`) matches exactly what `resolveCandidates`'s `MoveResolution` and `narrowCandidates`'s signature produce/consume from Task 2 — no renamed fields between tasks.
