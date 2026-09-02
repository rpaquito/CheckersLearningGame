# Menu, Settings & Visual Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 5 of the design spec's build phasing (§13): the real home
menu (`/`), a persisted-settings page (`/opcoes`), the "anime" visual-identity
design tokens, and the shared chrome components (`ChipButton`/`ToggleGroup`/
`PageChrome`) and `lib/settings/` module everything else in this phase (and
later ones) depends on. Also adds the two remaining piece styles
(`moderno`/`anime`) and wires board/piece theming into `CheckersBoard`, since
`/opcoes`'s theme pickers need a real, visible effect somewhere to not be
dead controls.

**Architecture:** Ports `ChipButton`, `ToggleGroup` (+ `activeToggleStyle`),
`PageChrome`, and the `lib/settings/` module (`settings.ts`/`themes.ts`/
`useSettings.ts`, a `useSyncExternalStore` singleton) from the sibling Chess
Sensei repo (`/Users/rpaquito/Documents/Projects/ChessLearningGame`) —
already-tested, already game-agnostic code — adapting only what's actually
checkers-specific (`PlayerColor`'s `'b'/'w'/'random'` shape, no i18n
dependency yet, storage key). `CheckersBoard` gains two new optional props
(`boardTheme`, `pieceStyle`) so the board actually renders whatever
`/opcoes` picks, without becoming any less "dumb" — it still only renders
what it's given. `/` and `/opcoes` are new/rewritten pages using the new
chrome; `/configurar`, `/jogar`, and every modal/toast component stay
plain-Tailwind for now (out of scope — see Global Constraints).

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest + Testing
Library, Tailwind v4 — identical to every prior phase in this repo.

**Spec:** `docs/superpowers/specs/2026-08-31-checkers-sensei-design.md` §7
("Settings, themes, i18n"), §8 ("Visual identity & branding"), §13 (phase
5). Two things this plan does that deviate from the spec's literal text, both
confirmed by directly inspecting the sibling repo before writing this plan —
read the task comments for the reasoning, not just the spec:

1. §7's `Settings.defaultColor` pseudocode shows `'black' | 'white' |
   'random'`, copying chess's own shape. Checkers' `PlayerColor`
   (`lib/checkers/playerColor.ts`, already implemented in the AI-opponent
   phase) is `'b' | 'w' | 'random'` — this plan uses the real, already-built
   type, not the spec's illustrative pseudocode.
2. §8 claims Chess Sensei's three `public/menu/background-*.webp` files are
   "scenic art, no chess imagery" and can be copied unchanged. **This is
   false, verified by viewing all three files during this plan's research**:
   `background-templo.webp` shows the sensei mascot seated on a floating
   chessboard surrounded by chess pieces; `background-dojo.webp` and
   `background-cosmico.webp` both center a giant chess king piece. Only the
   six flat `public/board/*.webp` square textures are genuinely
   chess-agnostic and get copied. The background images are real,
   deferred Draw Things work — see Global Constraints and Task 6.

## Global Constraints

- No worktrees, no feature branches. Commit each task's changes directly to
  `main` and push (`git push origin main`) once its tests pass, before
  starting the next task — never batch multiple tasks into one unpushed
  commit (CLAUDE.md §Process rules).
- Portuguese-only in every new UI string (hardcoded, no i18n system exists
  until Phase 8) — same convention every prior phase has followed. No
  `Locale`/language toggle appears in `/opcoes` in this plan (see Task 5);
  `Settings.language` exists in the type for forward-compatibility with
  Phase 8's storage shape, but nothing reads or writes it yet beyond its
  hardcoded `'pt'` default.
- **No new Draw Things assets in this plan.** Per-tile menu illustrations
  (`vs-cpu.webp`/`two-players.webp`/`tutorial.webp`/`options.webp`), the
  three menu background scenes, and the app icon are all confirmed
  chess-specific and are Phase 10 work (spec §13, phase 10: "New visual
  assets... branding"). This plan uses flat gradients (menu tiles) and a
  gradient fallback layered behind a 404ing image path (backgrounds, see
  Task 6) so the app looks intentional today and needs zero rework once
  Phase 10 drops real files into the same paths.
- `/configurar`, `/jogar`, and every existing modal/toast component
  (`RulesModal`, `GameEndModal`, `ConfirmModal`, `LearningPanel`, `Toast`)
  are **not** restyled with the new chrome in this plan. The spec's feature
  parity table (§5) only marks `/` and `/opcoes` for "New art" in this
  phase; the rest keep their plain-Tailwind, hardcoded-PT style until a
  later phase explicitly revisits them. `/configurar` gets exactly one
  small change (Task 12: its initial difficulty/color state reads from
  `Settings` instead of being hardcoded) — everything else about it is
  untouched.
- `CheckersBoard` stays "dumb": the new `boardTheme`/`pieceStyle` props are
  rendered exactly as given, with no knowledge of `Settings` or
  `useSettings()` — only the pages that render `<CheckersBoard>` read
  settings and pass them down as props.
- `lib/settings/` has no dependency on `lib/checkers/` beyond importing the
  two existing types it needs (`Difficulty`, `PlayerColor`) — same
  direction of dependency chess's `lib/settings/` has on `lib/chess/`.
- Reference implementation for every ported file: the sibling repo at
  `/Users/rpaquito/Documents/Projects/ChessLearningGame` (already checked
  out locally, same Next.js/React/Tailwind versions). Each task below
  already includes the adapted code — you do not need to re-read the
  sibling repo to implement this plan, but it's there if something is
  ambiguous.

---

## Task 1: Visual identity tokens (design palette + fonts)

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: Tailwind color tokens `bg-ink`, `bg-ink-soft`, `text-cyan`,
  `text-pink`, `text-gold`, `text-purple`, `text-lilac` (and their `bg-`/
  `border-` variants, since `@theme inline` registers plain color tokens);
  `font-display` (Bangers) and `font-sans` (Poppins, already the default via
  `body`'s `font-family`). Every later task in this plan (`ChipButton`,
  `PageChrome`, `/`, `/opcoes`) consumes these token names directly.

No dedicated automated test — this is CSS/font wiring with no logic to
assert against (same as the sibling repo, which has no test file for either
of these). Verified via `npm run build` (fonts must resolve, no CSS parse
errors) and a manual look at `npm run dev`.

- [ ] **Step 1: Replace the placeholder tokens in `app/globals.css`**

```css
@import "tailwindcss";

/* "Anime" visual identity (design spec §8) -- ported from Chess Sensei's
   redesign. Always dark, doesn't depend on prefers-color-scheme -- there is
   no light variant of this app. */
:root {
  --background: #1A0B33;
  --foreground: #FFF6EE;

  /* Named palette -- distinct names so they don't collide with Tailwind's
     own default palette (stone/sky/emerald/etc.), which some earlier,
     pre-redesign code in this repo may still use. */
  --color-ink: #1A0B33;
  --color-ink-soft: #241246;
  --color-cyan: #00E5FF;
  --color-pink: #FF6FA5;
  --color-gold: #FFD600;
  --color-purple: #7B3FA0;
  --color-lilac: #E8D9FF;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-ink: var(--color-ink);
  --color-ink-soft: var(--color-ink-soft);
  --color-cyan: var(--color-cyan);
  --color-pink: var(--color-pink);
  --color-gold: var(--color-gold);
  --color-purple: var(--color-purple);
  --color-lilac: var(--color-lilac);
  --font-sans: var(--font-poppins);
  --font-display: var(--font-bangers);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-poppins), system-ui, sans-serif;
}
```

Deliberately dropped from the sibling repo's version: the confetti
keyframe/`--animate-confetti-pop` token (`GameEndModal` has no confetti yet,
Phase 10 per its own CLAUDE.md note) and the `env(safe-area-inset-*)`
padding (no Capacitor/native iOS shell yet — Phase 11). Add both back
when those phases land.

- [ ] **Step 2: Wire Bangers + Poppins in `app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import { Bangers, Poppins } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/Toast/ToastProvider';

// "Anime" visual identity (spec §8): Bangers for display/titles only
// (`font-display`, see globals.css), Poppins for everything else
// (`font-sans`, the default via body's font-family above). `latin-ext`
// alongside `latin` because all copy is PT-PT and needs the accented
// characters.
const bangers = Bangers({
  weight: '400',
  subsets: ['latin', 'latin-ext'],
  variable: '--font-bangers',
  display: 'swap',
});

