# Checkers Sensei

Next.js (App Router) checkers app — the twin/sibling project to Chess Sensei
(`rpaquito/ChessLearningGame`): play against a custom AI (3 difficulty
levels) or two players on the same device, a learning mode (legal moves,
mandatory-capture highlights, move suggestion, move-quality feedback), and a
tutorial at `/aprender` including an openings/traps trainer. Installable PWA,
works offline. No backend/API routes, no authentication — everything runs
client-side, same architecture as the twin project.

Design spec: `docs/superpowers/specs/2026-08-31-checkers-sensei-design.md`
— read it for the full rationale behind every decision below. This file is
the living summary of non-obvious conventions actually implemented; the spec
is the historical design record and isn't updated after the fact.

## Process rules

- **Branching**: no worktrees, no feature branches. Every task's changes are
  committed directly to `main` and pushed immediately (`git push origin
  main`) once its tests pass — never batch multiple tasks into one unpushed
  commit.
- **Vercel**: project `checkers-learning-game` (to be created), team
  `algorithm-cloud` (same team as Chess Sensei). Deploy is Vercel-only,
  auto-deploy on push to `main` via the GitHub integration once the project
  exists — no local `vercel deploy` needed for normal work.
- **GitHub**: `rpaquito/CheckersLearningGame`, `origin` remote already
  configured.
- **This file**: updated at the end of every implementation-plan phase with
  whatever new non-obvious convention that phase introduced — not a
  one-shot document. If implementing a phase teaches something a future
  implementer (human or agent) would need but couldn't derive from reading
  the code alone, it belongs here.

## Structure

```
app/
  layout.tsx       # root layout (placeholder until the menu/branding phase)
  page.tsx          # home page (placeholder until the menu/branding phase)
  globals.css        # Tailwind v4 entrypoint (placeholder tokens until the
                      # visual-identity phase — see spec §8 for the real palette)
lib/checkers/
  types.ts           # Square/Color/PieceKind/Piece/Board/CheckersMove/GameStatus
  board.ts            # board geometry: squareToRowCol/rowColToSquare/neighbor/
                       # createInitialBoard/direction constants
  moveGeneration.ts    # simpleMovesFrom/captureMovesFrom/hasAnyCapture/
                        # legalMovesFrom/allLegalMoves/applyMove
  gameStatus.ts          # computeStatus/boardKey — terminal-state detection
  useCheckersGame.ts       # the game-state hook the UI will consume, wraps
                            # everything above; localStorage-persisted
  inferMove.ts               # board-diff helper for move animation (not
                              # consumed yet — wired up in the UI phase)
  *.test.ts                 # co-located tests, one per module above
components/CheckersBoard/
  CheckersBoard.tsx   # "dumb" 8x8 board -- never decides legality, renders
                       # whatever the caller computed (selectedSquare/
                       # legalTargets/mandatoryCaptureSquares/lastMove props).
                       # Derives move animation via inferMove board-diffing,
                       # not by being told what moved -- same philosophy as
                       # Chess Sensei's ChessBoard.tsx, and for the same
                       # reason: reusable by future non-hook callers (e.g. a
                       # tutorial demo) without needing a lastMove-shaped prop.
  PieceIcon.tsx         # dispatches to a piece style -- only "classico"
                        # exists yet (see pieceStyles/), Phase 5 adds more
  pieceStyles/
    classico.tsx          # man = disc + rim, king = disc + rim + crown polygon
app/jogar/
  page.tsx                  # the ONE game loop for both modes: a click-to-
                            # select-then-move state machine over
                            # useCheckersGame. `?mode=ai` (plus difficulty and
                            # a concrete color) additionally drives the engine
                            # client on the AI's turn; without it, the same
                            # page is local two-player on one device.
lib/checkers/ (additions in the AI-opponent phase)
  difficulty.ts             # Difficulty/EngineOptions, provisional depth/time/
                            # randomness numbers per difficulty (spec §3)
  evaluate.ts               # material + positional scoring, antisymmetric
                            # between colors on the same board
  search.ts                 # negamax + alpha-beta + iterative deepening;
                            # findBestMove() is the engine's public entry point
  selectMove.ts             # selectWeightedMove -- ported from Chess Sensei's
                            # lib/chess/selectMove.ts, generalized to a generic
                            # move type instead of a UCI string
  moveClassification.ts     # evalLoss/classifyMove -- built now (spec §3
                            # bundles it here) but NOT wired to any UI yet;
                            # that's Phase 4 (learning mode)
  checkersEngine.worker.ts  # Web Worker entry point -- thin message handler
                            # over search.ts, bundled as a native module worker
                            # (no external asset, unlike Chess Sensei's
                            # prebuilt Stockfish)
  checkersEngineClient.ts   # promise-serialized wrapper around the worker,
                            # dependency-injectable for tests
  playerColor.ts            # PlayerColor ('b'|'w'|'random') +
                            # resolvePlayerColor
app/configurar/
  page.tsx                  # difficulty/color picker for vs-computer games;
                            # plain Tailwind, no chrome/i18n system yet
                            # (Phase 5/8). Reachable only by typing the URL —
                            # nothing links to it until Phase 5 builds the
                            # real menu; that's expected, not a regression.
```

