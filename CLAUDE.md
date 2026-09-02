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
  layout.tsx       # root layout with font/theme variables
  page.tsx         # home menu, real page with PageChrome chrome and
                   # BACKGROUND_THEMES background picker integration
  globals.css      # Tailwind v4 entrypoint with "anime" visual-identity tokens
                   # (Bangers/Poppins fonts, color palette per design spec §8)
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
                       # legalTargets/mandatoryCaptureSquares/lastMove/
                       # suggestedMove props). New optional boardTheme/
                       # pieceStyle props control rendering per settings,
                       # while maintaining "dumb" principle — only renders
                       # what's given.
                       # Derives move animation via inferMove board-diffing,
                       # not by being told what moved -- same philosophy as
                       # Chess Sensei's ChessBoard.tsx, and for the same
                       # reason: reusable by future non-hook callers (e.g. a
                       # tutorial demo) without needing a lastMove-shaped prop.
  PieceIcon.tsx         # dispatches to a piece style -- "classico"
                        # (original), "moderno", "anime" (Phase 5 additions)
  pieceStyles/
    classico.tsx        # man = disc + rim, king = disc + rim + crown polygon
    moderno.tsx         # alternative piece design (Phase 5)
    anime.tsx           # third piece design (Phase 5)
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
                            # now reads initial state from useSettings() instead
                            # of hardcoded defaults, then stays plain Tailwind
                            # with no PageChrome chrome (out of scope for this
                            # phase; spec phase-5 feature parity only marks `/`
                            # and `/opcoes` for new art).
lib/ui/
  useFocusTrap.ts        # modal focus trapping -- game-agnostic, no chess/
                          # checkers dependency, ported unchanged
  activeToggleStyle.ts   # shared "active" gradient for toggle-style selection
                         # groups (difficulty/color in /configurar and /opcoes)
lib/i18n/ (additions in the i18n Mechanism & Dictionary plan)
  types.ts               # Locale ('pt' | 'en'), VALID_LOCALES; canonical
                         # version going forward for i18n (others still declared
                         # locally; Phase 8 deferred consolidation, see Conventions)
  detectLocale.ts        # detectLocale(navigatorLanguage?: string): Locale --
                         # browser-language detection falling back to English
  useTranslation.ts      # useTranslation() hook returning {t: Dictionary, locale}
                         # from useSettings().settings.language; no new Context
  dictionaries/
    types.ts             # Dictionary interface defining every key path
    pt.ts                # complete Portuguese dictionary (all pages/modals built so far)
    en.ts                # complete English translation
    index.ts             # DICTIONARIES: Record<Locale, Dictionary> re-export
lib/settings/
  settings.ts            # Settings interface (defaultDifficulty/defaultColor/
                         # boardTheme/backgroundTheme/pieceStyle/language) and
                         # DEFAULT_SETTINGS; validation and storage key. Now
                         # includes detectLocale integration: language field uses
                         # browser-language auto-detection on first load (resolving
                         # to 'en' if detection can't determine 'pt'), then
                         # persists so detection only runs once per installation
  themes.ts              # BOARD_THEMES (sakura/nebulosa/neon) and
                         # BACKGROUND_THEMES (templo/dojo/cosmico) registries;
                         # includes fallbackGradient for background images
                         # pending real art from Phase 10
  useSettings.ts         # useSyncExternalStore singleton reading/writing
                         # Settings to localStorage
components/ChipButton/
  ChipButton.tsx         # link-or-button with 4 color variants (purple/cyan/
                         # pink/gold) and diagonal-clip "stamped" shadow;
                         # ported from Chess Sensei unchanged
components/ToggleGroup/
  ToggleGroup.tsx        # radio-group-style selection widget with
                         # activeToggleStyle on selected option; ported from
                         # Chess Sensei unchanged
components/PageChrome/
  PageChrome.tsx         # layout wrapper with PageHeader, PageGlow, and
                         # title text effects (titleStroke); ported from
                         # Chess Sensei unchanged
components/Toast/
  Toast.tsx               # pure toast card, no timer -- closes via onDismiss
  ToastProvider.tsx        # app-wide context (mounted in app/layout.tsx),
                            # show()/dismiss(), 4s auto-dismiss on every tone
                            # (no 'check'-style blocking tone -- no checkers
                            # analog, see CLAUDE.md Conventions)
components/ConfirmModal/
  ConfirmModal.tsx        # generic confirm/cancel popup, backdrop+Escape+
                           # cancel all count as "no"
components/GameEndModal/
  GameEndModal.tsx        # win/lose/draw modal -- text/button only, no
                           # mascot/confetti yet (Phase 10)