const poppins = Poppins({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin', 'latin-ext'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Checkers Sensei',
  description:
    'Jogue às damas contra o computador ou com um amigo, com dicas para aprender a jogar melhor.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT" className={`${bangers.variable} ${poppins.variable}`}>
      <body className="antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
```

Deliberately not ported yet: `manifest`/`appleWebApp`/`icons` metadata
(Phase 9 PWA + Phase 10 icon assets), `viewport` safe-area config (Phase
11 native iOS), `LanguageSync` (Phase 8), `ServiceWorkerRegistration`
(Phase 9).

- [ ] **Step 3: Verify with a build**

Run: `npm run build`
Expected: build succeeds, no font-loading or CSS errors.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat(ui): port anime visual-identity design tokens and fonts

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 2: `ChipButton`

**Files:**
- Create: `components/ChipButton/ChipButton.tsx`
- Test: `components/ChipButton/ChipButton.test.tsx`

**Interfaces:**
- Produces: `ChipButton` (component), `ChipColor = 'purple' | 'cyan' |
  'pink' | 'gold'` (exported type). Consumed by Task 11 (`/opcoes`'s "Menu
  inicial" link back to `/`).

Verbatim port — already fully game-agnostic (a link-or-button with 4 color
variants and a diagonal-clip "stamped" shadow), nothing chess-specific in
it.

- [ ] **Step 1: Write the test**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChipButton } from './ChipButton';

describe('ChipButton', () => {
  it('renders as a link when given an href', () => {
    render(
      <ChipButton color="purple" href="/aprender">
        Ver tutorial
      </ChipButton>
    );
    const link = screen.getByRole('link', { name: 'Ver tutorial' });
    expect(link).toHaveAttribute('href', '/aprender');
  });

  it('renders as a button when given onClick instead of href', () => {
    const onClick = vi.fn();
    render(
      <ChipButton color="cyan" onClick={onClick}>
        Regras do jogo
      </ChipButton>
    );
    const button = screen.getByRole('button', { name: 'Regras do jogo' });
    button.click();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('applies a distinct background per color so chips never look identical', () => {
    const { rerender, container } = render(
      <ChipButton color="purple" onClick={() => {}}>
        A
      </ChipButton>
    );
    const purpleBg = (container.firstChild as HTMLElement).style.background;

    rerender(
      <ChipButton color="cyan" onClick={() => {}}>
        A
      </ChipButton>
    );
    const cyanBg = (container.firstChild as HTMLElement).style.background;

    expect(purpleBg).not.toBe(cyanBg);
  });

  it('supports a disabled state that blocks onClick and shows reduced opacity (button)', () => {
    const onClick = vi.fn();
    render(
      <ChipButton color="pink" onClick={onClick} disabled>
        Seguinte
      </ChipButton>
    );
    const button = screen.getByRole('button', { name: 'Seguinte' });
    expect(button).toBeDisabled();
    expect(button.className).toContain('opacity-40');
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies the disabled styling to a link too, since <a> has no native disabled', () => {
    render(
      <ChipButton color="purple" href="/aprender" disabled>
        Ver tutorial
      </ChipButton>
    );
    const link = screen.getByRole('link', { name: 'Ver tutorial' });
    expect(link.className).toContain('opacity-40');
    expect(link.className).toContain('pointer-events-none');
  });

  it('blocks keyboard activation on a disabled link, not just pointer clicks', () => {
    render(
      <ChipButton color="purple" href="/aprender" disabled>
        Ver tutorial
      </ChipButton>
    );
    const link = screen.getByRole('link', { name: 'Ver tutorial' });
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link).toHaveAttribute('tabIndex', '-1');
  });

  it('does not apply disabled styling when disabled is omitted', () => {
    render(
      <ChipButton color="gold" onClick={() => {}}>
        Reiniciar
      </ChipButton>
    );
    const button = screen.getByRole('button', { name: 'Reiniciar' });
    expect(button).not.toBeDisabled();
    expect(button.className).not.toContain('opacity-40');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ChipButton.test.tsx`
Expected: FAIL — `./ChipButton` doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```tsx
import { forwardRef, type ReactNode } from 'react';
import Link from 'next/link';

export type ChipColor = 'purple' | 'cyan' | 'pink' | 'gold';

// Same visual language as the menu tiles (diagonal clip, "stamped" shadow),
// at a secondary scale -- use this for ANY page-level link or action,
// never a bare underlined text link.
const CHIP_GRADIENT: Record<ChipColor, string> = {
  purple: 'linear-gradient(135deg, #B87FDB, #7B3FA0)',
  cyan: 'linear-gradient(135deg, #7DE0E6, #3FA9B0)',
  pink: 'linear-gradient(135deg, #FF9AC2, #FF6FA5)',
  gold: 'linear-gradient(135deg, #FFE066, #FFD600)',
};

const CHIP_TEXT: Record<ChipColor, string> = {
  purple: '#FFF6FF',
  cyan: '#0B2E30',
  pink: '#3A0B1F',
  gold: '#3A2A00',
};

export interface ChipButtonProps {
  color: ChipColor;
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

const BASE_CLASS =
  'inline-block font-semibold text-sm px-4 py-2 rounded-lg shadow-[3px_3px_0_rgba(0,0,0,0.35)] ' +
  '[clip-path:polygon(0_0,100%_0,100%_82%,93%_100%,0_100%)] transition-transform hover:scale-[1.03]';

// `ref` is only forwarded to the native button (the no-`href` variant) --
// the only case with a real consumer so far would be a future step-viewer
// needing manual focus management near a disabled boundary. The `<Link>`
// variant ignores the ref; add support there only when a real consumer
// needs it.
export const ChipButton = forwardRef<HTMLButtonElement, ChipButtonProps>(function ChipButton(
  { color, children, href, onClick, disabled = false, className = '' },
  ref
) {
  const style = { background: CHIP_GRADIENT[color], color: CHIP_TEXT[color] };
  const disabledClasses = disabled ? ' opacity-40 pointer-events-none' : '';
  const classes = `${BASE_CLASS}${disabledClasses} ${className}`.trim();

  if (href) {
    // <a> has no native `disabled` -- `pointer-events-none` (in
    // `disabledClasses`) already blocks the click, but without this the
    // link stays reachable and activatable via Tab+Enter.
    return (
      <Link
        href={href}
        style={style}
        className={classes}
        onClick={onClick}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : undefined}
      >
        {children}
      </Link>
    );
  }

  return (
    <button ref={ref} type="button" onClick={onClick} disabled={disabled} style={style} className={classes}>
      {children}
    </button>
  );
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- ChipButton.test.tsx`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add components/ChipButton/
git commit -m "feat(ui): ChipButton -- link/button chip with 4 color variants

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 3: `ToggleGroup` + `activeToggleStyle`

**Files:**
- Create: `lib/ui/activeToggleStyle.ts`
- Create: `components/ToggleGroup/ToggleGroup.tsx`
- Test: `components/ToggleGroup/ToggleGroup.test.tsx`

**Interfaces:**
- Produces: `ACTIVE_TOGGLE_STYLE` (object), `ToggleGroup<T extends string>`
  (component), `ToggleGroupOption<T>` (exported type). Consumed by Task 11
  (`/opcoes`'s difficulty/color pickers) and Task 12 (optionally, if
  `/configurar` is touched further — not required by this plan).

Verbatim port — already generic over `T extends string`, no chess/checkers
dependency (already used this way in this exact repo's own `LearningPanel`
precedent, though `LearningPanel` doesn't happen to use `ToggleGroup`
itself).

- [ ] **Step 1: Write the test**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ToggleGroup } from './ToggleGroup';

const OPTIONS = [
  { value: 'facil', label: 'facil' },
  { value: 'medio', label: 'medio' },
  { value: 'dificil', label: 'dificil' },
];

describe('ToggleGroup', () => {
  it('renders the legend and one button per option', () => {
    render(<ToggleGroup legend="Dificuldade" options={OPTIONS} value="facil" onChange={() => {}} />);
    expect(screen.getByText('Dificuldade')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'facil' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'medio' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'dificil' })).toBeInTheDocument();
  });

  it('marks only the current value as pressed', () => {
    render(<ToggleGroup legend="Dificuldade" options={OPTIONS} value="medio" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'facil' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'medio' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'dificil' })).toHaveAttribute('aria-pressed', 'false');
  });

  it("calls onChange with the clicked option's value", () => {
    const onChange = vi.fn();
    render(<ToggleGroup legend="Dificuldade" options={OPTIONS} value="facil" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'dificil' }));
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('dificil');
  });

  it('still calls onChange when the already-active option is clicked again', () => {
    const onChange = vi.fn();
    render(<ToggleGroup legend="Dificuldade" options={OPTIONS} value="facil" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'facil' }));
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('facil');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ToggleGroup.test.tsx`
Expected: FAIL — `./ToggleGroup` doesn't exist yet.

- [ ] **Step 3: Write the implementation**

`lib/ui/activeToggleStyle.ts`:

```ts
/**
 * Shared "active" style for toggle-style selection groups across the app
 * (difficulty/color in /configurar and /opcoes) -- one shared value instead
 * of repeating the same gradient by hand in each file. Inline instead of a
 * Tailwind bg-gradient-to-br utility: safer than depending on the exact
 * utility name (renamed across some Tailwind v4 versions).
 */
export const ACTIVE_TOGGLE_STYLE = {
  background: 'linear-gradient(135deg, #00E5FF, #4EA8DE)',
  color: '#0B2E30',
};
```

`components/ToggleGroup/ToggleGroup.tsx`:

```tsx
'use client';

import { ACTIVE_TOGGLE_STYLE } from '@/lib/ui/activeToggleStyle';

export interface ToggleGroupOption<T extends string> {
  value: T;
  label: string;
}