## Conventions

### Board numbering: standard checkers 1-32, verified against real notation

`lib/checkers/board.ts` numbers the 32 dark squares 1-32, row-major from the
top (row 0) to the bottom (row 7), 4 squares per row. Black starts on
squares 1-12 (top 3 rows) and advances toward higher-numbered squares
(south); White starts on 21-32 (bottom 3 rows) and advances toward
lower-numbered squares (north). This is not an arbitrary internal scheme —
it was cross-checked against real checkers notation during design: square
11's forward-diagonal neighbor is 15, and square 23's is 19, reproducing the
famous "11-15 23-19" opening exactly as documented in real checkers
literature (see `board.test.ts`). This matters because the openings/traps
trainer (a later phase) cites real named openings by real move notation —
getting the numbering scheme right from the start avoids relabeling every
opening later. As a further sanity check, black has exactly 7 legal opening
moves from the standard starting position — a well-known checkers fact,
also asserted as a test (`moveGeneration.test.ts`).

### The board stays "dumb" — mandatory capture is enforced in the engine, not the UI

Same philosophy as Chess Sensei's `ChessBoard.tsx`: nothing above
`lib/checkers/` needs to check "is this move legal" itself.
`legalMovesFrom(board, turn, square)` already returns *only* capturing
moves when any capture is available anywhere on the board for that color —
a future UI just renders whatever squares this function returns as
clickable targets. There is no "you must capture" warning to build — a
piece with no legal capture simply never offers a non-capturing target
while a capture is forced elsewhere (`state.mandatoryCaptureSquares` from
`useCheckersGame` is for *highlighting* which pieces must move, not for
gating anything).

### Promotion mid-capture-chain stops the chain

Decided explicitly in the design spec, not left ambiguous: a man that lands
on the back row during a capture sequence becomes a king and its move ends
there immediately, even if the newly-crowned king could technically
continue capturing. `lib/checkers/moveGeneration.ts`'s `captureChainsFrom`
enforces this in its `justPromoted` branch, covered by a dedicated test
that constructs a position where continuing would otherwise be possible.

### Draw rule: 80 plies without a capture

`lib/checkers/gameStatus.ts`'s `NO_CAPTURE_DRAW_PLIES = 80` (40 full moves
by each side) is the commonly-cited simplified version of checkers'
no-progress rule, not a tournament-federation-verified threshold. Documented
here so nobody later assumes deeper authority than exists — same
"informational, not authoritative" framing the design spec uses for the
openings trainer's opening names (spec §6).

### `useCheckersGame` persistence follows the SSR-hydration-safe pattern from day one

Unlike Chess Sensei's `useChessGame` (which the twin project's own
`CLAUDE.md` documents as having a *known, unfixed* hydration bug),
`useCheckersGame` reads `localStorage` only inside a `useEffect`, after the
initial (always-fresh) render — see the hydration `useEffect` in the
source. This was done correctly from the start rather than importing the
twin project's bug.

A real, non-blocking finding from manual browser testing, independently
verified by the final reviewer: hydration can still lose a saved game on
the very first page load after a real move was made, if the persistence
effect's write — which closes over the pre-hydration `game` value — runs
after the hydration effect's `setGame(parsed)` call but before the
resulting re-render. In practice the window is real but narrow: production
builds (`next build && next start`) were verified to persist correctly
across reload, and the loss was only reproduced under `next dev`'s React
Strict Mode double-effect invocation — though the underlying race isn't
strictly limited to that mode (a tab closed at exactly the wrong
single-frame window could in principle lose a save even outside Strict
Mode). Not fixed here; the suggested remedy is gating the persistence
effect's write on a "hydration has completed" ref so it never fires with a
pre-hydration closure value.