components/RulesModal/
  RulesModal.tsx          # checkers rules content -- movement, mandatory
                           # capture, promotion, draw conditions. Built and
                           # ready, but not linked from anywhere yet -- no
                           # trigger button in /jogar opens it; that's
                           # expected, not a regression, same as
                           # /configurar above.
components/LearningPanel/
  LearningPanel.tsx       # toggle + suggestion button/explanation -- "dumb"
                           # like CheckersBoard, doesn't know whose turn it
                           # is or whether the game ended (canRequestSuggestion
                           # is how the caller controls that)
app/opcoes/
  page.tsx                 # settings page with theme/difficulty/color/piece
                           # pickers using PageChrome chrome and useSettings();
                           # new in Phase 5
lib/checkers/ (additions in the Toast/Modal UI chrome phase)
  gameEndMessage.ts        # describeGameEnd -- GameStatus -> title/kind for
                            # GameEndModal, no locale param yet (Phase 8)
lib/checkers/ (additions in the Learning Mode phase)
  gradeMove.ts               # gradeMove -- runs ONE findBestMove search on
                              # the pre-move board and reads both the best
                              # and played-move scores out of its candidate
                              # list into a MoveGrade via
                              # moveClassification.ts, finally giving that
                              # phase's unused machinery a caller
  moveExplanation.ts         # explainMove/describeMoveQuality/materialFeel/
                              # describeMoveForToast -- canned-phrase move
                              # descriptions, bilingual (Locale: 'pt'|'en')
                              # from day one per spec §5, though every call
                              # site today hardcodes 'pt' -- no UI locale
                              # toggle exists until Phase 8
  useLearningModePreference.ts # persisted (localStorage) Learning Mode
                                # toggle, same SSR-hydration-safe pattern as
                                # useCheckersGame
lib/checkers/ (additions in the Tutorial Hub phase)
  demoBoards.ts                # squareAt(row, col)/buildBoard(pieces) --
                               # constructs demo Boards from row/col
                               # coordinates instead of hand-typed square
                               # numbers, verified against legalMovesFrom in
                               # the same task's test before any page renders
                               # it. Exports six DemoPosition constants:
                               # MAN_MOVEMENT_DEMO, KING_MOVEMENT_DEMO,
                               # PROMOTION_DEMO, MANDATORY_CAPTURE_DEMO,
                               # MULTI_JUMP_DEMO, NO_LEGAL_MOVES_DEMO
  demoBoards.test.ts           # co-located tests verifying each position's
                               # legal-move behavior via legalMovesFrom
components/InteractiveDemo/
  InteractiveDemo.tsx          # playable single-piece demo -- keeps its own
                               # state (board + highlighted square) and calls
                               # straight into legalMovesFrom/applyMove to
                               # validate/apply clicks. Reuses CheckersBoard's
                               # click interaction and slide/capture-fade
                               # animation. `turn` prop is the color OPPOSITE
                               # the protagonist's, held constant for the whole
                               # demo (see Conventions: "InteractiveDemo's turn
                               # prop trick" for why this is load-bearing).
  InteractiveDemo.test.tsx     # co-located tests
components/NavCard/
  NavCard.tsx                  # link card "title + description [+ meta]" --
                               # the hub's tile shell. `meta` was deliberately
                               # omitted when this component was first built
                               # (Tutorial Hub phase); this phase restores it
                               # (Conventions: NavCard meta prop precedent)
app/aprender/
  page.tsx                     # tutorial hub -- displays six NavCard tiles
                               (/aprender/pecas, /aprender/regras-especiais,
                               /aprender/fim-de-jogo, /aprender/estrategia,
                               /aprender/centipawns, /aprender/aberturas)
  pecas/page.tsx               # piece movement rules -- interactive demo +
                               explanatory text
  regras-especiais/page.tsx    # special rules (mandatory capture, multi-jump)
                               -- interactive demos + explanatory text
  fim-de-jogo/page.tsx         # end-game conditions (win/loss/draw) --
                               one interactive demo + explanatory text
  estrategia/page.tsx          # strategy tips -- text-only page, no demos
  centipawns/page.tsx          # move-quality explainer (engine-evaluation
                               badge system using the checkers material
                               scale) -- text-only page, references
                               MoveQuality type from moveClassification.ts
  aberturas/
    page.tsx                   # openings trainer hub -- displays one NavCard
                               tile per opening in OPENINGS
    [id]/page.tsx              # study mode -- step through an opening line with
                               explanations using OpeningStudy; `id` is the
                               opening's id from lib/openings/data.ts
    [id]/praticar/page.tsx     # practice mode -- play an opening line yourself
                               against an auto-playing opponent using
                               OpeningPractice
