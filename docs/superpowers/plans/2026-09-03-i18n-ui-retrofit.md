# i18n UI Retrofit (Plan 8b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retrofit every existing page and component to actually call `useTranslation()` instead of rendering hardcoded Portuguese, so `Settings.language` (built in Plan 8a, currently inert) has a real, visible effect.

**Architecture:** Plan 8a already built `lib/i18n/` (the `Dictionary` type, `pt`/`en` object literals, `DICTIONARIES`, `useTranslation()`) and confirmed ~140 of its ~150 keys are byte-identical to the app's current live Portuguese text. This plan does NOT introduce new i18n machinery — it wires the existing one in. Every retrofitted component calls `useTranslation()` directly (no new React Context; `useTranslation` already sits on top of `useSettings`'s `useSyncExternalStore` singleton) and swaps its literal PT strings for `t.foo.bar`. Two exceptions to the pure-hook pattern, both because the callee isn't itself a component: `lib/checkers/gameEndMessage.ts`'s `describeGameEnd` gains an explicit `locale: Locale` parameter (its caller, `GameEndModal`, already has `t`/`locale` from its own `useTranslation()` call and passes `locale` through); `components/LineTabs/LineTabs.tsx` gains a `tablistLabel: string` prop instead of calling the hook itself, matching the existing `ToggleGroup`/`OptionPicker` pattern of "generic component, caller supplies its own strings."

Two known gaps get closed as part of this plan (not deferred further): `lib/settings/themes.ts`'s hardcoded PT `label` fields on `BOARD_THEMES`/`BACKGROUND_THEMES` are replaced by two new dictionary sections (`boardThemeLabel`, `backgroundThemeLabel`), and `/opcoes` gains a real language toggle (the dictionary's `opcoes.language`/`portuguese`/`english`/`toastLanguageChanged` keys have existed since Plan 8a with no UI consumer until now). Two gaps stay explicitly out of scope, ruled below: `app/layout.tsx`'s `metadata.description`/`<html lang>` (no SSR-visible locale exists in this client-only, no-backend app) and `CheckersBoard.tsx`'s `aria-label={`square ${square}`}` (a screen-reader coordinate identifier, not prose content).

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind v4, Vitest + Testing Library — unchanged from the rest of the project.

