# UI Parity & Game Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Bring `/jogar` and `/configurar` up to the same "anime" visual identity as `/` and `/opcoes`, make the board orient to the human player, make `/opcoes`'s board-theme/piece-style settings actually reach the game board, and restyle `ConfirmModal`/`RulesModal`/`LearningPanel` to match Chess Sensei's chrome — closing every gap the user flagged after reviewing the live app.

**Architecture:** Pure rendering-layer and settings-wiring changes — no `lib/checkers/` game logic, engine, or test currently passing for unrelated reasons is touched. `CheckersBoard` gains one new optional `orientation` prop (a display-only 180° flip transform, private to the component). `/jogar` and `/configurar` are restyled to read `useSettings()` and render the same chrome primitives (`PageGlow`, `PageHeader`, `ChipButton`, `ToggleGroup`) that `/` and `/opcoes` already use. `ConfirmModal`/`RulesModal`/`LearningPanel` are restyled in place, porting Chess Sensei's already-proven markup for the same three components — their prop contracts do not change, so no call site outside these files needs updating.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind v4, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-04-ui-parity-and-game-completion-design.md`

## Global Constraints

- No changes to `lib/checkers/` (rules engine, AI, move grading, haptics) — this plan is rendering/chrome/settings-wiring only.
- `CheckersBoard`'s new `orientation` prop defaults to `'w'`, which must render **identically** to today's fixed behavior (Black top / White bottom) when omitted.
- Vs-computer mode (`/jogar?mode=ai`) passes `orientation={humanColor}`. Local two-player mode (`/jogar?mode=local`) always passes `orientation="w"` regardless of the page's internal `humanColor` state — that state defaults to `'b'` in local mode from an unrelated URL-parsing fallback and must never leak into orientation (see Task 7, Step 3).
- Board-theme/piece-style settings wiring is scoped to `/jogar` only. Tutorial (`/aprender`) and openings-trainer boards are explicitly out of scope and must not change.
- `ConfirmModal`/`RulesModal`/`LearningPanel`'s prop interfaces (names, types, call signatures) do not change — only their internal markup/styling. Every existing test for these three files must keep passing **unmodified** (this is verified explicitly in each task, and a failure means the restyle broke a behavioral contract, not that the test needs updating).
- Reuse existing chrome primitives only (`PageGlow`, `PageHeader`, `PageTitle`, `MODAL_BACKDROP_CLASS`, `ChipButton`, `ToggleGroup`, `ACTIVE_TOGGLE_STYLE`) — no new shared UI components beyond `GameSetup` (Task 6).

---

## Task 1: Home title fits on one line on mobile

**Files:**
- Modify: `app/page.tsx:95`

**Interfaces:** None — this is a self-contained JSX prop change.

- [x] **Step 1: Change the title's font size to be responsive**

In `app/page.tsx`, find:

```tsx
      <PageHeader size="text-5xl" softDrop={5} logoSize="lg" wrapperClassName="w-full max-w-sm">
```

Replace with:

```tsx
      <PageHeader size="text-4xl sm:text-5xl" softDrop={5} logoSize="lg" wrapperClassName="w-full max-w-sm">
```