export interface ToggleGroupProps<T extends string> {
  legend: string;
  options: ToggleGroupOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * A group of toggle buttons (difficulty/color, etc.) -- generic over the
 * option value type so any page can reuse it without a chess/checkers
 * dependency. The caller is free to add its own logic (e.g. /opcoes calls
 * `updateSettings` + `toast.show(...)` inside its own `onChange`) -- this
 * component knows nothing about that.
 */
export function ToggleGroup<T extends string>({ legend, options, value, onChange }: ToggleGroupProps<T>) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="font-medium mb-1 text-white">{legend}</legend>
      <div className="flex gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            style={value === option.value ? ACTIVE_TOGGLE_STYLE : undefined}
            className={`flex-1 rounded-xl border-2 px-3 py-2 capitalize font-semibold transition-transform hover:scale-[1.02] ${
              value === option.value
                ? 'border-transparent shadow-[3px_3px_0_rgba(0,0,0,0.35)]'
                : 'border-purple/40 text-lilac'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- ToggleGroup.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/ui/activeToggleStyle.ts components/ToggleGroup/
git commit -m "feat(ui): ToggleGroup -- generic toggle-button selection group

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 4: `PageChrome`

**Files:**
- Create: `components/PageChrome/PageChrome.tsx`

**Interfaces:**
- Produces: `titleStroke(width, softDropPx?)`, `PageTitle`, `PageHeader`,
  `MODAL_BACKDROP_CLASS`, `PageGlow` (all exported). Consumed by Task 10
  (`/`) and Task 11 (`/opcoes`).

Verbatim port, no test file (matches the sibling repo, which also has none
for this file — it's pure presentational composition of already-tested
primitives like `PageTitle`'s inline style). One adaptation: `PageHeader`'s
logo references `/icons/icon-192.png`, which doesn't exist in this repo yet
(app icons are Phase 10 Draw Things work). Keep the same code (so Phase 10
just has to drop the file in) — until then the logo renders as an empty
rounded, shadowed box, which is a harmless, honest "nothing there yet"
placeholder, not a broken-image glyph (it's a CSS `background-image` on an
empty `<div>`, not an `<img>`).

- [ ] **Step 1: Write the implementation**

```tsx
import type { ReactNode } from 'react';

const STROKE_COLOR = '#1A0B33';

/**
 * Solid "comic-book" text-shadow outline (no blur) used on every gold
 * title in the app. `softDropPx`, when given, adds the 45°-drop-shadow
 * page `<h1>`s use (menu tile labels and modal `<h2>`s don't).
 */
export function titleStroke(width: 1 | 2, softDropPx?: number): string {
  const corners = [
    `-${width}px -${width}px 0 ${STROKE_COLOR}`,
    `${width}px -${width}px 0 ${STROKE_COLOR}`,
    `-${width}px ${width}px 0 ${STROKE_COLOR}`,
    `${width}px ${width}px 0 ${STROKE_COLOR}`,
  ];
  if (softDropPx) corners.push(`${softDropPx}px ${softDropPx}px 0 rgba(0,0,0,0.35)`);
  return corners.join(', ');
}

export interface PageTitleProps {
  as?: 'h1' | 'h2';
  /** Tailwind font-size class, e.g. "text-4xl". */
  size?: string;
  strokeWidth?: 1 | 2;
  /** Defaults to 4px when strokeWidth=2, no drop when strokeWidth=1. */
  softDrop?: number;
  className?: string;
  children: ReactNode;
}

/** Gold title with the "comic-book" outline -- see `titleStroke` above. */
export function PageTitle({
  as: Tag = 'h1',
  size = 'text-4xl',
  strokeWidth = 2,
  softDrop = strokeWidth === 2 ? 4 : undefined,
  className = '',
  children,
}: PageTitleProps) {
  return (
    <Tag
      className={`font-display tracking-wide text-gold ${size} ${className}`.trim()}
      style={{ textShadow: titleStroke(strokeWidth, softDrop) }}
    >
      {children}
    </Tag>
  );
}

export interface PageHeaderProps extends PageTitleProps {
  /** 'lg' for the home menu's bigger logo (56px); 'md' (default) elsewhere. */
  logoSize?: 'md' | 'lg';
  /**
   * Extra classes for the logo+title wrapper `<div>`. Needed on pages whose
   * `<main>` uses `items-center`: without an explicit width, this wrapper
   * would stretch to `<main>`'s width under flex's default `align-items:
   * stretch` -- but `items-center` replaces that with "shrink to content
   * and center", which would center the header instead of left-aligning it
   * with the rest of the page. Pass `w-full max-w-*` matching the content
   * column's width below it in that case.
   */
  wrapperClassName?: string;
}

const LOGO_SIZE_CLASS: Record<'md' | 'lg', string> = {
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
};

/**
 * Logo (`public/icons/icon-192.png` -- not generated until Phase 10, see
 * this file's own task notes; renders as an empty shadowed box until then)
 * + `PageTitle`, always left-aligned. Use this instead of a bare
 * `<PageTitle>` at the top of any page.
 */
export function PageHeader({ logoSize = 'md', wrapperClassName = '', ...titleProps }: PageHeaderProps) {
  return (
    <div className={`relative flex items-center gap-3 ${wrapperClassName}`.trim()}>
      <div
        aria-hidden="true"
        className={`${LOGO_SIZE_CLASS[logoSize]} shrink-0 rounded-2xl bg-cover bg-center shadow-[3px_3px_0_rgba(0,0,0,0.35)]`}
        style={{ backgroundImage: 'url(/icons/icon-192.png)' }}
      />
      <PageTitle {...titleProps} />
    </div>
  );
}

/**
 * Shared `fixed inset-0` backdrop for GameEndModal/RulesModal/ConfirmModal.
 * `pt-`/`pb-` (instead of a flat `p-4`) keep the panel clear of a
 * notch/Dynamic Island once the native iOS shell exists (Phase 11) --
 * `max(1rem, …)` keeps today's usual 1rem margin on any device without a
 * notch, or in a normal browser.
 */
export const MODAL_BACKDROP_CLASS =
  'fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 ' +
  'pt-[max(1rem,calc(env(safe-area-inset-top)+0.5rem))] pb-[max(1rem,env(safe-area-inset-bottom))]';

export interface PageGlowProps {
  /**
   * 'fixed' for scrollable pages (must not enter the flow, so it gets
   * `-z-10`); 'absolute' for single-view screens, where `<main>` already
   * clips overflow and later siblings have their own `relative` to stay on
   * top.
   */
  position?: 'fixed' | 'absolute';
  pinkOpacity?: number;
  /** [top, bottom] -- extra darkening toward ink, only where the
   * background underneath needs more contrast (menu, /jogar). */
  darken?: [number, number];
}

/**
 * Identity layer (radial pink glow, optional darkening toward ink) reused
 * on almost every page.
 */
export function PageGlow({ position = 'absolute', pinkOpacity = 0.2, darken }: PageGlowProps) {
  const layers = [
    `radial-gradient(circle at 50% -10%, rgba(255,111,165,${pinkOpacity}), transparent 55%)`,
  ];
  if (darken) {
    layers.push(
      `linear-gradient(180deg, rgba(26,11,51,${darken[0]}) 0%, rgba(26,11,51,${darken[1]}) 100%)`
    );
  }
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none ${position} inset-0${position === 'fixed' ? ' -z-10' : ''}`}
      style={{ background: layers.join(', ') }}
    />
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: no type errors (nothing imports this file yet, so this only
checks the file itself compiles).

- [ ] **Step 3: Commit**

```bash
git add components/PageChrome/
git commit -m "feat(ui): PageChrome -- PageTitle/PageHeader/PageGlow/modal backdrop

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 5: `lib/settings/settings.ts`

**Files:**
- Create: `lib/settings/settings.ts`
- Test: `lib/settings/settings.test.ts`

**Interfaces:**
- Produces: `Settings` (interface), `DEFAULT_SETTINGS`, `loadSettings()`,
  `saveSettings()`, `BoardTheme`, `BackgroundTheme`, `PieceStyle`, `Locale`
  (all exported types/values). Consumed by Task 6 (`themes.ts`), Task 7
  (`useSettings.ts`), Task 9 (`CheckersBoard`), Task 10 (`/`), Task 11
  (`/opcoes`), Task 12 (`/configurar`).

Adapted from the sibling repo: `defaultColor` uses this repo's real
`PlayerColor` (`'b' | 'w' | 'random'`, from `lib/checkers/playerColor.ts`),
not chess's `'white'/'black'/'random'`. `language` has **no browser
auto-detection** (unlike Chess Sensei's `resolveInitialLocale`/
`detectLocale`) — there's no i18n dictionary system yet for a detected
locale to actually change anything (every UI string in this repo is still
hardcoded PT), so detecting it now would be dead machinery. `language`
always defaults to `'pt'`; Phase 8 can add real detection once there's a
second dictionary for it to select. `Locale` is defined locally here (not
imported from `lib/checkers/moveExplanation.ts`, which already declares an
identical `Locale = 'pt' | 'en'`) — `lib/settings/` has no reason to depend
on `lib/checkers/` for a two-value string union, and the two will fold into
one `lib/i18n/types.ts` in Phase 8.

- [ ] **Step 1: Write the test**

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from './settings';

const STORAGE_KEY = 'checkers-settings';

describe('loadSettings', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns the defaults when nothing is saved', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('returns previously saved settings', () => {
    saveSettings({ ...DEFAULT_SETTINGS, defaultDifficulty: 'dificil', defaultColor: 'b' });
    expect(loadSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      defaultDifficulty: 'dificil',
      defaultColor: 'b',
    });
  });

