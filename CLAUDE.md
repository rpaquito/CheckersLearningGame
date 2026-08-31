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

## Deploy

Vercel only (same as Chess Sensei — Docker/self-host is not supported). No
environment variables needed — no backend, no auth, no API routes.
