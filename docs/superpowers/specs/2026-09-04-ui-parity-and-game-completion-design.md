# UI parity & game completion — design

Closes the remaining gap between Checkers Sensei and its twin project,
Chess Sensei (`rpaquito/ChessLearningGame`), flagged directly by the user
after reviewing the live app: the home title wraps on mobile, `/jogar` and
`/configurar` never received the "anime" visual identity that `/` and
`/opcoes` already have, the board never orients to the human player, and
`/opcoes`'s settings (board theme, piece style) have no visible effect on
the actual game. This spec turns those into one concrete, scoped plan.

## 1. Problem statement

Verified directly against both repos (not assumed) before writing this:

- **Home title wraps to 2 lines on mobile.** "Checkers Sensei" (16
  characters) is longer than "Chess Sensei" (12 characters), rendered at
  the same `text-5xl` `Bangers`-font size Chess Sensei uses for its
  shorter title. Not a copy error — a real consequence of the longer name
  at an unmodified size.
- **`/jogar` and `/configurar` are still plain-Tailwind**, exactly as
  CLAUDE.md's "stayed plain-Tailwind by spec" entry documents — no
  background image, no `PageGlow`, no `ChipButton`, hand-rolled
  `bg-stone-*` buttons instead of `ToggleGroup`. `GameEndModal` is the
  only modal that has already been restyled (a Phase 10d exception);
  `ConfirmModal`, `RulesModal`, and `LearningPanel` remain plain.
- **The board never orients to the human player.** `CheckersBoard` has no
  `orientation` prop at all — it always renders Black at the top, White at
  the bottom (`lib/checkers/board.ts`'s fixed numbering), regardless of
  which color the human chose in `/configurar`. Chess Sensei's
  `ChessBoard` has had an `orientation` prop (`'white' | 'black'`) since
  its own board-UI phase, driven by `humanColor`.
- **`/jogar` ignores `useSettings()` entirely.** It doesn't import the
  hook, so `CheckersBoard` always renders with its own hardcoded defaults
  (`boardTheme='nebulosa'`, `pieceStyle='classico'`) no matter what the
  player picked in `/opcoes` — confirmed by reading the page directly.
  `lib/ui/activeToggleStyle.ts`'s own doc comment already predicted this
  exact fix: *"Intended for /configurar's restyling in a future phase."*
- All referenced real assets already exist and are already wired
  correctly into `/` and `/opcoes` — `public/menu/background-*.webp`,
  `public/board/*-square.webp`, `BACKGROUND_THEMES`/`BOARD_THEMES` in
  `lib/settings/themes.ts`. Nothing needs generating; this is a wiring and
  chrome problem, not a missing-asset problem.

## 2. Scope

Confirmed with the user before writing this spec:

1. Home title — one line on mobile, without shrinking the desktop/tablet
   size unnecessarily.
2. `CheckersBoard` gains an `orientation` prop. In vs-computer mode
   (`/jogar?mode=ai`), the board always shows the human's chosen color at
   the bottom, whichever color that is. **Local two-player mode is
   unchanged** — fixed White-at-bottom for the whole game, no per-turn
   flip, matching how the board already renders today and matching Chess
   Sensei's own local mode (which never flips either).
3. `/jogar` and `/configurar` get the real chrome: background art,
   `PageGlow`, `ChipButton`, and (for `/configurar`) `ToggleGroup`.
4. `/jogar`'s board reads `settings.boardTheme` / `settings.pieceStyle`
   for real.
5. `ConfirmModal`, `RulesModal`, `LearningPanel` are restyled to the same
   chrome Chess Sensei's equivalents already use. `GameEndModal` needs no
   change — it already has this chrome from an earlier phase.

**Explicitly out of scope** (confirmed with the user, not oversights):

- Tutorial (`/aprender`) and openings-trainer (`/aprender/aberturas/...`)
  boards keep rendering with `CheckersBoard`'s current defaults, not the
  player's settings — matching how Chess Sensei's own tutorial boards
  work today.
- No per-turn board flip in local two-player mode.
- No behavioral/game-logic changes anywhere — this is a rendering-layer
  and settings-wiring pass only. `useCheckersGame`, the engine, move
  grading, haptics, and every `lib/checkers/` module are untouched.

## 3. Home title fix (`app/page.tsx`)

Change `PageHeader`'s `size` prop on the home page from a flat `text-5xl`
to a responsive size — smaller on narrow phone widths, `text-5xl` from
Tailwind's `sm:` breakpoint (640px) up, so tablet/desktop keep today's
look and only the phone case (where the wrap actually happens) shrinks.
Verify with an actual mobile-viewport screenshot before/after — font
metrics for a display font like `Bangers` aren't reliably predictable by
inspection alone.

## 4. `CheckersBoard` orientation

New optional prop:

```ts
orientation?: Color; // default 'w' — preserves today's fixed rendering
                      // everywhere the prop isn't passed
```

Internally, a small flip transform is applied only inside
`CheckersBoard.tsx` — never in `lib/checkers/`, since no rules-engine code
needs this, only display does:

```ts
function flip(row: number, col: number, shouldFlip: boolean) {
  return shouldFlip ? { row: 7 - row, col: 7 - col } : { row, col };
}
```

Applied identically to (a) the empty light-square placeholders' grid
iteration and (b) each `DisplayPiece`'s `left`/`top` positioning — both
currently computed straight from `row`/`col`. This is a full 180° rotation
(both axes reversed), the same technique `ChessBoard`'s own `orientation`
prop already uses, not a plain vertical mirror — that matters because a
one-axis-only mirror would scramble which diagonal direction reads as
"forward" for each color.

`/jogar` passes `orientation={humanColor}` only when `isAiMode` is true;
local two-player mode passes nothing, so it's unaffected and keeps
rendering exactly as it does today.

## 5. `/jogar` redesign

Ports Chess Sensei's `/jogar` shell:

- A `fixed inset-0` background layer reading
  `BACKGROUND_THEMES[settings.backgroundTheme].image` (with the existing
  `fallbackGradient` still layered underneath as defense-in-depth, same
  pattern `/` already uses).
- `PageGlow` for the identity layer.
- `CheckersBoard` gains `boardTheme={settings.boardTheme}`,
  `pieceStyle={settings.pieceStyle}`, and the new `orientation` prop.
- The bottom action row (`Menu inicial` / `Reiniciar partida` / `Regras`)
  becomes `ChipButton`s (purple/pink/cyan, matching Chess Sensei's own
  color choices for the same three actions) instead of plain underlined
  `<Link>`/`<button>` text.

Game state and logic are untouched: `useCheckersGame`, the engine
client/worker wiring, the grading effect, haptics, `GameEndModal`/
`ConfirmModal`/`RulesModal` open/close state — all stay exactly as they
are. Only what's rendered around them changes.

## 6. `/configurar` redesign

Chess Sensei's `/configurar` is a thin shell (`PageHeader` + `PageGlow` +
a `ChipButton` back to the menu) around a separate `GameSetup` component
that owns the actual difficulty/color pickers. Checkers has no `GameSetup`
component yet — this phase adds one, `components/GameSetup/GameSetup.tsx`,
adapted from Chess Sensei's with two deliberate differences:

- Uses checkers' own `Difficulty`/`PlayerColor` value shapes (`'facil' |
  'medio' | 'dificil'`, `'b' | 'w' | 'random'`), not chess's.
- Uses checkers' existing **override pattern**
  (`useState<Difficulty | null>(null)` /
  `useState<PlayerColor | null>(null)`, then `value ?? settings.default...`)
  for its initial selection, instead of Chess Sensei's plain
  `useState(settings.defaultDifficulty)` initializer. CLAUDE.md already
  documents why the plain form is wrong for this codebase: under
  `useSyncExternalStore`, the server/first-render snapshot is always
  `DEFAULT_SETTINGS`, and a plain `useState` initializer freezes on that
  value forever, never picking up the real settings once they load
  post-hydration. `/configurar/page.tsx` already uses the override pattern
  correctly today for this exact reason — `GameSetup` continues it rather
  than reintroducing the bug chess never had to face (chess has its own,
  different, already-documented hydration issue elsewhere).

`GameSetup` uses `ToggleGroup` for both pickers (already used by
`/opcoes`) and a start button styled like Chess Sensei's own (gold
gradient chip). `/configurar/page.tsx` itself shrinks to `PageHeader` +
`PageGlow` + a `ChipButton` back to the menu + `<GameSetup />`, matching
`/opcoes`'s established shell shape.

## 7. Modal/panel chrome port

`ConfirmModal`, `RulesModal`, `LearningPanel` each get Chess Sensei's
chrome ported over:

- `PageTitle` and `MODAL_BACKDROP_CLASS` (from `components/PageChrome/
  PageChrome.tsx`) replace each component's current plain backdrop/heading
  markup.
- `ChipButton` replaces plain buttons for every action (confirm/cancel,
  the rules modal's close button).
- `LearningPanel`'s toggle switches to `ACTIVE_TOGGLE_STYLE` (from
  `lib/ui/activeToggleStyle.ts`) for its active state — that file's own
  doc comment already flagged this exact component as pending this exact
  change.

All three building blocks (`PageTitle`/`MODAL_BACKDROP_CLASS`,
`ChipButton`, `ACTIVE_TOGGLE_STYLE`) already exist in this repo and are
already used elsewhere (`GameEndModal`, `/opcoes`) — this section applies
an established local pattern, it doesn't invent one. Props and behavior
(focus trap, Escape-to-close, backdrop-click-to-cancel, the toggle's
`onChange` contract) stay identical; only the rendered markup/styling
changes. No call site outside these three files needs to change.

## 8. Testing

- `CheckersBoard.test.tsx` gains cases for `orientation='b'`: empty-square
  layout and piece positions both flip correctly; existing tests are
  unaffected since the default (`'w'`) preserves current behavior exactly.
- `ConfirmModal`/`RulesModal`/`LearningPanel`'s existing test files are
  updated only where the restyle changes queryable markup (e.g. a
  `role="dialog"` heading now rendered via `PageTitle` instead of a plain
  `<h2>`) — no behavioral test changes.
- `/jogar` and `/configurar` remain page-level-untested, consistent with
  this repo's existing precedent (CLAUDE.md's "`/jogar/page.tsx` has no
  dedicated test file" entry, for the same reasons: the reusable pieces
  each have their own thorough tests, and this page's size — engine/worker
  wiring, `useSearchParams`, routing, multiple modals — has made it a
  lib/component-tested page throughout the project rather than a
  page-tested one). Verified instead via `tsc`/`lint`/the full suite
  (unaffected) plus a manual dev-server render check across both game
  modes and both board orientations, including a real mobile-viewport
  screenshot for the title fix and the new chrome.

## 9. Out-of-scope items surfaced but not fixed here

Recorded so a future pass doesn't need to rediscover them:

- Tutorial/openings-trainer boards not reading `settings.boardTheme`/
  `pieceStyle` — deliberately deferred (see Scope above).
- No per-turn local-mode flip — deliberately deferred (see Scope above).
- Nothing in this spec touches `lib/checkers/`, the engine, or any test
  currently passing for reasons unrelated to rendering/chrome.