  it('falls back to defaults field-by-field when one field is invalid', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_SETTINGS, defaultDifficulty: 'impossivel', defaultColor: 'b' })
    );
    expect(loadSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      defaultDifficulty: DEFAULT_SETTINGS.defaultDifficulty,
      defaultColor: 'b',
    });
  });

  it('falls back to defaults entirely when the saved data is not valid JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, 'not json{{{');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('falls back to defaults when the saved value is not an object', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify('a string, not an object'));
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('returns previously saved theme choices', () => {
    saveSettings({ ...DEFAULT_SETTINGS, boardTheme: 'neon', backgroundTheme: 'dojo' });
    expect(loadSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      boardTheme: 'neon',
      backgroundTheme: 'dojo',
    });
  });

  it('falls back to default theme choices when saved values are invalid', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_SETTINGS, boardTheme: 'nao-existe', backgroundTheme: 42 })
    );
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('returns a previously saved piece style', () => {
    saveSettings({ ...DEFAULT_SETTINGS, pieceStyle: 'moderno' });
    expect(loadSettings()).toEqual({ ...DEFAULT_SETTINGS, pieceStyle: 'moderno' });
  });

  it('falls back to the default piece style when the saved value is invalid', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_SETTINGS, pieceStyle: 'nao-existe' })
    );
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('DEFAULT_SETTINGS.language is "pt" with no auto-detection involved', () => {
    expect(DEFAULT_SETTINGS.language).toBe('pt');
  });

  it('falls back to the default language when the saved value is invalid', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, language: 'fr' }));
    expect(loadSettings().language).toBe('pt');
  });
});

describe('saveSettings', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persists settings that loadSettings can read back', () => {
    saveSettings({ ...DEFAULT_SETTINGS, defaultDifficulty: 'medio', defaultColor: 'random' });
    expect(loadSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      defaultDifficulty: 'medio',
      defaultColor: 'random',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- settings.test.ts`
Expected: FAIL — `./settings` doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```ts
import type { Difficulty } from '@/lib/checkers/difficulty';
import type { PlayerColor } from '@/lib/checkers/playerColor';

// Defined locally rather than imported from lib/checkers/moveExplanation.ts
// (which already declares an identical Locale) -- lib/settings/ has no
// reason to depend on lib/checkers/ for a two-value string union, and
// neither module should depend on the other just for this type. Both fold
// into a shared lib/i18n/types.ts in Phase 8.
export type Locale = 'pt' | 'en';

export type BoardTheme = 'sakura' | 'nebulosa' | 'neon';
export type BackgroundTheme = 'templo' | 'dojo' | 'cosmico';
export type PieceStyle = 'classico' | 'moderno' | 'anime';

export interface Settings {
  defaultDifficulty: Difficulty;
  defaultColor: PlayerColor;
  boardTheme: BoardTheme;
  backgroundTheme: BackgroundTheme;
  pieceStyle: PieceStyle;
  language: Locale;
}

export const DEFAULT_SETTINGS: Settings = {
  defaultDifficulty: 'facil',
  defaultColor: 'w',
  boardTheme: 'nebulosa',
  backgroundTheme: 'templo',
  pieceStyle: 'anime',
  language: 'pt',
};

// English, project-native from day one -- unlike chess's 'xadrez-settings'
// (which reflects that project's own pre-rebrand history), there's no
// reason to import that naming inconsistency here.
const STORAGE_KEY = 'checkers-settings';

const VALID_DIFFICULTIES: readonly Difficulty[] = ['facil', 'medio', 'dificil'];
const VALID_COLORS: readonly PlayerColor[] = ['b', 'w', 'random'];
const VALID_BOARD_THEMES: readonly BoardTheme[] = ['sakura', 'nebulosa', 'neon'];
const VALID_BACKGROUND_THEMES: readonly BackgroundTheme[] = ['templo', 'dojo', 'cosmico'];
const VALID_PIECE_STYLES: readonly PieceStyle[] = ['classico', 'moderno', 'anime'];
const VALID_LOCALES: readonly Locale[] = ['pt', 'en'];

/** Validates a stored value against a field's list of valid values,
 * returning it (type-narrowed) only if it matches one of them. */
function pickValid<T extends string>(value: unknown, valid: readonly T[], fallback: T): T {
  return typeof value === 'string' && (valid as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/**
 * Reads settings saved in localStorage. Missing, corrupted, or
 * old-shaped data falls back to defaults field-by-field -- one invalid
 * setting must not blow up the whole app or wipe out the other,
 * still-valid settings.
 */
export function loadSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    const candidate: Record<string, unknown> =
      typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};

    return {
      defaultDifficulty: pickValid(
        candidate.defaultDifficulty,
        VALID_DIFFICULTIES,
        DEFAULT_SETTINGS.defaultDifficulty
      ),
      defaultColor: pickValid(candidate.defaultColor, VALID_COLORS, DEFAULT_SETTINGS.defaultColor),
      boardTheme: pickValid(candidate.boardTheme, VALID_BOARD_THEMES, DEFAULT_SETTINGS.boardTheme),
      backgroundTheme: pickValid(
        candidate.backgroundTheme,
        VALID_BACKGROUND_THEMES,
        DEFAULT_SETTINGS.backgroundTheme
      ),
      pieceStyle: pickValid(candidate.pieceStyle, VALID_PIECE_STYLES, DEFAULT_SETTINGS.pieceStyle),
      language: pickValid(candidate.language, VALID_LOCALES, DEFAULT_SETTINGS.language),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage unavailable (private mode, full quota) -- choices just
    // don't persist across visits, nothing else in the app breaks.
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- settings.test.ts`
Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/settings/settings.ts lib/settings/settings.test.ts
git commit -m "feat(settings): Settings type + load/save, checkers PlayerColor shape

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 6: `lib/settings/themes.ts` + board texture assets

**Files:**
- Create: `lib/settings/themes.ts`
- Test: `lib/settings/themes.test.ts`
- Create (copy): `public/board/sakura-light-square.webp`,
  `public/board/sakura-dark-square.webp`,
  `public/board/nebulosa-light-square.webp`,
  `public/board/nebulosa-dark-square.webp`,
  `public/board/neon-light-square.webp`, `public/board/neon-dark-square.webp`

**Interfaces:**
- Produces: `BOARD_THEMES: Record<BoardTheme, BoardThemeInfo>`,
  `BACKGROUND_THEMES: Record<BackgroundTheme, BackgroundThemeInfo>` (both
  exported). Consumed by Task 9 (`CheckersBoard`, `BOARD_THEMES`), Task 10
  (`/`, `BACKGROUND_THEMES`), Task 11 (`/opcoes`, both).

The six board-square textures are flat colored/grain textures with no
chess imagery (visually verified during this plan's research) — safe to
copy unchanged. The three `background-*.webp` files are **not** copied
(see this plan's header: verified to contain chess pieces/boards baked into
the art) — `BACKGROUND_THEMES` still declares an `image` path for each
(so Phase 10 only has to drop files into `public/menu/` with no code
changes) plus a `fallbackGradient` that's what actually renders today.

- [ ] **Step 1: Copy the six board-square textures from the sibling repo**

```bash
mkdir -p public/board
cp /Users/rpaquito/Documents/Projects/ChessLearningGame/public/board/sakura-light-square.webp public/board/
cp /Users/rpaquito/Documents/Projects/ChessLearningGame/public/board/sakura-dark-square.webp public/board/
cp /Users/rpaquito/Documents/Projects/ChessLearningGame/public/board/nebulosa-light-square.webp public/board/
cp /Users/rpaquito/Documents/Projects/ChessLearningGame/public/board/nebulosa-dark-square.webp public/board/
cp /Users/rpaquito/Documents/Projects/ChessLearningGame/public/board/neon-light-square.webp public/board/
cp /Users/rpaquito/Documents/Projects/ChessLearningGame/public/board/neon-dark-square.webp public/board/
```

- [ ] **Step 2: Write the test**

```ts
import { describe, expect, it } from 'vitest';
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
      expect(BOARD_THEMES[theme].label.length).toBeGreaterThan(0);
    }
  });
});