lib/openings/ (additions in the Openings & Traps Trainer phase)
  types.ts                   # Locale, OpeningMove/OpeningLine/Opening types;
                             # Locale ('pt'|'en') is defined locally here,
                             # independent of other Locale definitions until
                             # Phase 8 folds them into a shared i18n module
  replayLine.ts              # replayLine(line: OpeningLine): ReplayedMove[] --
                             # replays a line from the initial position using
                             # the real legalMovesFrom/applyMove engine,
                             # enabling both the study/practice UIs to get
                             # board states and guaranteeing every line in
                             # data.ts is legally valid
  replayLine.test.ts         # co-located tests
  data.ts                    # OPENINGS: 8 real-named checkers openings (see
                             # Conventions) with one main line each, every
                             # move validated by data.test.ts before commit;
                             # each line uses numeric checkers notation
                             # ("11-15"), not chess's SAN
  data.test.ts               # replays every opening line via replayLine to
                             # verify legality; catches hand-authoring errors
                             # before any page renders the data
components/LineTabs/
  LineTabs.tsx               # tabbed widget for selecting among an opening's
                             # lines (currently all openings have exactly one
                             # line per Constraints, but the component is
                             # structured for future multi-line support)
components/OpeningPageHeader/
  OpeningPageHeader.tsx      # page header for study/practice pages, displays
                             # opening name + description bilingual (from
                             # data.ts) but reads `.pt` half only for display
                             # (no locale toggle exists until Phase 8)
components/OpeningStudy/
  OpeningStudy.tsx           # study mode -- step through an opening line via
                             # prev/next buttons, displaying the board state,
                             # move notation, and move explanation; ported from
                             # Chess Sensei's OpeningStudy, adapted to
                             # checkers' Board/Square/CheckersBoard instead of
                             # chess.js/FEN/ChessBoard; plain Tailwind, no
                             # boardTheme/pieceStyle props wired (matching
                             # /jogar's current state per Constraints)
  OpeningStudy.test.tsx      # co-located tests
components/OpeningPractice/
  OpeningPractice.tsx        # practice mode -- play an opening line yourself
                             # from the position after each move in the line,
                             # with an auto-playing opponent handling White's
                             # moves; ported from Chess Sensei's
                             # OpeningPractice, adapted to checkers;
                             # protagonist is always black per Constraints (no
                             # White-system/Black-defense split like chess)
  OpeningPractice.test.tsx   # co-located tests
public/
  board/                   # square texture assets for board themes (sakura/
                           # nebulosa/neon) — light/dark pairs, chess-agnostic
                           # and copied from Chess Sensei. Menu background
                           # images (background-*.webp) are chess-specific and
                           # are Phase 10 work (see Conventions: Background
                           # art assumption was false).
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

### Toast/Modal chrome is ported behaviorally, not visually, from Chess Sensei

`Toast`/`ToastProvider`/`ConfirmModal`/`GameEndModal`/`RulesModal` reuse Chess
Sensei's *shape* (backdrop, `role="dialog"`, focus trap via
`lib/ui/useFocusTrap.ts`, Escape-to-close) but not its visual chrome: no
`PageChrome`/`ChipButton` (Phase 5), no `useTranslation`/i18n dictionaries
(Phase 8), no mascot illustrations or confetti animation on `GameEndModal`
(Phase 10 — this repo has no `public/gameend/` assets or `animate-confetti-pop`
keyframe yet). Plain Tailwind, hardcoded Portuguese, matching `/jogar`'s and
`/configurar`'s established style.

### No 'check' toast tone — checkers has no analog

Chess Sensei's `ToastTone` includes a `'check'` tone that blocks board
interaction until manually dismissed (no auto-dismiss timer). This repo's
`ToastTone` (`'info' | MoveQuality`) has no equivalent: per spec §4, an
illegal move is simply never offered as a clickable target, so there's
nothing to react to and no tone needs to hold the board hostage. Every tone
here auto-dismisses after 4 seconds.

### `GameEndModal` opens automatically; `ConfirmModal` gates only real progress

