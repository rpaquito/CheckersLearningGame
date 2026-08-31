# Checkers Sensei — design spec

Companion/"twin" app to Chess Sensei (`/Users/rpaquito/Documents/Projects/ChessLearningGame`,
GitHub `rpaquito/ChessLearningGame`, Vercel project `chess-learning-game` on team
`algorithm-cloud`). This spec exists so the port is deliberate rather than
"clone and hope" — it calls out exactly what is reused unchanged, what is
adapted, and what is genuinely new engineering/content work.

Full architecture reference: see the digest folded into this spec's sections
below, which was produced by reading the entire Chess Sensei codebase
(`CLAUDE.md`, `app/`, `components/`, `lib/`, `public/`, config files, and all
`docs/superpowers/specs|plans/*.md`). Where a section says "reuse unchanged,"
the exact source file in Chess Sensei is named — copy its structure/pattern,
adapting only the domain (chess → checkers) where the code actually touches
chess rules.

## 0. Process rules for this build

These apply for the whole build, confirmed with the user 2026-08-31:

- **Repo**: `rpaquito/CheckersLearningGame` on GitHub already exists and is
  linked as `origin`. GitHub access confirmed (`gh auth status`: logged in as
  `rpaquito`, token scope includes `repo`).
- **Vercel**: access confirmed (`vercel whoami`: `rpaquito-4333`; team
  `algorithm-cloud` / `team_pRUjnDsAYgDySY40gd0EzJYO`, same team as Chess
  Sensei, plan `hobby`).
- **Branching**: no worktrees, no feature branches. Every commit is made
  directly to `main` and pushed immediately after each phase of the
  implementation plan completes and its tests pass.
- **Commit cadence**: one commit (or a small tight series) per implementation
  plan phase, pushed to `main` right after — mirrors how Chess Sensei was
  actually built (one dated spec+plan per delivered feature, see §13
  "Build history" below).
- **CLAUDE.md**: created at repo bootstrap (Phase 0) with the same rule
  *categories* Chess Sensei's `CLAUDE.md` documents (structure map,
  non-obvious conventions, "why", recurring bugs/traps, deploy info, agent
  context file note), adapted for checkers where the rule is domain-specific
  and reused verbatim where it's tooling/process (testing setup, PWA
  strategy, Vercel-only deploy, safe-area/viewport handling, etc.). Updated
  at the end of every phase with whatever new non-obvious conventions that
  phase introduced — same discipline as the twin project, not a one-shot
  document.
- **Offloading work**: the `gemini` CLI (v0.57.0, confirmed installed) is
  available and should be used where it can genuinely save turns/usage
  without sacrificing quality — good candidates: bulk-generating/translating
  openings content drafts, generating boilerplate test cases, drafting
  dictionary entries — always reviewed/verified before being treated as
  final, especially anything checkers-rules-sensitive (see §7's
  engine-validation safety net).
- **Questions**: ask at any point scope or a decision is genuinely unclear —
  standing invitation, not just during brainstorming.

## 1. Rules variant (confirmed)