### `makeMove`'s return value is now reliable on every call — and its tie-break is documented, not solved

An earlier version of `makeMove` computed its `boolean` return value via a
side-effect flag set inside a `setState` functional updater
(`let didMove = false; setGame(prev => { didMove = true; ... })`). That
only worked for the *first* call on a given hook instance — React only
invokes a `useState` updater "eagerly" (synchronously) for the first
queued update on a fiber; later calls defer the updater to the render
pass, so the flag was read before it was ever set. Fixed by computing
legality and the resulting state synchronously against a `gameRef` that
mirrors `game` (kept fresh every render) instead of relying on updater
timing at all — see `lib/checkers/useCheckersGame.ts`'s `makeMove`.

Separately, `makeMove(from, to)` cannot disambiguate two distinct legal
capture chains that happen to share the same final `to` square while
capturing different pieces along the way (possible in checkers — a king
with 3+ available routes to the same landing square). This is rare
(verified via brute-force search: needs 3+ simultaneous routes, only seen
in synthetic king-heavy endgame positions, never in 34k+ plies of random
play from the opening) and is resolved by taking the first match found —
deterministic, but not driven by any explicit choice. A capture chain can
also legally return to its own origin square (`from === to`) for a king
looping back through several jumps. Neither case has a UI resolution yet
— if/when it needs one, step-by-step landing-square selection (the way
real checkers UIs work) is the natural fix, requiring the board component
to expose per-hop choices rather than a single final destination.

### `inferMove` takes an explicit `turn` parameter, deviating from the spec

