# Toast/Modal UI Chrome Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the game-agnostic Toast/Modal UI chrome (`Toast`, `ToastProvider`,
`ConfirmModal`, `GameEndModal`, `RulesModal`, `useFocusTrap`) this project needs
before Learning Mode (Phase 4b) can use a toast for move-quality feedback, and
wire the two pieces `/jogar` already needs today — a real end-of-game modal
(replacing the current plain-text status line) and a confirmation prompt before
"Reiniciar partida"/"Menu inicial" discard an in-progress game.

**Architecture:** Ported from Chess Sensei's equivalent components
(`components/Toast/`, `components/ConfirmModal/`, `components/GameEndModal/`,
`components/RulesModal/`, `lib/ui/useFocusTrap.ts`), which the design spec (§5)
calls out as reusable "verbatim" in *shape* — but their actual chess
implementations pull in chrome this repo doesn't have yet (`PageChrome`'s
`PageTitle`/`MODAL_BACKDROP_CLASS`, `ChipButton`, `useTranslation`/i18n
dictionaries) and, for `GameEndModal` specifically, mascot illustration assets
and a confetti animation that don't exist here either. This plan ports the
*behavioral* shape (backdrop, `role="dialog"`, Escape-to-close, focus trap,
open/close callbacks) with plain Tailwind and hardcoded Portuguese strings —
matching `/jogar`'s and `/configurar`'s already-established style from the
previous two phases — and defers the mascot/confetti/chrome/i18n integration to
their respective later phases (10, 5, 8). `useFocusTrap` itself has zero chrome/
i18n dependency and ports unchanged.