`/jogar` opens `GameEndModal` via an effect watching `state.isGameOver` —
not a button the player has to click. `ConfirmModal` for "Reiniciar
partida"/"Menu inicial" only appears when `!state.isGameOver &&
state.lastMove !== null` (a move has actually been made and the game isn't
already over) — at the very start of a fresh game there's nothing to lose,
and once the game has ended `GameEndModal`'s own "Jogar novamente"/"Menu
inicial" already handle that transition without a redundant second prompt.

### `describeGameEnd` has no `locale` parameter yet

Unlike Chess Sensei's `lib/chess/gameEndMessage.ts` (which takes a `Locale`
and reads from i18n dictionaries), `lib/checkers/gameEndMessage.ts`'s
`describeGameEnd` hardcodes Portuguese strings directly — no i18n system
exists in this repo yet (Phase 8). Revisit this function's signature when
that phase adds a `Locale`/dictionary system.

### Learning Mode's suggestion strength is a dedicated constant, not `dificil` itself

`lib/checkers/difficulty.ts`'s `SUGGESTION_ENGINE_OPTIONS` starts with the
exact same numbers as `DIFFICULTY_OPTIONS.dificil` (`maxDepth: 10,
timeBudgetMs: 1800, randomness: 0`) but is a separate exported constant.
This is deliberate: a future retuning of `dificil` for opponent-play-feel
reasons must never silently also change what a move suggestion recommends
-- "full-strength hint regardless of game difficulty" (spec §5) means
independent of *any* `Difficulty`, including whichever one currently
happens to share its numbers.

### Move-quality grading uses ONE search, not two — reading both scores out of its candidate list

`lib/checkers/gradeMove.ts`'s `gradeMove()` is the first real consumer of
`moveClassification.ts`'s `evalLoss`/`classifyMove`, both built (but
unused) in the AI-opponent phase. An earlier version called the `evaluate`
worker message twice — once on the board before the move, once on the
board after, negating the second — and that design was wrong: two separate
`findBestMove` calls from two different root positions are NOT the
"comparable" case CLAUDE.md's "Search scores are mate-distance-relative and
NOT normalized across searches" section describes, even at the same fixed
depth (a depth-8 search from the after-position is really 9 plies deep
from the original root), and `search.ts`'s single-legal-move short-circuit
returns a *static* `evaluate()` instead of a searched score, compounding
the mismatch. Measured against the real engine, that combination scored
real blunders as "Boa jogada!" more often than not.

The fix: a new `gradeMove` worker message runs exactly ONE `findBestMove`
call on `boardBeforeMove`, then reads both `bestScore` (the top candidate)
and `playedScore` (the specific move that was actually played, looked up
within that same search's `candidates` array) out of that single search.
Both numbers come from the same search at the same depth from the same
root, so they're directly comparable with no negation and no cross-search
normalization needed. The played move is matched by FULL move equality
(`from`/`to`/`promotes`/`captures`, not just `from`/`to`) — this repo has a
documented, rare case where two distinct legal capture chains can share the
same `from`/`to` while capturing different pieces (see `useCheckersGame.ts`'s
conventions above); matching the whole move shape, which the caller always
has since it's the move that was actually played, side-steps that ambiguity
entirely. `GRADE_DEPTH` (currently 8, in `gradeMove.ts`) remains its own
constant, independent of both the opponent's configured `Difficulty` and
`SUGGESTION_ENGINE_OPTIONS`'s suggestion strength.

### Grading and suggestion failures are silent by design; the AI-move failure is not

`app/jogar/page.tsx` already had one engine-failure path before this phase
(`setEngineError`, surfaced in the `aria-live` status line) for when the
AI's own move request fails — that failure blocks play, so it must be
visible. Learning Mode's two new engine calls (`gradeMove` in the
post-move grading effect, `getBestMove` in `handleRequestSuggestion`) are
a nice-to-have overlay on top of a game that works fine without them, so
both `catch` blocks only `console.error` and return — no toast, no status
line change, no `setEngineError`. A player whose grading silently stops
working (engine error, or Learning Mode toggled off mid-flight) simply
sees no toast for that move and can keep playing uninterrupted.

### Vs-computer mode shares its engine with Learning Mode; local mode gets a second, independent one

`app/jogar/page.tsx`'s `getLearningEngine()` returns `engineRef.current`
when `isAiMode` is true (the same worker already running the opponent's
moves) and `learningEngineRef.current` otherwise (a second worker, created
lazily only while Learning Mode is on in a local two-player game).
Sharing in vs-computer mode is deliberate, not just an optimization:
`learningEngineRef`'s creation effect depends only on `[isAiMode,
learningModeEnabled]`, and `isAiMode` never changes during a game, so
toggling Learning Mode on/off in a vs-computer game never touches
`engineRef`'s lifecycle — an earlier design that instead made ONE engine
effect depend on `learningModeEnabled` even when `isAiMode` was true would
have recreated/terminated that engine on every toggle, and
`checkersEngineClient.ts`'s `terminate()` rejects every in-flight request —
silently cancelling an outstanding AI move request mid-think as a side
effect of the player flipping a Learning Mode switch. Local mode has no
such shared engine to protect, so it simply gets its own.

### A move suggestion is graded by nothing; a played move is graded by `gradeMove`

`moveExplanation.ts`'s `explainMove()` (what a move does) and
`describeMoveForToast()` (quality label + `explainMove()` + an optional
material-feel note) are separate exports on purpose: `/jogar`'s suggestion
handler calls `explainMove()` directly (a suggestion has no `MoveQuality`
or `evalLoss` of its own — it's *the* engine's own top pick, not something
being graded against it), while the post-move grading effect calls
`describeMoveForToast()`, which needs the `MoveQuality`/`loss` that
`gradeMove()` just computed.

### `moveExplanation.ts` is bilingual from day one — a deliberate, narrow exception

Unlike `gameEndMessage.ts`/`RulesModal.tsx` (hardcoded Portuguese, i18n
deferred to Phase 8), `lib/checkers/moveExplanation.ts` takes an explicit
`Locale` (`'pt' | 'en'`) parameter and has both phrase sets written now,
per spec §5's explicit call-out that this module (unlike Chess Sensei's
retrofitted `lib/chess/moveExplanation.ts`) should never need a bilingual
retrofit later. Every call site built in this phase (`app/jogar/page.tsx`)
still hardcodes `locale: 'pt'` — there is no UI locale toggle anywhere in
the app yet. Revisit call sites once Phase 8 introduces one.

### Grading effect uses a mount-lifecycle ref, not a per-render cancelled flag

The post-move grading effect in `app/jogar/page.tsx` originally tracked
completion via a `cancelled` local variable in the effect body, cleaned up
on re-render via a dependency on `[state.lastMove]`. This caused the
move-quality toast to never appear in vs-computer mode: the grading effect's
two `evaluate()` calls share the same worker queue (`engineRef`) with the
AI's own `getBestMove()` request, which is enqueued first (because its
effect is declared earlier in the file). The AI's reply move lands via a
same-tick microtask and flips `state.lastMove` again before grading's
queued calls can resolve, so the cleanup always cancelled the grading
promise before the toast could show. Local two-player mode was unaffected
since `learningEngineRef` is never contended by a competing automatic move.
The fix replaces the per-render `cancelled` variable with a `mountedRef`
initialized to `true`, kept in sync via a separate empty-deps `useEffect`
that sets `mountedRef.current = true` on mount and `false` on unmount.
Grading's `.then()`/`.catch()` now check `if (!mountedRef.current) return;`
instead of the old `cancelled` flag. Re-arming the ref on every mount (not
just declaring `useRef(true)` once) is load-bearing: React Strict Mode in
development double-invokes every effect once (mount → cleanup → mount
again), which would otherwise leave the ref permanently `false` after the
simulated unmount, suppressing every grading toast in `next dev` while
working fine in production builds. A toast can still land a beat after the
AI's own reply (since grading's worker calls queue behind the AI's), but a
toast that never arrives is not acceptable.

### Spec §8's background-art claim was verified false during implementation

The design spec claims Chess Sensei's three `public/menu/background-*.webp`
files are "scenic art, no chess imagery" and can be copied unchanged. Direct
inspection during this plan's research proved this false: `background-templo.webp`
shows the sensei mascot seated on a floating chessboard surrounded by chess pieces;
`background-dojo.webp` and `background-cosmico.webp` both center a giant chess
king piece. Only the six flat `public/board/*.webp` square textures are
genuinely chess-agnostic and were copied. The three background images are
real, deferred Draw Things work (Phase 10). In the meantime, `lib/settings/themes.ts`
defines `BACKGROUND_THEMES` with each theme's `fallbackGradient` layered behind
the image path via CSS, so `/` and `/opcoes` render an intentional gradient
today, and no code change is needed once Phase 10 drops real files into the
`public/menu/` paths.

### `/configurar`, `/jogar`, and modals stayed plain-Tailwind by spec

Only `/` and `/opcoes` received the new PageChrome chrome and "anime"
visual identity in this phase — this matches the spec's feature-parity table
(§5), which marks only those two pages for "New art" in Phase 5. Every other
page (`/configurar`, `/jogar`) and component (`RulesModal`, `GameEndModal`,
`ConfirmModal`, `LearningPanel`, `Toast`) keep their hardcoded-Portuguese,
plain-Tailwind style until a later phase explicitly revisits them. `CheckersBoard`'s
new `boardTheme`/`pieceStyle` props exist and are tested; `/jogar` doesn't
pass real `settings` values into them yet — it still renders with the default
`'nebulosa'`/`'classico'`. Wiring those props through in `/jogar` is deferred
to whichever phase gives `/jogar` its own visual pass.

### `Settings.language` has no auto-detection and no UI control yet

`lib/settings/settings.ts` declares `Settings.language: Locale ('pt' | 'en')`
and sets its default to `'pt'`, but nothing auto-detects browser locale (unlike
Chess Sensei's `detectLocale`) and no UI control exists in `/opcoes` to change it.
The field exists purely for forward-compatibility with Phase 8's i18n system,
which will add both detection and a language toggle. For now, nothing reads
`Settings.language` except its default initialization — every UI string is
hardcoded Portuguese.

### `/configurar`'s initial difficulty/color reads from `useSettings()` via an "override" pattern

`app/configurar/page.tsx` needs to read the user's saved default difficulty and
color from `useSettings()` and render them as the initial selection. However, a
plain `useState(settings.defaultDifficulty)` initializer runs once on the first
render and freezes on its initial value. During SSR hydration, `useSyncExternalStore`'s
`getServerSnapshot` returns `DEFAULT_SETTINGS` (same on server and client), so
the state would seed with the generic fallback and never update even though
`settings` updates post-hydration. The fix uses a nullable "override" pattern
instead: track `difficultyOverride` and `colorOverride` as `T | null`, then
compute `const difficulty = difficultyOverride ?? settings.defaultDifficulty`.
This way, before the user clicks any button this session, the UI renders whatever
`settings.defaultDifficulty`/`.defaultColor` currently holds (which updates
correctly post-hydration). Once the user explicitly clicks a button, the override
takes precedence. This pattern is the same workaround used elsewhere in this
codebase (e.g., `LearningModePreference` in `lib/checkers/`).

### `DEFAULT_SETTINGS` values are load-bearing and must never be changed casually

`lib/settings/settings.ts`'s `DEFAULT_SETTINGS` has `defaultDifficulty: 'facil'`
and `defaultColor: 'w'`, mandated by the design spec (spec §7) and depended on
by every test that checks `/configurar`'s fallback state. During Task 12's
implementation, a test failure was briefly "fixed" by changing `DEFAULT_SETTINGS`
itself — an out-of-scope, spec-violating change caught during review and reverted
(commit 93a89ab). Documented here as a cautionary note: any test that seems to
require a different default value has the wrong expectation, not the settings
module. `DEFAULT_SETTINGS` values are design decisions, not test fixtures.

### `vitest.setup.ts` clears `localStorage` and resets `useSettings` before every test

`vitest.setup.ts` has a global `beforeEach` hook (not per-file, but per entire
suite) that calls `window.localStorage.clear()` and `__resetSettingsCacheForTests()`.
This runs before every single test in the whole project, not just settings-related
ones. This means any test that seeds `localStorage` or calls `saveSettings()` at
module scope (outside of a `beforeEach` or `it`) will silently have that data
wiped before the test runs, which can be surprising. When writing a test that
depends on persisted settings, seed them inside a `beforeEach` hook so they're
applied after the global clear, or inside the individual `it` block.

### `DEFAULT_SETTINGS.pieceStyle` is `'anime'`; `CheckersBoard`'s default is `'classico'`

`lib/settings/settings.ts`'s `DEFAULT_SETTINGS.pieceStyle` defaults to `'anime'`,
reflecting the Phase 5 visual redesign. However, `components/CheckersBoard/CheckersBoard.tsx`'s
own `pieceStyle` prop defaults to `'classico'` when the prop is omitted. This is
a deliberate, known divergence, not a bug: no page in this codebase currently
wires `settings.pieceStyle` into the board component, so today nothing observes
the mismatch. `CheckersBoard`'s default exists purely as a fallback for tests
and any future caller that renders the board without reading settings at all.
Once a later phase wires settings into `/jogar`'s board rendering, it will
explicitly pass `settings.pieceStyle` and the CheckersBoard default will become
unreachable in the real app (but harmless to keep around).

### Demo boards use row/col coordinates, not hand-typed square numbers

`lib/checkers/demoBoards.ts` is the first place in the codebase to systematically
avoid hand-typed checkers square numbers — the existing CLAUDE.md entry "Spec §2's
compact board notation was never implemented" already flags this as an error-prone
pattern that caused real defects elsewhere. Every demo position uses `squareAt(row,
col)` and `buildBoard(pieces)`, which resolve coordinates through the real
`rowColToSquare` function instead of manually indexing `board[N]`. This pattern
should be adopted by any future demo/test content that needs to reference board
positions — never hand-index squares directly when `squareAt()` exists. Every
named position in `demoBoards.ts` has a corresponding test in `demoBoards.test.ts`
that asserts its legal-move behavior via `legalMovesFrom` (the real, already-tested
engine) before any page ever renders it — this is how a hand-designed position gets
caught if it's wrong.

### `InteractiveDemo`'s `turn` prop is the color OPPOSITE the protagonist's

`components/InteractiveDemo/InteractiveDemo.tsx` passes `CheckersBoard` the turn
as a color held constant for the whole demo — specifically, the color *opposite*
the single piece the demo lets the player move. This is load-bearing for animation:
`CheckersBoard`'s animation effect infers "who just moved" by detecting NOT-`turn`
in the piece positions between renders. Since only the protagonist ever moves in a
demo (there's no opponent turn), holding `turn` fixed at the opposite color ensures
that inference always resolves back to the protagonist's own color, making the
slide/capture-fade animation fire instead of a hard snap on every demo move.

### Openings/traps trainer scope: 8 openings, one line each, hand-verified theory + generic development

`lib/openings/data.ts` contains 8 real-named checkers openings (`old-fourteenth`,
`single-corner`, `defiance`, `alma`, `cross`, `switcher`, `double-corner`,
`laird-and-lady`) with exactly one main line per opening. This was a deliberate,
user-confirmed scope reduction from the design spec's suggestion of "8-12 openings
with main-line + 1-2 named variations": hand-authoring accurate, engine-validated
checkers opening theory is real content work. What this plan actually delivers is:
each opening's *first move* (checkers openings are genuinely classified primarily
by which of Black's 7 legal opening moves is played — a documented fact already
asserted as a test in `moveGeneration.test.ts`) and *defining second move* (the
reply that gives the named system its character) are real theory, hand-verified
safe during planning; the remaining 4 moves per line follow a generic, structurally-safe
"develop a second piece, fill the gap left behind" pattern rather than reproducing
exact textbook continuations from memory. Every move in every line has been validated
against the actual rules engine via `lib/openings/data.test.ts` before commit —
a test failure during Task 2 is expected, normal work (see Global Constraints
in the plan), not a blocker. Extending to more openings or more variations per
opening is real, well-scoped future content work.

### Opening names are loanwords, never translated

Every opening in `lib/openings/data.ts` has `name.pt === name.en` (e.g., both
are `'Old Fourteenth'`, not `'Old Fourteenth'` / `'A Décima Quarta Antiga'`).
This is correct for the medium: opening names are proper nouns / historical
loanwords that stay identical in Portuguese checkers literature, exactly like
"Najdorf" stays "Najdorf" in Portuguese chess writing. Future additions to the
openings list should give a new opening's `name.pt` the same value as its
`name.en` unless it's a genuinely PT-and-EN-legitimately-different case (unlikely
for checkers openings). Any bilingual-content test that asserts "must differ
across locales" should except proper-noun loanwords, following chess's own
precedent — `data.test.ts` asserts `description.en !== description.pt` (those
are free-written prose) but not name inequality.

### Each opening's first move must be unique across the list, with one documented exception

Checkers openings are classified BY which of Black's 7 legal opening moves is
played — a documented fact of real checkers theory (already verified in a test:
`moveGeneration.test.ts` asserts exactly 7 legal first moves). Each opening in
`OPENINGS` should have a unique `notation:` value for its move 1 (the first move
in its first line), with exactly one deliberate exception: `old-fourteenth` and
`single-corner` both intentionally start with `'11-15'`, differentiated only by
White's reply. This mirrors real checkers theory, where multiple named systems
branch from the same most-popular first move. A move-1 change should never be
"required" by the legality test (move 1 from the initial position is always legal —
one of exactly 7 guaranteed options) — if a future content-editing pass ever
changes a move-1, that's a deliberate design decision, not a bug fix, and must
be checked against every other opening's move-1 for a collision or intention.

### Checkers openings depart from Chess Sensei's precedent in three ways

1. **No `eco` field**: American checkers has no ECO-equivalent universal
   classification code — `Opening`/`OpeningLine`/`OpeningMove` have no `eco`
   property (unlike Chess Sensei's data shape). This is a deliberate difference
   from chess, not an oversight (design spec §6).

2. **Protagonist is always black**: Unlike chess (which splits openings into
   White systems and Black defenses, branching `protagonistColorFor` on the
   opening's `id` prefix), every checkers opening is defined by Black's own
   first move (the side that always moves first in checkers). `OpeningPractice`'s
   protagonist is hardcoded to `'b'` — do not port chess's
   `protagonistColorFor` function; there is no checkers equivalent.

3. **CheckersBoard has no orientation/flip prop**: Unlike chess's `ChessBoard`,
   `CheckersBoard` has no `orientation` prop and renders the board exactly as
   it already does today, with fixed orientation (Black at top, White at bottom).
   Both `OpeningStudy`/`OpeningPractice` pass only the board state to
   `CheckersBoard`, never any theme/style props — matching `/jogar`'s current,
   documented, still-unwired state (per Conventions: `CheckersBoard`'s theme
   props exist since Phase 5 but no page wires real `Settings` values yet).

### Captured-piece removal in tests requires fake timers to match CheckersBoard's animation

`components/CheckersBoard/CheckersBoard.tsx` keeps captured pieces rendered (with
`opacity-0 scale-75` classes, their `removing` flag set to true) for `CAPTURE_FADE_MS`
(300ms) before removing them from its internal `displayPieces` state. The whole pieces
container has `pointer-events-none`, applying to every piece, not just captured ones.
Any test that clicks a capturing move and then asserts on the captured square's removal
from the DOM must advance past this animation duration using fake timers
(`vi.useFakeTimers()` / `act(() => vi.advanceTimersByTime(400))` / `vi.useRealTimers()`
in a `try/finally`) — a synchronous assertion immediately after the click will
intermittently or always fail, depending on exact timing. See `CheckersBoard.test.tsx`'s
own "fades a captured piece out and removes it after the fade duration" test for the
pattern.

### Phase 8 (i18n) was deliberately split into two plans: mechanism+dictionary now, UI retrofit later

This plan (`i18n Mechanism & Dictionary`) delivers `lib/i18n/` and a complete PT/EN
dictionary covering every hardcoded string in pages/components built through Phase 7.
A deliberate follow-up plan ("Plan 8b") will retrofit every existing page and component
to actually call `useTranslation()` instead of hardcoded Portuguese — the same "built
but not wired up yet" pattern this project used for earlier groundwork phases
(e.g., `RulesModal` added before it was linked anywhere). **No page or component in this
repo actually uses the dictionary yet** — `useSettings().settings.language` can be changed
(e.g., via a future `/opcoes` language toggle in Plan 8b) with zero visible effect until
that retrofit plan lands. The dictionary is fully validated and complete; it's just not
consumed anywhere yet.

### Global test-locale seed: vitest.setup.ts seeds Portuguese before every test

`vitest.setup.ts`'s `beforeEach` now calls `window.localStorage.setItem('checkers-settings',
JSON.stringify({ language: 'pt' }))` before every test in the whole repo. This is load-bearing:
with `Settings.language` now having real browser-based auto-detection (`detectLocale`), any
existing test that asserts hardcoded Portuguese text would otherwise fail under `jsdom`'s
default `navigator.language` (`'en-US'`), which would auto-resolve to `'en'`. The seed ensures
every test that doesn't explicitly override `language` gets Portuguese by default, keeping
all existing tests passing once Plan 8b swaps hardcoded strings for `useTranslation()` calls.
Any future test needing to exercise the English dictionary must explicitly call
`saveSettings({ ..., language: 'en' })` or stub `navigator.language` to `'pt-PT'` before
calling `loadSettings()` directly, rather than relying on the global seed default.

### `Locale` type duplication is intentional, for now

`lib/i18n/types.ts` declares the canonical `Locale = 'pt' | 'en'` going forward. However,
`lib/checkers/moveExplanation.ts`, `lib/settings/settings.ts`, and `lib/openings/types.ts`
each still declare their own, structurally-identical `Locale` locally (a pattern each of
those phases' own CLAUDE.md entries already documented as deliberate, decoupled-until-i18n-exists).
Now that `lib/i18n/types.ts` exists, consolidating them onto this canonical version is
legitimate future cleanup — but not required by anything in this plan or Plan 8b, since
TypeScript's structural typing makes the duplicates fully interchangeable without any import
changes. Each module that declares its own `Locale` has a comment explaining the reasoning;
they can fold into `lib/i18n/types.ts` later without breaking any call sites.

### Four dictionary values are identical by design: language names and loanwords

`lib/i18n/dictionaries/dictionaries.test.ts` documents an exception set of four leaf keys
where PT and EN text is deliberately identical: `opcoes.portuguese` ("Português"),
`opcoes.english` ("English"), `menu.title` ("Checkers Sensei"), and `pieceStyleLabel.anime`
("Anime"). The first two match real-world convention: a language switcher's option labels
conventionally display each language's name in itself, not translated. `menu.title` is the
app's own brand name, unchanged in both languages. `pieceStyleLabel.anime` is an established
loanword in Portuguese (and kept in both dictionaries for consistency), same as the openings
trainer's international opening names which also stay identical across locales. Every other
string pair differs genuinely between locales; the test asserts this with the exception set
explicitly documented.

### `lib/settings/useSettings.test.ts` stubs `navigator` because `localStorage.clear()` requires it

`lib/settings/useSettings.test.ts` has a module-local `beforeEach` that stubs `navigator` to
`{ language: 'pt-PT' }` via `vi.stubGlobal('navigator', ...)`. This is necessary because the
global `vitest.setup.ts` `beforeEach` clears `localStorage` before every test, and with auto-detection
now wired into `Settings.language`, calling `loadSettings()` on empty localStorage would
otherwise use `jsdom`'s default `navigator.language` to detect — which is `'en-US'`, giving
every test an English locale by default instead of Portuguese. The stub in this test file
ensures that tests in `useSettings.test.ts` specifically, which exercise `loadSettings()`
on empty storage and depend on language being `'pt'`, get the right value without relying
on the global seed (which can't pre-populate saved `language` for this file's own
language-detection tests). This pattern is specific to this file because it's testing the
very detection logic; other test files rely only on the global seed and needn't stub anything.

## Deploy

Vercel only (same as Chess Sensei — Docker/self-host is not supported). No
environment variables needed — no backend, no auth, no API routes.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