The design spec (§2) describes `inferMove(prevBoard, nextBoard)`. The
implementation is `inferMove(prevBoard, turn, nextBoard)` — a deliberate
deviation, not an oversight: searching only `allLegalMoves(prevBoard,
turn)` (the given color's legal moves) instead of both colors' is both
faster and avoids a rare cross-color ambiguity. Small, defensible, but
worth recording since this file is the living record of what was actually
built, not the spec.

### Known design constraint for the future board UI: `from`/`to` alone can't always disambiguate a capture chain

Verified by the final reviewer via brute-force search over king positions
(rare, needs 3+ available capture routes for the same piece): two distinct
legal capture chains can share the same `from` and `to` squares while
capturing different intermediate pieces. A capture chain can even return to
its own origin square (`from === to`) for a king looping back through its
own trail. Neither `legalMovesFrom(square): Square[]` nor `makeMove(from,
to)` can disambiguate the first case as currently shaped. **This needs to
be resolved when the board UI is designed** — step-by-step landing-square
input (the way real checkers UIs work) is one natural answer. Flagged here
as a known, load-bearing constraint for that future work; this plan does
not attempt to fix it.

### Spec §2's compact board notation was never implemented

The design spec describes a 32-character-plus-turn-marker board notation as
the board representation. What actually exists is `gameStatus.ts`'s
`boardKey` — an internal repetition-detection hash with a similar but
distinct encoding (`b`/`B`/`w`/`W`/`-` per square plus a turn marker is
close, but it was never designed or documented as the general-purpose
notation the spec describes, and nothing else in the codebase treats it as
one). This is real, deferred work for a future plan — it would also let
test fixtures stop being hand-indexed `board[N] = {...} // square N+1`
comments, which is exactly the error-prone pattern that caused several
defects caught during this plan's implementation.

### Captured-but-not-yet-removed pieces blocking a landing square: unobservable in this variant

The capture-chain comment in `moveGeneration.ts` notes that captured pieces
stay on the working board until the whole move finishes (matching official
rules). The final reviewer verified this is provably unobservable in
American checkers specifically: because non-flying kings mean landing
squares and jumped squares are always on disjoint board-parity classes, a
capture chain can never actually land on a square still occupied by one of
its own already-captured (but not-yet-removed) pieces. It would matter for
the international-draughts variant noted as backlog in the design spec
(flying kings can jump further), but not for this one.

### The board is "dumb"; animation is derived, not told

`CheckersBoard` never checks whether a click is legal — it only renders
`selectedSquare`/`legalTargets`/`mandatoryCaptureSquares` exactly as given,
and calls `onSquareClick` unconditionally. All legality lives in
`lib/checkers/` (`useCheckersGame`'s `legalMovesFrom`/`makeMove`), consumed
by `app/jogar/page.tsx`'s click-handling state machine. Move animation
works the same way as Chess Sensei's board: `CheckersBoard` diffs
consecutive `board` props via `inferMove` to discover what moved, rather
than being told directly — this keeps it reusable for a future context
(e.g. a tutorial demo) that doesn't go through `useCheckersGame` at all.

### Multi-jump animation is a single slide, not stepwise hops

Unlike a real physical board, a captured piece doesn't visually "hop" square
by square during a multi-jump chain — `CheckersBoard` animates the moving
piece with one CSS transition straight from `from` to the chain's final
`to`, while every captured piece (there can be more than one) fades out
together. This is a deliberate scope choice for this phase, not a bug: true
stepwise-hop animation would need `CheckersMove`/`applyMove` to expose the
chain's intermediate landing squares, which nothing needs yet. Revisit if
it's ever raised as a real polish request.

### Single piece style, flat square colors -- by design, for now

Only `classico` exists (`components/CheckersBoard/pieceStyles/`), and board
squares are flat Tailwind colors, not textured images. `PieceIcon` is
structured (a thin dispatcher over a style module) so Phase 5's
"moderno"/"anime" styles and the textured `boardTheme` system slot in later
without restructuring — see the design spec §4/§8 for the full plan.

### The AI engine is a from-scratch minimax, not a vendored binary

Unlike Chess Sensei's vendored Stockfish, `lib/checkers/search.ts` is a
custom negamax/alpha-beta implementation written for this app (design spec
§3 confirmed no suitable off-the-shelf "Stockfish for checkers" WASM binary
exists). It runs in a Web Worker
(`checkersEngine.worker.ts`) bundled natively by Next.js/Turbopack via
`new Worker(new URL('./checkersEngine.worker.ts', import.meta.url))` — no
external/public asset, unlike Stockfish's prebuilt binary loaded from a
static path. `checkersEngineClient.ts` wraps it behind a promise-serialized
request queue (same reasoning as `stockfishClient.ts`: concurrent
`getBestMove`/`evaluate` calls could otherwise cross-resolve), but skips the
UCI text protocol and WASM-load readiness handshake entirely, since there's
no external engine process to wait on.

### Search scores are mate-distance-relative and NOT normalized across searches

`findBestMove`'s `bestScore` (and every `candidates[].score`) comes out of a
particular search at a particular completed depth. Two things make those
numbers non-comparable between searches:

- The terminal-node sentinel is `LOSS_SCORE - depthRemaining`, so a forced
  win/loss scores differently depending on how many plies away it was found.
  That is the whole point (it makes the engine hasten its wins and delay its
  losses), but it means the same forced win scores e.g. `1_000_005` in one
  search and `1_000_003` in another.
- Iterative deepening stops at whatever depth the time budget allowed, so two
  calls on similar positions may have completed different depths.
- A position with exactly one legal move short-circuits without searching at
  all and reports the STATIC `evaluate()` of the position as its `bestScore`.

Phase 4 (move-quality grading) therefore must not feed `bestScore` values
from two different searches straight into `moveClassification.ts`'s
`evalLoss` without accounting for this — grade a move by comparing scores
produced within a single fixed-depth search, or normalize the mate-distance
term out first.

### The engine's time budget is enforced inside the search, not just around it

`search.ts` checks the deadline every `NODES_PER_DEADLINE_CHECK` (4096)
negamax nodes and throws a single pre-allocated `SEARCH_ABORTED` sentinel,
caught only by `findBestMove`'s iterative-deepening loop, which discards the
whole in-progress depth. Two things depend on this and are easy to break:

- **Never merge an aborted depth's partial candidates with a completed
  depth's.** The unwind exists precisely so a half-scanned depth's
  artificially skewed scores can't outrank a shallower complete one.
- **Depth 1 must stay uninterruptible** (`ctx.deadline` is `Infinity` for
  it), otherwise a tight budget could return with the placeholder
  `-Infinity` candidate list.

A single legal root move is returned immediately without searching at all —
common in checkers, since captures are mandatory, and previously the worst
case for overshoot (the between-root-moves deadline check can never fire with
only one root move to iterate over, so the full `maxDepth` ran uncapped).

### Worker plumbing is deliberately untested; the client wrapper's queueing logic isn't

`checkersEngine.worker.ts`'s `self.onmessage` handler has no dedicated test
file — jsdom has no functional `Worker` to exercise it against, matching
Chess Sensei's own precedent for `stockfishClient.ts`. All of the actual
search/evaluation logic it delegates to (`search.ts`, `evaluate.ts`) is
fully unit-tested on its own, independent of the worker.
`checkersEngineClient.ts`'s promise-serialization *is* unit-tested despite
this, via a dependency-injected fake `WorkerLike` object
(`checkersEngineClient.test.ts`) — a deliberate, narrow improvement over
Chess Sensei's precedent: only the queueing behavior is made testable this
way, not real threading or the search algorithm itself.

### Every engine request must settle — the queue has no timeout to save it

`checkersEngineClient.ts` serializes requests behind a `busy` flag that only
clears when the in-flight request settles. There is no watchdog: one request
that never settles locks the AI for the rest of the session, with no recovery
short of a page reload. So every path settles explicitly — the worker's
`self.onmessage` wraps its whole body in `try/catch` and answers with a
`{ type: 'error', message }` response (including for an unrecognized request
type), the client rejects on that response, on the `Worker` `error` event, on
a synchronously-throwing `postMessage()`, and on `terminate()` (which settles
the in-flight request *and* everything still queued). **Any new request or
response type must preserve the "exactly one response per request"
invariant.** `app/jogar/page.tsx` catches the resulting rejection, ignoring it
when its effect has already been cancelled (unmount/terminate is expected
teardown, not a failure) and otherwise logging and surfacing a message in the
existing `aria-live` status line.

### Move-quality grading exists as pure functions, unused by any UI yet

`lib/checkers/moveClassification.ts` (`evalLoss`/`classifyMove`) and the
worker's `evaluate` message were built in the AI-opponent phase (spec §3
bundles them there, since the engine's own evaluator is what feeds them) but
are not wired into any UI — no toast, no suggestion overlay. That's Phase 4
(learning mode), which needs highlighting UI that doesn't exist yet.

### `/configurar` and `/jogar`'s AI wiring stay chrome-free, matching `/jogar`'s own precedent

Neither imports Chess Sensei's `ChipButton`/`PageChrome`/`useTranslation`/
`GameSetup`/`ToggleGroup` — none of that exists in this repo yet (Phase 5
visual identity, Phase 8 i18n). Plain Tailwind, hardcoded Portuguese
strings, same as `/jogar`'s existing style. `/configurar` is also not linked
from anywhere yet — it is reached by typing the URL until Phase 5 builds the
real menu.

### `color=random` is resolved by `/configurar`, never by `/jogar`

`app/configurar/page.tsx`'s `handleStart` calls `resolvePlayerColor` *before*
navigating and puts the concrete `b`/`w` in the URL, so `/jogar` never sees
`color=random` in practice. This is load-bearing, not tidiness:
`useCheckersGame(true)` restores the saved position from `localStorage` on
mount, so a `/jogar?...&color=random` URL reloaded mid-game would restore the
board but re-roll the coin — handing the human the opposite side of its own
pieces half the time. `/jogar`'s own `resolvePlayerColor` call (in a lazy
`useState` initializer) is now just defensive handling of an
already-concrete value for hand-typed URLs.

### `useSearchParams()` requires a `Suspense` boundary — enforced at build time, not just lint

`app/jogar/page.tsx` splits into `JogarPageInner` (reads `useSearchParams()`)
and a default-exported `JogarPage` that wraps it in `<Suspense
fallback={null}>`. This is a hard build error, not a lint warning: a plain
`npm run build` prerenders these pages, and prerendering a component that
reads `useSearchParams()` without a `Suspense` boundary above it fails the
build. (`next.config.ts` additionally sets `output: 'export'`, but only under
`BUILD_TARGET=capacitor` — the failure does not depend on that; it happens in
the ordinary build too.)

## Deploy

Vercel only (same as Chess Sensei — Docker/self-host is not supported). No
environment variables needed — no backend, no auth, no API routes.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
