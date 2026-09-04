# Capture-chain disambiguation — design

Closes a known, previously-deferred gap documented across several CLAUDE.md
entries ("`makeMove`'s return value is now reliable on every call — and its
tie-break is documented, not solved", "Known design constraint for the
future board UI: `from`/`to` alone can't always disambiguate a capture
chain"): a king with three or more simultaneous legal capture routes can
have two distinct chains that capture different pieces but land on the
same final square. `useCheckersGame.makeMove(from, to)` currently can't
tell these apart and silently takes the first match found. This is rare —
verified by a past reviewer via brute-force search to need 3+ simultaneous
routes, never observed in 34,000+ plies of random play from the opening,
only in synthetic king-heavy endgame positions — but it is a real,
provable gap in the engine's public contract, not a cosmetic one.

## 1. Problem statement (verified against the real code, not assumed)

- `lib/checkers/types.ts`'s `CheckersMove` has `from`/`to`/`captures`/
  `promotes` — no field records *which squares were visited along the way*.
  Two distinct capture chains that capture different intermediate pieces
  but happen to land on the same square are structurally indistinguishable
  once reduced to this shape.
- `lib/checkers/moveGeneration.ts`'s `captureChainsFrom` already explores
  every route recursively — it just throws away everything except the
  final `{to, captures, promotes}` when it returns.
- `lib/checkers/useCheckersGame.ts`'s `makeMove(from, to)` resolves the
  move via `legalMovesFromEngine(...).find(m => m.to === to)` — `.find()`
  returns the first match, silently discarding any other equally-legal
  route to that square. `app/jogar/page.tsx` is `useCheckersGame`'s only
  real caller (confirmed by grep — its own test file is the only other
  one) with the AI-move effect and the human-click handler both routing
  through it.
- `CheckersMove` itself is only ever constructed in four places, all
  inside `moveGeneration.ts` (confirmed by grep for its required
  `promotes:` field) — every other file that touches `CheckersMove` only
  *consumes* objects built there.

## 2. Scope

Confirmed with the user before writing this spec:

1. **Targeted fix, not a UX redesign.** Every unambiguous move (the
   overwhelming majority — including every normal multi-jump capture)
   keeps today's exact one-click "select piece, click final destination"
   interaction and the existing single-slide animation. Nothing changes
   there. Multi-jump captures do **not** become click-each-hop across the
   board — that was explicitly considered and rejected as disproportionate
   to a bug this rare, and as an unrelated UX change nobody asked for.
2. **Disambiguation only activates when the engine proves it's needed.**
   When a clicked destination genuinely has 2+ distinct legal routes, the
   board doesn't commit — it switches `legalTargets` to just the *next*
   square where those routes actually differ, and the player clicks
   through until only one route remains, which then commits automatically
   (the player is never required to click all the way to the literal
   final square once only one candidate is left).
3. **`CheckersBoard` does not change.** It already renders whatever
   `selectedSquare`/`legalTargets` it's given and stays fully agnostic of
   why those props hold the values they do — the "board stays dumb"
   principle established since the rules-engine phase holds without
   modification.
4. **The disambiguation algorithm is pure and independently testable.**
   It does not live inline in `app/jogar/page.tsx` — it's a small new
   module in `lib/checkers/`, matching this codebase's consistent pattern
   of keeping all real logic out of page components.

**Explicitly out of scope:**

- No change to `InteractiveDemo`, `OpeningStudy`, `OpeningPractice`, or any
  tutorial/openings-trainer board — none of them call
  `useCheckersGame.makeMove` (confirmed by grep; they manage their own
  board state directly against `moveGeneration.ts`), and none of their
  curated/early-game positions can produce this ambiguity.
- No change to stepwise/hop-by-hop animation — CLAUDE.md's "Multi-jump
  animation is a single slide, not stepwise hops" entry is explicitly
  preserved; this plan doesn't touch `CheckersBoard`'s animation code at
  all, since disambiguation is fully resolved before anything is
  committed to `state.board`.
- No change to `lib/checkers/evaluate.ts`/`search.ts`/`gradeMove.ts`/
  `moveExplanation.ts`/`inferMove.ts`/openings' `replayLine.ts` beyond
  automatically gaining the new required `path` field on every
  `CheckersMove` they already handle — none of them construct `CheckersMove`
  object literals themselves, so this is a type-level ripple only, not a
  logic change. Verified by grep (see §1) before writing this spec, and
  re-verified by the TypeScript compiler once `path` becomes a required
  field, since the compiler will refuse to build if any construction site
  was missed.

## 3. `CheckersMove` gains a required `path: Square[]` field

```ts
export interface CheckersMove {
  from: Square;
  to: Square;
  captures: Square[];
  promotes: boolean;
  /** The sequence of squares the piece actually LANDED on, in order --
   * intermediate capture landings followed by the final `to`. Always
   * ends with `to` (`path[path.length - 1] === to`). For a simple
   * (non-capturing) move, `path = [to]` (a single hop). This is the
   * complete, unambiguous identity of a route: two capture chains that
   * capture different pieces can never have the same `path`, even if
   * they happen to share the same final `to`. */
  path: Square[];
}
```

`from` is deliberately NOT included in `path` (it's already its own field,
and every route trivially starts there) — `path` is exactly the sequence
of squares visited *after* `from`, which is also exactly what a UI needs
to offer as clickable "next square" targets during disambiguation.

`lib/checkers/moveGeneration.ts` changes:

- `ChainResult` (the internal recursion accumulator) gains a `path: Square[]`
  field, threaded through `captureChainsFrom`'s existing recursion the same
  way `capturedSoFar` already is — each recursive call appends its own
  `landing` to the path before recursing.
- `captureMovesFrom`'s final `.map()` includes `path: r.path`.
- `simpleMovesFrom` sets `path: [to]` for every simple move it constructs.
- `applyMove` needs no change — it already applies purely from `from`/
  `to`/`captures`/`promotes`; `path` is redundant for board mutation, it
  exists purely to preserve route identity for disambiguation.

This is a required field, not optional — deliberately, so the TypeScript
compiler itself becomes the checklist of every construction site (there
are exactly four, all identified in §1, all inside this same file).

## 4. New module: `lib/checkers/moveDisambiguation.ts`

Pure functions, no React/UI dependency, fully unit-testable on their own —
the actual "algorithm" for this feature lives here, not in `app/jogar/page.tsx`:

```ts
export function candidatesForTarget(moves: CheckersMove[], to: Square): CheckersMove[]
```
Filters a square's full legal-move list down to just the ones that land on
a specific clicked destination. Called once, on the player's first click of
a piece's destination.

```ts
export type MoveResolution =
  | { status: 'resolved'; move: CheckersMove }
  | { status: 'ambiguous'; nextTargets: Square[]; candidates: CheckersMove[] };

export function resolveCandidates(candidates: CheckersMove[], chosenPrefixLength: number): MoveResolution
```
If exactly one candidate remains, it's resolved (commit it). Otherwise,
returns the distinct set of squares at `path[chosenPrefixLength]` across
the remaining candidates — these are the next clickable targets that would
actually narrow the choice.

```ts
export function narrowCandidates(candidates: CheckersMove[], index: number, chosenSquare: Square): CheckersMove[]
```
Filters candidates down to the ones whose `path[index]` matches the square
the player just clicked. The caller then re-runs `resolveCandidates` on the
result.

This three-function shape means the *entire* disambiguation flow — from a
click on an ambiguous target, through however many narrowing clicks are
needed, to a fully resolved move — is: call `candidatesForTarget`, then
loop `resolveCandidates`/`narrowCandidates` until `status === 'resolved'`.
No case in that loop is special: a chain that returns to its own origin
square (`from === to`, a documented existing edge case) or a chain that's
ambiguous for several hops before diverging both fall out of the same
generic narrowing, with no dedicated branch for either.

## 5. `useCheckersGame.makeMove` takes a `CheckersMove`, not `(from, to)`

```ts
// Before
makeMove: (from: Square, to: Square) => boolean;
// After
makeMove: (move: CheckersMove) => boolean;
```

The implementation re-derives the legal moves for `move.from` against the
CURRENT `gameRef.current` board (same safety property as today — never
trusts the caller blindly, guards against a stale closure) and looks for
an EXACT match on the full move shape (`to`, `captures`, `promotes`,
`path` — `path` alone is already sufficient given §3's guarantee, but
matching the whole object is cheap and leaves no ambiguity about intent).
If no exact match is found (the position changed since the move was
computed, or a bogus move was passed), it returns `false`, exactly as
`makeMove` does today for an illegal `(from, to)`.

This closes CLAUDE.md's documented gap at the root: `makeMove` no longer
*can* silently pick a wrong route, because there is no longer a
representation ambiguous enough for that to happen. The existing
"`makeMove`'s return value is now reliable on every call" CLAUDE.md entry
needs its tie-break paragraph removed/rewritten once this lands — it
currently documents the exact behavior this spec eliminates.

## 6. `app/jogar/page.tsx`: a `pendingChoice` state slice

New state:

```ts
const [pendingChoice, setPendingChoice] = useState<{
  from: Square;
  candidates: CheckersMove[];
  resolution: Extract<MoveResolution, { status: 'ambiguous' }>;
} | null>(null);
```

`legalTargets` (the prop fed to `CheckersBoard`) becomes:

```ts
const legalTargets = pendingChoice
  ? pendingChoice.resolution.nextTargets
  : selected !== null ? legalMovesFrom(selected) : [];
```

`selectedSquare` stays `selected` throughout — `pendingChoice` never
clears it, so the originating piece stays visually highlighted through
the whole narrowing sequence exactly as it is for a normal single-click
move.

`handleSquareClick`'s shape:

- If `pendingChoice` is active and the clicked square is one of its
  `nextTargets`: narrow via `narrowCandidates`, then `resolveCandidates`
  on the result. `status === 'resolved'` → commit and clear
  `pendingChoice`/`selected`. `status === 'ambiguous'` → update
  `pendingChoice` with the narrowed candidates/targets and keep going.
- If `pendingChoice` is active and the click is anything else: clear
  `pendingChoice` and fall through to the normal selection logic below
  (matches today's "click elsewhere cancels the pending selection"
  behavior, just also clearing the new state).
- Otherwise (today's existing logic, unchanged in shape): if a piece is
  selected and the click is a legal target, resolve via
  `candidatesForTarget` + `resolveCandidates(…, 0)`. `resolved` → commit
  directly, identical to today's single-click behavior for every
  unambiguous move. `ambiguous` → enter `pendingChoice` instead of
  committing.

A single `commitMove(move: CheckersMove)` helper replaces the current
inline commit logic: sets `pendingGradeRef` when Learning Mode is on
(unchanged condition), calls `makeMove(move)`, and fires the haptic
(`hapticKinged`/`hapticCapture`/`hapticMove`) directly off `move`'s own
fields — no more separate `legalMovesFromEngine(...).find(...)` lookup for
haptics, since the resolved `move` object is already in hand by the time
anything commits.

The AI-move effect (vs-computer mode) simplifies from
`makeMove(move.from, move.to)` to `makeMove(move)` — the engine already
returns a full `CheckersMove`, so this is strictly less code, not more.

## 7. Testing

- `lib/checkers/moveGeneration.test.ts` gains `path` assertions: a simple
  move's `path` is `[to]`; a multi-jump capture's `path` has one entry per
  hop, ending in `to`; a promotion-mid-chain route's `path` stops exactly
  where CLAUDE.md's existing "promotion mid-chain" test already proves the
  chain stops.
- A genuine 3+-simultaneous-route king position must be constructed and
  verified against the real engine before it's used in any test — same
  discipline `lib/checkers/demoBoards.ts` already established project-wide
  (`squareAt`/`buildBoard` from row/col coordinates, never hand-indexed
  square numbers) and the same discipline the original reviewer used when
  first proving this bug exists via brute-force search. Finding this
  position is real implementation work, not assumed solved by this spec.
- `lib/checkers/moveDisambiguation.test.ts` (new): unit tests for
  `candidatesForTarget`/`resolveCandidates`/`narrowCandidates` against
  hand-built candidate-move lists (no board required — these functions
  don't touch `Board` at all, only `CheckersMove[]`), covering: a single
  unambiguous candidate resolves immediately; 2+ candidates sharing a
  `to` but diverging at the first hop; candidates that stay tied for
  several hops before diverging; the true 3+-route position from the
  point above, exercised through the full `legalMovesFrom` → disambiguate
  pipeline end to end.
- `lib/checkers/useCheckersGame.test.ts`: every existing `makeMove(from,
  to)` call site updates to `makeMove(move)`, using the already-resolved
  move object from `legalMovesFrom`/a hand-built move where needed (a
  small, mechanical signature-only update — no behavioral test changes to
  the non-ambiguous cases). One new test drives the hook through an
  ambiguous position end to end via two `makeMove` calls with different
  `path`s sharing the same `to`, and confirms each lands the board in the
  distinct correct resulting position.
- `app/jogar/page.tsx` stays without a dedicated test file, consistent
  with this repo's established precedent (CLAUDE.md's "`/jogar/page.tsx`
  has no dedicated test file" entry) — verified instead via `tsc`/`lint`/
  the full suite plus a manual dev-server check: constructing the
  synthetic ambiguous position via browser devtools or a temporary debug
  route is not warranted for this; the pure-function tests above already
  prove the algorithm, and `/jogar`'s own role here is thin state
  plumbing already covered by type-checking. A manual click-through check
  of the NORMAL (unambiguous) capture/move/promotion flows across both
  game modes is still done, to confirm the `pendingChoice` plumbing
  introduced no regression to the common path.

## 8. Migration notes for existing CLAUDE.md entries

Two entries need updating once this lands (recorded here so the
implementation plan's final task doesn't have to rediscover them):

- **"`makeMove`'s return value is now reliable on every call — and its
  tie-break is documented, not solved"** — the tie-break paragraph
  (first-match-wins for shared-`to` capture chains) becomes obsolete;
  replace with a note that `path` now makes every route uniquely
  identifiable and `makeMove` matches on it exactly.
- **"Known design constraint for the future board UI: `from`/`to` alone
  can't always disambiguate a capture chain"** — this entire entry
  becomes historical; it explicitly predicted "this needs to be resolved
  when the board UI is designed" and names step-by-step landing-square
  input as the natural answer, which is exactly what this phase built.