**Spec:** `docs/superpowers/specs/2026-08-31-checkers-sensei-design.md` (§7's i18n subsection; §13 phase 8).

## Global Constraints

- **Process (CLAUDE.md, hard repo rule):** no worktrees, no feature branches. Every task's changes are committed directly to `main` and pushed (`git push origin main`) immediately once its tests pass — never batch multiple tasks into one unpushed commit. `CLAUDE.md` is updated at the end of this phase (Task 11).
- **No new i18n machinery.** Every retrofitted component reads translated strings via `const { t } = useTranslation();` (or `const { t, locale } = useTranslation();` where `locale` itself is needed, e.g. to pass into `describeGameEnd` or to index `opening.name[locale]`). Do not introduce a new Context, a new hook, or prop-drill `t` through components that can call the hook themselves.
- **Verbatim-by-default is the safety net — do not break it silently.** Plan 8a's dictionary text is confirmed byte-identical to today's hardcoded PT strings for every key an existing test currently asserts on. Every existing test file's PT-language assertions (in every test that doesn't itself change `settings.language`) MUST continue passing completely unchanged once a task wires that component's text through `t.foo.bar`, because the app's default locale is `'pt'` and every test file gets a PT-seeded `localStorage` from `vitest.setup.ts`'s global `beforeEach`. If a task's retrofit requires editing an *existing* test's expected string, that is a defect in the retrofit (a typo relative to the dictionary, most likely) — fix the code, not the test.
- **The `localStorage.clear()` trap.** Any test file whose own `beforeEach` calls `window.localStorage.clear()` wipes the global PT seed right back out, exposing that file's PT-asserting tests to `jsdom`'s default `navigator.language` (`'en-US'`) once the component under test starts reading `settings.language`. `lib/settings/settings.test.ts` and `lib/settings/useSettings.test.ts` were already fixed for this in Plan 8a (`vi.stubGlobal('navigator', { language: 'pt-PT' })` in their own `beforeEach`, `vi.unstubAllGlobals()` in `afterEach`). Grepping this repo for the pattern (`grep -rln "localStorage.clear()" app components lib --include="*.test.ts*"`) turns up exactly two more exposed files: `app/opcoes/page.test.tsx` (Task 3) and `app/configurar/page.test.tsx` (Task 5). Both need the identical fix as part of their task.
- **Every retrofit gets a real English-path test, not just a compiling one.** This project has twice shipped an untested, load-bearing prop-wiring bug (`CheckersBoard`'s `turn`-inversion convention, wrong in two different phases) that passed every existing test while silently doing the wrong thing — because the existing tests only ever exercised the one code path that happened to still work. The same risk applies directly here: an existing PT-locale test can't tell the difference between a component that reads `t.foo.bar` correctly and one that still has the old literal string sitting right next to unused `t`/`useTranslation` imports. Every task below that wires a component's rendered text to `t` must add at least one new test that sets `language: 'en'` (via `saveSettings({ ...DEFAULT_SETTINGS, language: 'en' })` before `render()`, the same pattern `lib/i18n/useTranslation.test.ts` already uses) and asserts the English string actually renders.
- **Explicitly out of scope, ruled here rather than left ambiguous:**
  - `app/layout.tsx`'s `metadata.description` and `<html lang="pt-PT">` stay hardcoded Portuguese. This is a Server Component evaluated with no access to `localStorage` (the only place `Settings.language` lives — this app has no backend, no cookies, no URL-based locale routing), so there is no correct per-request locale to read here without a much larger architectural change (locale-prefixed routes, a cookie synced from `updateSettings`) that is real, separate, future work — not a gap this retrofit can close. Documented in Task 11's CLAUDE.md entry, not fixed in code.
  - `components/CheckersBoard/CheckersBoard.tsx`'s `aria-label={`square ${square}`}` stays as-is. It identifies a board coordinate for assistive tech, not prose — translating "square" is defensible but low-value, and doing it would mean threading `locale` into the one component this project has deliberately kept fully game/locale-agnostic ("dumb", per its own doc comment). Documented in Task 11, not fixed in code.
- **Cost if either ruling is wrong:** small. Both are additive later — a locale-aware `<html lang>` needs new infrastructure this plan doesn't build anyway, and `CheckersBoard`'s aria-label can gain a `locale`/`t` prop in a follow-up without touching this plan's work.

---

### Task 1: `describeGameEnd` gains a `locale` parameter

**Files:**
- Modify: `lib/checkers/gameEndMessage.ts`
- Modify (test): `lib/checkers/gameEndMessage.test.ts`

**Interfaces:**
- Consumes: `DICTIONARIES` from `@/lib/i18n/dictionaries` (built in Plan 8a — `DICTIONARIES[locale].gameEndMessage` has `aiLose`/`aiWin`/`localWhiteWins`/`localBlackWins`/`drawRepetition`/`drawNoCapture`, all `string`); `Locale` from `@/lib/i18n/types`.
- Produces: `describeGameEnd(status, mode, humanColor, turn, locale: Locale): GameEndDescription | null` — same shape as before, with `locale` appended as a required 5th parameter. Consumed by Task 2's `GameEndModal`.

- [ ] **Step 1: Write the failing test**

Add to `lib/checkers/gameEndMessage.test.ts` (append a new `describe` block; every existing call site in this file needs `'pt'` appended as the 5th argument — see Step 3 for the full updated file):

```ts
describe('locale', () => {
  it('returns English text when locale is "en"', () => {
    const result = describeGameEnd('no-moves', 'ai', 'b', 'b', 'en');
    expect(result?.title).toBe('You lost — no moves available');
  });

  it('returns different text for pt vs en on the same inputs', () => {
    const pt = describeGameEnd('draw-repetition', 'local', 'b', 'b', 'pt');
    const en = describeGameEnd('draw-repetition', 'local', 'b', 'b', 'en');
    expect(en?.title).not.toBe(pt?.title);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/checkers/gameEndMessage.test.ts`
Expected: FAIL — `describeGameEnd` currently takes 4 arguments; TypeScript will also flag every existing call site in this file once Step 3's signature change lands, so this step is really "confirm the test file doesn't compile/pass yet."

- [ ] **Step 3: Update the implementation and every existing call site in the test file**

Replace `lib/checkers/gameEndMessage.ts` in full:

```ts
import type { Color, GameStatus } from './types';
import type { Locale } from '@/lib/i18n/types';
import { DICTIONARIES } from '@/lib/i18n/dictionaries';

// Which tone the GameEndModal should read as -- text-only distinction in
// this plan (win/lose/draw wording), no mascot/confetti yet (Phase 10).
export type GameEndKind = 'win' | 'lose' | 'draw';

export interface GameEndDescription {
  title: string;
  kind: GameEndKind;
}

// Title + kind for the GameEndModal -- only covers truly terminal statuses
// ('no-moves', 'draw-repetition', 'draw-no-capture'). Returns null for
// 'playing', which never opens the modal.
//
// Local mode never returns 'lose' -- always 'win' (for whichever color
// isn't the one stuck) or 'draw', never a losing perspective (there's no
// single "you" on a screen shared by two players).
//
// `locale` was added in the i18n UI retrofit plan (Phase 8b) -- this
// function now reads its strings straight out of the shared dictionary
// (DICTIONARIES[locale].gameEndMessage) instead of owning its own PT text,
// since Plan 8a already authored those exact keys for this exact consumer.
export function describeGameEnd(
  status: GameStatus,
  mode: 'ai' | 'local',
  humanColor: Color,
  turn: Color,
  locale: Locale
): GameEndDescription | null {
  const t = DICTIONARIES[locale].gameEndMessage;
  if (status === 'no-moves') {
    // `turn` is always the side with zero legal moves -- they lose.
    if (mode === 'ai') {
      return turn === humanColor ? { title: t.aiLose, kind: 'lose' } : { title: t.aiWin, kind: 'win' };
    }
    return turn === 'b' ? { title: t.localWhiteWins, kind: 'win' } : { title: t.localBlackWins, kind: 'win' };
  }
  if (status === 'draw-repetition') {
    return { title: t.drawRepetition, kind: 'draw' };
  }
  if (status === 'draw-no-capture') {
    return { title: t.drawNoCapture, kind: 'draw' };
  }
  return null;
}
```

Replace `lib/checkers/gameEndMessage.test.ts` in full (every existing call gains `'pt'` as its 5th argument; the two draw-title assertions switch from substring-matching Portuguese words to checking the known dictionary values, since that's more precise than `.toContain('repetição')` now that the string comes from a shared source of truth):

```ts
import { describe, it, expect } from 'vitest';
import { describeGameEnd } from './gameEndMessage';

describe('describeGameEnd', () => {
  it('returns null for playing (game not over)', () => {
    expect(describeGameEnd('playing', 'local', 'b', 'b', 'pt')).toBeNull();
  });

  describe('no-moves, ai mode', () => {
    it('is a loss when the human is the side with no moves', () => {
      const result = describeGameEnd('no-moves', 'ai', 'b', 'b', 'pt');
      expect(result?.kind).toBe('lose');
    });

    it('is a win when the AI is the side with no moves', () => {
      const result = describeGameEnd('no-moves', 'ai', 'b', 'w', 'pt');
      expect(result?.kind).toBe('win');
    });
  });

  describe('no-moves, local mode', () => {
    it('is always a win (for whichever color is not stuck), never a loss perspective', () => {
      const blackStuck = describeGameEnd('no-moves', 'local', 'b', 'b', 'pt');
      const whiteStuck = describeGameEnd('no-moves', 'local', 'b', 'w', 'pt');
      expect(blackStuck?.kind).toBe('win');
      expect(whiteStuck?.kind).toBe('win');
      expect(blackStuck?.title).not.toBe(whiteStuck?.title);
    });
  });

  it('classifies draw-repetition as a draw', () => {
    const result = describeGameEnd('draw-repetition', 'local', 'b', 'b', 'pt');
    expect(result?.kind).toBe('draw');
    expect(result?.title).toBe('Empate por repetição de posição');
  });

  it('classifies draw-no-capture as a draw with distinct wording from draw-repetition', () => {
    const repetition = describeGameEnd('draw-repetition', 'local', 'b', 'b', 'pt');
    const noCapture = describeGameEnd('draw-no-capture', 'local', 'b', 'b', 'pt');
    expect(noCapture?.kind).toBe('draw');
    expect(noCapture?.title).not.toBe(repetition?.title);
  });

  describe('locale', () => {
    it('returns English text when locale is "en"', () => {
      const result = describeGameEnd('no-moves', 'ai', 'b', 'b', 'en');
      expect(result?.title).toBe('You lost — no moves available');
    });

    it('returns different text for pt vs en on the same inputs', () => {
      const pt = describeGameEnd('draw-repetition', 'local', 'b', 'b', 'pt');
      const en = describeGameEnd('draw-repetition', 'local', 'b', 'b', 'en');
      expect(en?.title).not.toBe(pt?.title);
    });
  });
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/checkers/gameEndMessage.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/checkers/gameEndMessage.ts lib/checkers/gameEndMessage.test.ts
git commit -m "feat(i18n): describeGameEnd reads its strings from the dictionary by locale"
git push origin main
```

---

### Task 2: Retrofit `GameEndModal`, `RulesModal`, and `Toast`

**Files:**
- Modify: `components/GameEndModal/GameEndModal.tsx`
- Modify: `components/RulesModal/RulesModal.tsx`
- Modify: `components/Toast/Toast.tsx`
- Modify (tests): `components/GameEndModal/GameEndModal.test.tsx`, `components/RulesModal/RulesModal.test.tsx`, `components/Toast/Toast.test.tsx`

**Interfaces:**
- Consumes: `useTranslation()` from `@/lib/i18n/useTranslation` (Plan 8a — `{ t: Dictionary, locale: Locale }`); Task 1's `describeGameEnd(status, mode, humanColor, turn, locale)`.
- Produces: none of these three change their own public props — no caller needs to change beyond what Task 6 already does for `GameEndModal` (nothing changes there; `GameEndModal` derives `locale` internally).

- [ ] **Step 1: Write the failing tests**

Append to `components/GameEndModal/GameEndModal.test.tsx` (needs `saveSettings`/`DEFAULT_SETTINGS` imports added):

```ts
import { saveSettings, DEFAULT_SETTINGS } from '@/lib/settings/settings';
```

```ts
  it('shows English text when settings.language is "en"', () => {
    saveSettings({ ...DEFAULT_SETTINGS, language: 'en' });
    render(
      <GameEndModal
        open={true}
        status="no-moves"
        mode="local"
        humanColor="b"
        turn="w"
        onClose={() => {}}
        onPlayAgain={() => {}}
      />
    );
    expect(screen.getByText('Black wins — White has no moves left')).toBeInTheDocument();
    expect(screen.getByText('Play again')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Main menu' })).toBeInTheDocument();
  });
```

Append to `components/RulesModal/RulesModal.test.tsx` (same imports added):

```ts
  it('shows English text when settings.language is "en"', () => {
    saveSettings({ ...DEFAULT_SETTINGS, language: 'en' });
    render(<RulesModal open={true} onClose={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Game rules', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('Movement')).not.toBeNull();
    expect(screen.getByText('Mandatory capture', { selector: 'h3' })).not.toBeNull();
  });
```

Append to `components/Toast/Toast.test.tsx` (same imports added):

```ts
  it('shows the English close label when settings.language is "en"', () => {
    saveSettings({ ...DEFAULT_SETTINGS, language: 'en' });
    render(<Toast toast={{ id: 1, message: 'Good move!', tone: 'boa' }} onDismiss={() => {}} />);
    expect(screen.getByLabelText('Close')).not.toBeNull();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run components/GameEndModal components/RulesModal components/Toast`
Expected: FAIL — all three components still render hardcoded Portuguese regardless of `settings.language`.

- [ ] **Step 3: Retrofit the three components**

Replace `components/GameEndModal/GameEndModal.tsx` in full:

```tsx
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import type { Color, GameStatus } from '@/lib/checkers/types';
import { describeGameEnd } from '@/lib/checkers/gameEndMessage';
import { useFocusTrap } from '@/lib/ui/useFocusTrap';
import { useTranslation } from '@/lib/i18n/useTranslation';

export interface GameEndModalProps {
  open: boolean;
  status: GameStatus;
  mode: 'ai' | 'local';
  humanColor: Color;
  turn: Color;
  onClose: () => void;
  onPlayAgain: () => void;
}

const KIND_ACCENT: Record<'win' | 'lose' | 'draw', string> = {
  win: 'border-emerald-500',
  lose: 'border-red-500',
  draw: 'border-amber-500',
};

// Self-contained like ConfirmModal/RulesModal (backdrop, role="dialog",
// focus trap, Escape closes) rather than going through ToastProvider --
// only /jogar uses it and needs page-specific callbacks (onPlayAgain).
// Text/button only in this plan -- no mascot illustration or confetti
// (Phase 10, see this plan's Global Constraints).
export function GameEndModal({ open, status, mode, humanColor, turn, onClose, onPlayAgain }: GameEndModalProps) {
  const { t, locale } = useTranslation();
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
  const result = describeGameEnd(status, mode, humanColor, turn, locale);
  if (!result) return null;
  const { title, kind } = result;

  return (
    <div
      data-testid="game-end-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className={`w-full max-w-sm rounded-2xl border-2 ${KIND_ACCENT[kind]} bg-white p-6 text-stone-900 outline-none`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="rounded-full h-8 w-8 shrink-0 bg-stone-200 font-bold hover:scale-110 transition-transform"
          >
            ✕
          </button>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onPlayAgain}
            className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white"
          >
            {t.gameEndModal.playAgain}
          </button>
          <Link href="/" className="rounded-xl bg-stone-200 px-4 py-2 font-bold text-stone-900">
            {t.common.mainMenu}
          </Link>
        </div>
      </div>
    </div>
  );
}
```

Replace `components/RulesModal/RulesModal.tsx` in full:

```tsx
'use client';

import { useEffect } from 'react';
import { useFocusTrap } from '@/lib/ui/useFocusTrap';
import { useTranslation } from '@/lib/i18n/useTranslation';

export interface RulesModalProps {
  open: boolean;
  onClose: () => void;
}

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

  // Content per design spec §5's explicit list for this modal's checkers
  // version: man/king movement, mandatory capture, multi-jump, promotion,
  // draw conditions. Built from the shared dictionary (t.rulesModal) as of
  // the i18n UI retrofit plan (Phase 8b) -- previously a hardcoded PT array.
  const sections = [
    { title: t.rulesModal.movementTitle, items: [t.rulesModal.man, t.rulesModal.king] },
    { title: t.rulesModal.mandatoryCaptureTitle, items: [t.rulesModal.mandatoryCapture, t.rulesModal.multiJump] },
    { title: t.rulesModal.promotionTitle, items: [t.rulesModal.promotion] },
    { title: t.rulesModal.drawTitle, items: [t.rulesModal.repetition, t.rulesModal.noCaptureDraw] },
  ];

  return (
    <div
      data-testid="rules-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={t.rulesModal.title}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-2xl border-2 border-stone-700 bg-white p-6 text-stone-900 outline-none"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-2xl font-bold">{t.rulesModal.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="rounded-full h-8 w-8 shrink-0 bg-stone-200 font-bold hover:scale-110 transition-transform"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-5">
          {sections.map((section) => (
            <section key={section.title}>
              <h3 className="mb-2 font-semibold text-sky-700">{section.title}</h3>
              <dl className="flex flex-col gap-2">
                {section.items.map((item) => (
                  <div key={item.title}>
                    <dt className="font-medium">{item.title}</dt>
                    <dd className="text-sm text-stone-700">{item.text}</dd>
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

In `components/Toast/Toast.tsx`, add the `useTranslation` import and swap the one hardcoded string:

```tsx
'use client';

import type { MoveQuality } from '@/lib/checkers/moveClassification';
import { useTranslation } from '@/lib/i18n/useTranslation';
```

```tsx
export function Toast({ toast, onDismiss }: ToastProps) {
  const { t } = useTranslation();
  return (
```

```tsx
          <button
            type="button"
            onClick={onDismiss}
            aria-label={t.common.close}
            className="rounded-full h-6 w-6 shrink-0 bg-stone-200 font-bold hover:scale-110 transition-transform"
          >
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run components/GameEndModal components/RulesModal components/Toast`
Expected: PASS — every pre-existing test in all three files still passes unchanged (verbatim PT text), plus the 3 new English-locale tests.

- [ ] **Step 5: Commit**

```bash
git add components/GameEndModal/GameEndModal.tsx components/GameEndModal/GameEndModal.test.tsx \
        components/RulesModal/RulesModal.tsx components/RulesModal/RulesModal.test.tsx \
        components/Toast/Toast.tsx components/Toast/Toast.test.tsx
git commit -m "feat(i18n): retrofit GameEndModal, RulesModal, and Toast to useTranslation"
git push origin main
```

---

### Task 3: New `boardThemeLabel`/`backgroundThemeLabel` dictionary keys, `themes.ts` cleanup, and `/opcoes` retrofit (incl. language toggle)

**Files:**
- Modify: `lib/i18n/dictionaries/types.ts`, `lib/i18n/dictionaries/pt.ts`, `lib/i18n/dictionaries/en.ts`
- Modify (test): `lib/i18n/dictionaries/dictionaries.test.ts`
- Modify: `lib/settings/themes.ts`
- Modify (test): `lib/settings/themes.test.ts`
- Modify: `app/opcoes/page.tsx`
- Modify (test): `app/opcoes/page.test.tsx`

**Interfaces:**
- Produces: `Dictionary.boardThemeLabel: { sakura: string; nebulosa: string; neon: string }`, `Dictionary.backgroundThemeLabel: { templo: string; dojo: string; cosmico: string }` — consumed only by `app/opcoes/page.tsx` in this plan.
- `BoardThemeInfo`/`BackgroundThemeInfo` (in `lib/settings/themes.ts`) drop their `label: string` field — `CheckersBoard.tsx` never read it (confirmed: only `app/opcoes/page.tsx` did), so no other file needs a change for this removal.

- [ ] **Step 1: Write the failing tests**

In `lib/i18n/dictionaries/types.ts`, the failing test is really "the file won't compile until Step 3 adds these" — add to `dictionaries.test.ts` instead, which exercises the new keys through the existing generic leaf-walking tests (no new test needed there beyond extending `SAME_BY_DESIGN`, done in Step 3) plus one explicit assertion:

```ts
  it('has board and background theme labels for every theme id', () => {
    for (const locale of VALID_LOCALES) {
      const d = DICTIONARIES[locale];
      expect(d.boardThemeLabel.sakura).toBeTruthy();
      expect(d.boardThemeLabel.nebulosa).toBeTruthy();
      expect(d.boardThemeLabel.neon).toBeTruthy();
      expect(d.backgroundThemeLabel.templo).toBeTruthy();
      expect(d.backgroundThemeLabel.dojo).toBeTruthy();
      expect(d.backgroundThemeLabel.cosmico).toBeTruthy();
    }
  });
```

In `lib/settings/themes.test.ts`, remove the two `.label.length` assertions (Step 3 shows the full resulting file).

In `app/opcoes/page.test.tsx`, append (needs `vi` already imported — it isn't yet, add it; see Step 3 for the full file):

```ts
  it('updates and persists the language, switching the rendered text to English', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(loadSettings().language).toBe('en');
    expect(screen.getByRole('heading', { name: 'Options' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Language updated.');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/i18n/dictionaries lib/settings/themes.test.ts app/opcoes/page.test.tsx`
Expected: FAIL — `boardThemeLabel`/`backgroundThemeLabel` don't exist yet; `/opcoes` has no language toggle; `themes.test.ts`'s two removed assertions mean that file should already pass once trimmed (that part is a refactor, not TDD — trim it in Step 3 alongside the source change).

- [ ] **Step 3: Add the dictionary keys, clean up `themes.ts`, retrofit `/opcoes`**

In `lib/i18n/dictionaries/types.ts`, add two new top-level sections (place after `pieceStyleLabel`, before `configurar`):

```ts
  pieceStyleLabel: { classico: string; moderno: string; anime: string };
  boardThemeLabel: { sakura: string; nebulosa: string; neon: string };
  backgroundThemeLabel: { templo: string; dojo: string; cosmico: string };
  configurar: { title: string; difficultyLegend: string; colorLegend: string; start: string };
```

In `lib/i18n/dictionaries/pt.ts`, add (after `pieceStyleLabel`):

```ts
  pieceStyleLabel: { classico: 'Clássico', moderno: 'Moderno', anime: 'Anime' },
  boardThemeLabel: { sakura: 'Sakura', nebulosa: 'Nebulosa', neon: 'Néon' },
  backgroundThemeLabel: { templo: 'Templo', dojo: 'Dojo', cosmico: 'Cósmico' },
```

In `lib/i18n/dictionaries/en.ts`, add (after `pieceStyleLabel`):

```ts
  pieceStyleLabel: { classico: 'Classic', moderno: 'Modern', anime: 'Anime' },
  boardThemeLabel: { sakura: 'Sakura', nebulosa: 'Nebula', neon: 'Neon' },
  backgroundThemeLabel: { templo: 'Temple', dojo: 'Dojo', cosmico: 'Cosmic' },
```

In `lib/i18n/dictionaries/dictionaries.test.ts`, extend the exception set (the comment is updated to match — `sakura`/`dojo` are established loanwords in Portuguese exactly like `pieceStyleLabel.anime`, `neon`/`templo`/`cosmico` all get real translations so they're NOT exceptions):

```ts
  it('has genuinely different PT/EN text for every leaf, except documented exceptions (language names, app name, and established loanwords)', () => {
    const SAME_BY_DESIGN = new Set([
      'opcoes.portuguese',
      'opcoes.english',
      'menu.title',
      'pieceStyleLabel.anime',
      'boardThemeLabel.sakura',
      'backgroundThemeLabel.dojo',
    ]);
```

(Add the new "has board and background theme labels" test from Step 1 as well.)

In `lib/settings/themes.ts`, drop the `label` field from both interfaces and both registries:

```ts
import type { BackgroundTheme, BoardTheme } from './settings';

export interface BoardThemeInfo {
  light: string;
  dark: string;
}

export interface BackgroundThemeInfo {
  image: string;
  /**
   * CSS fallback layered behind `image` via a comma-separated
   * background-image list (see app/page.tsx and app/opcoes/page.tsx) --
   * `image` isn't a real file yet (see this plan's header: Chess Sensei's
   * background-*.webp files were verified to contain chess board/piece
   * imagery, so they weren't copied, and new art is Phase 10 work), so it
   * 404s harmlessly and this gradient is what actually renders today. Once
   * Phase 10 drops a real file at `image`'s path, it paints over this with
   * no code change needed.
   */
  fallbackGradient: string;
}

/**
 * Single registry of each theme's assets -- the rest of the app never
 * writes a theme image path directly, only reads from here
 * (CheckersBoard.tsx, app/page.tsx, app/opcoes/page.tsx). Display LABELS
 * live in the i18n dictionary (Dictionary.boardThemeLabel/
 * backgroundThemeLabel), not here -- this registry is asset paths only, so
 * it never needs a locale.
 */
export const BOARD_THEMES: Record<BoardTheme, BoardThemeInfo> = {
  sakura: {
    light: '/board/sakura-light-square.webp',
    dark: '/board/sakura-dark-square.webp',
  },
  nebulosa: {
    light: '/board/nebulosa-light-square.webp',
    dark: '/board/nebulosa-dark-square.webp',
  },
  neon: {
    light: '/board/neon-light-square.webp',
    dark: '/board/neon-dark-square.webp',
  },
};

export const BACKGROUND_THEMES: Record<BackgroundTheme, BackgroundThemeInfo> = {
  templo: {
    image: '/menu/background-templo.webp',
    fallbackGradient: 'linear-gradient(160deg, #241246 0%, #1A0B33 55%, #3A1550 100%)',
  },
  dojo: {
    image: '/menu/background-dojo.webp',
    fallbackGradient: 'linear-gradient(160deg, #0B2E30 0%, #1A0B33 55%, #14324a 100%)',
  },
  cosmico: {
    image: '/menu/background-cosmico.webp',
    fallbackGradient: 'radial-gradient(circle at 50% 20%, #3A1550 0%, #1A0B33 60%, #0d0620 100%)',
  },
};
```

In `lib/settings/themes.test.ts`, remove the two now-invalid `.label.length` assertions (full resulting file):

```ts
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { BOARD_THEMES, BACKGROUND_THEMES } from './themes';
import type { BoardTheme, BackgroundTheme } from './settings';

const ALL_BOARD_THEMES: BoardTheme[] = ['sakura', 'nebulosa', 'neon'];
const ALL_BACKGROUND_THEMES: BackgroundTheme[] = ['templo', 'dojo', 'cosmico'];

describe('BOARD_THEMES', () => {
  it('has a registry entry for every BoardTheme value', () => {
    for (const theme of ALL_BOARD_THEMES) {
      expect(BOARD_THEMES[theme]).toBeDefined();
      expect(BOARD_THEMES[theme].light).toMatch(/^\/board\//);
      expect(BOARD_THEMES[theme].dark).toMatch(/^\/board\//);
    }
  });

  it('board theme asset paths resolve to real files on disk', () => {
    for (const theme of ALL_BOARD_THEMES) {
      const themeInfo = BOARD_THEMES[theme];
      const lightPath = join(process.cwd(), 'public', themeInfo.light);
      const darkPath = join(process.cwd(), 'public', themeInfo.dark);
      expect(existsSync(lightPath)).toBe(true);
      expect(existsSync(darkPath)).toBe(true);
    }
  });
});

describe('BACKGROUND_THEMES', () => {
  it('has a registry entry for every BackgroundTheme value', () => {
    for (const theme of ALL_BACKGROUND_THEMES) {
      expect(BACKGROUND_THEMES[theme]).toBeDefined();
      expect(BACKGROUND_THEMES[theme].image).toMatch(/^\/menu\//);
      expect(BACKGROUND_THEMES[theme].fallbackGradient.length).toBeGreaterThan(0);
    }
  });

  it('gives each background theme a visibly distinct fallback gradient', () => {
    const gradients = ALL_BACKGROUND_THEMES.map((theme) => BACKGROUND_THEMES[theme].fallbackGradient);
    expect(new Set(gradients).size).toBe(ALL_BACKGROUND_THEMES.length);
  });
});
```

Replace `app/opcoes/page.tsx` in full:

```tsx
'use client';

import type { ReactNode } from 'react';
import type { Locale } from '@/lib/i18n/types';
import type { Difficulty } from '@/lib/checkers/difficulty';
import type { PlayerColor } from '@/lib/checkers/playerColor';
import type { BackgroundTheme, BoardTheme, PieceStyle } from '@/lib/settings/settings';
import { BACKGROUND_THEMES, BOARD_THEMES } from '@/lib/settings/themes';
import { useSettings } from '@/lib/settings/useSettings';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { PieceIcon } from '@/components/CheckersBoard/PieceIcon';
import { ChipButton } from '@/components/ChipButton/ChipButton';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';
import { ToggleGroup } from '@/components/ToggleGroup/ToggleGroup';
import { useToast } from '@/components/Toast/ToastProvider';

// Shared button shell for every option picker on this page (board theme,
// piece style, background) -- only the thumbnail inside changes between
// callers, via `renderPreview`.
function OptionPicker<T extends string, Opt extends { id: T; label: string }>({
  legend,
  options,
  value,
  onChange,
  renderPreview,
}: {
  legend: string;
  options: Opt[];
  value: T;
  onChange: (id: T) => void;
  renderPreview: (opt: Opt) => ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="font-medium mb-1 text-white">{legend}</legend>
      <div className="flex gap-3">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            aria-pressed={value === opt.id}
            className={`flex flex-col items-center gap-1 rounded-xl border-2 p-1 transition-transform hover:scale-[1.03] ${
              value === opt.id ? 'border-cyan ring-2 ring-cyan' : 'border-purple/40'
            }`}
          >
            {renderPreview(opt)}
            <span className="text-xs text-lilac">{opt.label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function ThemeSwatch({ image, image2, fallbackGradient }: { image: string; image2?: string; fallbackGradient?: string }) {
  if (image2) {
    return (
      <span className="grid h-16 w-16 grid-cols-2 grid-rows-2 overflow-hidden rounded">
        <span style={{ backgroundImage: `url(${image})`, backgroundSize: 'cover' }} />
        <span style={{ backgroundImage: `url(${image2})`, backgroundSize: 'cover' }} />
        <span style={{ backgroundImage: `url(${image2})`, backgroundSize: 'cover' }} />
        <span style={{ backgroundImage: `url(${image})`, backgroundSize: 'cover' }} />
      </span>
    );
  }
  const backgroundImage = fallbackGradient ? `url(${image}), ${fallbackGradient}` : `url(${image})`;
  return <span className="h-16 w-16 rounded bg-cover bg-center" style={{ backgroundImage }} />;
}

export default function OpcoesPage() {
  const { settings, updateSettings } = useSettings();
  const { t } = useTranslation();
  const toast = useToast();

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

  const languageOptions: { value: Locale; label: string }[] = [
    { value: 'pt', label: t.opcoes.portuguese },
    { value: 'en', label: t.opcoes.english },
  ];

  const pieceStyleOptions: { id: PieceStyle; label: string }[] = [
    { id: 'classico', label: t.pieceStyleLabel.classico },
    { id: 'moderno', label: t.pieceStyleLabel.moderno },
    { id: 'anime', label: t.pieceStyleLabel.anime },
  ];

  const boardThemeOptions: { id: BoardTheme; label: string; image: string; image2: string }[] = (
    Object.keys(BOARD_THEMES) as BoardTheme[]
  ).map((id) => ({ id, label: t.boardThemeLabel[id], image: BOARD_THEMES[id].light, image2: BOARD_THEMES[id].dark }));

  const backgroundThemeOptions: { id: BackgroundTheme; label: string; image: string; fallbackGradient: string }[] = (
    Object.keys(BACKGROUND_THEMES) as BackgroundTheme[]
  ).map((id) => ({
    id,
    label: t.backgroundThemeLabel[id],
    image: BACKGROUND_THEMES[id].image,
    fallbackGradient: BACKGROUND_THEMES[id].fallbackGradient,
  }));

  return (
    <main className="relative flex flex-col items-center justify-start p-8 overflow-hidden bg-ink">
      <PageGlow pinkOpacity={0.25} />
      <div className="relative w-full max-w-sm">
        <PageHeader>{t.opcoes.title}</PageHeader>
        <p className="mt-3">
          <ChipButton color="purple" href="/">
            {t.common.mainMenu}
          </ChipButton>
        </p>
      </div>
      <div className="relative flex flex-col gap-6 max-w-sm w-full mt-8">
        <ToggleGroup
          legend={t.opcoes.defaultDifficultyLegend}
          options={difficultyOptions}
          value={settings.defaultDifficulty}
          onChange={(level) => {
            updateSettings({ defaultDifficulty: level });
            toast.show(t.opcoes.toastDifficultyChanged);
          }}
        />

        <ToggleGroup
          legend={t.opcoes.defaultColorLegend}
          options={colorOptions}
          value={settings.defaultColor}
          onChange={(value) => {
            updateSettings({ defaultColor: value });
            toast.show(t.opcoes.toastColorChanged);
          }}
        />

        <ToggleGroup
          legend={t.opcoes.language}
          options={languageOptions}
          value={settings.language}
          onChange={(language) => {
            updateSettings({ language });
            toast.show(t.opcoes.toastLanguageChanged);
          }}
        />

        <OptionPicker
          legend={t.opcoes.boardTheme}
          options={boardThemeOptions}
          value={settings.boardTheme}
          onChange={(boardTheme) => {
            updateSettings({ boardTheme });
            toast.show(t.opcoes.toastBoardThemeChanged);
          }}
          renderPreview={(opt) => <ThemeSwatch image={opt.image} image2={opt.image2} />}
        />
        <OptionPicker
          legend={t.opcoes.pieceStyle}
          options={pieceStyleOptions}
          value={settings.pieceStyle}
          onChange={(pieceStyle) => {
            updateSettings({ pieceStyle });
            toast.show(t.opcoes.toastPieceStyleChanged);
          }}
          renderPreview={(opt) => (
            <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-ink">
              <span className="h-12 w-12 text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.9)]">
                <PieceIcon type="king" style={opt.id} />
              </span>
            </span>
          )}
        />
        <OptionPicker
          legend={t.opcoes.backgroundImage}
          options={backgroundThemeOptions}
          value={settings.backgroundTheme}
          onChange={(backgroundTheme) => {
            updateSettings({ backgroundTheme });
            toast.show(t.opcoes.toastBackgroundChanged);
          }}
          renderPreview={(opt) => <ThemeSwatch image={opt.image} fallbackGradient={opt.fallbackGradient} />}
        />
      </div>
    </main>
  );
}
```

Replace `app/opcoes/page.test.tsx` in full (adds the `vi`/`afterEach` navigator-stub fix and the new language test):

```tsx
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider } from '@/components/Toast/ToastProvider';
import { loadSettings } from '@/lib/settings/settings';
import OpcoesPage from './page';

function renderPage() {
  return render(
    <ToastProvider>
      <OpcoesPage />
    </ToastProvider>
  );
}

describe('OpcoesPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // Stub navigator to Portuguese so language auto-detection (added in
    // Plan 8a) doesn't flip these PT-asserting tests to English -- this
    // file's own localStorage.clear() above wipes vitest.setup.ts's global
    // 'pt' seed right back out, same as lib/settings/settings.test.ts and
    // lib/settings/useSettings.test.ts (see CLAUDE.md).
    vi.stubGlobal('navigator', { language: 'pt-PT' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the title and a link back to the main menu', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Opções' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Menu inicial' })).toHaveAttribute('href', '/');
  });

  it('updates and persists the default difficulty', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Difícil' }));
    expect(loadSettings().defaultDifficulty).toBe('dificil');
    expect(screen.getByRole('status')).toHaveTextContent('Dificuldade');
  });

  it('updates and persists the default color', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Pretas' }));
    expect(loadSettings().defaultColor).toBe('b');
  });

  it('updates and persists the piece style', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Moderno' }));
    expect(loadSettings().pieceStyle).toBe('moderno');
  });

  it('updates and persists the board theme', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Néon' }));
    expect(loadSettings().boardTheme).toBe('neon');
  });

  it('updates and persists the background theme', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Dojo' }));
    expect(loadSettings().backgroundTheme).toBe('dojo');
  });

  it('updates and persists the language, switching the rendered text to English', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(loadSettings().language).toBe('en');
    expect(screen.getByRole('heading', { name: 'Options' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Language updated.');
  });
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/i18n/dictionaries lib/settings/themes.test.ts app/opcoes/page.test.tsx`
Expected: PASS

- [ ] **Step 5: Run the full suite and build (cross-cutting change — `themes.ts`'s type change affects every importer)**

Run: `npm test -- --run && npm run build`
Expected: PASS / clean build.

- [ ] **Step 6: Commit**

```bash
git add lib/i18n/dictionaries/types.ts lib/i18n/dictionaries/pt.ts lib/i18n/dictionaries/en.ts \
        lib/i18n/dictionaries/dictionaries.test.ts lib/settings/themes.ts lib/settings/themes.test.ts \
        app/opcoes/page.tsx app/opcoes/page.test.tsx
git commit -m "feat(i18n): add theme-label dictionary keys and retrofit /opcoes (incl. language toggle)"
git push origin main
```

---

### Task 4: Retrofit the home menu (`app/page.tsx`)

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `useTranslation()`.

- [ ] **Step 1: Write the failing test**

`app/page.tsx` has no dedicated test file today (confirmed: none exists in the repo). Create `app/page.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { saveSettings, DEFAULT_SETTINGS } from '@/lib/settings/settings';
import HomePage from './page';

describe('HomePage', () => {
  it('renders the four menu tiles in Portuguese by default', () => {
    render(<HomePage />);
    expect(screen.getByRole('link', { name: /Jogar contra o computador/ })).toHaveAttribute('href', '/configurar');
    expect(screen.getByRole('link', { name: /Dois jogadores/ })).toHaveAttribute('href', '/jogar?mode=local');
    expect(screen.getByRole('link', { name: /Aprender a jogar/ })).toHaveAttribute('href', '/aprender');
    expect(screen.getByRole('link', { name: /Opções/ })).toHaveAttribute('href', '/opcoes');
  });

  it('renders English tile labels when settings.language is "en"', () => {
    saveSettings({ ...DEFAULT_SETTINGS, language: 'en' });
    render(<HomePage />);
    expect(screen.getByRole('link', { name: /Play vs computer/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Two players/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Learn to play/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Options/ })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run app/page.test.tsx`
Expected: FAIL — tiles are still hardcoded Portuguese regardless of `settings.language`.

- [ ] **Step 3: Retrofit `app/page.tsx`**

The `TILES` array is currently a module-level constant with hardcoded `label`s — since it now needs `t`, it moves inside the component body (mirroring Task 3's `OpcoesPage` restructuring). Replace `app/page.tsx` in full:

```tsx
'use client';

import Link from 'next/link';
import { clearSavedGame } from '@/lib/checkers/useCheckersGame';
import { PageGlow, PageHeader, titleStroke } from '@/components/PageChrome/PageChrome';
import { BACKGROUND_THEMES } from '@/lib/settings/themes';
import { useSettings } from '@/lib/settings/useSettings';
import { useTranslation } from '@/lib/i18n/useTranslation';

// Same "stamped shadow + diagonal clip" visual language as ChipButton, at
// tile scale, for the four primary actions.
const TILE_CLASS =
  'relative flex items-center justify-center h-32 rounded-2xl px-6 overflow-hidden ' +
  'shadow-[4px_4px_0_rgba(0,0,0,0.35)] [clip-path:polygon(0_0,100%_0,100%_88%,96%_100%,0_100%)] ' +
  'transition-transform hover:scale-[1.02]';

const TILE_LABEL_CLASS = 'relative z-10 text-lg font-bold text-center text-white';
const TILE_LABEL_STROKE = titleStroke(1);

interface TileData {
  href: string;
  gradient: string;
  emoji: string;
  label: string;
  onClick?: () => void;
}

function MenuTile({ href, gradient, emoji, label, onClick }: TileData) {
  return (
    <Link href={href} onClick={onClick} className={TILE_CLASS} style={{ background: gradient }}>
      <span aria-hidden="true" className="absolute top-3 right-4 text-base z-10">
        {emoji}
      </span>
      <span className={TILE_LABEL_CLASS} style={{ textShadow: TILE_LABEL_STROKE }}>
        {label}
      </span>
    </Link>
  );
}

export default function HomePage() {
  const { settings } = useSettings();
  const { t } = useTranslation();
  const theme = BACKGROUND_THEMES[settings.backgroundTheme];

  // No per-tile illustration yet -- Chess Sensei's vs-cpu.webp/two-players.
  // webp/tutorial.webp/options.webp are chess-specific art; new Draw Things
  // generation for checkers equivalents is Phase 10. Each tile is its own
  // gradient instead, in the same 4 accent colors real art will sit behind
  // once it lands.
  const tiles: TileData[] = [
    {
      href: '/configurar',
      gradient: 'linear-gradient(135deg, #00E5FF, #4EA8DE)',
      emoji: '⚔️',
      label: t.menu.playVsComputer,
    },
    {
      href: '/jogar?mode=local',
      gradient: 'linear-gradient(135deg, #FF9AC2, #FF6FA5)',
      emoji: '✨',
      label: t.menu.twoPlayers,
      onClick: () => clearSavedGame(),
    },
    {
      href: '/aprender',
      gradient: 'linear-gradient(135deg, #B87FDB, #7B3FA0)',
      emoji: '📖',
      label: t.menu.learnToPlay,
    },
    {
      href: '/opcoes',
      gradient: 'linear-gradient(135deg, #FFE066, #FFD600)',
      emoji: '⚙️',
      label: t.menu.options,
    },
  ];

  return (
    <main
      className="relative min-h-dvh flex flex-col items-center gap-8 p-8 overflow-hidden bg-ink bg-cover bg-center"
      style={{ backgroundImage: `url(${theme.image}), ${theme.fallbackGradient}` }}
    >
      {/* Identity layer over whichever background /opcoes picked: radial
          pink glow + darkening toward ink, so the chrome (title, tiles)
          reads consistently even before real background art exists. */}
      <PageGlow pinkOpacity={0.35} darken={[0.55, 0.85]} />

      <PageHeader size="text-5xl" softDrop={5} logoSize="lg" wrapperClassName="w-full max-w-sm">
        {t.menu.title}
      </PageHeader>

      <div className="relative flex flex-col gap-4 w-full max-w-sm">
        {tiles.map((tile) => (
          <MenuTile key={tile.href} {...tile} />
        ))}
      </div>
    </main>
  );
}
```

(`t.menu.title` is `'Checkers Sensei'` in both locales — a `SAME_BY_DESIGN` exception already established in Plan 8a, so this swap is text-identical either way.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run app/page.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/page.test.tsx
git commit -m "feat(i18n): retrofit the home menu to useTranslation"
git push origin main
```

---

### Task 5: Retrofit `app/configurar/page.tsx`

**Files:**
- Modify: `app/configurar/page.tsx`
- Modify (test): `app/configurar/page.test.tsx`

**Interfaces:**
- Consumes: `useTranslation()`.

- [ ] **Step 1: Write the failing test**

Append to `app/configurar/page.test.tsx` (needs `vi.stubGlobal`/`afterEach` added to fix the same `localStorage.clear()` exposure as Task 3's `/opcoes` fix, plus `saveSettings`/`DEFAULT_SETTINGS` imports and the new test — see Step 3 for the full file).

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run app/configurar/page.test.tsx`
Expected: FAIL — page still hardcodes Portuguese.

- [ ] **Step 3: Retrofit `app/configurar/page.tsx` and its test**

Replace `app/configurar/page.tsx` in full:

```tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Difficulty } from '@/lib/checkers/difficulty';
import { resolvePlayerColor, type PlayerColor } from '@/lib/checkers/playerColor';
import { clearSavedGame } from '@/lib/checkers/useCheckersGame';
import { useSettings } from '@/lib/settings/useSettings';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function ConfigurarPage() {
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
    // Resolve 'random' HERE, once per game, and put the concrete 'b'/'w' in
    // the URL. /jogar restores a saved position from localStorage on mount,
    // so if the URL still said `color=random` a mid-game reload would
    // re-roll the coin and hand the human the opposite side of the board it
    // had been playing half the time.
    const params = new URLSearchParams({ mode: 'ai', difficulty, color: resolvePlayerColor(color) });
    router.push(`/jogar?${params.toString()}`);
  }

  return (
    <main className="flex min-h-dvh flex-col items-center gap-6 p-4">
      <h1 className="text-2xl font-bold">{t.configurar.title}</h1>

      <fieldset className="flex flex-col items-center gap-2">
        <legend className="mb-1 font-semibold">{t.configurar.difficultyLegend}</legend>
        <div className="flex gap-2">
          {difficultyOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDifficultyOverride(option.value)}
              aria-pressed={difficulty === option.value}
              className={`rounded px-3 py-2 ${difficulty === option.value ? 'bg-stone-700 text-white' : 'bg-stone-200'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col items-center gap-2">
        <legend className="mb-1 font-semibold">{t.configurar.colorLegend}</legend>
        <div className="flex gap-2">
          {colorOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setColorOverride(option.value)}
              aria-pressed={color === option.value}
              className={`rounded px-3 py-2 ${color === option.value ? 'bg-stone-700 text-white' : 'bg-stone-200'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <button type="button" onClick={handleStart} className="rounded bg-emerald-600 px-6 py-3 font-bold text-white">
        {t.configurar.start}
      </button>

      <Link href="/" className="underline">
        {t.common.mainMenu}
      </Link>
    </main>
  );
}
```

Replace `app/configurar/page.test.tsx` in full:

```tsx
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { saveSettings, DEFAULT_SETTINGS } from '@/lib/settings/settings';
import ConfigurarPage from './page';

// Mock next/navigation's useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('ConfigurarPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // Stub navigator to Portuguese so language auto-detection (added in
    // Plan 8a) doesn't flip these PT-asserting tests to English -- this
    // file's own localStorage.clear() above wipes vitest.setup.ts's global
    // 'pt' seed right back out (see CLAUDE.md).
    vi.stubGlobal('navigator', { language: 'pt-PT' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults to the facil/brancas fallback when no settings are saved', () => {
    render(<ConfigurarPage />);
    expect(screen.getByRole('button', { name: 'Fácil' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Brancas' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('starts from the saved default difficulty and color when settings are already warm', () => {
    saveSettings({ ...DEFAULT_SETTINGS, defaultDifficulty: 'dificil', defaultColor: 'b' });
    render(<ConfigurarPage />);
    expect(screen.getByRole('button', { name: 'Difícil' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Pretas' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders English labels when settings.language is "en"', () => {
    saveSettings({ ...DEFAULT_SETTINGS, language: 'en' });
    render(<ConfigurarPage />);
    expect(screen.getByRole('heading', { name: 'Play vs computer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Easy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'White' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run app/configurar/page.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add app/configurar/page.tsx app/configurar/page.test.tsx
git commit -m "feat(i18n): retrofit /configurar to useTranslation"
git push origin main
```

---

### Task 6: Retrofit `app/jogar/page.tsx` and `LearningPanel`

**Files:**
- Modify: `app/jogar/page.tsx`
- Modify: `components/LearningPanel/LearningPanel.tsx`
- Modify (test): `components/LearningPanel/LearningPanel.test.tsx`

**Interfaces:**
- Consumes: `useTranslation()`; Task 1-2's already-retrofitted `GameEndModal` (no prop change needed — it derives `locale` internally); `moveExplanation.ts`'s existing `Locale`/`locale` parameter (unchanged by this plan — only its call sites in `/jogar` stop hardcoding `'pt'`).

- [ ] **Step 1: Write the failing test**

`app/jogar/page.tsx` has no dedicated test file today (confirmed: none exists — this repo's own established pattern per `CLAUDE.md`, this page is exercised through its constituent pieces instead). This task's TDD unit is `LearningPanel`. Append to `components/LearningPanel/LearningPanel.test.tsx` (needs `saveSettings`/`DEFAULT_SETTINGS` imports added):

```ts
import { saveSettings, DEFAULT_SETTINGS } from '@/lib/settings/settings';
```

```ts
  it('shows English labels when settings.language is "en"', () => {
    saveSettings({ ...DEFAULT_SETTINGS, language: 'en' });
    render(<LearningPanel {...baseProps} enabled={false} />);
    expect(screen.getByText('Enable learning mode')).not.toBeNull();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/LearningPanel/LearningPanel.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Retrofit `LearningPanel` and `/jogar`**

Replace `components/LearningPanel/LearningPanel.tsx` in full:

```tsx
'use client';

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
    <div className="flex w-full max-w-md flex-col items-center gap-2">
      <button type="button" onClick={onToggle} className="underline">
        {enabled ? t.learningPanel.disable : t.learningPanel.enable}
      </button>
      {enabled && (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onRequestSuggestion}
            disabled={!canRequestSuggestion || suggestionLoading}
            className="rounded-xl border-2 border-violet-400 bg-white px-4 py-1 text-sm font-medium text-stone-900 disabled:opacity-50"
          >
            {suggestionLoading ? t.learningPanel.suggestionLoading : t.learningPanel.suggestMove}
          </button>
          {hasSuggestion && suggestionExplanation && (
            <p className="text-center text-sm text-stone-700">{suggestionExplanation}</p>
          )}
        </div>
      )}
    </div>
  );
}
```

In `app/jogar/page.tsx`:

1. Add the import: `import { useTranslation } from '@/lib/i18n/useTranslation';`
2. Inside `JogarPageInner`, right after the existing `const { show } = useToast();` line, add: `const { t, locale } = useTranslation();`
3. Replace both hardcoded `locale: 'pt'` call sites (in the grading effect's `describeMoveForToast({...})` call and in `handleRequestSuggestion`'s `explainMove({...})` call) with `locale`.
4. Replace the `turnLabel`/`statusText` block:

```tsx
  const turnLabel = state.turn === 'b' ? t.jogar.turnBlack : t.jogar.turnWhite;
  const boardInteractive = !state.isGameOver && !(isAiMode && state.turn === aiColor);

  let statusText: string;
  if (state.isGameOver) statusText = t.jogar.gameOver;
  else if (engineError) statusText = t.jogar.engineUnavailable;
  else if (isAiTurn) statusText = t.common.thinking;
  else statusText = turnLabel;
```

5. Replace the JSX's hardcoded strings:

```tsx
      <div className="flex gap-4">
        <Link href="/" className="underline" onClick={handleMenuClick}>
          {t.common.mainMenu}
        </Link>
        <button type="button" onClick={handleRestartClick} className="underline">
          {t.jogar.restart}
        </button>
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
```

(`GameEndModal` itself needs no new props — Task 2 already made it call `useTranslation()` internally.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run components/LearningPanel/LearningPanel.test.tsx`
Expected: PASS (9 tests)

- [ ] **Step 5: Run the full suite and build**

Run: `npm test -- --run && npm run build`
Expected: PASS / clean build (`/jogar` has no dedicated test file, so the build's static-page generation plus the full suite together are this task's only end-to-end check on it).

- [ ] **Step 6: Commit**

```bash
git add app/jogar/page.tsx components/LearningPanel/LearningPanel.tsx components/LearningPanel/LearningPanel.test.tsx
git commit -m "feat(i18n): retrofit /jogar and LearningPanel to useTranslation"
git push origin main
```

---

### Task 7: Retrofit the tutorial hub (`app/aprender/page.tsx`)

**Files:**
- Modify: `app/aprender/page.tsx`
- Modify (test): `app/aprender/page.test.tsx`

**Interfaces:**
- Consumes: `useTranslation()`.

- [ ] **Step 1: Write the failing test**

Append to `app/aprender/page.test.tsx`:

```ts
import { saveSettings, DEFAULT_SETTINGS } from '@/lib/settings/settings';
```

```ts
  it('links each tile to its correct route in English', () => {
    saveSettings({ ...DEFAULT_SETTINGS, language: 'en' });
    render(<AprenderPage />);
    const expected: Record<string, string> = {
      'Pieces and movement': '/aprender/pecas',
      'Special rules': '/aprender/regras-especiais',
      Endgame: '/aprender/fim-de-jogo',
      Strategy: '/aprender/estrategia',
      'Evaluation and move quality': '/aprender/centipawns',
      'Openings and traps': '/aprender/aberturas',
    };
    for (const [title, href] of Object.entries(expected)) {
      expect(screen.getByRole('link', { name: new RegExp(title) })).toHaveAttribute('href', href);
    }
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run app/aprender/page.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Retrofit `app/aprender/page.tsx`**

Replace in full:

```tsx
'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { NavCard } from '@/components/NavCard/NavCard';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function AprenderPage() {
  const { t } = useTranslation();

  const topics = [
    { href: '/aprender/pecas', title: t.aprenderHub.piecesTitle, description: t.aprenderHub.piecesDesc },
    {
      href: '/aprender/regras-especiais',
      title: t.aprenderHub.specialRulesTitle,
      description: t.aprenderHub.specialRulesDesc,
    },
    { href: '/aprender/fim-de-jogo', title: t.aprenderHub.endgameTitle, description: t.aprenderHub.endgameDesc },
    { href: '/aprender/estrategia', title: t.aprenderHub.strategyTitle, description: t.aprenderHub.strategyDesc },
    {
      href: '/aprender/centipawns',
      title: t.aprenderHub.centipawnsTitle,
      description: t.aprenderHub.centipawnsDesc,
    },
    { href: '/aprender/aberturas', title: t.aprenderHub.openingsTitle, description: t.aprenderHub.openingsDesc },
  ];

  return (
    <main className="relative min-h-screen max-w-2xl mx-auto p-8 flex flex-col gap-6 overflow-hidden bg-ink">
      <PageGlow position="fixed" pinkOpacity={0.2} />
      <div>
        <PageHeader>{t.aprenderHub.title}</PageHeader>
        <p className="mt-3">
          <ChipButton color="purple" href="/">
            {t.common.mainMenu}
          </ChipButton>
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {topics.map((topic) => (
          <li key={topic.href}>
            <NavCard href={topic.href} title={topic.title} description={topic.description} />
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run app/aprender/page.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add app/aprender/page.tsx app/aprender/page.test.tsx
git commit -m "feat(i18n): retrofit the tutorial hub to useTranslation"
git push origin main
```

---

### Task 8: Retrofit `pecas`/`regras-especiais`/`fim-de-jogo` pages and `InteractiveDemo`

**Files:**
- Modify: `app/aprender/pecas/page.tsx`, `app/aprender/regras-especiais/page.tsx`, `app/aprender/fim-de-jogo/page.tsx`
- Modify: `components/InteractiveDemo/InteractiveDemo.tsx`
- Modify (test): `components/InteractiveDemo/InteractiveDemo.test.tsx`

**Interfaces:**
- Consumes: `useTranslation()`.

- [ ] **Step 1: Write the failing test**

Append to `components/InteractiveDemo/InteractiveDemo.test.tsx`:

```ts
import { saveSettings, DEFAULT_SETTINGS } from '@/lib/settings/settings';
```

```ts
  it('shows the English reset label when settings.language is "en"', () => {
    saveSettings({ ...DEFAULT_SETTINGS, language: 'en' });
    renderDemo();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/InteractiveDemo/InteractiveDemo.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Retrofit `InteractiveDemo` and the three pages**

In `components/InteractiveDemo/InteractiveDemo.tsx`, add the import and swap the reset button's label:

```tsx
import { useTranslation } from '@/lib/i18n/useTranslation';
```

```tsx
export function InteractiveDemo({ title, description, board: initialBoard, square: initialSquare }: PieceDemo) {
  const { t } = useTranslation();
```

```tsx
        <ChipButton color="pink" onClick={handleReset}>
          {t.interactiveDemo.reset}
        </ChipButton>
```

Replace `app/aprender/pecas/page.tsx` in full:

```tsx
'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';
import { InteractiveDemo, type PieceDemo } from '@/components/InteractiveDemo/InteractiveDemo';
import { MAN_MOVEMENT_DEMO, KING_MOVEMENT_DEMO, PROMOTION_DEMO } from '@/lib/checkers/demoBoards';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function PecasPage() {
  const { t } = useTranslation();

  const demos: PieceDemo[] = [
    { title: t.pecas.manMovement.title, description: t.pecas.manMovement.desc, ...MAN_MOVEMENT_DEMO },
    { title: t.pecas.kingMovement.title, description: t.pecas.kingMovement.desc, ...KING_MOVEMENT_DEMO },
    { title: t.pecas.promotion.title, description: t.pecas.promotion.desc, ...PROMOTION_DEMO },
  ];

  return (
    <main className="relative min-h-screen max-w-3xl mx-auto p-8 flex flex-col gap-8 overflow-hidden bg-ink">
      <PageGlow position="fixed" pinkOpacity={0.2} />
      <div>
        <PageHeader>{t.pecas.title}</PageHeader>
        <p className="mt-3">
          <ChipButton color="purple" href="/aprender">
            {t.common.backToTutorial}
          </ChipButton>
        </p>
      </div>
      {demos.map((demo) => (
        <InteractiveDemo key={demo.title} {...demo} />
      ))}
    </main>
  );
}
```

Replace `app/aprender/regras-especiais/page.tsx` in full:

```tsx
'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';
import { InteractiveDemo, type PieceDemo } from '@/components/InteractiveDemo/InteractiveDemo';
import { MANDATORY_CAPTURE_DEMO, MULTI_JUMP_DEMO } from '@/lib/checkers/demoBoards';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function RegrasEspeciaisPage() {
  const { t } = useTranslation();

  const demos: PieceDemo[] = [
    {
      title: t.regrasEspeciais.mandatoryCapture.title,
      description: t.regrasEspeciais.mandatoryCapture.desc,
      ...MANDATORY_CAPTURE_DEMO,
    },
    { title: t.regrasEspeciais.multiJump.title, description: t.regrasEspeciais.multiJump.desc, ...MULTI_JUMP_DEMO },
  ];

  return (
    <main className="relative min-h-screen max-w-3xl mx-auto p-8 flex flex-col gap-8 overflow-hidden bg-ink">
      <PageGlow position="fixed" pinkOpacity={0.2} />
      <div>
        <PageHeader>{t.regrasEspeciais.title}</PageHeader>
        <p className="mt-3">
          <ChipButton color="purple" href="/aprender">
            {t.common.backToTutorial}
          </ChipButton>
        </p>
      </div>
      {demos.map((demo) => (
        <InteractiveDemo key={demo.title} {...demo} />
      ))}
    </main>
  );
}
```

Replace `app/aprender/fim-de-jogo/page.tsx` in full:

```tsx
'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';
import { InteractiveDemo, type PieceDemo } from '@/components/InteractiveDemo/InteractiveDemo';
import { NO_LEGAL_MOVES_DEMO } from '@/lib/checkers/demoBoards';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function FimDeJogoPage() {
  const { t } = useTranslation();

  const demos: PieceDemo[] = [
    { title: t.fimDeJogo.noLegalMoves.title, description: t.fimDeJogo.noLegalMoves.desc, ...NO_LEGAL_MOVES_DEMO },
  ];

  return (
    <main className="relative min-h-screen max-w-3xl mx-auto p-8 flex flex-col gap-8 overflow-hidden bg-ink">
      <PageGlow position="fixed" pinkOpacity={0.2} />
      <div>
        <PageHeader>{t.fimDeJogo.title}</PageHeader>
        <p className="mt-3">
          <ChipButton color="purple" href="/aprender">
            {t.common.backToTutorial}
          </ChipButton>
        </p>
      </div>
      {demos.map((demo) => (
        <InteractiveDemo key={demo.title} {...demo} />
      ))}

      <section>
        <h2 className="text-xl font-semibold text-cyan">{t.fimDeJogo.drawTitle}</h2>
        <p className="text-lilac/80 mt-1">{t.fimDeJogo.drawText}</p>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run components/InteractiveDemo app/aprender/pecas app/aprender/regras-especiais app/aprender/fim-de-jogo`
Expected: PASS — every pre-existing test in all four files still passes unchanged, plus the new English-locale test.

- [ ] **Step 5: Commit**

```bash
git add app/aprender/pecas/page.tsx app/aprender/regras-especiais/page.tsx app/aprender/fim-de-jogo/page.tsx \
        components/InteractiveDemo/InteractiveDemo.tsx components/InteractiveDemo/InteractiveDemo.test.tsx
git commit -m "feat(i18n): retrofit pecas/regras-especiais/fim-de-jogo and InteractiveDemo"
git push origin main
```

---

### Task 9: Retrofit `estrategia` and `centipawns` pages

**Files:**
- Modify: `app/aprender/estrategia/page.tsx`, `app/aprender/centipawns/page.tsx`

**Interfaces:**
- Consumes: `useTranslation()`; existing `describeMoveQuality(quality, locale)` from `lib/checkers/moveExplanation.ts` (unchanged signature — the call site stops hardcoding `'pt'`).

- [ ] **Step 1: Write the failing tests**

Neither page has a dedicated test file today (confirmed: none exists). Create `app/aprender/estrategia/page.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { saveSettings, DEFAULT_SETTINGS } from '@/lib/settings/settings';
import EstrategiaPage from './page';

describe('EstrategiaPage', () => {
  it('renders all five principles in Portuguese by default', () => {
    render(<EstrategiaPage />);
    expect(screen.getByText('Controla o centro')).toBeInTheDocument();
    expect(screen.getByText('Protege as tuas damas')).toBeInTheDocument();
  });

  it('renders English principles when settings.language is "en"', () => {
    saveSettings({ ...DEFAULT_SETTINGS, language: 'en' });
    render(<EstrategiaPage />);
    expect(screen.getByText('Control the center')).toBeInTheDocument();
    expect(screen.getByText('Protect your kings')).toBeInTheDocument();
  });
});
```

Create `app/aprender/centipawns/page.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { saveSettings, DEFAULT_SETTINGS } from '@/lib/settings/settings';
import CentipawnsPage from './page';

describe('CentipawnsPage', () => {
  it('renders the three quality badges in Portuguese by default', () => {
    render(<CentipawnsPage />);
    expect(screen.getByText('Boa jogada!')).toBeInTheDocument();
    expect(screen.getByText('Imprecisão.')).toBeInTheDocument();
    expect(screen.getByText('Erro.')).toBeInTheDocument();
  });

  it('renders English quality badges when settings.language is "en"', () => {
    saveSettings({ ...DEFAULT_SETTINGS, language: 'en' });
    render(<CentipawnsPage />);
    expect(screen.getByText('Good move!')).toBeInTheDocument();
    expect(screen.getByText('Inaccuracy.')).toBeInTheDocument();
    expect(screen.getByText('Mistake.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run app/aprender/estrategia app/aprender/centipawns`
Expected: FAIL (files don't exist yet as importable pages producing this output — both pages currently hardcode Portuguese regardless of locale).

- [ ] **Step 3: Retrofit both pages**

Replace `app/aprender/estrategia/page.tsx` in full:

```tsx
'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function EstrategiaPage() {
  const { t } = useTranslation();

  return (
    <main className="relative min-h-screen max-w-2xl mx-auto p-8 flex flex-col gap-6 overflow-hidden bg-ink">
      <PageGlow position="fixed" pinkOpacity={0.2} />
      <div>
        <PageHeader>{t.estrategia.title}</PageHeader>
        <p className="mt-3">
          <ChipButton color="purple" href="/aprender">
            {t.common.backToTutorial}
          </ChipButton>
        </p>
      </div>
      <ul className="flex flex-col gap-4">
        {t.estrategia.principles.map((principle) => (
          <li key={principle.title} className="rounded-xl border-2 border-purple/40 bg-ink-soft p-4">
            <p className="font-semibold text-white">{principle.title}</p>
            <p className="text-lilac/80 mt-1">{principle.text}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

Replace `app/aprender/centipawns/page.tsx` in full:

```tsx
'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';
import { describeMoveQuality } from '@/lib/checkers/moveExplanation';
import type { MoveQuality } from '@/lib/checkers/moveClassification';
import { useTranslation } from '@/lib/i18n/useTranslation';

// Same color family as Toast.tsx's TONE_ACCENT (emerald/amber/red) -- a
// reader who sees a move-quality toast during a game should recognize
// the same colors here.
const QUALITY_BADGE_CLASS: Record<MoveQuality, string> = {
  boa: 'bg-emerald-900/60 text-emerald-200',
  imprecisao: 'bg-amber-900/60 text-amber-200',
  erro: 'bg-red-900/60 text-red-200',
};

const QUALITY_LEVELS: MoveQuality[] = ['boa', 'imprecisao', 'erro'];

export default function CentipawnsPage() {
  const { t, locale } = useTranslation();

  const concepts = [t.centipawnsPage.positionEvaluation, t.centipawnsPage.evalLoss];

  return (
    <main className="relative min-h-screen max-w-2xl mx-auto p-8 flex flex-col gap-6 overflow-hidden bg-ink">
      <PageGlow position="fixed" pinkOpacity={0.2} />
      <div>
        <PageHeader>{t.centipawnsPage.title}</PageHeader>
        <p className="mt-3">
          <ChipButton color="purple" href="/aprender">
            {t.common.backToTutorial}
          </ChipButton>
        </p>
      </div>
      <ul className="flex flex-col gap-4">
        {concepts.map((concept) => (
          <li key={concept.title} className="rounded-xl border-2 border-purple/40 bg-ink-soft p-4">
            <p className="font-semibold text-white">{concept.title}</p>
            <p className="text-lilac/80 mt-1">{concept.text}</p>
          </li>
        ))}
      </ul>
      <div>
        <p className="font-semibold text-white mb-3">{t.centipawnsPage.levelsHeading}</p>
        <ul className="flex flex-col gap-3">
          {QUALITY_LEVELS.map((level) => (
            <li key={level} className="rounded-xl border-2 border-purple/40 bg-ink-soft p-4 flex flex-col gap-2">
              <span className={`self-start rounded-full px-3 py-1 text-sm font-semibold ${QUALITY_BADGE_CLASS[level]}`}>
                {describeMoveQuality(level, locale)}
              </span>
              <p className="text-lilac/80">{t.centipawnsPage.qualityTexts[level]}</p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run app/aprender/estrategia app/aprender/centipawns`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add app/aprender/estrategia/page.tsx app/aprender/estrategia/page.test.tsx \
        app/aprender/centipawns/page.tsx app/aprender/centipawns/page.test.tsx
git commit -m "feat(i18n): retrofit estrategia and centipawns pages to useTranslation"
git push origin main
```

---

### Task 10: Retrofit the openings/traps trainer

**Files:**
- Modify: `components/LineTabs/LineTabs.tsx`
- Modify: `components/OpeningPageHeader/OpeningPageHeader.tsx`
- Modify: `components/OpeningStudy/OpeningStudy.tsx`
- Modify: `components/OpeningPractice/OpeningPractice.tsx`
- Modify: `app/aprender/aberturas/page.tsx`
- Modify (test): `components/OpeningStudy/OpeningStudy.test.tsx`, `components/OpeningPractice/OpeningPractice.test.tsx`
- Create (test): `components/OpeningPageHeader/OpeningPageHeader.test.tsx`, `app/aprender/aberturas/page.test.tsx`

**Interfaces:**
- Consumes: `useTranslation()`.
- Produces: `LineTabs` gains a required `tablistLabel: string` prop (its `aria-label` was hardcoded PT before; it stays a "generic component fed strings by its caller", the same pattern `ToggleGroup`'s `legend` and `OptionPicker`'s `legend` already use, rather than calling `useTranslation()` itself). Both consumers (`OpeningStudy`, `OpeningPractice`) pass it.

- [ ] **Step 1: Write the failing tests**

Append to `components/OpeningStudy/OpeningStudy.test.tsx`:

```ts
import { saveSettings, DEFAULT_SETTINGS } from '@/lib/settings/settings';
```

```ts
  it('renders English text when settings.language is "en"', () => {
    saveSettings({ ...DEFAULT_SETTINGS, language: 'en' });
    render(<OpeningStudy opening={oldFourteenth} />);
    expect(screen.getByText(/Starting position/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  });
```

Append to `components/OpeningPractice/OpeningPractice.test.tsx`:

```ts
import { saveSettings, DEFAULT_SETTINGS } from '@/lib/settings/settings';
```

```ts
  it('renders English text when settings.language is "en"', () => {
    saveSettings({ ...DEFAULT_SETTINGS, language: 'en' });
    render(<OpeningPractice opening={oldFourteenth} />);
    expect(screen.getByText("Your turn: find the line's move.")).toBeInTheDocument();
  });
```

Neither `OpeningPageHeader` nor the openings hub page (`app/aprender/aberturas/page.tsx`) has a test file today, and neither is exercised by `OpeningStudy.test.tsx`/`OpeningPractice.test.tsx` (those only render the study/practice widgets, not the page header or the hub list) — without dedicated tests, this task's own locale-switching in those two files would ship completely unverified, which is exactly the risk this plan's Global Constraints call out. Create `components/OpeningPageHeader/OpeningPageHeader.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { saveSettings, DEFAULT_SETTINGS } from '@/lib/settings/settings';
import { OpeningPageHeader } from './OpeningPageHeader';
import { OPENINGS } from '@/lib/openings/data';

const oldFourteenth = OPENINGS.find((o) => o.id === 'old-fourteenth')!;

describe('OpeningPageHeader', () => {
  it('renders the opening name and study-mode links in Portuguese by default', () => {
    render(<OpeningPageHeader opening={oldFourteenth} variant="study" />);
    expect(screen.getByRole('heading', { name: 'Old Fourteenth' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar às aberturas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Praticar esta abertura' })).toBeInTheDocument();
  });

  it('prefixes the title with "Praticar: " in practice mode', () => {
    render(<OpeningPageHeader opening={oldFourteenth} variant="practice" />);
    expect(screen.getByRole('heading', { name: 'Praticar: Old Fourteenth' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar ao estudo' })).toBeInTheDocument();
  });

  it('renders English text when settings.language is "en"', () => {
    saveSettings({ ...DEFAULT_SETTINGS, language: 'en' });
    render(<OpeningPageHeader opening={oldFourteenth} variant="practice" />);
    // "Old Fourteenth" is an established loanword (name.pt === name.en, see
    // lib/openings/data.ts) -- the prefix and the other links are what
    // actually prove the English dictionary is being read.
    expect(screen.getByRole('heading', { name: 'Practice: Old Fourteenth' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to study' })).toBeInTheDocument();
  });
});
```

Create `app/aprender/aberturas/page.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { saveSettings, DEFAULT_SETTINGS } from '@/lib/settings/settings';
import AberturasPage from './page';

describe('AberturasPage', () => {
  it('renders the hub title and every opening tile in Portuguese by default', () => {
    render(<AberturasPage />);
    expect(screen.getByRole('heading', { name: 'Aberturas e armadilhas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Old Fourteenth/ })).toHaveAttribute(
      'href',
      '/aprender/aberturas/old-fourteenth'
    );
  });

  it('renders the disclaimer and hub link back to the tutorial in English when settings.language is "en"', () => {
    saveSettings({ ...DEFAULT_SETTINGS, language: 'en' });
    render(<AberturasPage />);
    expect(screen.getByText(/informational, not verified by a checkers federation/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to tutorial' })).toHaveAttribute('href', '/aprender');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run components/OpeningStudy components/OpeningPractice components/OpeningPageHeader app/aprender/aberturas/page.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Retrofit `LineTabs`, `OpeningPageHeader`, `OpeningStudy`, `OpeningPractice`, and the openings hub**

In `components/LineTabs/LineTabs.tsx`, add a `tablistLabel` prop and use it instead of the hardcoded string:

```tsx
export function LineTabs({
  lines,
  activeIndex,
  onSelect,
  tablistLabel,
  children,
}: {
  lines: { name: string }[];
  activeIndex: number;
  onSelect: (index: number) => void;
  tablistLabel: string;
  children: ReactNode;
}) {
```

```tsx
      <div className="flex flex-wrap gap-2 justify-start" role="tablist" aria-label={tablistLabel}>
```

Replace `components/OpeningPageHeader/OpeningPageHeader.tsx` in full:

```tsx
'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { PageHeader } from '@/components/PageChrome/PageChrome';
import type { Opening } from '@/lib/openings/types';
import { useTranslation } from '@/lib/i18n/useTranslation';

export function OpeningPageHeader({ opening, variant }: { opening: Opening; variant: 'study' | 'practice' }) {
  const { t, locale } = useTranslation();
  const name = opening.name[locale];
  const title = variant === 'practice' ? t.openings.practiceTitle(name) : name;

  return (
    <div>
      <PageHeader>{title}</PageHeader>
      {variant === 'study' ? (
        <>
          <p className="mt-2 text-lilac/80">{opening.description[locale]}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <ChipButton color="purple" href="/aprender/aberturas">
              {t.openings.backToOpenings}
            </ChipButton>
            <ChipButton color="gold" href={`/aprender/aberturas/${opening.id}/praticar`}>
              {t.openings.practiceThisOpening}
            </ChipButton>
          </div>
        </>
      ) : (
        <p className="mt-3">
          <ChipButton color="purple" href={`/aprender/aberturas/${opening.id}`}>
            {t.openings.backToStudy}
          </ChipButton>
        </p>
      )}
    </div>
  );
}
```

Replace `components/OpeningStudy/OpeningStudy.tsx` in full:

```tsx
'use client';

import { useMemo, useRef, useState } from 'react';
import { createInitialBoard } from '@/lib/checkers/board';
import { CheckersBoard } from '@/components/CheckersBoard/CheckersBoard';
import { ChipButton } from '@/components/ChipButton/ChipButton';
import { LineTabs } from '@/components/LineTabs/LineTabs';
import { replayLine, type ReplayedMove } from '@/lib/openings/replayLine';
import type { Opening } from '@/lib/openings/types';
import { useTranslation } from '@/lib/i18n/useTranslation';

const START_BOARD = createInitialBoard();

/** "1. " for black's move, "1..." for white's reply -- checkers' lines
 * always start with black (see lib/checkers/board.ts). */
function moveLabel(stepIndex: number): string {
  const fullmove = Math.ceil(stepIndex / 2);
  return stepIndex % 2 === 1 ? `${fullmove}. ` : `${fullmove}...`;
}

export function OpeningStudy({ opening }: { opening: Opening }) {
  const { t, locale } = useTranslation();
  const tabLines = useMemo(() => opening.lines.map((line) => ({ name: line.name[locale] })), [opening, locale]);
  const replayedLines = useMemo(() => opening.lines.map((line) => replayLine(line)), [opening]);
  const [lineIndex, setLineIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  const replayed = replayedLines[lineIndex];
  const current: ReplayedMove | null = stepIndex === 0 ? null : replayed[stepIndex - 1];
  const board = current?.board ?? START_BOARD;
  const turn = stepIndex % 2 === 0 ? 'b' : 'w';
  const lastMove = current?.move ?? null;
  const prevButtonRef = useRef<HTMLButtonElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  function selectLine(index: number) {
    setLineIndex(index);
    setStepIndex(0);
  }

  // A focused native <button disabled> loses focus to <body> the instant
  // it becomes disabled -- trying to catch that afterward in an effect
  // loses the race. Instead, move focus to the still-enabled sibling
  // BEFORE React disables the clicked one.
  function goToStep(next: number) {
    if (next === 0) nextButtonRef.current?.focus();
    else if (next === replayed.length) prevButtonRef.current?.focus();
    setStepIndex(next);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <LineTabs lines={tabLines} activeIndex={lineIndex} onSelect={selectLine} tablistLabel={t.openings.linesTablistLabel}>
        <div className="w-[min(98vw,62dvh,560px)] sm:w-[min(92vw,62dvh,560px)] flex flex-col items-center gap-3">
          <CheckersBoard
            board={board}
            turn={turn}
            selectedSquare={null}
            legalTargets={[]}
            mandatoryCaptureSquares={[]}
            lastMove={lastMove}
            interactive={false}
          />

          <div className="flex items-center gap-3">
            <ChipButton
              ref={prevButtonRef}
              color="pink"
              onClick={() => goToStep(Math.max(0, stepIndex - 1))}
              disabled={stepIndex === 0}
            >
              {t.openings.previous}
            </ChipButton>
            <span className="text-sm text-lilac/80">
              {stepIndex} / {replayed.length}
            </span>
            <ChipButton
              ref={nextButtonRef}
              color="cyan"
              onClick={() => goToStep(Math.min(replayed.length, stepIndex + 1))}
              disabled={stepIndex === replayed.length}
            >
              {t.openings.next}
            </ChipButton>
          </div>

          <div className="w-full rounded-xl border-2 border-purple/40 bg-ink-soft p-4 text-center" aria-live="polite">
            {current ? (
              <>
                <p className="font-semibold text-cyan">
                  {moveLabel(stepIndex)}{current.notation}
                </p>
                <p className="text-lilac/80 mt-1">{current.explanation[locale]}</p>
              </>
            ) : (
              <p className="text-lilac/80">{t.openings.startPosition}</p>
            )}
          </div>
        </div>
      </LineTabs>
    </div>
  );
}
```

Replace `components/OpeningPractice/OpeningPractice.tsx` in full:

```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { createInitialBoard } from '@/lib/checkers/board';
import { legalMovesFrom } from '@/lib/checkers/moveGeneration';
import { CheckersBoard } from '@/components/CheckersBoard/CheckersBoard';
import { ChipButton } from '@/components/ChipButton/ChipButton';
import { LineTabs } from '@/components/LineTabs/LineTabs';
import { replayLine } from '@/lib/openings/replayLine';
import type { Square } from '@/lib/checkers/types';
import type { Opening } from '@/lib/openings/types';
import { useTranslation } from '@/lib/i18n/useTranslation';

const START_BOARD = createInitialBoard();
const OPPONENT_MOVE_DELAY_MS = 500;

export function OpeningPractice({ opening }: { opening: Opening }) {
  const { t, locale } = useTranslation();
  const tabLines = useMemo(() => opening.lines.map((line) => ({ name: line.name[locale] })), [opening, locale]);
  const replayedLines = useMemo(() => opening.lines.map((line) => replayLine(line)), [opening]);

  const [lineIndex, setLineIndex] = useState(0);
  const [plyIndex, setPlyIndex] = useState(0);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [wrongAttempt, setWrongAttempt] = useState(false);

  const replayed = replayedLines[lineIndex];
  const board = plyIndex === 0 ? START_BOARD : replayed[plyIndex - 1].board;
  const lastMove = plyIndex === 0 ? null : replayed[plyIndex - 1].move;
  const completed = plyIndex === replayed.length;
  const nextMoverColor = plyIndex % 2 === 0 ? 'b' : 'w';
  const isUserTurn = !completed && nextMoverColor === 'b';
  const legalTargets = selectedSquare ? legalMovesFrom(board, 'b', selectedSquare).map((m) => m.to) : [];
  const expected = completed ? null : replayed[plyIndex];

  function selectLine(index: number) {
    setLineIndex(index);
    setPlyIndex(0);
    setSelectedSquare(null);
    setWrongAttempt(false);
  }

  function restartLine() {
    setPlyIndex(0);
    setSelectedSquare(null);
    setWrongAttempt(false);
  }

  // The opponent always plays the line's own move automatically.
  // `lineIndex` is in the deps even though unread in the body: without
  // it, switching lines WHILE this timer is already counting (same
  // plyIndex/isUserTurn/completed before and after, e.g. 0->0 right at
  // the start) wouldn't restart the timer -- the new line's opponent
  // move would fire earlier than the promised OPPONENT_MOVE_DELAY_MS.
  useEffect(() => {
    if (completed || isUserTurn) return;
    const timer = setTimeout(() => {
      setPlyIndex((p) => p + 1);
    }, OPPONENT_MOVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [completed, isUserTurn, plyIndex, lineIndex]);

  function handleSquareClick(square: Square) {
    if (!isUserTurn || !expected) return;

    if (selectedSquare && legalTargets.includes(square)) {
      if (square === expected.move.to && selectedSquare === expected.move.from) {
        setPlyIndex((p) => p + 1);
        setWrongAttempt(false);
      } else {
        setWrongAttempt(true);
      }
      setSelectedSquare(null);
      return;
    }
    // Doesn't clear wrongAttempt here -- only when a move is actually
    // played (right, or a fresh wrong one), never by reselecting a
    // square. Same pattern as app/jogar/page.tsx: picking the suggested
    // piece (the natural first step to play it) can't erase the hint
    // before the destination is clicked.
    setSelectedSquare(square);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <LineTabs lines={tabLines} activeIndex={lineIndex} onSelect={selectLine} tablistLabel={t.openings.linesTablistLabel}>
        <div className="w-[min(98vw,62dvh,560px)] sm:w-[min(92vw,62dvh,560px)] flex flex-col items-center gap-3">
          <CheckersBoard
            board={board}
            turn={nextMoverColor}
            selectedSquare={selectedSquare}
            legalTargets={legalTargets}
            mandatoryCaptureSquares={[]}
            lastMove={lastMove}
            suggestedMove={wrongAttempt && expected ? expected.move : null}
            interactive={isUserTurn}
            onSquareClick={handleSquareClick}
          />

          {completed ? (
            <div className="w-full rounded-xl border-2 border-gold bg-ink-soft p-4 text-center flex flex-col gap-3" aria-live="polite">
              <p className="font-semibold text-gold">{t.openings.lineComplete}</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <ChipButton color="pink" onClick={restartLine}>
                  {t.openings.practiceAgain}
                </ChipButton>
                <ChipButton color="purple" href="/aprender/aberturas">
                  {t.openings.backToOpenings}
                </ChipButton>
              </div>
            </div>
          ) : (
            <div className="w-full rounded-xl border-2 border-purple/40 bg-ink-soft p-4 text-center" aria-live="polite">
              {isUserTurn ? (
                wrongAttempt ? (
                  <p className="text-lilac/80">{t.openings.wrongMove(expected!.notation)}</p>
                ) : (
                  <p className="text-lilac/80">{t.openings.yourTurn}</p>
                )
              ) : (
                <p className="text-lilac/80">{t.common.thinking}</p>
              )}
            </div>
          )}
        </div>
      </LineTabs>
    </div>
  );
}
```

Replace `app/aprender/aberturas/page.tsx` in full:

```tsx
'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { NavCard } from '@/components/NavCard/NavCard';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';
import { OPENINGS } from '@/lib/openings/data';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function AberturasPage() {
  const { t, locale } = useTranslation();

  return (
    <main className="relative min-h-screen max-w-2xl mx-auto p-8 flex flex-col gap-6 overflow-hidden bg-ink">
      <PageGlow position="fixed" pinkOpacity={0.2} />
      <div>
        <PageHeader>{t.openings.hubTitle}</PageHeader>
        <p className="mt-3">
          <ChipButton color="purple" href="/aprender">
            {t.common.backToTutorial}
          </ChipButton>
        </p>
        <p className="text-sm text-lilac/60 mt-3">{t.openings.disclaimer}</p>
      </div>
      <ul className="flex flex-col gap-3">
        {OPENINGS.map((opening) => (
          <li key={opening.id}>
            <NavCard
              href={`/aprender/aberturas/${opening.id}`}
              title={opening.name[locale]}
              description={opening.description[locale]}
              meta={opening.lines.map((line) => line.name[locale]).join(' · ')}
            />
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run components/OpeningStudy components/OpeningPractice components/OpeningPageHeader app/aprender/aberturas/page.test.tsx`
Expected: PASS — every pre-existing test in `OpeningStudy.test.tsx`/`OpeningPractice.test.tsx` still passes unchanged, plus the 2 new English-locale tests there and the 5 new tests in the 2 newly-created files.

- [ ] **Step 5: Run the full suite and build (`LineTabs`'s new required prop touches two consumers)**

Run: `npm test -- --run && npm run build`
Expected: PASS / clean build.

- [ ] **Step 6: Commit**

```bash
git add components/LineTabs/LineTabs.tsx \
        components/OpeningPageHeader/OpeningPageHeader.tsx components/OpeningPageHeader/OpeningPageHeader.test.tsx \
        components/OpeningStudy/OpeningStudy.tsx components/OpeningStudy/OpeningStudy.test.tsx \
        components/OpeningPractice/OpeningPractice.tsx components/OpeningPractice/OpeningPractice.test.tsx \
        app/aprender/aberturas/page.tsx app/aprender/aberturas/page.test.tsx
git commit -m "feat(i18n): retrofit the openings/traps trainer to useTranslation"
git push origin main
```

---

### Task 11: Full-suite verification and CLAUDE.md close-out

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:** none (documentation only).

- [ ] **Step 1: Run the full test suite and production build**

Run: `npm test -- --run && npm run build`
Expected: PASS (test count = the pre-Plan-8b count plus every new test added across Tasks 1-10) / clean build.

- [ ] **Step 2: Manual spot-check — switch language in the browser**

Run `npm run dev`, open `/opcoes`, click "English", and click through `/`, `/configurar`, `/jogar?mode=local`, `/aprender` and two or three of its subpages, `/aprender/aberturas/old-fourteenth`, and `/aprender/aberturas/old-fourteenth/praticar` confirming every page now renders in English and that switching back to "Português" on `/opcoes` restores the original text everywhere. This is the one check no unit test can substitute for: confirming there is no page left rendering a stray hardcoded Portuguese string alongside newly-translated ones.

- [ ] **Step 3: Update CLAUDE.md**

Add a `## Conventions` entry (place after the existing "Four dictionary values are identical by design" entry, before "`lib/settings/useSettings.test.ts` stubs..."):

```markdown
### Phase 8b: every page/component now calls `useTranslation()` -- the dictionary is fully wired in

`Settings.language` (built in Plan 8a, previously inert) now has a real, visible effect: every
page and component that rendered hardcoded Portuguese now reads `t.foo.bar` from
`useTranslation()` instead, and `/opcoes` gained a real language toggle (`ToggleGroup` over
`t.opcoes.portuguese`/`t.opcoes.english`, writing `settings.language`). Two deliberate exceptions
to the "component calls the hook directly" pattern:

- `lib/checkers/gameEndMessage.ts`'s `describeGameEnd` takes an explicit `locale: Locale`
  parameter instead of calling the hook itself (it isn't a component) -- its one caller,
  `GameEndModal`, already has `locale` from its own `useTranslation()` call and passes it
  through. `describeGameEnd` now reads `DICTIONARIES[locale].gameEndMessage` directly rather
  than owning its own bilingual text, since Plan 8a authored those exact keys for this exact
  consumer.
- `components/LineTabs/LineTabs.tsx` takes a `tablistLabel: string` prop rather than calling
  the hook -- matching the pre-existing pattern of `ToggleGroup`'s `legend`/`OptionPicker`'s
  `legend`: a generic, reusable UI primitive stays decoupled from i18n and is fed its strings
  by the caller.

Two gaps stay deliberately unfixed, not overlooked -- there is no correct locale to read for
either without new infrastructure this plan doesn't build:

- `app/layout.tsx`'s `metadata.description` and `<html lang="pt-PT">` stay hardcoded Portuguese.
  This app has no backend, no cookies, and no locale-prefixed routing -- `Settings.language`
  lives only in `localStorage`, which a Server Component (or build-time `metadata` export) has
  no access to. Fixing this for real means locale-prefixed routes or a synced cookie, which is
  its own future project, not a retrofit task.
- `components/CheckersBoard/CheckersBoard.tsx`'s `aria-label={`square ${square}`}` stays English
  in both locales -- a board-coordinate identifier for assistive tech, not prose, and
  `CheckersBoard` is deliberately kept fully game/locale-agnostic ("dumb") elsewhere. Translating
  it would mean threading `locale` into the one component this project has consistently kept
  free of exactly that kind of dependency.

`lib/settings/themes.ts`'s `BOARD_THEMES`/`BACKGROUND_THEMES` registries dropped their
`label: string` fields as part of this phase -- display labels for board/background themes now
live in the dictionary (`Dictionary.boardThemeLabel`/`backgroundThemeLabel`), so the registry
is asset-paths-only and never needs a locale. `sakura` and `dojo` join `pieceStyleLabel.anime`
as established-loanword `SAME_BY_DESIGN` exceptions in `dictionaries.test.ts` -- `Néon`/`Neon`,
`Templo`/`Temple`, and `Cósmico`/`Cosmic` all get real translations, so only those two theme
names stay identical across locales.
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: close out i18n UI retrofit phase in CLAUDE.md"
git push origin main
```

---

## Self-Review Notes

- **Spec coverage:** Design spec §7 (i18n) is fully implemented across Plans 8a+8b — dictionary mechanism (8a) plus every page/component now consuming it (8b, this plan). §5's `moveExplanation.ts`/`gameEndMessage.ts` bilingual call-out is satisfied (Task 1 for the latter; Task 6 wires the former's existing `locale` parameter to the real UI toggle instead of a hardcoded `'pt'`).
- **Placeholder scan:** no "TBD"/"handle it later"/unshown code — every task's Steps 1 and 3 contain complete, real file contents or precise diffs, not descriptions of changes.
- **Type consistency:** `useTranslation()`'s `{ t, locale }` shape, `Dictionary`'s key paths, `Opening.name`/`description: Record<Locale, string>`, and `describeGameEnd`'s new 5th parameter are used identically across every task that touches them — cross-checked against Plan 8a's actual shipped `lib/i18n/dictionaries/types.ts` (read in full while writing this plan, not assumed).
- **Pre-flight risk already resolved during planning, not left for a mid-execution surprise:** every test file in the repo whose own `beforeEach` calls `window.localStorage.clear()` was enumerated by grep before writing Tasks 3 and 5 — exactly two were exposed to the language-auto-detection trap beyond the two Plan 8a already fixed, and both get the identical fix as part of their task.