**American / English checkers.** 8×8 board, 32 dark squares, 12 men per side
in the standard starting position. Men move/capture diagonally forward only;
capturing a man that reaches the last row promotes it to a king. Kings move
and capture diagonally one square in any direction (not "flying" — that's
international draughts). Capture is mandatory whenever any capture is
available to the side to move, multi-jump chains must be continued to
completion, but the player is **not** required to choose the longest/maximum
chain if more than one capturing piece or path exists (this is what
distinguishes American checkers from international draughts' "must
maximize captures" rule).

**Backlog, not this build**: international draughts (10×10 board, 20
pieces/side, flying kings, mandatory-maximum-capture) as a future game mode
— noted so the rules-engine module boundary (§2) doesn't accidentally bake in
assumptions that make this impossible later (e.g. keep board size as a
constant, not hardcoded 8 everywhere).

## 2. Rules engine — `lib/checkers/`

The single biggest net-new module; nothing in Chess Sensei is reusable here
beyond the *shape* of `useChessGame.ts`. Needs thorough test coverage
(mandatory capture, multi-jump, promotion-mid-chain, terminal states) —
budget real design/test time, this is the highest-risk piece of the whole
port.

### Board representation

A compact custom notation (not FEN, not PDN — just internally consistent,
documented, and fully covered by tests): 32 characters, one per dark square
in standard checkers numbering (1-32, row-major starting top-left playable
square), plus a turn marker. Alphabet: `b`/`B` = black man/king, `w`/`W` =
white man/king, `-` = empty.

```ts
// lib/checkers/types.ts
export type Square = number; // 1-32
export type Color = 'b' | 'w';
export type PieceKind = 'man' | 'king';
export interface Piece { color: Color; kind: PieceKind; }
export type Board = ReadonlyArray<Piece | null>; // length 32, index = square-1

export interface CheckersMove {
  from: Square;
  to: Square;
  captures: Square[]; // squares of captured pieces along the path, [] if none
  promotes: boolean;  // true if this move ends with the piece becoming a king
}

export type GameStatus =
  | 'playing'
  | 'no-moves'        // side to move has zero legal moves -> they lose
  | 'draw-repetition'
  | 'draw-no-capture'; // N-move rule, see below
```

The starting position, adjacency/diagonal-neighbor table (which of the 32
squares are diagonally adjacent to which, and in which direction), and
row/column derivation from square number are the first things to implement
and test — everything else depends on them being correct.

### Move generation

```ts
// lib/checkers/moveGeneration.ts
export function legalMovesFrom(board: Board, turn: Color, square: Square): CheckersMove[];
export function allLegalMoves(board: Board, turn: Color): CheckersMove[];
export function hasAnyCapture(board: Board, turn: Color): boolean;
export function applyMove(board: Board, move: CheckersMove): Board;
```

Algorithm: compute every piece's simple moves and every piece's capture
sequences (recursive: for a capturing piece, explore each available jump,
and from the landing square recurse for further jumps before considering the
sequence "done" — a chain must be completed once started). If
`hasAnyCapture(board, turn)` is true, `allLegalMoves`/`legalMovesFrom` return
**only** capturing moves (mandatory capture enforced here, not as a UI
warning layered on top — same "board stays dumb" philosophy as
`ChessBoard.tsx`: it never decides legality, it just never gets offered an
illegal target). No maximum-capture filtering (see §1).

Terminal-state detection (`gameStatus(board, turn, history)`):
- `no-moves`: `allLegalMoves(board, turn).length === 0` → the side to move
  loses (this needs to be phrased carefully to the human — "you have no
  moves" reads as a loss condition, unlike chess stalemate which is a draw).
- `draw-no-capture`: a running counter of plies since the last capture,
  reaching **80 plies (40 full moves) with no capture by either side** →
  draw. This is the commonly-cited simplified version of the no-progress
  rule (real tournament rules have historical variants, e.g. different
  counts once only kings remain) — document in `CLAUDE.md` once implemented
  that this is the simplified version, not a tournament-federation-verified
  rule, same "informational, not authoritative" framing as §6's opening
  names.
- `draw-repetition`: same position (board + turn) occurring 3 times —
  requires tracking position history, same idea as chess threefold
  repetition even though Chess Sensei doesn't currently implement that check
  either (it relies on `chess.js` internals it doesn't expose) — this is
  genuinely new for both apps.

### `useCheckersGame` hook

Mirrors `lib/chess/useChessGame.ts`'s public shape exactly:

```ts
// lib/checkers/useCheckersGame.ts
export interface CheckersGameState {
  board: Board; turn: Color; status: GameStatus; isGameOver: boolean;
  lastMove: CheckersMove | null;
  mandatoryCaptureSquares: Square[]; // pieces that must move (empty if no capture is forced anywhere)
}
export interface UseCheckersGameResult {
  state: CheckersGameState;
  legalMovesFrom: (square: Square) => Square[]; // just target squares, for the board's highlight props
  makeMove: (from: Square, to: Square) => boolean;
  reset: () => void;
}
export const STORAGE_KEY = 'checkers-learning-game-board';
export function clearSavedGame(): void;
```

Same SSR-hydration caveat as `useChessGame` applies (`/jogar`-equivalent
route reads `localStorage` — do it the safe way from the start: read
`DEFAULT` synchronously, load the real saved game in a `useEffect` post-mount
— Chess Sensei documents this as a *known, unfixed* bug in its own hook, no
reason to import that bug into a fresh module).

### Move animation support

```ts
// lib/checkers/inferMove.ts
export function inferMove(prevBoard: Board, nextBoard: Board): CheckersMove | null;
```

Same purpose as Chess Sensei's `lib/chess/inferMove.ts` (diff two positions
to find what move connects them, for the sliding-piece animation) but must
handle the checkers-specific case chess doesn't have: a single move can
capture *multiple* pieces across a multi-hop chain. `captures: Square[]` is
already plural for this reason. The board component's animation layer needs
to animate the moving piece through each intermediate landing square in
sequence (not one CSS transition straight from origin to final square), and
fade out potentially several `removing` pieces from one move instead of at
most one.

## 3. AI opponent — `lib/checkers/checkersEngineClient.ts`

No off-the-shelf "Stockfish for checkers" WASM binary is vendored the way
Chess Sensei vendors real Stockfish — writing a custom engine is the
confirmed approach.

```ts
// lib/checkers/difficulty.ts — mirrors lib/chess/difficulty.ts's shape
export type Difficulty = 'facil' | 'medio' | 'dificil';
export interface EngineOptions {
  maxDepth: number;
  timeBudgetMs: number;
  randomness: number; // 0 = always best; >0 weighted-random among top candidates (reuse selectWeightedMove)
}
```

Concrete starting numbers to tune during implementation (write these as a
first guess, then adjust based on how the AI actually plays/feels in
manual testing — don't treat them as final without playing a few games):

| Difficulty | maxDepth | timeBudgetMs | randomness |
|---|---|---|---|
| facil | 3 | 200 | 0.8 |
| medio | 6 | 600 | 0.35 |
| dificil | 9-10 (iterative deepening up to time budget) | 1800 | 0 |

**Search**: minimax with alpha-beta pruning, iterative deepening within
`timeBudgetMs` for `dificil` (so it can go deeper on quieter positions
without a hard depth cap). **Evaluation**: material (man ≈ 100, king ≈ 250-300)
plus light positional terms — back-row retention (a documented checkers
opening principle: keeping men on your back row delays the opponent's
kinging), center-column control, advancement toward promotion, mobility
(legal move count) as a tie-breaker. Runs in a **Web Worker** (keep the UI
thread free during search) with its own small message protocol — not UCI,
since there's no UCI-speaking engine involved:

```ts
// worker message shapes, not a wire protocol standard — internal to this app
type WorkerRequest =
  | { type: 'getBestMove'; board: Board; turn: Color; options: EngineOptions }
  | { type: 'evaluate'; board: Board; turn: Color; depth: number };
type WorkerResponse =
  | { type: 'bestMove'; move: CheckersMove }
  | { type: 'evaluation'; score: number };
```

The client wrapper (`createCheckersEngineClient()`) reuses
`stockfishClient.ts`'s two proven patterns even though the wire protocol
differs: (1) a promise chain serializing all requests through the one
worker so concurrent `getBestMove`/`evaluate` calls can't cross-resolve, (2)
`evaluate()` always running at fixed full-strength/single-best regardless of
what difficulty the opponent search left configured, since it feeds
move-quality grading and must stay objective.

`lib/chess/selectMove.ts`'s `selectWeightedMove` (softmax pick among
top-N candidates so lower difficulties feel human, not
"capped-but-still-optimal") is engine-agnostic — reuse verbatim, just feed it
this engine's own top-N candidate list instead of Stockfish MultiPV output.

### Move-quality grading

```ts
// lib/checkers/moveClassification.ts — same shape as Chess Sensei's, recalibrated thresholds
export type MoveQuality = 'boa' | 'imprecisao' | 'erro';
export function evalLoss(bestEval: number, playedEval: number): number;
export function classifyMove(loss: number): MoveQuality;
```

Chess's cutoffs (≤30 "boa", ≤100 "imprecisão", else "erro" — centipawn scale
where a pawn ≈ 100) don't transfer numerically: checkers' material scale here
is man≈100/king≈250-300, and swings are generally smaller-magnitude than
chess (no queen-scale blunders). Pick provisional thresholds (e.g. ≤15
"boa", ≤50 "imprecisão", else "erro") and treat them as tunable, same
"provisional, verify by playing" caveat as the depth/time numbers above.

## 4. Board & pieces — `components/CheckersBoard/`

Same 8×8 grid skeleton as `components/ChessBoard/ChessBoard.tsx`: `role="grid"`,
64 `<button>` squares, same board-theme texture application via inline
`backgroundImage`, same highlight-layer approach (last-move ring, selected
outline, legal-target dot/ring, suggested-move ring) layered as separate
elements so colors can stack. Same viewport-fit sizing formula, learned the
hard way in Chess Sensei — reuse verbatim, don't rediscover the bug:
`w-[min(98vw,62dvh,560px)] sm:w-[min(92vw,62dvh,560px)]` on both the page's
board-wrapper `<div>` (must have this *exact* class, not just the inner
board component — see Chess Sensei CLAUDE.md's documented flex-sizing bug)
and the board component's own root.

Deltas from chess:
- Pieces only ever render on dark squares (light squares stay empty/unclickable
  in terms of pieces, though they still render as part of the grid for
  correct board geometry).
- `threatenedSquares` (chess: pieces under attack) becomes
  `mandatoryCaptureSquares` (checkers: pieces that must move because a
  capture is forced) — same visual treatment (outline), different meaning
  and different source (`state.mandatoryCaptureSquares` from the hook, not a
  separately-computed threats module — the rules engine already knows this
  as part of legality).
- No "check" concept at all — no board-locking toast tone needed. Illegal
  (non-capturing, when capture is mandatory) moves simply aren't offered as
  legal targets in the first place, so there's nothing to warn about
  reactively.
- Animation layer extended for multi-hop jump chains and multiple
  simultaneous capture removals per move (see §2's `inferMove`).

### Pieces — `PieceIcon.tsx` + `pieceStyles/`

Same dispatch pattern as Chess Sensei (`SHAPES: Record<PieceStyle, ...>`,
`<svg viewBox="0 0 100 100" fill="currentColor">`), but only 2 piece kinds
instead of 6 — `pieceStyles/classico.tsx` / `moderno.tsx` / `anime.tsx` each
shrink to a 2-case switch:

- **man**: classico = plain circle (like a simplified pawn body, no
  head/base distinction needed); moderno = simple hexagon/octagon polygon;
  anime = jagged/pointed disc silhouette (same "crystal/energy" language as
  the chess anime style's zigzag shapes).
- **king**: same base shape as man, plus a crown ornament on top (reusing
  each style's existing crown-drawing idiom where one exists — chess's
  `anime` queen/king already has a jagged-zigzag crown polyline; chess's
  `classico` king already has cross-bar rects — adapt those onto the checkers
  disc rather than inventing new crown geometry from scratch). Do **not**
  use the traditional "two stacked checkers" king convention — a crown/
  coronet reads better against this app's "Sensei" branding and stays
  visually consistent with the chess app's king iconography.

Never Unicode draughts glyphs (⛀⛁⛂⛃) — same rationale as chess's Unicode
ban: inconsistent font coverage and inconsistent rendered size across real
phones. Inline SVG only, from day one.

## 5. Feature parity map

Routes mirror Chess Sensei's 1:1 (Portuguese route segments, same as the
twin — the whole app defaults to PT-PT):

| Route | Purpose | Delta from chess |
|---|---|---|
| `/` | Menu: vs-computer / two-players / learn-to-play / options tiles | New art, same structure |
| `/configurar` | Per-game difficulty/color picker | Same, checkers `Difficulty`/`PlayerColor` types |
| `/opcoes` | Persisted default settings + theme pickers + language toggle | Same, checkers `Settings` shape |
| `/jogar` | The live game | Rules engine + AI + animation deltas (§2-4) |
| `/aprender` | Tutorial hub | Checkers-specific NavCards (see below) |
| `/aprender/pecas` | Playable piece-movement demos | Man movement, king movement, promotion |
| `/aprender/regras-especiais` | Special-rules demos | Mandatory capture, multi-jump chains |
| `/aprender/fim-de-jogo` | Endgame concepts | No-legal-moves loss, draw conditions |
| `/aprender/estrategia` | Text-only strategy principles | Checkers principles: control the center, keep the back row, avoid edge columns, force favorable trades, king safety |
| `/aprender/centipawns` (route slug reused; content generalized) | Explains the engine-evaluation / move-quality badges | Same 3-badge system, checkers framing |
| `/aprender/aberturas` + `[id]` + `[id]/praticar` | Openings/traps trainer | See §6 |

**Learning mode** (`LearningPanel`): legal-move highlighting, mandatory-capture
highlighting (replaces "threatened pieces"), move suggestion (full-strength
engine hint regardless of game difficulty, same as chess's
`handleRequestSuggestion`), last-move quality toast. Component itself is
game-agnostic enough to reuse unchanged (its props are already generic:
`enabled`/`onToggle`/`onRequestSuggestion`/`suggestionLoading`/`hasSuggestion`/
`suggestionExplanation`).

**Move-explanation phrases** (`lib/checkers/moveExplanation.ts`, mirrors
`lib/chess/moveExplanation.ts`): canned-phrase sentences (never free-generated
text), bilingual PT/EN from the start (no separate "phase 2" — Chess Sensei
retrofitted bilingual support onto an initially-PT-only module; build this
one bilingual from day one). Detects: capture (single vs. multi-jump chain,
"captures N pieces"), promotion ("becomes a king"), moving into a forced
capture (giving away a piece), advancing toward the king row, abandoning
back-row defense (an explicit checkers opening heuristic), center-column
occupation. `evalLoss`-to-intuition phrasing (`centipawnFeel` chess
equivalent) translated to checkers' man/king material scale.

**Toasts/modals**: reuse `Toast`/`ToastProvider`/`GameEndModal`/`ConfirmModal`/
`RulesModal` component shells verbatim (they're already game-agnostic shape:
message+tone / status+kind / confirm-cancel / open-close). Only the content
changes: `RulesModal`'s sections become man/king movement, mandatory capture,
multi-jump, promotion, draw conditions; `describeGameEnd`'s status→message
mapping uses checkers' `GameStatus` union (§2) instead of chess's
check/checkmate/stalemate/draw. `ToastTone`'s `'check'` special case (blocks
board interaction until dismissed) has no checkers analog — drop it, no
replacement tone needed (§4 explains why: illegal moves are simply never
offered, nothing to react to).

## 6. Openings/traps trainer

Same data shape as `lib/openings/types.ts`, renamed to the checkers domain
(module lives at `lib/checkersOpenings/` or `lib/openings/` reused — pick
one during implementation, document the choice):

```ts
export interface OpeningMove { notation: string; explanation: Record<Locale, string>; }
export interface OpeningLine { name: Record<Locale, string>; moves: OpeningMove[]; }
export interface Opening {
  id: string; // kebab-case slug, route segment
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  lines: OpeningLine[];
}
```

`notation` replaces chess's SAN with checkers' standard numeric notation
(e.g. `"11-15"`, `"23-19"` — squares numbered 1-32 as in §2). No `eco` field
(checkers has no ECO-equivalent universal code system) — openings are
identified by name only, same as their real-world usage.

**Content plan** (confirmed: include now, engine-validated): curate 8-12
well-known named American-checkers openings/traps — candidates: Old
Fourteenth, Laird and Lady, Cross, Single Corner, Double Corner, Alma,
Defiance, Switcher, Souter, Bristol, Paisley, Kelso, Wagram. Each gets a
main line + 1-2 named variations, move-by-move explanations in both PT-PT
and EN (hand-written for both, same rigor as chess's phase-3 i18n — not
machine-translated). **Every line is validated for legality against our own
`allLegalMoves`/`applyMove`** before being accepted into `data.ts` — same
safety net `replayLine.ts`'s tests give chess's `OPENINGS` (a test iterates
every opening/line/move and asserts the move is legal at that point). This
guarantees playability even though the *classification/name* of an opening
is informational rather than tournament-verified (flagged explicitly in
`CLAUDE.md` once written, so nobody later assumes deeper authority than
exists).

`replayLine`-equivalent:
```ts
export interface ReplayedMove { board: Board; move: CheckersMove; notation: string; explanation: Record<Locale, string>; }
export function replayLine(line: OpeningLine): ReplayedMove[]; // throws if any move is illegal at that point
```

Study mode (`OpeningStudy`) and practice mode (`OpeningPractice`) components
reuse Chess Sensei's structure near-verbatim (step-by-step viewer with
Prev/Next; opponent replays the line deterministically with a fixed delay,
never a real engine; wrong-but-legal move shows the expected move via the
board's suggested-move highlight). `LineTabs`, `NavCard`, `OpeningPageHeader`
reused unchanged (already fully game-agnostic).

## 7. Settings, themes, i18n — reused mechanisms, new content

**Settings** (`lib/settings/settings.ts`, `useSettings.ts` — reuse the
`useSyncExternalStore` singleton pattern verbatim):

```ts
export type BoardTheme = 'sakura' | 'nebulosa' | 'neon'; // same 3 themes, same names
export type PieceStyle = 'classico' | 'moderno' | 'anime'; // same 3 styles
export type BackgroundTheme = 'templo' | 'dojo' | 'cosmico'; // same 3 themes, same names
export interface Settings {
  defaultDifficulty: Difficulty;
  defaultColor: 'black' | 'white' | 'random'; // reuse PlayerColor shape verbatim
  boardTheme: BoardTheme;
  backgroundTheme: BackgroundTheme;
  pieceStyle: PieceStyle;
  language: Locale;
}
export const DEFAULT_SETTINGS: Settings = {
  defaultDifficulty: 'facil', defaultColor: 'white',
  boardTheme: 'nebulosa', backgroundTheme: 'templo',
  pieceStyle: 'anime', language: 'pt',
};
```

`STORAGE_KEY` for settings: `'checkers-settings'` (English, project-native
from day one — chess's `'xadrez-settings'` reflects its own pre-rebrand
history, no reason to import a naming inconsistency here). Game-state
storage key: `'checkers-learning-game-board'` (§2).

**Board/background theme assets are copied unchanged from Chess Sensei** —
confirmed in the design discussion: the square textures (flat color + grain,
no chess imagery) and the three menu backgrounds (temple/dojo/cosmic scenic
art, no chess imagery) are not chess-specific and can be copied straight
into `public/board/` and `public/menu/background-*.webp` with no Draw
Things regeneration needed. This is a real time-saver — confirm during
implementation that the files genuinely contain no chess-specific imagery
before copying (a quick visual check), and only regenerate if one turns out
to have a chess piece rendered into it somewhere.

**i18n** (`lib/i18n/`): reuse `types.ts` (`Locale`, `VALID_LOCALES`),
`dictionaries/index.ts`, `useTranslation.ts`, `detectLocale.ts` mechanism
verbatim. `Dictionary` interface shape reused with checkers-specific leaf
content: same top-level sections (`common`, `menu`, `opcoes`, `difficulty`,
`color`, `pieceStyleLabel`, `configurar`, `gameSetup`, `jogar`,
`learningPanel`, `rulesModal`, `gameEnd`, `aprenderHub`, tutorial subpages,
`openings`, `interactiveDemo`), content rewritten for checkers. Both
`pt.ts`/`en.ts` written together from the start (not phased in later like
chess's retrofit) — hand-written for both locales, not machine-translated,
same grammar discipline as chess's PT-PT conventions (gerund → "a +
infinitive", "teu/tua" not "seu/sua", infinitive instructions not
imperative). `dictionaries.test.ts` equivalent asserts both locales have
identical leaf keys and no empty strings — port this test verbatim, it's
pure structural validation.

## 8. Visual identity & branding

Same "anime" aesthetic, same design tokens, same fonts — copied verbatim
into `app/globals.css`:

```css
--color-ink: #1A0B33;      /* base bg */
--color-ink-soft: #241246;  /* cards */
--color-cyan: #00E5FF;
--color-pink: #FF6FA5;
--color-gold: #FFD600;
--color-purple: #7B3FA0;
--color-lilac: #E8D9FF;
```

Bangers (display/titles) + Poppins (body, weights 400-800), both `latin`+
`latin-ext` subsets. `ChipButton` (4 color variants, diagonal-clip +
stamped shadow), `ToggleGroup`, `PageChrome` (`PageTitle`/`PageHeader`/
`MODAL_BACKDROP_CLASS`/`PageGlow`) all reused unchanged — none of it is
chess-specific.

**New Draw Things assets** (only what's actually chess-specific in the
twin needs regenerating — see §7 for what's reused unchanged):

| Asset | Chess Sensei concept | Checkers Sensei concept |
|---|---|---|
| App icon (192/512/512-maskable/apple-touch) | Ivory pawn, golden headband, wispy beard, cyan aura — "pawn as sensei" | Crowned checkers disc (king piece) as "sensei" — same aura/headband/beard treatment adapted onto a disc silhouette instead of a pawn |
| `menu/vs-cpu.webp` | Chess-board-adjacent illustration | Checkers board/pieces, same "golden silhouette, dark background, bokeh" anime treatment (note from chess CLAUDE.md: first attempt at this tile rendered photorealistic — iterate the prompt toward the established anime style, don't accept the first result uncritically) |
| `menu/two-players.webp` | Two-player chess scene | Two-player checkers scene, same treatment |
| `menu/tutorial.webp` | Tutorial tile | Tutorial tile, checkers pieces |
| `menu/options.webp` | Options tile | Options tile (likely gear/settings-adjacent, not board-specific — may not need chess-vs-checkers differentiation at all, judge during implementation) |
| `gameend/{win,lose,draw}.webp` | Mascot reactions | Same mascot concept, checkers-flavored if the mascot itself references chess pieces, otherwise reusable |

Generation pipeline identical to chess: Draw Things app running locally,
HTTP API Server enabled, `POST http://127.0.0.1:7860/sdapi/v1/txt2img`
(confirmed reachable — `curl http://localhost:7860/sdapi/v1/options`
responded 2026-08-31), model `z_image_turbo`, JSON body with
`prompt`/`negative_prompt`/`width`/`height` (multiples of 64)/`steps`/
`sampler_name`/`batch_size`, response `{"images": ["<base64 PNG>"]}` — no
polling, budget ≥300s timeouts (~2-3 min/generation observed on the chess
build). After accepting a result: `sips -Z <size>` then `cwebp -q 85` before
committing, matching chess's exact pipeline and file-size discipline (final
assets in the few-KB to ~70KB range, not multi-MB originals).

## 9. Naming & deploy

| | Chess Sensei | Checkers Sensei |
|---|---|---|
| Repo | `rpaquito/ChessLearningGame` | `rpaquito/CheckersLearningGame` (exists, empty, `origin` linked) |
| `package.json` name | `chess-learning-game` | `checkers-learning-game` |
| Vercel project | `chess-learning-game` (team `algorithm-cloud`) | `checkers-learning-game` (team `algorithm-cloud`) — create via `vercel link`/`vercel git connect` during the deploy phase |
| App display name | "Chess Sensei" | "Checkers Sensei" |
| Capacitor `appId` | `pt.rpaquito.chesssensei` | `pt.rpaquito.checkerssensei` (new, distinct — bundle IDs are permanent once submitted to the App Store) |
| PWA `manifest.json` name/short_name | "Chess Sensei" | "Checkers Sensei" |
| Service worker cache name | `xadrez-cache-v2` | `checkers-sensei-cache-v1` |

Deploy: Vercel-only (no Docker/self-host, matching chess's discontinued
support for that), GitHub-integration auto-deploy on push to `main`, no
app-specific environment variables needed (same no-backend architecture —
everything runs client-side, no API routes, no auth).

## 10. Tech stack (identical to Chess Sensei)

Next.js 16 (App Router), React 19, Tailwind v4, TypeScript, Vitest + jsdom +
Testing Library (co-located `*.test.ts(x)` files, `afterEach(cleanup)`
manually registered in `vitest.setup.ts`, `@` path alias mirrored in
`vitest.config.ts`'s `resolve.alias` since Vitest/Vite doesn't inherit
Next's own path resolution), ESLint, Capacitor 8 (`@capacitor/cli` `core`
`haptics` `ios`) for the native iOS wrapper. No `chess.js`/`stockfish`
dependencies (replaced by the hand-written `lib/checkers/` engine — no
external chess/checkers library dependency at all).

`next.config.ts` reuses the conditional static-export pattern verbatim:

```ts
const isCapacitorBuild = process.env.BUILD_TARGET === 'capacitor';
const nextConfig: NextConfig = { ...(isCapacitorBuild ? { output: 'export' } : {}) };
```

`package.json` scripts identical set: `dev`, `build`, `build:capacitor`,
`start`, `lint`, `test`, `test:watch`, `cap:sync:ios`, `cap:open:ios`.

## 11. Native iOS

Reuse the entire Capacitor pipeline and `docs/ios-app-store-plan.md`
structure verbatim (name/bundle-id swapped): `haptics.ts`'s 3 no-op-unless-
native functions (`hapticMove`/`hapticCapture`/`hapticKinged` — rename
chess's `hapticCheck` since checkers has no "check" concept; a natural
checkers-specific moment is promotion, i.e. becoming a king), service worker
disabled in the native shell via `Capacitor.isNativePlatform()`, `out/`
staleness trap documented (`build:capacitor` must run before
`cap:sync:ios`), CocoaPods package manager flag required on `cap add ios`.
Deployment path: free 7-day sideload to a physical iPhone first (Xcode +
personal Apple ID, no paid account), TestFlight and full App Store release
documented as later options, same as chess's plan doc.

## 12. Testing strategy

Same setup as chess (§10), extended with real coverage for the new rules
engine — this is the one area where test thoroughness actually matters more
than the chess app's, since there's no battle-tested external library (like
`chess.js`) backing correctness. At minimum:

- Move generation: simple moves, single captures, multi-jump chains
  (including chains that change direction), mandatory-capture enforcement
  (a non-capturing move must never be offered when a capture exists
  anywhere for that color), promotion on reaching the back row — **including
  the mid-chain rule, decided now**: a piece that lands on the king row
  during a capture sequence becomes a king immediately and its move ends
  there, even if further jumps would otherwise be available to it as a king
  — it does not continue capturing in the same turn. This is the standard
  American-checkers convention; test it explicitly (a man mid-jump-chain
  that lands on the back row must stop, not chain further captures as a
  newly-crowned king).
- Terminal states: no-legal-moves loss, both draw conditions.
- `inferMove`: single move, single capture, multi-jump capture, promotion.
- Engine: sanity tests (engine prefers a free capture over no capture;
  doesn't hang past its time budget), not exhaustive strength testing.
- i18n: `dictionaries.test.ts`-equivalent structural check.
- Openings data: every line's every move validated legal (§6).

## 13. Build phasing

Mirrors how Chess Sensei was actually delivered — one committed, tested,
pushed-to-main phase at a time (§0's process rules), not one giant commit:

0. **Bootstrap**: repo scaffold (Next.js/Tailwind/Vitest/ESLint config),
   `CLAUDE.md` v1 (structure + process rules from §0), `package.json`
   naming (§9).
1. **Rules engine** (§2) + full test suite — no UI yet.
2. **Board & game UI, local 2-player mode** (§4) — `CheckersBoard`,
   `PieceIcon`/`pieceStyles`, `/jogar` wired to `mode=local` only.
3. **AI engine + vs-computer mode** (§3) — Worker, difficulty tuning,
   `/configurar`.
4. **Learning mode** (§5) — legal/mandatory-capture highlights, suggestion,
   move-quality toast, `moveExplanation.ts`.
5. **Menu, settings, themes** (§7-8) — `/`, `/opcoes`, asset copy from
   chess where unchanged.
6. **Tutorial hub** (§5) — `/aprender` + subpages, `InteractiveDemo` reuse.
7. **Openings/traps trainer** (§6) — data + study + practice, content
   authored (candidate for `gemini` CLI offload per §0, engine-validated).
8. **i18n** (§7) — dictionaries for everything built so far (built
   incrementally alongside each phase above may be more efficient in
   practice than one big pass at the end — decide during planning).
9. **PWA** (§9) — `sw.js`, `manifest.json`.
10. **New visual assets + native iOS + branding** (§8, §11) — Draw Things
    generation, Capacitor setup, `docs/ios-app-store-plan.md`.
11. **Vercel deploy** (§9) — project creation, first deploy, verify.

`CLAUDE.md` updated at the end of every phase (§0). Independent-enough
phases (e.g. tutorial content vs. openings content vs. i18n dictionary
authoring) are good candidates for parallel subagent dispatch once the
detailed implementation plan exists.