This keeps today's `text-5xl` size from Tailwind's `sm:` breakpoint (640px) up — tablet/desktop are unaffected — and only shrinks the phone case, where "Checkers Sensei" (longer than Chess Sensei's title) currently wraps.

- [x] **Step 2: Verify visually at a phone viewport**

Run `npm run dev`, then open `http://localhost:3000` in a browser tool (e.g. the `claude-in-chrome` or `chrome-devtools` MCP tools) sized to a 375px-wide viewport (iPhone SE class — the narrowest common target). Confirm "Checkers Sensei" renders on a single line, sitting cleanly next to the logo. Then resize to 768px+ and confirm the title still renders at the original, larger size with no visual regression.

- [x] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "fix: keep home title on one line on mobile

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PSoURGNKX7i2buwPDDsGQC"
```

---

## Task 2: `CheckersBoard` gains an `orientation` prop

**Files:**
- Modify: `components/CheckersBoard/CheckersBoard.tsx`
- Test: `components/CheckersBoard/CheckersBoard.test.tsx`

**Interfaces:**
- Produces: `CheckersBoardProps.orientation?: Color` (default `'w'`). `'w'` = today's fixed rendering (Black top, White bottom, unchanged). `'b'` = flipped 180° (White top, Black bottom) so a Black-playing human sees their own pieces at the bottom. Consumed by Task 7 (`/jogar`).

- [x] **Step 1: Write the failing tests**

Open `components/CheckersBoard/CheckersBoard.test.tsx`. Add `squareToRowCol` to the existing import from `@/lib/checkers/board`:

```tsx
import { createInitialBoard, squareToRowCol } from '@/lib/checkers/board';
```

Add a new `describe` block at the end of the file:

```tsx
describe('CheckersBoard orientation', () => {
  it('positions pieces for the default (white-at-bottom) orientation when the prop is omitted', () => {
    const { container } = render(
      <CheckersBoard
        board={createInitialBoard()}
        turn="b"
        selectedSquare={null}
        legalTargets={[]}
        mandatoryCaptureSquares={[]}
        lastMove={null}
      />,
    );
    const piece = container.querySelector('[data-square="1"]') as HTMLElement;
    const { row, col } = squareToRowCol(1);
    expect(piece.style.left).toBe(`${col * 12.5}%`);
    expect(piece.style.top).toBe(`${row * 12.5}%`);
  });

  it('flips piece positions 180 degrees when orientation is "b"', () => {
    const { container } = render(
      <CheckersBoard
        board={createInitialBoard()}
        turn="b"
        selectedSquare={null}
        legalTargets={[]}
        mandatoryCaptureSquares={[]}
        lastMove={null}
        orientation="b"
      />,
    );
    const piece = container.querySelector('[data-square="1"]') as HTMLElement;
    const { row, col } = squareToRowCol(1);
    expect(piece.style.left).toBe(`${(7 - col) * 12.5}%`);
    expect(piece.style.top).toBe(`${(7 - row) * 12.5}%`);
  });

  it('still renders 32 clickable squares and 24 pieces when flipped', () => {
    const { container } = render(
      <CheckersBoard
        board={createInitialBoard()}
        turn="b"
        selectedSquare={null}
        legalTargets={[]}
        mandatoryCaptureSquares={[]}
        lastMove={null}
        orientation="b"
      />,
    );
    expect(container.querySelectorAll('button')).toHaveLength(32);
    expect(container.querySelectorAll('svg')).toHaveLength(24);
  });
});
```

- [x] **Step 2: Run the tests to verify the new ones fail**

Run: `npm run test -- CheckersBoard`
Expected: the two new orientation-specific assertions FAIL (the flipped-position test fails because nothing flips yet; the default-position test should already PASS since it matches current behavior — if it doesn't, stop and re-check the test against the actual current rendering before continuing).

- [x] **Step 3: Implement the orientation prop**

In `components/CheckersBoard/CheckersBoard.tsx`, add `orientation` to the props interface:

```tsx
export interface CheckersBoardProps {
  board: Board;
  turn: Color;
  selectedSquare: Square | null;
  legalTargets: Square[];
  mandatoryCaptureSquares: Square[];
  lastMove: CheckersMove | null;
  suggestedMove?: CheckersMove | null;
  interactive?: boolean;
  boardTheme?: BoardTheme;
  pieceStyle?: PieceStyle;
  /** 'w' (default) = today's fixed rendering, Black top/White bottom.
   *  'b' = flipped 180 degrees so Black's pieces render at the bottom --
   *  used by /jogar in vs-computer mode so the human's chosen color is
   *  always closest to them. A pure display transform, computed here, not
   *  in lib/checkers/ -- no rules-engine code needs it, only rendering
   *  does. */
  orientation?: Color;
  onSquareClick?: (square: Square) => void;
}
```

Add `orientation = 'w',` to the destructured props:

```tsx
export function CheckersBoard({
  board,
  turn,
  selectedSquare,
  legalTargets,
  mandatoryCaptureSquares,
  lastMove,
  suggestedMove = null,
  interactive = true,
  boardTheme = 'nebulosa',
  pieceStyle = 'classico',
  orientation = 'w',
  onSquareClick,
}: CheckersBoardProps): ReactElement {
```

Replace the squares-building loop:

```tsx
  const squares: ReactElement[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = rowColToSquare(row, col);
```

with:

```tsx
  // A full 180-degree rotation (both row and col reversed), not a
  // one-axis mirror -- a plain vertical flip would scramble which
  // diagonal direction reads as "forward" for each color. Same technique
  // Chess Sensei's ChessBoard uses for its own orientation prop.
  const flipped = orientation === 'b';
  const squares: ReactElement[] = [];
  for (let visualRow = 0; visualRow < 8; visualRow++) {
    for (let visualCol = 0; visualCol < 8; visualCol++) {
      const row = flipped ? 7 - visualRow : visualRow;
      const col = flipped ? 7 - visualCol : visualCol;
      const square = rowColToSquare(row, col);
```

(The rest of that loop's body — the `if (square === null)` branch and the playable-square `<button>` — is unchanged; it already only reads `row`/`col`/`square`, which are now the flip-adjusted logical values.)

Replace the piece-positioning block:

```tsx
        {displayPieces.map((piece) => {
          const { row, col } = squareToRowCol(piece.square);
          return (
            <div
              key={piece.id}
              data-square={piece.square}
              className={[
                'absolute flex items-center justify-center transition-all duration-300 motion-reduce:transition-none',
                piece.color === 'b' ? 'text-stone-900' : 'text-stone-50',
                piece.removing ? 'opacity-0 scale-75' : 'opacity-100',
              ].join(' ')}
              style={{ left: `${col * 12.5}%`, top: `${row * 12.5}%`, width: '12.5%', height: '12.5%' }}
            >
              <PieceIcon type={piece.kind} style={pieceStyle} />
            </div>
          );
        })}
```

with:

```tsx
        {displayPieces.map((piece) => {
          const { row, col } = squareToRowCol(piece.square);
          const visualRow = flipped ? 7 - row : row;
          const visualCol = flipped ? 7 - col : col;
          return (
            <div
              key={piece.id}
              data-square={piece.square}
              className={[
                'absolute flex items-center justify-center transition-all duration-300 motion-reduce:transition-none',
                piece.color === 'b' ? 'text-stone-900' : 'text-stone-50',
                piece.removing ? 'opacity-0 scale-75' : 'opacity-100',
              ].join(' ')}
              style={{ left: `${visualCol * 12.5}%`, top: `${visualRow * 12.5}%`, width: '12.5%', height: '12.5%' }}
            >
              <PieceIcon type={piece.kind} style={pieceStyle} />
            </div>
          );
        })}
```

- [x] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- CheckersBoard`
Expected: PASS — all previously-existing `CheckersBoard.test.tsx` tests plus the three new orientation tests.

- [x] **Step 5: Commit**

```bash
git add components/CheckersBoard/CheckersBoard.tsx components/CheckersBoard/CheckersBoard.test.tsx
git commit -m "feat: add orientation prop to CheckersBoard

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PSoURGNKX7i2buwPDDsGQC"
```

---

## Task 3: Restyle `ConfirmModal` to match Chess Sensei's chrome

**Files:**
- Modify: `components/ConfirmModal/ConfirmModal.tsx` (full rewrite)
- Test: `components/ConfirmModal/ConfirmModal.test.tsx` (no changes expected — verify it still passes)

**Interfaces:** Unchanged — `ConfirmModalProps` (`open`, `title`, `message`, `confirmLabel`, `cancelLabel`, `onConfirm`, `onCancel`) is identical before and after.

- [x] **Step 1: Confirm the existing test suite passes before touching the component**

Run: `npm run test -- ConfirmModal`
Expected: PASS (baseline, before any change).

- [x] **Step 2: Rewrite the component with the ported chrome**

Replace the full contents of `components/ConfirmModal/ConfirmModal.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { MODAL_BACKDROP_CLASS, PageTitle } from '@/components/PageChrome/PageChrome';
import { ChipButton } from '@/components/ChipButton/ChipButton';
import { useFocusTrap } from '@/lib/ui/useFocusTrap';

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// Generic confirmation popup -- same self-contained pattern as GameEndModal/
// RulesModal (backdrop, role="dialog", focus trap, Escape closes), but no
// ✕ button: with only two actions (confirm/cancel), a third place to say
// "no" would be redundant. Escape and a backdrop click both count as
// cancel, same as clicking cancelLabel explicitly. Chrome ported from
// Chess Sensei's own ConfirmModal.tsx (see docs/superpowers/plans/
// 2026-09-04-ui-parity-and-game-completion.md) -- the same
// MODAL_BACKDROP_CLASS/PageTitle/ChipButton building blocks GameEndModal
// already uses in this repo. Props/behavior are unchanged from before this
// restyle.
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const panelRef = useFocusTrap(open);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div data-testid="confirm-modal-backdrop" onClick={onCancel} className={MODAL_BACKDROP_CLASS}>
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border-2 border-purple bg-ink-soft p-6 text-lilac outline-none"
      >
        <PageTitle as="h2" size="text-xl" strokeWidth={1} className="mb-2">
          {title}
        </PageTitle>
        <p className="mb-5 text-sm text-lilac/80">{message}</p>
        <div className="flex gap-3">
          <ChipButton color="pink" onClick={onConfirm}>
            {confirmLabel}
          </ChipButton>
          <ChipButton color="purple" onClick={onCancel}>
            {cancelLabel}
          </ChipButton>
        </div>
      </div>
    </div>
  );
}
```

- [x] **Step 3: Run the tests to verify they still pass unmodified**

Run: `npm run test -- ConfirmModal`
Expected: PASS. If anything fails, the restyle broke a behavioral contract (a `data-testid`, `role`, or visible text) — fix the component to match the original contract, do not edit the test.

- [x] **Step 4: Commit**

```bash
git add components/ConfirmModal/ConfirmModal.tsx
git commit -m "feat: restyle ConfirmModal with the anime chrome

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PSoURGNKX7i2buwPDDsGQC"
```

---

## Task 4: Restyle `RulesModal` to match Chess Sensei's chrome

**Files:**
- Modify: `components/RulesModal/RulesModal.tsx` (full rewrite)
- Test: `components/RulesModal/RulesModal.test.tsx` (no changes expected — verify it still passes)

**Interfaces:** Unchanged — `RulesModalProps` (`open`, `onClose`) is identical before and after. Content sections (`t.rulesModal.*`) are unchanged.

- [x] **Step 1: Confirm the existing test suite passes before touching the component**

Run: `npm run test -- RulesModal`
Expected: PASS (baseline).

- [x] **Step 2: Rewrite the component with the ported chrome**

Replace the full contents of `components/RulesModal/RulesModal.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { MODAL_BACKDROP_CLASS, PageTitle } from '@/components/PageChrome/PageChrome';
import { useFocusTrap } from '@/lib/ui/useFocusTrap';
import { useTranslation } from '@/lib/i18n/useTranslation';

export interface RulesModalProps {
  open: boolean;
  onClose: () => void;
}

// Chrome ported from Chess Sensei's own RulesModal.tsx (see
// docs/superpowers/plans/2026-09-04-ui-parity-and-game-completion.md).
// Content is unchanged from before this restyle -- man/king movement,
// mandatory capture, multi-jump, promotion, draw conditions (design spec
// §5's checkers-specific list), read from the shared dictionary
// (t.rulesModal) same as before.
export function RulesModal({ open, onClose }: RulesModalProps) {
  const { t } = useTranslation();
  const panelRef = useFocusTrap(open);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const sections = [
    { title: t.rulesModal.movementTitle, items: [t.rulesModal.man, t.rulesModal.king] },
    { title: t.rulesModal.mandatoryCaptureTitle, items: [t.rulesModal.mandatoryCapture, t.rulesModal.multiJump] },
    { title: t.rulesModal.promotionTitle, items: [t.rulesModal.promotion] },
    { title: t.rulesModal.drawTitle, items: [t.rulesModal.repetition, t.rulesModal.noCaptureDraw] },
  ];

  return (
    <div data-testid="rules-modal-backdrop" onClick={onClose} className={MODAL_BACKDROP_CLASS}>
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={t.rulesModal.title}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-2xl border-2 border-purple bg-ink-soft p-6 text-lilac outline-none"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <PageTitle as="h2" size="text-2xl" strokeWidth={1}>
            {t.rulesModal.title}
          </PageTitle>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="rounded-full h-8 w-8 shrink-0 bg-pink text-[#3A0B1F] font-bold hover:scale-110 transition-transform"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-5">
          {sections.map((section) => (
            <section key={section.title}>
              <h3 className="mb-2 font-semibold text-cyan">{section.title}</h3>
              <dl className="flex flex-col gap-2">
                {section.items.map((item) => (
                  <div key={item.title}>
                    <dt className="font-medium text-white">{item.title}</dt>
                    <dd className="text-sm text-lilac/80">{item.text}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [x] **Step 3: Run the tests to verify they still pass unmodified**

Run: `npm run test -- RulesModal`
Expected: PASS. If anything fails, the restyle broke a behavioral contract — fix the component, do not edit the test.

- [x] **Step 4: Commit**

```bash
git add components/RulesModal/RulesModal.tsx
git commit -m "feat: restyle RulesModal with the anime chrome

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PSoURGNKX7i2buwPDDsGQC"
```

---

## Task 5: Restyle `LearningPanel` to match Chess Sensei's chrome

**Files:**
- Modify: `components/LearningPanel/LearningPanel.tsx` (full rewrite)
- Test: `components/LearningPanel/LearningPanel.test.tsx` (no changes expected — verify it still passes)

**Interfaces:** Unchanged — `LearningPanelProps` (`enabled`, `onToggle: () => void`, `canRequestSuggestion`, `onRequestSuggestion`, `suggestionLoading`, `hasSuggestion`, `suggestionExplanation`) is identical before and after. **Note:** unlike Chess Sensei's `LearningPanel` (whose `onToggle` takes an `enabled: boolean` argument and renders a checkbox), this component's `onToggle` takes no argument and stays a toggle button — that is an existing, different contract this task does not change, only its styling.

- [x] **Step 1: Confirm the existing test suite passes before touching the component**

Run: `npm run test -- LearningPanel`
Expected: PASS (baseline).

- [x] **Step 2: Rewrite the component with the ported chrome**

Replace the full contents of `components/LearningPanel/LearningPanel.tsx`:

```tsx
'use client';

import { ACTIVE_TOGGLE_STYLE } from '@/lib/ui/activeToggleStyle';
import { useTranslation } from '@/lib/i18n/useTranslation';

export interface LearningPanelProps {
  enabled: boolean;
  onToggle: () => void;
  // Beyond spec §5's exact prop list: LearningPanel is a "dumb" component
  // (same philosophy as CheckersBoard) -- it doesn't know whether it's the
  // human's turn or the game has ended, so the caller (app/jogar/page.tsx)
  // decides via this flag whether the suggestion button is clickable.
  canRequestSuggestion: boolean;
  onRequestSuggestion: () => void;
  suggestionLoading: boolean;
  hasSuggestion: boolean;
  suggestionExplanation: string | null;
}

// Chrome ported from Chess Sensei's own LearningPanel.tsx (see
// docs/superpowers/plans/2026-09-04-ui-parity-and-game-completion.md) --
// container/colors/ACTIVE_TOGGLE_STYLE match, but the enable toggle stays
// a plain button (not chess's checkbox input): this component's onToggle
// is `() => void`, not `(enabled: boolean) => void` -- an established,
// different contract this restyle does not change.
export function LearningPanel({
  enabled,
  onToggle,
  canRequestSuggestion,
  onRequestSuggestion,
  suggestionLoading,
  hasSuggestion,
  suggestionExplanation,
}: LearningPanelProps) {
  const { t } = useTranslation();
  return (
    <aside className="flex flex-col gap-4 w-full max-w-xs border-2 border-cyan rounded-2xl p-4 bg-ink-soft text-lilac">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={enabled}
        style={enabled ? ACTIVE_TOGGLE_STYLE : undefined}
        className={`rounded-xl px-3 py-2 font-semibold text-center transition-transform hover:scale-[1.02] ${
          enabled ? 'shadow-[3px_3px_0_rgba(0,0,0,0.35)]' : 'border-2 border-purple/40 text-lilac'
        }`}
      >
        {enabled ? t.learningPanel.disable : t.learningPanel.enable}
      </button>
      {enabled && (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onRequestSuggestion}
            disabled={!canRequestSuggestion || suggestionLoading}
            className="rounded-lg px-3 py-2 font-semibold text-white shadow-[3px_3px_0_rgba(0,0,0,0.35)] disabled:opacity-50 transition-transform enabled:hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #B87FDB, #7B3FA0)' }}
          >
            {suggestionLoading ? t.learningPanel.suggestionLoading : t.learningPanel.suggestMove}
          </button>
          {hasSuggestion && suggestionExplanation && (
            <p className="text-center text-sm text-lilac/80">{suggestionExplanation}</p>
          )}
        </div>
      )}
    </aside>
  );
}
```

- [x] **Step 3: Run the tests to verify they still pass unmodified**

Run: `npm run test -- LearningPanel`
Expected: PASS. If anything fails, the restyle broke a behavioral contract — fix the component, do not edit the test.

- [x] **Step 4: Commit**

```bash
git add components/LearningPanel/LearningPanel.tsx
git commit -m "feat: restyle LearningPanel with the anime chrome

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PSoURGNKX7i2buwPDDsGQC"
```

---

## Task 6: `GameSetup` component + `/configurar` redesign

**Files:**
- Create: `components/GameSetup/GameSetup.tsx`
- Modify: `app/configurar/page.tsx` (full rewrite)
- Test: `app/configurar/page.test.tsx` (no changes expected — verify it still passes)

**Interfaces:**
- Produces: `GameSetup` — a self-contained component (no props) rendering difficulty/color `ToggleGroup`s pre-filled from `useSettings()`, plus a start button that navigates to `/jogar?mode=ai&difficulty=...&color=...`.
- Consumes: `ToggleGroup` (`components/ToggleGroup/ToggleGroup.tsx`, existing — `legend`, `options: {value, label}[]`, `value`, `onChange`), `useSettings()` (existing), `resolvePlayerColor` (`lib/checkers/playerColor.ts`, existing), `clearSavedGame` (`lib/checkers/useCheckersGame.ts`, existing), `useTranslation()` (existing, reads `t.difficulty.*`, `t.color.*`, `t.configurar.*`).

- [x] **Step 1: Confirm the existing `/configurar` test suite passes before touching anything**

Run: `npm run test -- configurar`
Expected: PASS (baseline).

- [x] **Step 2: Create `GameSetup`**

Create `components/GameSetup/GameSetup.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Difficulty } from '@/lib/checkers/difficulty';
import { resolvePlayerColor, type PlayerColor } from '@/lib/checkers/playerColor';
import { clearSavedGame } from '@/lib/checkers/useCheckersGame';
import { useSettings } from '@/lib/settings/useSettings';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { ToggleGroup } from '@/components/ToggleGroup/ToggleGroup';

// Difficulty/color pre-fill from the saved Settings, but choosing here is
// only for this one game -- it never writes back to Settings (only
// /opcoes does that). Uses the "override" pattern (nullable useState +
// `?? settings.default...`), NOT a plain `useState(settings.x)`
// initializer like Chess Sensei's own GameSetup -- see CLAUDE.md
// ("`/configurar`'s initial difficulty/color reads from `useSettings()`
// via an "override" pattern") for why the plain form is wrong here:
// useSyncExternalStore's server/first-render snapshot is always
// DEFAULT_SETTINGS, and a plain initializer freezes on that value
// forever instead of picking up the real settings once they load
// post-hydration. This is exactly the pattern /configurar/page.tsx
// itself used before this component existed.
export function GameSetup() {
  const router = useRouter();
  const { settings } = useSettings();
  const { t } = useTranslation();
  const [difficultyOverride, setDifficultyOverride] = useState<Difficulty | null>(null);
  const [colorOverride, setColorOverride] = useState<PlayerColor | null>(null);
  const difficulty = difficultyOverride ?? settings.defaultDifficulty;
  const color = colorOverride ?? settings.defaultColor;

  const difficultyOptions: { value: Difficulty; label: string }[] = [
    { value: 'facil', label: t.difficulty.facil },
    { value: 'medio', label: t.difficulty.medio },
    { value: 'dificil', label: t.difficulty.dificil },
  ];

  const colorOptions: { value: PlayerColor; label: string }[] = [
    { value: 'b', label: t.color.black },
    { value: 'w', label: t.color.white },
    { value: 'random', label: t.color.random },
  ];

  function handleStart() {
    clearSavedGame();
    // Resolve 'random' HERE, once per game, and put the concrete 'b'/'w'
    // in the URL -- see CLAUDE.md ("`color=random` is resolved by
    // `/configurar`, never by `/jogar`") for why /jogar must never see
    // `color=random` in its own URL.
    const params = new URLSearchParams({ mode: 'ai', difficulty, color: resolvePlayerColor(color) });
    router.push(`/jogar?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-6 max-w-sm mx-auto w-full">
      <ToggleGroup
        legend={t.configurar.difficultyLegend}
        options={difficultyOptions}
        value={difficulty}
        onChange={setDifficultyOverride}
      />
      <ToggleGroup
        legend={t.configurar.colorLegend}
        options={colorOptions}
        value={color}
        onChange={setColorOverride}
      />
      <button
        type="button"
        onClick={handleStart}
        className="rounded-xl px-4 py-3 font-bold text-[#0B2E30] shadow-[4px_4px_0_rgba(0,0,0,0.35)] transition-transform hover:scale-[1.02]"
        style={{ background: 'linear-gradient(135deg, #FFD600, #FFA800)' }}
      >
        {t.configurar.start}
      </button>
    </div>
  );
}
```

- [x] **Step 3: Rewrite `/configurar/page.tsx` to use it**

Replace the full contents of `app/configurar/page.tsx`:

```tsx
'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';
import { GameSetup } from '@/components/GameSetup/GameSetup';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function ConfigurarPage() {
  const { t } = useTranslation();

  return (
    <main className="relative flex flex-col items-center justify-start p-8 overflow-hidden bg-ink">
      <PageGlow pinkOpacity={0.25} />
      <div className="relative w-full max-w-sm">
        <PageHeader size="text-3xl">{t.configurar.title}</PageHeader>
        <p className="mt-3">
          <ChipButton color="purple" href="/">
            {t.common.mainMenu}
          </ChipButton>
        </p>
      </div>
      <div className="relative w-full max-w-sm mt-8">
        <GameSetup />
      </div>
    </main>
  );
}
```

- [x] **Step 4: Run the tests to verify they still pass unmodified**

Run: `npm run test -- configurar`
Expected: PASS. `app/configurar/page.test.tsx` asserts `aria-pressed` on the difficulty/color toggle buttons and text on the heading/start button — all preserved by `GameSetup`/`ToggleGroup`. If anything fails, fix the component, do not edit the test.

- [x] **Step 5: Commit**

```bash
git add components/GameSetup/GameSetup.tsx app/configurar/page.tsx
git commit -m "feat: add GameSetup component, redesign /configurar with the anime chrome

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PSoURGNKX7i2buwPDDsGQC"
```

---

## Task 7: `/jogar` redesign — background, settings, orientation

**Files:**
- Modify: `app/jogar/page.tsx`

**Interfaces:**
- Consumes: `CheckersBoard`'s `orientation`/`boardTheme`/`pieceStyle` props (Task 2, pre-existing), `useSettings()` (existing), `BACKGROUND_THEMES` (`lib/settings/themes.ts`, existing), `PageGlow` (`components/PageChrome/PageChrome.tsx`, existing), `ChipButton` (existing).

- [x] **Step 1: Update imports**

In `app/jogar/page.tsx`, remove the now-unused `Link` import:

```tsx
import Link from 'next/link';
```

Add these imports (after the existing `useCheckersGame` import, before `CheckersBoard`):

```tsx
import { ChipButton } from '@/components/ChipButton/ChipButton';
import { PageGlow } from '@/components/PageChrome/PageChrome';
import { BACKGROUND_THEMES } from '@/lib/settings/themes';
import { useSettings } from '@/lib/settings/useSettings';
```

- [x] **Step 2: Read settings inside the component**

Find:

```tsx
  const { show } = useToast();
  const { t, locale } = useTranslation();
```

Replace with:

```tsx
  const { show } = useToast();
  const { t, locale } = useTranslation();
  const { settings } = useSettings();
```

- [x] **Step 3: Fix `handleMenuClick` to not depend on an intercepted `<Link>` navigation**

`ChipButton`'s `onClick` prop is typed `() => void` (no event parameter) — swapping the plain `<Link>` for a `ChipButton` means `handleMenuClick` can no longer rely on `event.preventDefault()` to stop a `<Link>`'s default navigation. Chess Sensei's own `/jogar` solves this the same way: no `href` at all on the menu button, navigate explicitly via `router.push('/')` when there's nothing to confirm.

Find:

```tsx
  function handleMenuClick(event: React.MouseEvent) {
    if (hasProgressToLose) {
      event.preventDefault();
      setConfirmAction('menu');
    }
    // else: let the <Link> navigate normally.
  }
```

Replace with:

```tsx
  function handleMenuClick() {
    if (hasProgressToLose) {
      setConfirmAction('menu');
    } else {
      router.push('/');
    }
  }
```

(`router` is already in scope — `useRouter()` is called near the top of this component and already used by `handleConfirmAction`.)

- [x] **Step 4: Replace the returned JSX**

Find the full `return (...)` block (everything from `return (` through the closing `);` right before the component's closing `}`, i.e. the whole `<main>...</main>` tree). Replace it with:

```tsx
  return (
    <main className="relative flex min-h-dvh flex-col items-center gap-4 p-4 overflow-hidden">
      <div
        className="fixed inset-0 -z-10 bg-ink bg-cover bg-center"
        style={{
          backgroundImage: `url(${BACKGROUND_THEMES[settings.backgroundTheme].image}), ${BACKGROUND_THEMES[settings.backgroundTheme].fallbackGradient}`,
        }}
        aria-hidden="true"
      />
      <PageGlow position="fixed" pinkOpacity={0.35} darken={[0.55, 0.85]} />
      <p aria-live="polite" className="relative font-semibold text-gold">
        {statusText}
      </p>
      <CheckersBoard
        board={state.board}
        turn={state.turn}
        selectedSquare={selected}
        legalTargets={legalTargets}
        mandatoryCaptureSquares={state.mandatoryCaptureSquares}
        lastMove={state.lastMove}
        suggestedMove={learningModeEnabled ? suggestedMove : null}
        interactive={boardInteractive}
        boardTheme={settings.boardTheme}
        pieceStyle={settings.pieceStyle}
        // Local two-player mode must NEVER flip -- humanColor defaults to
        // 'b' there from an unrelated URL-parsing fallback (no `color`
        // param exists in local mode's URL), which is not a real chosen
        // color and must not drive orientation. Only vs-computer mode
        // orients to the human's actual choice.
        orientation={isAiMode ? humanColor : 'w'}
        onSquareClick={handleSquareClick}
      />
      <LearningPanel
        enabled={learningModeEnabled}
        onToggle={toggleLearningMode}
        canRequestSuggestion={boardInteractive && !suggestionLoading}
        onRequestSuggestion={handleRequestSuggestion}
        suggestionLoading={suggestionLoading}
        hasSuggestion={suggestedMove !== null}
        suggestionExplanation={suggestionExplanation}
      />
      <div className="relative flex flex-wrap justify-center gap-3">
        <ChipButton color="purple" onClick={handleMenuClick}>
          {t.common.mainMenu}
        </ChipButton>
        <ChipButton color="pink" onClick={handleRestartClick}>
          {t.jogar.restart}
        </ChipButton>
        <ChipButton color="cyan" onClick={() => setRulesOpen(true)}>
          {t.jogar.rules}
        </ChipButton>
      </div>

      <GameEndModal
        open={gameEndOpen}
        status={state.status}
        mode={isAiMode ? 'ai' : 'local'}
        humanColor={humanColor}
        turn={state.turn}
        onClose={() => setGameEndOpen(false)}
        onPlayAgain={doReset}
      />
      <ConfirmModal
        open={confirmAction !== null && hasProgressToLose}
        title={confirmAction === 'restart' ? t.jogar.confirmRestartTitle : t.jogar.confirmMenuTitle}
        message={confirmAction === 'restart' ? t.jogar.confirmRestartMessage : t.jogar.confirmMenuMessage}
        confirmLabel={confirmAction === 'restart' ? t.jogar.confirmRestartButton : t.jogar.confirmMenuButton}
        cancelLabel={t.common.cancel}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelConfirm}
      />
      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </main>
  );
```

- [x] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no errors (in particular, no unused-import error for `Link`, no type error on any `ChipButton onClick`).

Run: `npm run lint`
Expected: no errors.

- [x] **Step 6: Run the full test suite**

Run: `npm run test`
Expected: PASS. `/jogar` has no dedicated test file (an established, documented precedent in this repo — see CLAUDE.md's "`/jogar/page.tsx` has no dedicated test file" entry), so this step is confirming no other test broke, not testing this page directly.

- [x] **Step 7: Manual verification with the dev server**

Run `npm run dev`, then using a browser tool:

1. Visit `/configurar`, start a game as White vs. an AI difficulty — confirm the board background/theme/pieces match whatever `/opcoes` has set, and White's pieces render at the bottom.
2. Restart from the menu, start a new game as **Black** vs. AI — confirm Black's pieces now render at the bottom (the board visibly flipped compared to the White game).
3. Visit `/` → "Two players" (`/jogar?mode=local`) — confirm the board is NOT flipped (White still at the bottom, matching the very first check), even though this mode has no explicit color choice.
4. In any game, confirm the background image is visible behind the board (not blank/default), and that "Menu inicial"/"Reiniciar partida"/"Regras" render as the pink/purple/cyan chip buttons, not plain underlined text.
5. Change the board theme and piece style in `/opcoes`, return to `/jogar`, and confirm the board reflects the new theme/pieces.

- [x] **Step 8: Commit**

```bash
git add app/jogar/page.tsx
git commit -m "feat: give /jogar the anime chrome, settings wiring, and board orientation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PSoURGNKX7i2buwPDDsGQC"
```

---

## Task 8: Final full-suite verification

**Files:** None (verification only).

- [x] **Step 1: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 2: Lint the whole project**

Run: `npm run lint`
Expected: no errors.

- [x] **Step 3: Run the full test suite**

Run: `npm run test`
Expected: PASS, including every test from Tasks 2–6 and every previously-existing test in the project (in particular `CheckersBoard.test.tsx`, `ConfirmModal.test.tsx`, `RulesModal.test.tsx`, `LearningPanel.test.tsx`, `app/configurar/page.test.tsx`).

- [x] **Step 4: Production build**

Run: `npm run build`
Expected: build succeeds (this also re-confirms the `useSearchParams()`/`Suspense` boundary in `/jogar` is intact — see CLAUDE.md's entry on why a plain `npm run build` catches that specific class of bug that `npm run dev` doesn't).

- [x] **Step 5: Push to `main`**

Per this project's process rules (CLAUDE.md), every task's changes are committed directly to `main` and pushed once its tests pass. If Tasks 1–7 were each already pushed individually as they landed, this step is a no-op check that `main` is clean and pushed; otherwise push now:

```bash
git status
git push origin main
```

- [x] **Step 6: Update CLAUDE.md**

Add a new entry to `CLAUDE.md`'s Conventions section recording what this phase changed and why, following the file's existing style (one entry per non-obvious decision). At minimum, record:
- `CheckersBoard`'s new `orientation` prop and the "local two-player mode never flips" rule.
- That `/jogar`/`/configurar` are no longer in the "stayed plain-Tailwind by spec" list — update or remove that convention entry, since it's now stale.
- That `ConfirmModal`/`RulesModal`/`LearningPanel` now have the anime chrome — update the "Toast/Modal chrome was ported behaviorally first..." entry, which currently says these three remain plain-Tailwind.
- The `handleMenuClick` → `router.push` change and why (`ChipButton`'s `onClick` type has no event parameter).

Commit:

```bash
git add CLAUDE.md
git commit -m "docs: record UI parity & game completion phase in CLAUDE.md

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PSoURGNKX7i2buwPDDsGQC"
git push origin main
```

---

## Self-Review Notes

- **Spec coverage:** §3 (title) → Task 1. §4 (orientation prop) → Task 2. §5 (`/jogar` redesign) → Task 7. §6 (`/configurar`/`GameSetup`) → Task 6. §7 (modal/panel chrome) → Tasks 3–5. §8 (testing approach) → each task's own test steps plus Task 8's full-suite pass. §9 (out-of-scope items) → intentionally has no corresponding task; Global Constraints repeats them so no task accidentally drifts into that scope.
- **Placeholder scan:** no TBD/TODO; every step has literal, complete code or an exact runnable command.
- **Type consistency:** `orientation?: Color` (Task 2) is consumed identically in Task 7 (`orientation={isAiMode ? humanColor : 'w'}`, where `humanColor: Color`). `GameSetup` (Task 6) uses `Difficulty`/`PlayerColor` exactly as already defined in `lib/checkers/difficulty.ts`/`lib/checkers/playerColor.ts` — no new types introduced. `ChipButtonProps.onClick: () => void` is respected everywhere it's used in Task 7 (verified `handleMenuClick`, `handleRestartClick`, and the inline rules-modal opener are all zero-argument).
