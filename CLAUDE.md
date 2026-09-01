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
  page.tsx              # local two-player game loop (click-to-select-then-
                         # move state machine on top of useCheckersGame).
                         # No mode=ai yet -- Phase 3 extends this same file.
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
initial (always-fresh) render — see the "SSR-hydration-safe pattern"
comment in the source. This was done correctly from the start rather than
importing the twin project's bug.

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

## Deploy

Vercel only (same as Chess Sensei — Docker/self-host is not supported). No
environment variables needed — no backend, no auth, no API routes.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