**Tech Stack:** Same as the previous plans — Next.js 16.3.1 (Turbopack), React
19.2.8, Tailwind v4, TypeScript strict, Vitest + jsdom + Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-31-checkers-sensei-design.md` — this
plan implements the "Toasts/modals" subsection of §5 (`Toast`/`ToastProvider`/
`GameEndModal`/`ConfirmModal`/`RulesModal` shells, `describeGameEnd`'s
status→message mapping for checkers' `GameStatus`, dropping the `'check'` toast
tone with no checkers analog) plus the `RulesModal` content list given there
(man/king movement, mandatory capture, multi-jump, promotion, draw conditions).
It does **not** implement the "Learning mode"/`LearningPanel`/move-suggestion/
move-quality-toast/`moveExplanation.ts` parts of §5 — that's the next plan
(Phase 4b), which will be the first actual *consumer* of the `Toast` this plan
builds.

## Global Constraints

- No worktrees, no feature branches — every task commits directly to `main`,
  pushed immediately after (`git push origin main`).
- TypeScript strict mode; every task must typecheck and lint clean before commit.
- **No Chess Sensei chrome/i18n imports.** `PageChrome`, `ChipButton`,
  `useTranslation`, i18n dictionaries do not exist in this repo (Phase 5/8) and
  must not be imported. Plain Tailwind, hardcoded Portuguese strings, matching
  `/jogar`'s and `/configurar`'s existing style (see `app/jogar/page.tsx`,
  `app/configurar/page.tsx` from the previous two plans for the established
  voice/formatting).
- **No mascot images, no confetti.** Chess Sensei's `GameEndModal` shows a
  per-outcome mascot illustration (`public/gameend/*.webp`, none of which exist
  here) and a confetti burst on a win (custom `animate-confetti-pop` keyframe,
  not defined in this repo's `globals.css`). Both are explicitly deferred to
  Phase 10 (new visual assets) — this plan's `GameEndModal` is text/button
  only. Do not add placeholder images or a placeholder animation "for now."
- **Drop the `'check'` toast tone.** Chess's `ToastTone` includes `'check'`,
  which blocks board interaction until manually dismissed (no auto-dismiss
  timer) — chess-specific, no checkers analog per spec §4 (illegal moves are
  simply never offered, nothing to react to). This plan's `ToastTone` is
  `'info' | MoveQuality` only (`MoveQuality` from
  `lib/checkers/moveClassification.ts`, already built in Phase 3 — `'boa' |
  'imprecisao' | 'erro'`). All tones auto-dismiss.
- `useFocusTrap` moves focus into the modal panel on open (not to the first
  button inside it — avoids accidentally landing on a "Fechar"/close action
  where a stray Enter would immediately re-close the modal), traps Tab/
  Shift+Tab cycling within the panel's focusable elements, and restores focus
  to whatever was focused before the modal opened, when it closes.
- Backdrop click and Escape both count as "cancel"/"close", same as the
  explicit close button/cancel button.
- Board sizing/animation/CheckersBoard/useCheckersGame are untouched by this
  plan except for the small `/jogar` integration in the final task — this plan
  is additive UI chrome, not a rules-engine or board change.

---

### Task 1: `lib/ui/useFocusTrap.ts` — focus-trap hook

**Files:**
- Create: `lib/ui/useFocusTrap.ts`
- Test: `lib/ui/useFocusTrap.test.tsx`

**Interfaces:**
- Consumes: nothing (self-contained, no chrome/i18n dependency).
- Produces: `useFocusTrap(open: boolean): RefObject<HTMLDivElement | null>` —
  consumed by Task 3 (`ConfirmModal`), Task 5 (`GameEndModal`), Task 6
  (`RulesModal`).

Ported unchanged from Chess Sensei's `lib/ui/useFocusTrap.ts` (verified
verbatim-portable: no i18n/chrome imports).

- [ ] **Step 1: Write the failing test**

```tsx
// lib/ui/useFocusTrap.test.tsx
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { useFocusTrap } from './useFocusTrap';

function TestModal({ open }: { open: boolean }) {
  const panelRef = useFocusTrap(open);
  if (!open) return null;
  return (
    <div ref={panelRef} tabIndex={-1} data-testid="panel">
      <button type="button">First</button>
      <button type="button">Last</button>
    </div>
  );
}

describe('useFocusTrap', () => {
  it('moves focus to the panel itself when it opens', () => {
    const { getByTestId } = render(<TestModal open={true} />);
    expect(document.activeElement).toBe(getByTestId('panel'));
  });

  it('cycles Tab from the last focusable element back to the first', () => {
    const { getByText } = render(<TestModal open={true} />);
    const first = getByText('First');
    const last = getByText('Last');
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
  });

  it('cycles Shift+Tab from the first focusable element to the last', () => {
    const { getByText } = render(<TestModal open={true} />);
    const first = getByText('First');
    const last = getByText('Last');
    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('restores focus to the previously-focused element when it closes', () => {
    const outsideButton = document.createElement('button');
    document.body.appendChild(outsideButton);
    outsideButton.focus();

    const { rerender } = render(<TestModal open={false} />);
    rerender(<TestModal open={true} />);
    rerender(<TestModal open={false} />);

    expect(document.activeElement).toBe(outsideButton);
    document.body.removeChild(outsideButton);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/ui/useFocusTrap.test.tsx`
Expected: FAIL — `Cannot find module './useFocusTrap'`.

- [ ] **Step 3: Write `lib/ui/useFocusTrap.ts`**

```ts
import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Traps focus inside a modal panel while it's open. Used by ConfirmModal,
// GameEndModal, and RulesModal.
//
// On open: moves focus to the panel itself (not the first button inside it
// -- avoids landing on an action like "Fechar" where a stray Enter would
// immediately close the modal). Tab/Shift+Tab then cycle only through the
// panel's own focusable elements. On close: returns focus to whatever was
// focused before the modal opened.
//
// Does not set `inert`/`aria-hidden` on the rest of the page -- none of the
// consuming modals render via a portal, so "the rest of the page" has no
// single simple root to mark from here; out of scope for this plan.
export function useFocusTrap(open: boolean) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open]);

  return panelRef;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/ui/useFocusTrap.test.tsx`
Expected: PASS, all 4 tests.

- [ ] **Step 5: Typecheck, lint, commit and push**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

```bash
git add lib/ui/useFocusTrap.ts lib/ui/useFocusTrap.test.tsx
git commit -m "feat(ui): useFocusTrap -- modal focus trapping, ported from Chess Sensei

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

### Task 2: `components/Toast/Toast.tsx` + `components/Toast/ToastProvider.tsx`

**Files:**
- Create: `components/Toast/Toast.tsx`
- Create: `components/Toast/ToastProvider.tsx`
- Test: `components/Toast/Toast.test.tsx`
- Test: `components/Toast/ToastProvider.test.tsx`

**Interfaces:**
- Consumes: `MoveQuality` from `@/lib/checkers/moveClassification` (already
  built, Phase 3).
- Produces: `ToastTone` (`'info' | MoveQuality`), `ToastState`
  (`{id: number; message: string; tone: ToastTone}`), `Toast` component,
  `ToastProvider` component, `useToast(): {toast, show, dismiss}` — `show`
  consumed by Phase 4b (move-quality toast) and by any future page wanting a
  toast; `ToastProvider` consumed by Task 7 (wired into `app/layout.tsx`).

Per Global Constraints: no `'check'` tone (dropped, no checkers analog — every
tone here auto-dismisses, there is no "blocks the board" tone). Plain Tailwind
(no `ink`/`lilac`/`purple`/`cyan`/`pink` theme tokens — those don't exist in
this repo's `globals.css` yet), hardcoded Portuguese "Fechar" for the close
button's `aria-label` (no `useTranslation`).

- [ ] **Step 1: Write the failing tests**

```tsx
// components/Toast/Toast.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toast } from './Toast';

describe('Toast', () => {
  it('renders nothing visible when toast is null', () => {
    render(<Toast toast={null} onDismiss={() => {}} />);
    expect(screen.queryByTestId('toast-card')).toBeNull();
  });

  it('renders the message when a toast is given', () => {
    render(<Toast toast={{ id: 1, message: 'Boa jogada!', tone: 'boa' }} onDismiss={() => {}} />);
    expect(screen.getByText('Boa jogada!')).not.toBeNull();
  });

  it('calls onDismiss when the close button is clicked', () => {
    const onDismiss = vi.fn();
    render(<Toast toast={{ id: 1, message: 'Boa jogada!', tone: 'boa' }} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByLabelText('Fechar'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('remounts the card (new key) when the id changes, even with an identical message', () => {
    const { rerender, container } = render(
      <Toast toast={{ id: 1, message: 'Mesma mensagem', tone: 'info' }} onDismiss={() => {}} />
    );
    const firstCard = container.querySelector('[data-testid="toast-card"]');
    rerender(<Toast toast={{ id: 2, message: 'Mesma mensagem', tone: 'info' }} onDismiss={() => {}} />);
    const secondCard = container.querySelector('[data-testid="toast-card"]');
    expect(secondCard).not.toBe(firstCard);
  });
});
```

```tsx
// components/Toast/ToastProvider.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { ToastProvider, useToast } from './ToastProvider';
import type { ReactNode } from 'react';

function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

describe('ToastProvider / useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('throws when useToast is called outside a ToastProvider', () => {
    const { result } = renderHook(() => {
      try {
        return useToast();
      } catch (error) {
        return error;
      }
    });
    expect(result.current).toBeInstanceOf(Error);
  });

  it('show() displays a toast with the given message and default info tone', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => {
      result.current.show('Olá');
    });
    expect(result.current.toast).toEqual({ id: expect.any(Number), message: 'Olá', tone: 'info' });
  });

  it('a new show() call replaces the current toast and resets its auto-dismiss timer', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => {
      result.current.show('Primeira');
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    act(() => {
      result.current.show('Segunda');
    });
    expect(result.current.toast?.message).toBe('Segunda');
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    // Still visible -- only 3s have passed since the SECOND show(), not the 4s auto-dismiss.
    expect(result.current.toast?.message).toBe('Segunda');
  });

  it('auto-dismisses after 4 seconds', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => {
      result.current.show('Vai desaparecer');
    });
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.toast).toBeNull();
  });

  it('dismiss() clears the toast immediately', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => {
      result.current.show('Mensagem');
    });
    act(() => {
      result.current.dismiss();
    });
    expect(result.current.toast).toBeNull();
  });

  it('renders the Toast UI as part of the provider tree', () => {
    render(
      <ToastProvider>
        <button
          type="button"
          onClick={() => {
            /* placeholder child */
          }}
        >
          child
        </button>
      </ToastProvider>
    );
    expect(screen.getByText('child')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/Toast/`
Expected: FAIL — `Cannot find module './Toast'` / `'./ToastProvider'`.

- [ ] **Step 3: Write `components/Toast/Toast.tsx`**

```tsx
'use client';

import type { MoveQuality } from '@/lib/checkers/moveClassification';

// 'boa'/'imprecisao'/'erro' (MoveQuality) reused as tones -- this toast is
// how Phase 4b (learning mode) will surface last-move-quality feedback,
// with the same semantic colors the eventual quality badge will use. No
// 'check' tone here (unlike Chess Sensei's ToastTone): checkers has no
// concept that blocks board interaction until acknowledged (see spec §4 --
// illegal moves are simply never offered, nothing to react to), so every
// tone here auto-dismisses.
export type ToastTone = 'info' | MoveQuality;

export interface ToastState {
  id: number;
  message: string;
  tone: ToastTone;
}

export interface ToastProps {
  toast: ToastState | null;
  onDismiss: () => void;
}

const TONE_ACCENT: Record<ToastTone, string> = {
  info: 'border-sky-500',
  boa: 'border-emerald-500',
  imprecisao: 'border-amber-500',
  erro: 'border-red-500',
};

// Pure toast card -- no timer, closes only manually (via onDismiss) or when
// the provider replaces/auto-dismisses it. The wrapper (role="status"/
// aria-live="polite") stays mounted even with no toast -- only the card
// inside enters/exits, with key={toast.id} forcing React to remount that
// subtree even when the message is identical to the previous one (e.g. two
// "Boa jogada!" toasts in a row would otherwise not re-announce to screen
// readers or show a visible repaint on the second call).
export function Toast({ toast, onDismiss }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-[max(1rem,calc(env(safe-area-inset-top)+0.5rem))] left-1/2 -translate-x-1/2 z-[60]"
    >
      {toast && (
        <div
          key={toast.id}
          data-testid="toast-card"
          className={`flex items-center gap-3 rounded-xl border-2 ${TONE_ACCENT[toast.tone]} bg-white px-4 py-2 text-stone-900 shadow-[3px_3px_0_rgba(0,0,0,0.2)]`}
        >
          <p className="text-sm font-medium">{toast.message}</p>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Fechar"
            className="rounded-full h-6 w-6 shrink-0 bg-stone-200 font-bold hover:scale-110 transition-transform"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Write `components/Toast/ToastProvider.tsx`**

```tsx
'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Toast, type ToastState, type ToastTone } from './Toast';

interface ToastContextValue {
  toast: ToastState | null;
  show: (message: string, tone?: ToastTone) => void;
  dismiss: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Monotonic counter instead of Date.now(): two show() calls in the same
// millisecond would otherwise generate the same id, colliding with
// Toast.tsx's key={toast.id} and silently failing to force a remount when
// the repeated message also happened to match.
let nextToastId = 0;

// Every tone auto-dismisses after this long if nobody closes it first --
// unlike Chess Sensei, there's no 'check' tone that needs to stay open
// until manually acknowledged (see Toast.tsx's comment).
const AUTO_DISMISS_MS = 4000;

// The app's one Toast context -- mounted once in app/layout.tsx (Task 7) so
// useToast() is available on any client page without prop-drilling.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoDismissTimer = useCallback(() => {
    if (autoDismissTimer.current !== null) {
      clearTimeout(autoDismissTimer.current);
      autoDismissTimer.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearAutoDismissTimer();
    setToast(null);
  }, [clearAutoDismissTimer]);

  const show = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      // Instantly replaces any previous toast/timer -- never a queue, and a
      // new show() always cancels the auto-dismiss of whatever toast was
      // showing before it.
      clearAutoDismissTimer();
      setToast({ id: nextToastId++, message, tone });
      autoDismissTimer.current = setTimeout(() => {
        autoDismissTimer.current = null;
        setToast(null);
      }, AUTO_DISMISS_MS);
    },
    [clearAutoDismissTimer]
  );

  const value = useMemo(() => ({ toast, show, dismiss }), [toast, show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast toast={toast} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast() só pode ser usado dentro de <ToastProvider>.');
  }
  return ctx;
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run components/Toast/`
Expected: PASS, all 11 tests (4 `Toast.test.tsx` + 7 `ToastProvider.test.tsx`).

- [ ] **Step 6: Run the full suite, typecheck, lint**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: all pass, no errors.

- [ ] **Step 7: Commit and push**

```bash
git add components/Toast/
git commit -m "feat(ui): Toast + ToastProvider -- ported from Chess Sensei, no 'check' tone

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

### Task 3: `components/ConfirmModal/ConfirmModal.tsx`

**Files:**
- Create: `components/ConfirmModal/ConfirmModal.tsx`
- Test: `components/ConfirmModal/ConfirmModal.test.tsx`

**Interfaces:**
- Consumes: `useFocusTrap` from `@/lib/ui/useFocusTrap` (Task 1).
- Produces: `ConfirmModalProps` (`{open, title, message, confirmLabel,
  cancelLabel, onConfirm, onCancel}`), `ConfirmModal` component — consumed by
  Task 7 (`/jogar`'s reset/menu confirmation).

Already game-agnostic via props in Chess Sensei's version (no i18n import in
that file at all) — this port only swaps `PageChrome`/`ChipButton` for plain
Tailwind.

- [ ] **Step 1: Write the failing tests**

```tsx
// components/ConfirmModal/ConfirmModal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmModal } from './ConfirmModal';

const baseProps = {
  title: 'Reiniciar partida?',
  message: 'Vais perder o progresso desta partida.',
  confirmLabel: 'Reiniciar',
  cancelLabel: 'Cancelar',
};

describe('ConfirmModal', () => {
  it('renders nothing when closed', () => {
    render(<ConfirmModal open={false} {...baseProps} onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders the title, message, and both buttons when open', () => {
    render(<ConfirmModal open={true} {...baseProps} onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('dialog')).not.toBeNull();
    expect(screen.getByText('Reiniciar partida?')).not.toBeNull();
    expect(screen.getByText('Vais perder o progresso desta partida.')).not.toBeNull();
    expect(screen.getByText('Reiniciar')).not.toBeNull();
    expect(screen.getByText('Cancelar')).not.toBeNull();
  });

  it('calls onConfirm when the confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmModal open={true} {...baseProps} onConfirm={onConfirm} onCancel={() => {}} />);
    fireEvent.click(screen.getByText('Reiniciar'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when the cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<ConfirmModal open={true} {...baseProps} onConfirm={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when the backdrop is clicked', () => {
    const onCancel = vi.fn();
    const { container } = render(<ConfirmModal open={true} {...baseProps} onConfirm={() => {}} onCancel={onCancel} />);
    fireEvent.click(container.querySelector('[data-testid="confirm-modal-backdrop"]')!);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Escape is pressed', () => {
    const onCancel = vi.fn();
    render(<ConfirmModal open={true} {...baseProps} onConfirm={() => {}} onCancel={onCancel} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('clicking inside the panel does not call onCancel', () => {
    const onCancel = vi.fn();
    render(<ConfirmModal open={true} {...baseProps} onConfirm={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onCancel).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/ConfirmModal/`
Expected: FAIL — `Cannot find module './ConfirmModal'`.

- [ ] **Step 3: Write `components/ConfirmModal/ConfirmModal.tsx`**

```tsx
'use client';

import { useEffect } from 'react';
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
// cancel, same as clicking cancelLabel explicitly. Used by /jogar (Task 7)
// to confirm "Reiniciar partida"/"Menu inicial" when there's progress to
// lose, but generic enough for other call sites later.
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
    <div
      data-testid="confirm-modal-backdrop"
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border-2 border-stone-700 bg-white p-6 text-stone-900 outline-none"
      >
        <h2 className="mb-2 text-xl font-bold">{title}</h2>
        <p className="mb-5 text-sm text-stone-700">{message}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white"
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl bg-stone-200 px-4 py-2 font-bold text-stone-900"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run components/ConfirmModal/`
Expected: PASS, all 7 tests.

- [ ] **Step 5: Typecheck, lint, commit and push**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

```bash
git add components/ConfirmModal/
git commit -m "feat(ui): ConfirmModal -- generic confirm/cancel popup, ported from Chess Sensei

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

### Task 4: `lib/checkers/gameEndMessage.ts` — status → end-game message mapping

**Files:**
- Create: `lib/checkers/gameEndMessage.ts`
- Test: `lib/checkers/gameEndMessage.test.ts`

**Interfaces:**
- Consumes: `GameStatus`, `Color` from `./types`.
- Produces: `GameEndKind` (`'win' | 'lose' | 'draw'`), `GameEndDescription`
  (`{title: string; kind: GameEndKind}`),
  `describeGameEnd(status: GameStatus, mode: 'ai' | 'local', humanColor: Color, turn: Color): GameEndDescription | null`
  — consumed by Task 5 (`GameEndModal`).

Ported from Chess Sensei's `lib/chess/gameEndMessage.ts`, deviating in two
ways: (1) no `locale` parameter (no i18n yet — hardcoded Portuguese strings
directly in this function, matching the rest of this repo), (2) mapped to
checkers' `GameStatus` union (`'playing' | 'no-moves' | 'draw-repetition' |
'draw-no-capture'`) instead of chess's check/checkmate/stalemate/draw. Per
`lib/checkers/types.ts`'s own documented rule: `'no-moves'` means "side to move
has zero legal moves -> they lose" — so `turn` is always the LOSING side for
that status, same shape as chess's checkmate (`turn` is the side in
checkmate). In local mode, per spec's "no 'you' on a shared screen" framing,
the result is always phrased as "Pretas vencem"/"Brancas vencem", never a
win/lose perspective.

- [ ] **Step 1: Write the failing tests**

```ts
// lib/checkers/gameEndMessage.test.ts
import { describe, it, expect } from 'vitest';
import { describeGameEnd } from './gameEndMessage';

describe('describeGameEnd', () => {
  it('returns null for playing (game not over)', () => {
    expect(describeGameEnd('playing', 'local', 'b', 'b')).toBeNull();
  });

  describe('no-moves, ai mode', () => {
    it('is a loss when the human is the side with no moves', () => {
      const result = describeGameEnd('no-moves', 'ai', 'b', 'b');
      expect(result?.kind).toBe('lose');
    });

    it('is a win when the AI is the side with no moves', () => {
      const result = describeGameEnd('no-moves', 'ai', 'b', 'w');
      expect(result?.kind).toBe('win');
    });
  });

  describe('no-moves, local mode', () => {
    it('is always a win (for whichever color is not stuck), never a loss perspective', () => {
      const blackStuck = describeGameEnd('no-moves', 'local', 'b', 'b');
      const whiteStuck = describeGameEnd('no-moves', 'local', 'b', 'w');
      expect(blackStuck?.kind).toBe('win');
      expect(whiteStuck?.kind).toBe('win');
      expect(blackStuck?.title).not.toBe(whiteStuck?.title);
    });
  });

  it('classifies draw-repetition as a draw', () => {
    const result = describeGameEnd('draw-repetition', 'local', 'b', 'b');
    expect(result?.kind).toBe('draw');
    expect(result?.title).toContain('repetição');
  });

  it('classifies draw-no-capture as a draw with distinct wording from draw-repetition', () => {
    const repetition = describeGameEnd('draw-repetition', 'local', 'b', 'b');
    const noCapture = describeGameEnd('draw-no-capture', 'local', 'b', 'b');
    expect(noCapture?.kind).toBe('draw');
    expect(noCapture?.title).not.toBe(repetition?.title);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/checkers/gameEndMessage.test.ts`
Expected: FAIL — `Cannot find module './gameEndMessage'`.

- [ ] **Step 3: Write `lib/checkers/gameEndMessage.ts`**

```ts
import type { Color, GameStatus } from './types';

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
export function describeGameEnd(
  status: GameStatus,
  mode: 'ai' | 'local',
  humanColor: Color,
  turn: Color
): GameEndDescription | null {
  if (status === 'no-moves') {
    // `turn` is always the side with zero legal moves -- they lose.
    if (mode === 'ai') {
      return turn === humanColor
        ? { title: 'Perdeste — sem jogadas possíveis', kind: 'lose' }
        : { title: 'Ganhaste — o adversário ficou sem jogadas possíveis', kind: 'win' };
    }
    return turn === 'b'
      ? { title: 'Brancas vencem — pretas sem jogadas possíveis', kind: 'win' }
      : { title: 'Pretas vencem — brancas sem jogadas possíveis', kind: 'win' };
  }
  if (status === 'draw-repetition') {
    return { title: 'Empate por repetição de posição', kind: 'draw' };
  }
  if (status === 'draw-no-capture') {
    return { title: 'Empate — 40 lances sem captura', kind: 'draw' };
  }
  return null;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/checkers/gameEndMessage.test.ts`
Expected: PASS, all 7 tests.

- [ ] **Step 5: Typecheck, lint, commit and push**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

```bash
git add lib/checkers/gameEndMessage.ts lib/checkers/gameEndMessage.test.ts
git commit -m "feat(checkers): describeGameEnd -- status to end-game title/kind mapping

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

### Task 5: `components/GameEndModal/GameEndModal.tsx`

**Files:**
- Create: `components/GameEndModal/GameEndModal.tsx`
- Test: `components/GameEndModal/GameEndModal.test.tsx`

**Interfaces:**
- Consumes: `describeGameEnd` from `@/lib/checkers/gameEndMessage` (Task 4);
  `useFocusTrap` from `@/lib/ui/useFocusTrap` (Task 1); `GameStatus`, `Color`
  from `@/lib/checkers/types`.
- Produces: `GameEndModalProps`
  (`{open, status, mode, humanColor, turn, onClose, onPlayAgain}`),
  `GameEndModal` component — consumed by Task 7 (`/jogar`).

Text/button only, per Global Constraints — no mascot image, no confetti (both
Phase 10). Otherwise same structural shape as Chess Sensei's version
(backdrop, `role="dialog"`, ✕ button, Escape closes, "Jogar novamente"/"Menu
inicial" actions).

- [ ] **Step 1: Write the failing tests**

```tsx
// components/GameEndModal/GameEndModal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameEndModal } from './GameEndModal';

describe('GameEndModal', () => {
  it('renders nothing when closed', () => {
    render(
      <GameEndModal
        open={false}
        status="no-moves"
        mode="local"
        humanColor="b"
        turn="w"
        onClose={() => {}}
        onPlayAgain={() => {}}
      />
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders nothing when status is playing, even if open is true', () => {
    render(
      <GameEndModal
        open={true}
        status="playing"
        mode="local"
        humanColor="b"
        turn="w"
        onClose={() => {}}
        onPlayAgain={() => {}}
      />
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the describeGameEnd title when open with a terminal status', () => {
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
    expect(screen.getByText('Pretas vencem — brancas sem jogadas possíveis')).not.toBeNull();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <GameEndModal
        open={true}
        status="draw-repetition"
        mode="local"
        humanColor="b"
        turn="w"
        onClose={onClose}
        onPlayAgain={() => {}}
      />
    );
    fireEvent.click(screen.getByLabelText('Fechar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(
      <GameEndModal
        open={true}
        status="draw-repetition"
        mode="local"
        humanColor="b"
        turn="w"
        onClose={onClose}
        onPlayAgain={() => {}}
      />
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onPlayAgain when "Jogar novamente" is clicked', () => {
    const onPlayAgain = vi.fn();
    render(
      <GameEndModal
        open={true}
        status="draw-repetition"
        mode="local"
        humanColor="b"
        turn="w"
        onClose={() => {}}
        onPlayAgain={onPlayAgain}
      />
    );
    fireEvent.click(screen.getByText('Jogar novamente'));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });

  it('links "Menu inicial" to /', () => {
    render(
      <GameEndModal
        open={true}
        status="draw-repetition"
        mode="local"
        humanColor="b"
        turn="w"
        onClose={() => {}}
        onPlayAgain={() => {}}
      />
    );
    const link = screen.getByText('Menu inicial').closest('a');
    expect(link?.getAttribute('href')).toBe('/');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/GameEndModal/`
Expected: FAIL — `Cannot find module './GameEndModal'`.

- [ ] **Step 3: Write `components/GameEndModal/GameEndModal.tsx`**

```tsx
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import type { Color, GameStatus } from '@/lib/checkers/types';
import { describeGameEnd } from '@/lib/checkers/gameEndMessage';
import { useFocusTrap } from '@/lib/ui/useFocusTrap';

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
  const result = describeGameEnd(status, mode, humanColor, turn);
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
            aria-label="Fechar"
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
            Jogar novamente
          </button>
          <Link href="/" className="rounded-xl bg-stone-200 px-4 py-2 font-bold text-stone-900">
            Menu inicial
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run components/GameEndModal/`
Expected: PASS, all 7 tests.

- [ ] **Step 5: Typecheck, lint, commit and push**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

```bash
git add components/GameEndModal/
git commit -m "feat(ui): GameEndModal -- text/button only, no mascot/confetti yet (Phase 10)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

### Task 6: `components/RulesModal/RulesModal.tsx`

**Files:**
- Create: `components/RulesModal/RulesModal.tsx`
- Test: `components/RulesModal/RulesModal.test.tsx`

**Interfaces:**
- Consumes: `useFocusTrap` from `@/lib/ui/useFocusTrap` (Task 1).
- Produces: `RulesModalProps` (`{open, onClose}`), `RulesModal` component —
  not consumed by any other task in this plan (no "Regras" trigger button
  exists in `/jogar` yet — that's a small, natural addition for whichever
  future phase adds page chrome/navigation; this task builds the modal
  itself, ready to be opened from anywhere).

Content per spec §5: man/king movement, mandatory capture, multi-jump,
promotion, draw conditions — hardcoded Portuguese sections (no i18n
dictionary yet, unlike Chess Sensei's `t.rulesModal.*`-driven version).

- [ ] **Step 1: Write the failing tests**

```tsx
// components/RulesModal/RulesModal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RulesModal } from './RulesModal';

describe('RulesModal', () => {
  it('renders nothing when closed', () => {
    render(<RulesModal open={false} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders section headings for movement, mandatory capture, and draw conditions', () => {
    render(<RulesModal open={true} onClose={() => {}} />);
    expect(screen.getByText(/Movimento/)).not.toBeNull();
    expect(screen.getByText(/Captura obrigatória/)).not.toBeNull();
    expect(screen.getByText(/Empate/)).not.toBeNull();
  });

  it('mentions multi-jump chains and promotion', () => {
    render(<RulesModal open={true} onClose={() => {}} />);
    expect(screen.getByText(/encadeada|múltipla/)).not.toBeNull();
    // getByText(/dama/i) would be ambiguous here -- both the "Promoção a
    // dama" heading and an item's body text ("torna-se dama...") match.
    // Target the heading specifically.
    expect(screen.getByRole('heading', { name: /dama/i, level: 3 })).not.toBeNull();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<RulesModal open={true} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Fechar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<RulesModal open={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<RulesModal open={true} onClose={onClose} />);
    fireEvent.click(container.querySelector('[data-testid="rules-modal-backdrop"]')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/RulesModal/`
Expected: FAIL — `Cannot find module './RulesModal'`.

- [ ] **Step 3: Write `components/RulesModal/RulesModal.tsx`**

```tsx
'use client';

import { useEffect } from 'react';
import { useFocusTrap } from '@/lib/ui/useFocusTrap';

export interface RulesModalProps {
  open: boolean;
  onClose: () => void;
}

// Content per design spec §5's explicit list for this modal's checkers
// version: man/king movement, mandatory capture, multi-jump, promotion,
// draw conditions. Hardcoded Portuguese -- no i18n dictionary yet (Phase 8),
// unlike Chess Sensei's t.rulesModal.*-driven content.
const SECTIONS = [
  {
    title: 'Movimento',
    items: [
      { title: 'Peça (homem)', text: 'Move-se uma casa na diagonal, sempre para a frente, para uma casa escura vazia.' },
      { title: 'Dama', text: 'Move-se uma casa na diagonal, em qualquer das quatro direções.' },
    ],
  },
  {
    title: 'Captura obrigatória',
    items: [
      {
        title: 'Quando há uma captura disponível',
        text: 'És obrigado a capturar -- não podes fazer um lance simples se alguma das tuas peças puder capturar.',
      },
      {
        title: 'Captura encadeada (lance múltiplo)',
        text: 'Se depois de capturares uma peça a mesma peça puder capturar outra, a captura continua no mesmo lance.',
      },
    ],
  },
  {
    title: 'Promoção a dama',
    text_only: undefined,
    items: [
      {
        title: 'Chegar à última linha',
        text: 'Uma peça que chegue à última linha do adversário torna-se dama imediatamente -- mesmo a meio de uma captura encadeada, o lance termina aí.',
      },
    ],
  },
  {
    title: 'Empate',
    items: [
      { title: 'Repetição de posição', text: 'A mesma posição repete-se três vezes.' },
      { title: 'Sem capturas', text: '40 lances seguidos (de cada jogador) sem nenhuma captura.' },
    ],
  },
];

export function RulesModal({ open, onClose }: RulesModalProps) {
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
        aria-label="Regras do jogo"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-2xl border-2 border-stone-700 bg-white p-6 text-stone-900 outline-none"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-2xl font-bold">Regras do jogo</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-full h-8 w-8 shrink-0 bg-stone-200 font-bold hover:scale-110 transition-transform"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-5">
          {SECTIONS.map((section) => (
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

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run components/RulesModal/`
Expected: PASS, all 6 tests.

- [ ] **Step 5: Typecheck, lint, commit and push**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

```bash
git add components/RulesModal/
git commit -m "feat(ui): RulesModal -- checkers rules content (movement, mandatory capture, draws)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

### Task 7: Wire into the app — `ToastProvider` in the root layout, `GameEndModal` + `ConfirmModal` in `/jogar`

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/jogar/page.tsx`

**Interfaces:**
- Consumes: `ToastProvider` from `@/components/Toast/ToastProvider` (Task 2);
  `GameEndModal` from `@/components/GameEndModal/GameEndModal` (Task 5);
  `ConfirmModal` from `@/components/ConfirmModal/ConfirmModal` (Task 3).
- Produces: no new exports — this is the integration point, same "leaf glue"
  pattern as `/jogar` itself. No dedicated test file (matches the established
  precedent from the previous two plans: `/jogar`'s own composition logic
  isn't unit-tested — verified by exercising the already-tested pieces it
  composes, plus manual verification below).

`GameEndModal` opens automatically the moment `state.isGameOver` becomes
true (an effect watching it), replacing the current plain-text
`STATUS_LABEL`-driven message for terminal states. The `aria-live` status
paragraph keeps a minimal "Fim de jogo" for the moment the modal is opening
(screen readers get an immediate heads-up even before the modal's own content
is announced), rather than duplicating the modal's now-richer message inline.

`ConfirmModal` gates "Reiniciar partida"/"Menu inicial" only when there's
real progress to lose: `!state.isGameOver && state.lastMove !== null` (at
least one move made, game not already over). At the very start of a fresh
game (`lastMove === null`) or once the game has ended (the `GameEndModal`
already offers its own "Jogar novamente"/"Menu inicial"), both actions
proceed directly with no extra prompt.

- [ ] **Step 1: Modify `app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/Toast/ToastProvider';

export const metadata: Metadata = {
  title: 'Checkers Sensei',
  description: 'Checkers Sensei — placeholder layout, replaced in a later phase.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Modify `app/jogar/page.tsx`**

Replace the entire file with:

```tsx
'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCheckersGame } from '@/lib/checkers/useCheckersGame';
import { CheckersBoard } from '@/components/CheckersBoard/CheckersBoard';
import { GameEndModal } from '@/components/GameEndModal/GameEndModal';
import { ConfirmModal } from '@/components/ConfirmModal/ConfirmModal';
import { createCheckersEngineClient, type CheckersEngineClient } from '@/lib/checkers/checkersEngineClient';
import { difficultyToEngineOptions, type Difficulty } from '@/lib/checkers/difficulty';
import { resolvePlayerColor, type PlayerColor } from '@/lib/checkers/playerColor';
import type { Color, Square } from '@/lib/checkers/types';

function isDifficulty(value: string | null): value is Difficulty {
  return value === 'facil' || value === 'medio' || value === 'dificil';
}

function isPlayerColor(value: string | null): value is PlayerColor {
  return value === 'b' || value === 'w' || value === 'random';
}

type ConfirmAction = 'restart' | 'menu' | null;

function JogarPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAiMode = searchParams.get('mode') === 'ai';
  const difficultyParam = searchParams.get('difficulty');
  const difficulty: Difficulty = isDifficulty(difficultyParam) ? difficultyParam : 'medio';
  const colorParam = searchParams.get('color');
  const colorChoice: PlayerColor = isPlayerColor(colorParam) ? colorParam : 'b';

  const { state, legalMovesFrom, makeMove, reset } = useCheckersGame(true);
  const [selected, setSelected] = useState<Square | null>(null);
  const [engineError, setEngineError] = useState(false);
  const [gameEndOpen, setGameEndOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const [humanColor] = useState<Color>(() => resolvePlayerColor(colorChoice));
  const aiColor: Color = humanColor === 'b' ? 'w' : 'b';

  const engineRef = useRef<CheckersEngineClient | null>(null);
  useEffect(() => {
    if (!isAiMode) return;
    const client = createCheckersEngineClient();
    engineRef.current = client;
    return () => {
      client.terminate();
      engineRef.current = null;
    };
  }, [isAiMode]);

  const isAiTurn = isAiMode && state.turn === aiColor && !state.isGameOver;
  useEffect(() => {
    if (!isAiTurn) return;
    const client = engineRef.current;
    if (!client) return;
    let cancelled = false;
    const options = difficultyToEngineOptions(difficulty);
    client
      .getBestMove(state.board, state.turn, options)
      .then((move) => {
        if (cancelled) return;
        if (!makeMove(move.from, move.to)) {
          console.error('[jogar] engine returned a move the game rejected:', move);
          setEngineError(true);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error('[jogar] engine request failed:', error);
        setEngineError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isAiTurn, state.board, state.turn, difficulty, makeMove]);

  // Opens the moment the game ends -- once per game, since state.isGameOver
  // only flips false->true when a fresh reset() happens (which also closes
  // this via handleReset below).
  useEffect(() => {
    if (state.isGameOver) setGameEndOpen(true);
  }, [state.isGameOver]);

  const legalTargets = selected !== null ? legalMovesFrom(selected) : [];

  function handleSquareClick(square: Square) {
    if (state.isGameOver) return;
    if (isAiMode && state.turn === aiColor) return;

    if (selected !== null && legalTargets.includes(square)) {
      makeMove(selected, square);
      setSelected(null);
      return;
    }

    const piece = state.board[square - 1];
    if (piece && piece.color === state.turn) {
      setSelected((prev) => (prev === square ? null : square));
    } else {
      setSelected(null);
    }
  }

  function doReset() {
    reset();
    setSelected(null);
    setEngineError(false);
    setGameEndOpen(false);
  }

  // Progress worth confirming before discarding: at least one move has
  // been made, and the game hasn't already ended (GameEndModal's own
  // "Jogar novamente"/"Menu inicial" already handle that transition
  // without a redundant extra prompt).
  const hasProgressToLose = !state.isGameOver && state.lastMove !== null;

  function handleRestartClick() {
    if (hasProgressToLose) {
      setConfirmAction('restart');
    } else {
      doReset();
    }
  }

  function handleMenuClick(event: React.MouseEvent) {
    if (hasProgressToLose) {
      event.preventDefault();
      setConfirmAction('menu');
    }
    // else: let the <Link> navigate normally.
  }

  function handleConfirmAction() {
    if (confirmAction === 'restart') {
      doReset();
    } else if (confirmAction === 'menu') {
      // ConfirmModal's confirmLabel renders as plain button text, not a
      // link (see Task 3) -- confirming a menu exit must navigate
      // explicitly, there's no <Link> to fall back on here.
      router.push('/');
    }
    setConfirmAction(null);
  }

  function handleCancelConfirm() {
    setConfirmAction(null);
  }

  const turnLabel = state.turn === 'b' ? 'Vez das pretas' : 'Vez das brancas';
  const boardInteractive = !state.isGameOver && !(isAiMode && state.turn === aiColor);

  let statusText: string;
  if (state.isGameOver) statusText = 'Fim de jogo';
  else if (engineError) statusText = 'Erro no motor de jogo — reinicie a partida';
  else if (isAiTurn) statusText = 'A pensar...';
  else statusText = turnLabel;

  return (
    <main className="flex min-h-dvh flex-col items-center gap-4 p-4">
      <p aria-live="polite">{statusText}</p>
      <CheckersBoard
        board={state.board}
        turn={state.turn}
        selectedSquare={selected}
        legalTargets={legalTargets}
        mandatoryCaptureSquares={state.mandatoryCaptureSquares}
        lastMove={state.lastMove}
        interactive={boardInteractive}
        onSquareClick={handleSquareClick}
      />
      <div className="flex gap-4">
        <Link href="/" className="underline" onClick={handleMenuClick}>
          Menu inicial
        </Link>
        <button type="button" onClick={handleRestartClick} className="underline">
          Reiniciar partida
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
        open={confirmAction !== null}
        title={confirmAction === 'restart' ? 'Reiniciar partida?' : 'Sair para o menu?'}
        message="Vais perder o progresso desta partida."
        confirmLabel={confirmAction === 'restart' ? 'Reiniciar' : 'Sair'}
        cancelLabel="Cancelar"
        onConfirm={handleConfirmAction}
        onCancel={handleCancelConfirm}
      />
    </main>
  );
}

export default function JogarPage() {
  return (
    <Suspense fallback={null}>
      <JogarPageInner />
    </Suspense>
  );
}
```

- [ ] **Step 3: Manually verify in the browser**

Run: `npm run dev`

Open `http://localhost:3000/jogar` (local mode) and confirm:
(a) playing a full game to completion (or use a synthetic position, revert
after) opens `GameEndModal` automatically the moment the game ends, with the
correct win/draw title;
(b) closing the modal (✕, Escape, or backdrop click) leaves the board visible
underneath, still showing the final position;
(c) "Jogar novamente" inside the modal resets to a fresh game and closes the
modal;
(d) mid-game (at least one move made, game not over), clicking "Reiniciar
partida" shows the `ConfirmModal`, and confirming actually resets while
cancelling leaves the game untouched;
(e) mid-game, clicking "Menu inicial" shows the `ConfirmModal`, and
confirming navigates to `/` while cancelling stays on `/jogar`;
(f) at the very start of a fresh game (no moves made yet), both "Reiniciar
partida" and "Menu inicial" act immediately with no confirmation prompt.

Then open `http://localhost:3000/jogar?mode=ai&difficulty=facil&color=b` and
confirm the same `GameEndModal`/`ConfirmModal` behavior works in AI mode too,
including that a human loss shows the "lose" wording distinctly from a win.

Stop the dev server after verifying.

- [ ] **Step 4: Run the full suite, typecheck, lint, build**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: all pass.

Run: `npm run build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 5: Commit and push**

```bash
git add app/layout.tsx app/jogar/page.tsx
git commit -m "feat(checkers): wire ToastProvider, GameEndModal, ConfirmModal into the app

GameEndModal replaces the plain-text game-over status line and opens
automatically when a game ends. ConfirmModal gates 'Reiniciar
partida'/'Menu inicial' only when there's real progress to lose.
Manually verified: local mode, AI mode, both win/lose/draw wordings,
confirm/cancel paths, no-prompt-at-game-start.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

### Task 8: Close out the phase in `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:** none — documentation only.

- [ ] **Step 1: Update `## Structure`**

Add new blocks:

```markdown
lib/ui/
  useFocusTrap.ts        # modal focus trapping -- game-agnostic, no chess/
                          # checkers dependency, ported unchanged
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
                           # capture, promotion, draw conditions
lib/checkers/ (additions this phase)
  gameEndMessage.ts        # describeGameEnd -- GameStatus -> title/kind for
                            # GameEndModal, no locale param yet (Phase 8)
```

- [ ] **Step 2: Add to `## Conventions`**

Insert before `## Deploy`:

```markdown
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
```

- [ ] **Step 3: Commit and push**

```bash
git add CLAUDE.md
git commit -m "docs: close out Toast/Modal UI chrome phase in CLAUDE.md

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

## Plan self-review notes

- **Spec coverage:** implements the "Toasts/modals" subsection of spec §5 in
  full for the shells this plan scopes (`Toast`/`ToastProvider`/
  `ConfirmModal`/`GameEndModal`/`RulesModal`, `describeGameEnd`'s
  `GameStatus`-based mapping, the dropped `'check'` tone with its rationale).
  Deliberately deferred, per this plan's own Global Constraints and recorded
  in `CLAUDE.md`: `LearningPanel`/move-suggestion/move-quality-toast/
  `moveExplanation.ts` (next plan, Phase 4b — the first real consumer of
  `Toast`), mascot images/confetti (Phase 10), `PageChrome`/`ChipButton`
  chrome (Phase 5), i18n/`Locale` (Phase 8).
- **Placeholder scan:** no TBD/TODO; every step has real, runnable code. In
  particular, `ConfirmModal`'s "menu" confirmation path (Task 7) is written
  as actual `router.push('/')` code inside `handleConfirmAction`, not
  described in prose as something to add — `ConfirmModal`'s `confirmLabel`
  is plain button text (Task 3), so a menu-exit confirmation has no `<Link>`
  to fall back on and needs the explicit navigation call.
- **Type consistency:** `ConfirmModalProps` (Task 3) is consumed by Task 7
  with matching field names throughout (`title`/`message`/`confirmLabel`/
  `cancelLabel`/`onConfirm`/`onCancel`). `GameEndModalProps` (Task 5) is
  consumed by Task 7 with `mode: isAiMode ? 'ai' : 'local'`,
  `humanColor`/`turn` sourced from state already established in Phase 3's
  `/jogar` wiring — no renaming drift. `describeGameEnd`'s
  `(status, mode, humanColor, turn)` parameter order (Task 4) matches
  `GameEndModal`'s internal call to it exactly (Task 5). `ToastTone`/
  `MoveQuality` (Task 2) reuses Phase 3's `lib/checkers/moveClassification.ts`
  type verbatim, not redefined.