describe('BACKGROUND_THEMES', () => {
  it('has a registry entry for every BackgroundTheme value', () => {
    for (const theme of ALL_BACKGROUND_THEMES) {
      expect(BACKGROUND_THEMES[theme]).toBeDefined();
      expect(BACKGROUND_THEMES[theme].image).toMatch(/^\/menu\//);
      expect(BACKGROUND_THEMES[theme].fallbackGradient.length).toBeGreaterThan(0);
      expect(BACKGROUND_THEMES[theme].label.length).toBeGreaterThan(0);
    }
  });

  it('gives each background theme a visibly distinct fallback gradient', () => {
    const gradients = ALL_BACKGROUND_THEMES.map((theme) => BACKGROUND_THEMES[theme].fallbackGradient);
    expect(new Set(gradients).size).toBe(ALL_BACKGROUND_THEMES.length);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- themes.test.ts`
Expected: FAIL — `./themes` doesn't exist yet.

- [ ] **Step 4: Write the implementation**

```ts
import type { BackgroundTheme, BoardTheme } from './settings';

export interface BoardThemeInfo {
  label: string;
  light: string;
  dark: string;
}

export interface BackgroundThemeInfo {
  label: string;
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
 * (CheckersBoard.tsx, app/page.tsx, app/opcoes/page.tsx).
 */
export const BOARD_THEMES: Record<BoardTheme, BoardThemeInfo> = {
  sakura: {
    label: 'Sakura',
    light: '/board/sakura-light-square.webp',
    dark: '/board/sakura-dark-square.webp',
  },
  nebulosa: {
    label: 'Nebulosa',
    light: '/board/nebulosa-light-square.webp',
    dark: '/board/nebulosa-dark-square.webp',
  },
  neon: {
    label: 'Néon',
    light: '/board/neon-light-square.webp',
    dark: '/board/neon-dark-square.webp',
  },
};

export const BACKGROUND_THEMES: Record<BackgroundTheme, BackgroundThemeInfo> = {
  templo: {
    label: 'Templo',
    image: '/menu/background-templo.webp',
    fallbackGradient: 'linear-gradient(160deg, #241246 0%, #1A0B33 55%, #3A1550 100%)',
  },
  dojo: {
    label: 'Dojo',
    image: '/menu/background-dojo.webp',
    fallbackGradient: 'linear-gradient(160deg, #0B2E30 0%, #1A0B33 55%, #14324a 100%)',
  },
  cosmico: {
    label: 'Cósmico',
    image: '/menu/background-cosmico.webp',
    fallbackGradient: 'radial-gradient(circle at 50% 20%, #3A1550 0%, #1A0B33 60%, #0d0620 100%)',
  },
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- themes.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/settings/themes.ts lib/settings/themes.test.ts public/board/
git commit -m "feat(settings): board/background theme registry + copied board textures

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 7: `lib/settings/useSettings.ts` + global test setup

**Files:**
- Create: `lib/settings/useSettings.ts`
- Test: `lib/settings/useSettings.test.ts`
- Modify: `vitest.setup.ts`

**Interfaces:**
- Produces: `useSettings(): { settings: Settings; updateSettings:
  (partial: Partial<Settings>) => void }`, `__resetSettingsCacheForTests()`
  (test-only export). NOT consumed by Task 9 (`CheckersBoard` itself stays
  settings-agnostic) — consumed by Task 10 (`/`), Task 11 (`/opcoes`), Task
  12 (`/configurar`).

Verbatim port of the `useSyncExternalStore` singleton pattern — no
checkers-specific logic in this file at all, only the `Settings` type it
imports differs. `vitest.setup.ts` already has a comment anticipating this
exact task ("NOTE for a later phase: once lib/settings/useSettings.ts
exists, add a beforeEach..."); this step fulfills and removes that note.
Unlike the sibling repo's setup file, no locale is seeded (no i18n
dictionaries exist to select between yet).

- [ ] **Step 1: Write the test**

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSettings, __resetSettingsCacheForTests } from './useSettings';
import { DEFAULT_SETTINGS, loadSettings } from './settings';

describe('useSettings', () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetSettingsCacheForTests();
  });

  it('starts from the defaults when nothing is saved', () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('starts from whatever was already saved', () => {
    window.localStorage.setItem(
      'checkers-settings',
      JSON.stringify({ ...DEFAULT_SETTINGS, defaultDifficulty: 'dificil', defaultColor: 'b' })
    );
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings).toEqual({
      ...DEFAULT_SETTINGS,
      defaultDifficulty: 'dificil',
      defaultColor: 'b',
    });
  });

  it('updateSettings merges a partial change and persists it', () => {
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.updateSettings({ defaultColor: 'b' });
    });
    expect(result.current.settings).toEqual({ ...DEFAULT_SETTINGS, defaultColor: 'b' });
    // Persisted for real, not just local React state -- a fresh load from
    // storage sees the same value.
    expect(loadSettings()).toEqual({ ...DEFAULT_SETTINGS, defaultColor: 'b' });
  });

  it('two separate updateSettings calls both persist (no lost update)', () => {
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.updateSettings({ defaultDifficulty: 'medio' });
    });
    act(() => {
      result.current.updateSettings({ defaultColor: 'random' });
    });
    expect(result.current.settings).toEqual({
      ...DEFAULT_SETTINGS,
      defaultDifficulty: 'medio',
      defaultColor: 'random',
    });
  });

  it('does not lose an update when two updateSettings calls happen before a re-render settles', () => {
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.updateSettings({ defaultDifficulty: 'medio' });
      result.current.updateSettings({ defaultColor: 'random' });
    });
    expect(result.current.settings).toEqual({
      ...DEFAULT_SETTINGS,
      defaultDifficulty: 'medio',
      defaultColor: 'random',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useSettings.test.ts`
Expected: FAIL — `./useSettings` doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```ts
'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from './settings';

export interface UseSettingsResult {
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => void;
}

/**
 * Module-singleton store behind useSettings, via useSyncExternalStore --
 * React's idiomatic mechanism for "sync an external value (localStorage)
 * into React". This solves two things at once:
 *
 * 1. Safe hydration: /opcoes (and any future settings-reading page) is
 *    pre-rendered -- reading the real localStorage value immediately would
 *    produce different server/client HTML whenever settings were already
 *    saved. getServerSnapshot always returns DEFAULT_SETTINGS (same on
 *    server and client); only after hydration does React switch to the
 *    real value via getSnapshot.
 * 2. No lost updates: since `cache` is a module value (not per hook
 *    instance), two updateSettings calls in a row -- even before a
 *    re-render -- always read the latest `cache`, with no separate ref
 *    needed to avoid merging against a stale `settings`. Bonus: multiple
 *    simultaneous useSettings instances (e.g. two components) stay
 *    automatically consistent with each other.
 */
let cache: Settings | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): Settings {
  if (cache === null) cache = loadSettings();
  return cache;
}

function getServerSnapshot(): Settings {
  return DEFAULT_SETTINGS;
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function setCache(next: Settings): void {
  cache = next;
  listeners.forEach((listener) => listener());
}

/**
 * Test-only: `cache` is a module value, so it survives between `it`s in
 * the same test file (ES modules aren't re-imported per test) -- without
 * this, the first test that mounted the hook would "freeze" the cache
 * forever, and later tests writing directly to localStorage would never
 * see that value reflected.
 */
export function __resetSettingsCacheForTests(): void {
  cache = null;
  listeners.clear();
}

export function useSettings(): UseSettingsResult {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    const next = { ...getSnapshot(), ...partial };
    saveSettings(next);
    setCache(next);
  }, []);

  return { settings, updateSettings };
}
```

- [ ] **Step 4: Update `vitest.setup.ts`**

Replace the trailing `NOTE for a later phase` comment with a real
`beforeEach`:

```ts
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { __resetSettingsCacheForTests } from '@/lib/settings/useSettings';

// @testing-library/react only auto-registers its afterEach(cleanup) hook in
// a Jest environment; under Vitest it must be wired up explicitly, or DOM
// from one test in a file leaks into the next.
afterEach(cleanup);

// Node 22+ ships an experimental global `localStorage`/`sessionStorage` that,
// without --localstorage-file, resolves to `undefined`. Vitest's jsdom
// environment only overrides globals that are not already own/inherited
// properties of `globalThis`, so this native stub shadows jsdom's real
// Storage implementation and `window.localStorage` ends up `undefined`.
// Restore the real jsdom-backed storage explicitly so tests can use it.
const jsdomGlobal = (globalThis as unknown as { jsdom?: { window: Window } }).jsdom;
if (typeof window !== 'undefined' && jsdomGlobal) {
  Object.defineProperty(window, 'localStorage', {
    value: jsdomGlobal.window.localStorage,
    configurable: true,
  });
  Object.defineProperty(window, 'sessionStorage', {
    value: jsdomGlobal.window.sessionStorage,
    configurable: true,
  });
}

// Clear persisted settings/localStorage before every test so one test's
// saved settings never leak into the next -- the settings cache is a
// module singleton (see useSettings.ts), so it survives across `it`s in
// the same file without this. No locale seeding here (unlike Chess
// Sensei's setup file) -- no i18n dictionaries exist yet to select
// between.
beforeEach(() => {
  window.localStorage.clear();
  __resetSettingsCacheForTests();
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test`
Expected: PASS — the new `useSettings.test.ts` (5 tests) passes, and the
full existing suite still passes (the new global `beforeEach` clearing
`localStorage` must not break any existing test; if something relied on
`localStorage` surviving across tests within a file, fix that test to seed
its own state inside its own `it`/`beforeEach`, not rely on suite order).

- [ ] **Step 6: Commit**

```bash
git add lib/settings/useSettings.ts lib/settings/useSettings.test.ts vitest.setup.ts
git commit -m "feat(settings): useSettings hook + global test-setup reset

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 8: `moderno` and `anime` piece styles + `PieceIcon` style dispatch

**Files:**
- Create: `components/CheckersBoard/pieceStyles/moderno.tsx`
- Create: `components/CheckersBoard/pieceStyles/anime.tsx`
- Modify: `components/CheckersBoard/PieceIcon.tsx`
- Test: `components/CheckersBoard/PieceIcon.test.tsx` (extend, don't
  replace — keep the two existing tests)

**Interfaces:**
- Produces: `PieceShape({ type: PieceKind }): ReactElement` from each new
  style file (same signature as `classico.tsx`'s, already established).
  `PieceIcon` gains an optional `style?: PieceStyle` prop, default
  `'classico'`. Consumed by Task 9 (`CheckersBoard`), Task 11 (`/opcoes`'s
  piece-style preview).

New, checkers-native disc designs — **not** ports of Chess Sensei's
piece-shape files (those are per-chess-piece-type silhouettes, which don't
apply to checkers' two-kind man/king shape). Same differentiation the
sibling repo uses (classico = circles/curves, moderno = flat angular
polygons, anime = jagged "crystal" edges), redrawn from scratch for a
disc+crown instead of chess pieces.

- [ ] **Step 1: Extend `PieceIcon.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PieceIcon } from './PieceIcon';

describe('PieceIcon', () => {
  it('renders an svg for a man, with no crown', () => {
    const { container } = render(<PieceIcon type="man" />);
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('polygon')).toBeNull();
  });

  it('renders a crown polygon for a king', () => {
    const { container } = render(<PieceIcon type="king" />);
    expect(container.querySelector('polygon')).not.toBeNull();
  });

  it('defaults to the classico style', () => {
    const { container: withDefault } = render(<PieceIcon type="king" />);
    const { container: withExplicit } = render(<PieceIcon type="king" style="classico" />);
    expect(withDefault.querySelector('svg')?.innerHTML).toBe(withExplicit.querySelector('svg')?.innerHTML);
  });

  it('renders a visibly different shape per style, for both man and king', () => {
    for (const type of ['man', 'king'] as const) {
      const results = (['classico', 'moderno', 'anime'] as const).map((style) => {
        const { container, unmount } = render(<PieceIcon type={type} style={style} />);
        const html = container.querySelector('svg')?.innerHTML;
        unmount();
        return html;
      });
      expect(new Set(results).size).toBe(3);
    }
  });

  it('renders at least one drawable shape for every type/style combination', () => {
    for (const type of ['man', 'king'] as const) {
      for (const style of ['classico', 'moderno', 'anime'] as const) {
        const { container, unmount } = render(<PieceIcon type={type} style={style} />);
        expect(container.querySelectorAll('circle, polygon').length).toBeGreaterThan(0);
        unmount();
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify the new assertions fail**

Run: `npm test -- PieceIcon.test.tsx`
Expected: FAIL — `PieceIcon` doesn't accept a `style` prop yet, and
`moderno`/`anime` don't exist.

- [ ] **Step 3: Write `pieceStyles/moderno.tsx`**

```tsx
import type { ReactElement } from 'react';
import type { PieceKind } from '@/lib/checkers/types';

// Second piece style -- same convention as classico.tsx (fill="currentColor",
// 100x100 viewBox, man vs. king differ only by a crown), but angular: an
// octagon instead of a circle, a polygon rim instead of a stroked ring, and
// a spikier crown -- reads as a distinct family from classico at a glance,
// the same idea Chess Sensei's moderno.tsx uses (polygons instead of
// circles/curves) applied to a disc instead of chess-piece silhouettes.
const DISC_POINTS = '50,10 75,20 88,45 88,55 75,80 50,90 25,80 12,55 12,45 25,20';
const RIM_POINTS = '50,23 68,30 77,48 77,52 68,70 50,77 32,70 23,52 23,48 32,30';
const CROWN_POINTS = '28,44 38,24 50,36 62,24 72,44 65,54 35,54';

export function PieceShape({ type }: { type: PieceKind }): ReactElement {
  return (
    <>
      <polygon points={DISC_POINTS} />
      <polygon points={RIM_POINTS} fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="4" />
      {type === 'king' && <polygon points={CROWN_POINTS} fill="currentColor" opacity="0.9" />}
    </>
  );
}
```

- [ ] **Step 4: Write `pieceStyles/anime.tsx`**

```tsx
import type { ReactElement } from 'react';
import type { PieceKind } from '@/lib/checkers/types';

// Third piece style, part of the "anime" visual identity (spec §8) -- a
// jagged, crystal-like disc instead of classico's smooth circle or
// moderno's flat octagon, plus a sparkle accent on kings instead of a plain
// crown, matching the pointed-edge language used elsewhere in the redesign
// (ChipButton's diagonal clip, the app's zigzag crown motif).
const JAGGED_DISC_POINTS =
  '50,8 58,20 72,14 74,28 88,30 82,44 92,54 80,60 84,74 70,72 64,86 52,78 42,90 36,76 22,80 22,66 8,60 18,50 8,38 22,34 20,20 34,24';
const CROWN_POINTS = '30,44 38,26 50,38 62,26 70,44 64,54 36,54';
const SPARKLE_POINTS = '50,20 53,28 61,30 53,32 50,40 47,32 39,30 47,28';

export function PieceShape({ type }: { type: PieceKind }): ReactElement {
  return (
    <>
      <polygon points={JAGGED_DISC_POINTS} />
      {type === 'king' ? (
        <>
          <polygon points={CROWN_POINTS} fill="currentColor" opacity="0.9" />
          <polygon points={SPARKLE_POINTS} fill="currentColor" />
        </>
      ) : (
        <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="3" />
      )}
    </>
  );
}
```

- [ ] **Step 5: Refactor `PieceIcon.tsx` to a style dispatch**

```tsx
import type { ReactElement } from 'react';
import type { PieceKind } from '@/lib/checkers/types';
import type { PieceStyle } from '@/lib/settings/settings';
import { PieceShape as ClassicoShape } from './pieceStyles/classico';
import { PieceShape as ModernoShape } from './pieceStyles/moderno';
import { PieceShape as AnimeShape } from './pieceStyles/anime';

export interface PieceIconProps {
  type: PieceKind;
  style?: PieceStyle;
}

const SHAPES: Record<PieceStyle, (props: { type: PieceKind }) => ReactElement> = {
  classico: ClassicoShape,
  moderno: ModernoShape,
  anime: AnimeShape,
};

export function PieceIcon({ type, style = 'classico' }: PieceIconProps): ReactElement {
  const Shape = SHAPES[style];
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" className="h-[78%] w-[78%]" aria-hidden="true">
      <Shape type={type} />
    </svg>
  );
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- PieceIcon.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 7: Commit**

```bash
git add components/CheckersBoard/pieceStyles/moderno.tsx components/CheckersBoard/pieceStyles/anime.tsx components/CheckersBoard/PieceIcon.tsx components/CheckersBoard/PieceIcon.test.tsx
git commit -m "feat(ui): moderno/anime piece styles, PieceIcon style dispatch

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 9: Wire `boardTheme`/`pieceStyle` into `CheckersBoard`

**Files:**
- Modify: `components/CheckersBoard/CheckersBoard.tsx`
- Test: `components/CheckersBoard/CheckersBoard.test.tsx` (extend, don't
  replace)

**Interfaces:**
- Produces: `CheckersBoardProps` gains `boardTheme?: BoardTheme` (default
  `'nebulosa'`) and `pieceStyle?: PieceStyle` (default `'classico'`).
  Consumed by Task 12's `/jogar` change is **not** in this plan (out of
  scope per Global Constraints) — this task only makes the props exist and
  work; wiring `/jogar` to pass real `settings.boardTheme`/`pieceStyle`
  through is deliberately left for a future phase alongside the rest of
  `/jogar`'s chrome, and is flagged in CLAUDE.md at the end of this plan.

`CheckersBoard` stays "dumb": these are plain rendering props, no
`useSettings()` call inside the board itself. Existing tests (which never
pass either prop) must keep passing unchanged, since the defaults preserve
today's visual behavior's *shape* (a themed square instead of a flat
Tailwind color, still one dark/light square per cell).

- [ ] **Step 1: Extend `CheckersBoard.test.tsx`**

Add this new `describe` block at the end of the file:

```tsx
describe('CheckersBoard theming', () => {
  it('uses the nebulosa board theme by default', () => {
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
    const square1 = container.querySelector('[aria-label="square 1"]') as HTMLElement;
    expect(square1.style.backgroundImage).toContain('nebulosa-dark-square.webp');
  });

  it('renders the requested board theme', () => {
    const { container } = render(
      <CheckersBoard
        board={createInitialBoard()}
        turn="b"
        selectedSquare={null}
        legalTargets={[]}
        mandatoryCaptureSquares={[]}
        lastMove={null}
        boardTheme="neon"
      />,
    );
    const square1 = container.querySelector('[aria-label="square 1"]') as HTMLElement;
    expect(square1.style.backgroundImage).toContain('neon-dark-square.webp');
  });

  it('passes pieceStyle through to the rendered pieces', () => {
    const { container: classico } = render(
      <CheckersBoard
        board={createInitialBoard()}
        turn="b"
        selectedSquare={null}
        legalTargets={[]}
        mandatoryCaptureSquares={[]}
        lastMove={null}
      />,
    );
    const { container: moderno } = render(
      <CheckersBoard
        board={createInitialBoard()}
        turn="b"
        selectedSquare={null}
        legalTargets={[]}
        mandatoryCaptureSquares={[]}
        lastMove={null}
        pieceStyle="moderno"
      />,
    );
    expect(classico.querySelector('svg')?.innerHTML).not.toBe(moderno.querySelector('svg')?.innerHTML);
  });
});
```

- [ ] **Step 2: Run test to verify the new assertions fail**

Run: `npm test -- CheckersBoard.test.tsx`
Expected: FAIL — `boardTheme`/`pieceStyle` props don't exist yet, squares
have no `backgroundImage`.

- [ ] **Step 3: Wire the props into the implementation**

Add imports:

```ts
import type { BoardTheme, PieceStyle } from '@/lib/settings/settings';
import { BOARD_THEMES } from '@/lib/settings/themes';
```

Extend `CheckersBoardProps`:

```ts
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
  onSquareClick?: (square: Square) => void;
}
```

Destructure the two new props with defaults matching today's visual look
(`'nebulosa'` is `DEFAULT_SETTINGS.boardTheme`; `'classico'` matches
`PieceIcon`'s own default so a bare `<CheckersBoard>` with nothing settings-
aware still renders exactly as it does today):

```ts
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
  onSquareClick,
}: CheckersBoardProps): ReactElement {
```

Replace the light filler square's flat color with the theme's light
texture:

```tsx
if (square === null) {
  squares.push(
    <div
      key={`light-${row}-${col}`}
      className="bg-cover bg-center"
      style={{ backgroundImage: `url(${BOARD_THEMES[boardTheme].light})` }}
      aria-hidden="true"
    />,
  );
  continue;
}
```

Replace the dark square button's flat `bg-stone-700` with the theme's dark
texture (remove `'bg-stone-700'` from the className array, add
`'bg-cover bg-center'`, and add a `style` prop):

```tsx
squares.push(
  <button
    key={square}
    type="button"
    disabled={!interactive}
    onClick={() => onSquareClick?.(square)}
    aria-label={`square ${square}`}
    style={{ backgroundImage: `url(${BOARD_THEMES[boardTheme].dark})` }}
    className={[
      'relative aspect-square min-h-0 min-w-0 overflow-hidden bg-cover bg-center',
      isLastMove ? 'ring-4 ring-yellow-400' : '',
      isSelected ? 'outline outline-4 outline-sky-500' : '',
      isMandatory ? 'outline outline-4 outline-amber-400' : '',
      isSuggested ? 'outline outline-4 outline-violet-400' : '',
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {isLegalTarget && <span className="absolute inset-0 m-auto h-1/4 w-1/4 rounded-full bg-emerald-400/70" />}
  </button>,
);
```

Thread `pieceStyle` into `PieceIcon`:

```tsx
<PieceIcon type={piece.kind} style={pieceStyle} />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- CheckersBoard.test.tsx`
Expected: PASS (all 11 prior tests unchanged, plus the 3 new ones — 14 total).

- [ ] **Step 5: Commit**

```bash
git add components/CheckersBoard/CheckersBoard.tsx components/CheckersBoard/CheckersBoard.test.tsx
git commit -m "feat(ui): CheckersBoard -- boardTheme/pieceStyle props, real square textures

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 10: `/` home menu

**Files:**
- Modify (rewrite): `app/page.tsx`

**Interfaces:**
- Consumes: `PageGlow`/`PageHeader`/`titleStroke` (Task 4),
  `BACKGROUND_THEMES` (Task 6), `useSettings` (Task 7), `clearSavedGame`
  (already exists, `lib/checkers/useCheckersGame.ts`).

Four tiles (vs-computer / two-players / learn-to-play / options), each a
flat gradient (no per-tile illustration — see Global Constraints) instead
of Chess Sensei's `vs-cpu.webp`/etc. background images. The "learn to play"
tile links to `/aprender`, which doesn't exist until Phase 6 (the very next
phase per the spec's build order, §13) — this is a deliberately temporary
404, the same "documented, not hidden" tolerance this repo already uses for
forward-reaching links (e.g. `RulesModal` built with no trigger button
yet). No dedicated test file, matching the sibling repo's own precedent (no
`app/page.test.tsx` exists there either — the page is nearly all static
links with negligible logic to assert against). Verify manually via
`npm run dev`.

- [ ] **Step 1: Write `app/page.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { clearSavedGame } from '@/lib/checkers/useCheckersGame';
import { PageGlow, PageHeader, titleStroke } from '@/components/PageChrome/PageChrome';
import { BACKGROUND_THEMES } from '@/lib/settings/themes';
import { useSettings } from '@/lib/settings/useSettings';

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

// No per-tile illustration yet -- Chess Sensei's vs-cpu.webp/two-players.
// webp/tutorial.webp/options.webp are chess-specific art; new Draw Things
// generation for checkers equivalents is Phase 10 (see this plan's Global
// Constraints and CLAUDE.md). Each tile is its own gradient instead, in the
// same 4 accent colors real art will sit behind once it lands.
const TILES: TileData[] = [
  {
    href: '/configurar',
    gradient: 'linear-gradient(135deg, #00E5FF, #4EA8DE)',
    emoji: '⚔️',
    label: 'Jogar contra o computador',
  },
  {
    href: '/jogar?mode=local',
    gradient: 'linear-gradient(135deg, #FF9AC2, #FF6FA5)',
    emoji: '✨',
    label: 'Dois jogadores',
  },
  {
    // /aprender doesn't exist until Phase 6 (next per spec §13) -- this
    // tile links ahead of it deliberately, same as other forward-reaching
    // wiring already documented in CLAUDE.md.
    href: '/aprender',
    gradient: 'linear-gradient(135deg, #B87FDB, #7B3FA0)',
    emoji: '📖',
    label: 'Aprender a jogar',
  },
  {
    href: '/opcoes',
    gradient: 'linear-gradient(135deg, #FFE066, #FFD600)',
    emoji: '⚙️',
    label: 'Opções',
  },
];

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
  const theme = BACKGROUND_THEMES[settings.backgroundTheme];

  const tiles = TILES.map((tile) =>
    tile.href === '/jogar?mode=local' ? { ...tile, onClick: () => clearSavedGame() } : tile
  );

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
        Checkers Sensei
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

- [ ] **Step 2: Verify manually**

Run: `npm run dev`, open `/`. Expected: four gradient tiles, correct
labels/emoji, clicking "Jogar contra o computador" goes to `/configurar`,
"Dois jogadores" goes to `/jogar?mode=local` and clears any saved game,
"Opções" goes to `/opcoes` (built next task), "Aprender a jogar" 404s
(expected — Phase 6).

- [ ] **Step 3: Run the full suite and build**

Run: `npm test && npm run build`
Expected: PASS / build succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat(app): real home menu -- 4 tiles, background theme, no art yet

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 11: `/opcoes` settings page

**Files:**
- Create: `app/opcoes/page.tsx`
- Test: `app/opcoes/page.test.tsx`

**Interfaces:**
- Consumes: `useSettings` (Task 7), `BOARD_THEMES`/`BACKGROUND_THEMES`
  (Task 6), `PieceIcon` (Task 8), `ChipButton` (Task 2), `PageGlow`/
  `PageHeader` (Task 4), `ToggleGroup` (Task 3), `useToast` (already
  exists, `components/Toast/ToastProvider.tsx`).

Difficulty/color defaults (`ToggleGroup`) and board/piece/background theme
pickers (a local `OptionPicker`, same shell as the sibling repo's). No
language toggle (see Global Constraints — `Settings.language` exists in
the type but has no UI control until Phase 8 gives it a real effect).

- [ ] **Step 1: Write the test**

```tsx
import { describe, expect, it, beforeEach } from 'vitest';
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- app/opcoes/page.test.tsx`
Expected: FAIL — `./page` doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```tsx
'use client';

import type { ReactNode } from 'react';
import type { Difficulty } from '@/lib/checkers/difficulty';
import type { PlayerColor } from '@/lib/checkers/playerColor';
import type { BackgroundTheme, BoardTheme, PieceStyle } from '@/lib/settings/settings';
import { BACKGROUND_THEMES, BOARD_THEMES } from '@/lib/settings/themes';
import { useSettings } from '@/lib/settings/useSettings';
import { PieceIcon } from '@/components/CheckersBoard/PieceIcon';
import { ChipButton } from '@/components/ChipButton/ChipButton';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';
import { ToggleGroup } from '@/components/ToggleGroup/ToggleGroup';
import { useToast } from '@/components/Toast/ToastProvider';

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 'facil', label: 'Fácil' },
  { value: 'medio', label: 'Médio' },
  { value: 'dificil', label: 'Difícil' },
];

const COLOR_OPTIONS: { value: PlayerColor; label: string }[] = [
  { value: 'b', label: 'Pretas' },
  { value: 'w', label: 'Brancas' },
  { value: 'random', label: 'Aleatório' },
];

const PIECE_STYLE_OPTIONS: { id: PieceStyle; label: string }[] = [
  { id: 'classico', label: 'Clássico' },
  { id: 'moderno', label: 'Moderno' },
  { id: 'anime', label: 'Anime' },
];

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

const BOARD_THEME_OPTIONS: { id: BoardTheme; label: string; image: string; image2: string }[] = (
  Object.keys(BOARD_THEMES) as BoardTheme[]
).map((id) => ({ id, label: BOARD_THEMES[id].label, image: BOARD_THEMES[id].light, image2: BOARD_THEMES[id].dark }));

const BACKGROUND_THEME_OPTIONS: { id: BackgroundTheme; label: string; image: string; fallbackGradient: string }[] = (
  Object.keys(BACKGROUND_THEMES) as BackgroundTheme[]
).map((id) => ({
  id,
  label: BACKGROUND_THEMES[id].label,
  image: BACKGROUND_THEMES[id].image,
  fallbackGradient: BACKGROUND_THEMES[id].fallbackGradient,
}));

export default function OpcoesPage() {
  const { settings, updateSettings } = useSettings();
  const toast = useToast();

  return (
    <main className="relative flex flex-col items-center justify-start p-8 overflow-hidden bg-ink">
      <PageGlow pinkOpacity={0.25} />
      <div className="relative w-full max-w-sm">
        <PageHeader>Opções</PageHeader>
        <p className="mt-3">
          <ChipButton color="purple" href="/">
            Menu inicial
          </ChipButton>
        </p>
      </div>
      <div className="relative flex flex-col gap-6 max-w-sm w-full mt-8">
        <ToggleGroup
          legend="Dificuldade por omissão"
          options={DIFFICULTY_OPTIONS}
          value={settings.defaultDifficulty}
          onChange={(level) => {
            updateSettings({ defaultDifficulty: level });
            toast.show('Dificuldade por omissão atualizada.');
          }}
        />

        <ToggleGroup
          legend="Cor por omissão"
          options={COLOR_OPTIONS}
          value={settings.defaultColor}
          onChange={(value) => {
            updateSettings({ defaultColor: value });
            toast.show('Cor por omissão atualizada.');
          }}
        />

        <OptionPicker
          legend="Tema do tabuleiro"
          options={BOARD_THEME_OPTIONS}
          value={settings.boardTheme}
          onChange={(boardTheme) => {
            updateSettings({ boardTheme });
            toast.show('Tema do tabuleiro atualizado.');
          }}
          renderPreview={(opt) => <ThemeSwatch image={opt.image} image2={opt.image2} />}
        />
        <OptionPicker
          legend="Estilo das peças"
          options={PIECE_STYLE_OPTIONS}
          value={settings.pieceStyle}
          onChange={(pieceStyle) => {
            updateSettings({ pieceStyle });
            toast.show('Estilo das peças atualizado.');
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
          legend="Imagem de fundo"
          options={BACKGROUND_THEME_OPTIONS}
          value={settings.backgroundTheme}
          onChange={(backgroundTheme) => {
            updateSettings({ backgroundTheme });
            toast.show('Imagem de fundo atualizada.');
          }}
          renderPreview={(opt) => <ThemeSwatch image={opt.image} fallbackGradient={opt.fallbackGradient} />}
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- app/opcoes/page.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add app/opcoes/
git commit -m "feat(app): /opcoes -- persisted defaults + board/piece/background pickers

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 12: Wire `/configurar`'s initial difficulty/color to `Settings`

**Files:**
- Modify: `app/configurar/page.tsx`
- Test: `app/configurar/page.test.tsx` (new — none exists yet)

**Interfaces:**
- Consumes: `useSettings` (Task 7).

The only change to `/configurar` in this plan (see Global Constraints —
everything else about this page, including its plain-Tailwind styling,
stays untouched). Without this, `Settings.defaultDifficulty`/`defaultColor`
would be dead fields nothing ever reads. Matches Chess Sensei's own
`GameSetup.tsx` precedent exactly, including its caveat: the `useState`
initializer only runs on the very first render, so it picks up
`useSettings()`'s real value only when the settings cache is already warm
(i.e. `/configurar` was reached via client-side navigation from a page that
already called `useSettings()`, such as the new `/` home menu) — a full
page load straight to `/configurar` (typed URL) still shows the global
defaults for one visit, same known, accepted tradeoff as chess's identical
pattern.

- [ ] **Step 1: Write the test**

```tsx
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { saveSettings, DEFAULT_SETTINGS } from '@/lib/settings/settings';
import ConfigurarPage from './page';

describe('ConfigurarPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to the medio/pretas fallback when no settings are saved', () => {
    render(<ConfigurarPage />);
    expect(screen.getByRole('button', { name: 'Médio' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Pretas' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('starts from the saved default difficulty and color when settings are already warm', () => {
    saveSettings({ ...DEFAULT_SETTINGS, defaultDifficulty: 'dificil', defaultColor: 'w' });
    render(<ConfigurarPage />);
    expect(screen.getByRole('button', { name: 'Difícil' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Brancas' })).toHaveAttribute('aria-pressed', 'true');
  });
});
```

Note: `vitest.setup.ts`'s global `beforeEach` (Task 7) already resets the
`useSettings` module cache to `null` before every test, so the second
test's `saveSettings()` call (which writes storage directly) is guaranteed
to be seen by `useSettings()`'s first read in that test — `getSnapshot()`
calls `loadSettings()` fresh whenever `cache` is `null`. No extra reset
needed inside the test itself.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- app/configurar/page.test.tsx`
Expected: FAIL — the page currently hardcodes `useState<Difficulty>('medio')`
and `useState<PlayerColor>('b')`, so the second test's saved `'dificil'`/`'w'`
never shows as pressed.

- [ ] **Step 3: Update the implementation**

In `app/configurar/page.tsx`, add the import and read the initial state
from settings:

```tsx
import { useSettings } from '@/lib/settings/useSettings';
```

```tsx
export default function ConfigurarPage() {
  const router = useRouter();
  const { settings } = useSettings();
  const [difficulty, setDifficulty] = useState<Difficulty>(settings.defaultDifficulty);
  const [color, setColor] = useState<PlayerColor>(settings.defaultColor);
```

(Everything else in the file — `handleStart`, the two `fieldset`s, the
"Começar"/"Menu inicial" controls — stays exactly as it is today.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- app/configurar/page.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions in any other file.

- [ ] **Step 6: Commit**

```bash
git add app/configurar/page.tsx app/configurar/page.test.tsx
git commit -m "feat(app): /configurar -- initial difficulty/color read from Settings

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 13: Close out the phase in `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

Per the project's own process rule ("updated at the end of every
implementation-plan phase with whatever new non-obvious convention that
phase introduced"). No test — documentation only.

- [ ] **Step 1: Update the `Structure` section**

Add entries for every new/changed path this plan touched: `lib/ui/
activeToggleStyle.ts`, `components/ChipButton/`, `components/ToggleGroup/`,
`components/PageChrome/`, `lib/settings/` (settings.ts/themes.ts/
useSettings.ts), the new `pieceStyles/moderno.tsx`/`anime.tsx` and
`PieceIcon.tsx`'s style dispatch, `CheckersBoard.tsx`'s new props,
`app/page.tsx` (real menu, replacing the bootstrap placeholder),
`app/opcoes/page.tsx` (new), `app/configurar/page.tsx`'s settings wiring,
and `public/board/` (new).

- [ ] **Step 2: Add a new `Conventions` entry documenting the background-art finding**

Record, in CLAUDE.md's own voice (matching its existing "documented, not
solved" entries): that spec §8's claim about Chess Sensei's
`background-*.webp` files being chess-agnostic was verified false by
directly viewing them; only `public/board/*.webp` was actually safe to
copy; `BACKGROUND_THEMES` ships a `fallbackGradient` per theme so
`/opcoes`'s picker and `/`'s background aren't broken while Phase 10's real
art is pending.

- [ ] **Step 3: Add a `Conventions` entry documenting what stayed out of scope**

Record that `/configurar`, `/jogar`, and every modal/toast component were
deliberately NOT restyled with the new chrome in this phase (matches the
spec's feature-parity table, which only marks `/` and `/opcoes` for new art
in this phase) — and that `CheckersBoard`'s new `boardTheme`/`pieceStyle`
props exist and are tested, but `/jogar` doesn't pass real `settings`
values into them yet (it still renders with the props' defaults) — that
wiring is left for the phase that gives `/jogar` its own visual pass.

- [ ] **Step 4: Add a `Conventions` entry documenting `Settings.language`'s no-op status**

Record that `Settings.language` has no auto-detection (unlike Chess
Sensei's `detectLocale`) and no `/opcoes` control yet — it exists purely
for storage-shape forward-compatibility with Phase 8, defaults to `'pt'`,
and nothing reads it besides that default.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: close out Menu/Settings/Visual-Identity phase in CLAUDE.md

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```
