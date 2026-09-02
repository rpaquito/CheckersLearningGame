# Tutorial Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 6 of the design spec's build phasing (§13): the tutorial
hub at `/aprender` and its five content subpages (`pecas`, `regras-especiais`,
`fim-de-jogo`, `estrategia`, `centipawns`) — playable single-piece demos for
movement/capture/promotion rules, plus text-only strategy and move-quality
explainer pages. `/aprender/aberturas` (the openings/traps trainer) is a
separate phase (§13, phase 7) and is NOT built here — the hub links to it
anyway, a deliberately temporary 404 until that phase lands, same tolerance
this repo already uses for forward-reaching links (e.g. the home menu's
"Aprender a jogar" tile before this very phase existed).

**Architecture:** A new `lib/checkers/demoBoards.ts` module builds every
demo's starting `Board` from `(row, col)` coordinates via a `squareAt`/
`buildBoard` helper — never a hand-typed square number — and every position
is verified against the real rules engine (`legalMovesFrom`) in its own test
file before any page ever renders it. A new `components/InteractiveDemo/
InteractiveDemo.tsx` (ported from Chess Sensei's component of the same name,
adapted to checkers' `Board`/`CheckersMove` shape instead of chess's FEN)
gives each demo its own isolated, resettable, single-piece state and calls
straight into `legalMovesFrom`/`applyMove` to validate and apply clicks,
reusing `CheckersBoard`'s existing click interaction and slide/capture-fade
animation for free. `components/NavCard/NavCard.tsx` (ported, trivial) is the
hub's link-card shell.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest + Testing
Library, Tailwind v4 — identical to every prior phase in this repo.

**Spec:** `docs/superpowers/specs/2026-08-31-checkers-sensei-design.md` §5
("Feature parity map" — the `/aprender` route table), §13 (phase 6). The
demo positions and their pedagogical framing are this plan's own design,
argued from the already-implemented and already-tested rules engine
(`lib/checkers/moveGeneration.ts`, `lib/checkers/gameStatus.ts`) — not
independently re-derivable from the spec, which doesn't go into this level
of content detail.

## Global Constraints

- No worktrees, no feature branches. Commit each task's changes directly to
  `main` and push (`git push origin main`) once its tests pass, before
  starting the next task — never batch multiple tasks into one unpushed
  commit (CLAUDE.md §Process rules).
- Portuguese-only in every new UI string (hardcoded, no i18n system exists
  until Phase 8) — same convention every prior phase has followed.
- **Never hand-type a checkers square number.** `lib/checkers/demoBoards.ts`'s
  `squareAt(row, col)`/`buildBoard(pieces)` (Task 1) are the only sanctioned
  way any file in this plan names a board position — CLAUDE.md's own
  "Spec §2's compact board notation was never implemented" entry already
  flags hand-indexed `board[N] = {...}` comments as the exact, error-prone
  pattern that caused real defects in this codebase before. Every task
  after Task 1 that needs to reference a square (in a page or a test)
  calls `squareAt(row, col)` — it never writes a literal square number.
- Every demo position in `demoBoards.ts` must have a test in the same task
  that asserts its actual legal-move behavior via `legalMovesFrom` (the
  real, already-tested engine) — this is how a hand-designed position gets
  caught if it's wrong, before any page ever renders it.
- `InteractiveDemo` and every `/aprender` page use `ChipButton`/`PageChrome`
  (Phase 5), matching `/` and `/opcoes`'s established visual chrome — this
  is the same generation of pages, not `/configurar`/`/jogar`'s older
  plain-Tailwind style.
- This plan does not restyle `/`, `/opcoes`, `/configurar`, or `/jogar`, and
  does not touch `lib/checkers/moveGeneration.ts`, `evaluate.ts`,
  `moveClassification.ts`, or `moveExplanation.ts` — only reads from them.

---

## Task 1: `lib/checkers/demoBoards.ts` — demo position builder + 6 positions

**Files:**
- Create: `lib/checkers/demoBoards.ts`
- Test: `lib/checkers/demoBoards.test.ts`

**Interfaces:**
- Produces: `squareAt(row: number, col: number): Square`, `buildBoard(pieces:
  DemoPieceSpec[]): Board`, `DemoPieceSpec { row, col, color, kind }`,
  `DemoPosition { board: Board; square: Square }`, and six exported
  `DemoPosition` constants: `MAN_MOVEMENT_DEMO`, `KING_MOVEMENT_DEMO`,
  `PROMOTION_DEMO`, `MANDATORY_CAPTURE_DEMO`, `MULTI_JUMP_DEMO`,
  `NO_LEGAL_MOVES_DEMO`. Consumed by Task 2's test, Task 5 (`/aprender/
  pecas`), Task 6 (`/aprender/regras-especiais`), Task 7 (`/aprender/
  fim-de-jogo`).

- [ ] **Step 1: Write the test**

```ts
import { describe, expect, it } from 'vitest';
import {
  buildBoard,
  squareAt,
  MAN_MOVEMENT_DEMO,
  KING_MOVEMENT_DEMO,
  PROMOTION_DEMO,
  MANDATORY_CAPTURE_DEMO,
  MULTI_JUMP_DEMO,
  NO_LEGAL_MOVES_DEMO,
} from './demoBoards';
import { legalMovesFrom } from './moveGeneration';

describe('squareAt / buildBoard', () => {
  it('throws for a light (non-playable) square', () => {
    expect(() => squareAt(0, 0)).toThrow();
  });

  it('places a piece at the resolved square', () => {
    const board = buildBoard([{ row: 0, col: 1, color: 'b', kind: 'man' }]);
    expect(board[squareAt(0, 1) - 1]).toEqual({ color: 'b', kind: 'man' });
  });
});

describe('MAN_MOVEMENT_DEMO', () => {
  it('has exactly two legal simple moves, both forward diagonals', () => {
    const moves = legalMovesFrom(MAN_MOVEMENT_DEMO.board, 'b', MAN_MOVEMENT_DEMO.square);
    const targets = moves.map((m) => m.to).sort((a, b) => a - b);
    const expected = [squareAt(4, 1), squareAt(4, 3)].sort((a, b) => a - b);
    expect(targets).toEqual(expected);
  });
});

describe('KING_MOVEMENT_DEMO', () => {
  it('has exactly four legal moves, one per diagonal direction', () => {
    const moves = legalMovesFrom(KING_MOVEMENT_DEMO.board, 'b', KING_MOVEMENT_DEMO.square);
    expect(moves).toHaveLength(4);
  });
});

describe('PROMOTION_DEMO', () => {
  it('promotes on both of its legal landing squares', () => {
    const moves = legalMovesFrom(PROMOTION_DEMO.board, 'b', PROMOTION_DEMO.square);
    expect(moves).toHaveLength(2);
    expect(moves.every((m) => m.promotes)).toBe(true);
  });
});

describe('MANDATORY_CAPTURE_DEMO', () => {
  it('has exactly one legal move: the jump', () => {
    const moves = legalMovesFrom(MANDATORY_CAPTURE_DEMO.board, 'b', MANDATORY_CAPTURE_DEMO.square);
    expect(moves).toHaveLength(1);
    expect(moves[0].to).toBe(squareAt(4, 3));
    expect(moves[0].captures).toEqual([squareAt(3, 2)]);
  });
});

describe('MULTI_JUMP_DEMO', () => {
  it('has exactly one legal move that captures both white men', () => {
    const moves = legalMovesFrom(MULTI_JUMP_DEMO.board, 'b', MULTI_JUMP_DEMO.square);
    expect(moves).toHaveLength(1);
    expect(moves[0].to).toBe(squareAt(4, 5));
    const captures = moves[0].captures.slice().sort((a, b) => a - b);
    const expected = [squareAt(1, 2), squareAt(3, 4)].sort((a, b) => a - b);
    expect(captures).toEqual(expected);
  });
});

describe('NO_LEGAL_MOVES_DEMO', () => {
  it('has zero legal moves', () => {
    const moves = legalMovesFrom(NO_LEGAL_MOVES_DEMO.board, 'b', NO_LEGAL_MOVES_DEMO.square);
    expect(moves).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- demoBoards.test.ts`
Expected: FAIL — `./demoBoards` doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```ts
import type { Board, Color, Piece, PieceKind, Square } from './types';
import { rowColToSquare } from './board';

export interface DemoPieceSpec {
  row: number;
  col: number;
  color: Color;
  kind: PieceKind;
}

/**
 * Resolves a (row, col) pair to its checkers square number -- used
 * throughout this module instead of hand-typed square numbers, which
 * CLAUDE.md flags as an error-prone pattern that has already caused real
 * defects elsewhere in this codebase. Throws for a light (non-playable)
 * square so a mistaken coordinate fails loudly at import time, not
 * silently as a missing piece a demo page would otherwise render wrong.
 */
export function squareAt(row: number, col: number): Square {
  const square = rowColToSquare(row, col);
  if (square === null) throw new Error(`squareAt: (${row}, ${col}) is not a playable dark square`);
  return square;
}

/** Builds a 32-square Board from row/col piece specs -- see squareAt. */
export function buildBoard(pieces: DemoPieceSpec[]): Board {
  const board: (Piece | null)[] = new Array(32).fill(null);
  for (const { row, col, color, kind } of pieces) {
    board[squareAt(row, col) - 1] = { color, kind };
  }
  return board;
}

export interface DemoPosition {
  board: Board;
  square: Square;
}

// -- /aprender/pecas ------------------------------------------------------

/** A lone black man with both forward diagonals open. */
export const MAN_MOVEMENT_DEMO: DemoPosition = {
  board: buildBoard([{ row: 3, col: 2, color: 'b', kind: 'man' }]),
  square: squareAt(3, 2),
};

/** A lone black king -- moves in all four diagonal directions, not just
 * forward. */
export const KING_MOVEMENT_DEMO: DemoPosition = {
  board: buildBoard([{ row: 4, col: 3, color: 'b', kind: 'king' }]),
  square: squareAt(4, 3),
};

/** A black man one diagonal step from black's crowning row (row 7) --
 * either legal landing square promotes it. */
export const PROMOTION_DEMO: DemoPosition = {
  board: buildBoard([{ row: 6, col: 1, color: 'b', kind: 'man' }]),
  square: squareAt(6, 1),
};

// -- /aprender/regras-especiais --------------------------------------------

/** A black man that can jump one white man -- capturing is mandatory once
 * available, so this piece's only legal move is the jump (not any
 * hypothetical simple move it might otherwise have). */
export const MANDATORY_CAPTURE_DEMO: DemoPosition = {
  board: buildBoard([
    { row: 2, col: 1, color: 'b', kind: 'man' },
    { row: 3, col: 2, color: 'w', kind: 'man' },
  ]),
  square: squareAt(2, 1),
};

/** A black man that captures two white men in one turn via a chained
 * double jump, both hops in the 'se' direction. */
export const MULTI_JUMP_DEMO: DemoPosition = {
  board: buildBoard([
    { row: 0, col: 1, color: 'b', kind: 'man' },
    { row: 1, col: 2, color: 'w', kind: 'man' },
    { row: 3, col: 4, color: 'w', kind: 'man' },
  ]),
  square: squareAt(0, 1),
};

// -- /aprender/fim-de-jogo --------------------------------------------------

/** A black man boxed in by the board edge and a white man -- zero legal
 * moves: no simple move (both forward diagonals are occupied or
 * off-board), no capture (the only possible capture's landing square is
 * off-board). */
export const NO_LEGAL_MOVES_DEMO: DemoPosition = {
  board: buildBoard([
    { row: 6, col: 7, color: 'b', kind: 'man' },
    { row: 7, col: 6, color: 'w', kind: 'man' },
  ]),
  square: squareAt(6, 7),
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- demoBoards.test.ts`
Expected: PASS (8 tests). If any position's test fails, the position is
wrong — fix the `(row, col)` coordinates in Step 3, don't change the test.

- [ ] **Step 5: Commit**

```bash
git add lib/checkers/demoBoards.ts lib/checkers/demoBoards.test.ts
git commit -m "feat(checkers): demoBoards -- row/col-built, engine-verified tutorial positions

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 2: `InteractiveDemo` component

**Files:**
- Create: `components/InteractiveDemo/InteractiveDemo.tsx`
- Test: `components/InteractiveDemo/InteractiveDemo.test.tsx`

**Interfaces:**
- Produces: `InteractiveDemo({ title, description, board, square }):
  ReactElement`, `PieceDemo { title: string; description: string; board:
  Board; square: Square }` (exported type). Consumed by Task 5, 6, 7 (every
  `/aprender` subpage with a board).

Adapted from Chess Sensei's `InteractiveDemo.tsx`: same "own state, reuse
the real board component's click/animation, reset button" shape, but built
on `Board`/`Square`/`CheckersMove` and `legalMovesFrom`/`applyMove` instead
of chess.js/FEN.

- [ ] **Step 1: Write the test**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { buildBoard, squareAt } from '@/lib/checkers/demoBoards';
import { InteractiveDemo } from './InteractiveDemo';

const DEMO_BOARD = buildBoard([{ row: 3, col: 2, color: 'b', kind: 'man' }]);
const START = squareAt(3, 2);
const TARGET = squareAt(4, 3);
const NEXT_TARGET = squareAt(5, 4);
const ILLEGAL = squareAt(5, 2);

function renderDemo() {
  return render(<InteractiveDemo title="Título" description="Descrição" board={DEMO_BOARD} square={START} />);
}

describe('InteractiveDemo', () => {
  it('moves the demo piece when a legal target square is clicked', () => {
    const { container } = renderDemo();
    fireEvent.click(container.querySelector(`[aria-label="square ${TARGET}"]`) as HTMLButtonElement);
    expect(container.querySelector(`[data-square="${TARGET}"]`)).not.toBeNull();
    expect(container.querySelector(`[data-square="${START}"]`)).toBeNull();
  });

  it('does nothing when an illegal square is clicked', () => {
    const { container } = renderDemo();
    fireEvent.click(container.querySelector(`[aria-label="square ${ILLEGAL}"]`) as HTMLButtonElement);
    expect(container.querySelector(`[data-square="${START}"]`)).not.toBeNull();
  });

  it("recomputes legal targets from the piece's new square after it moves", () => {
    const { container } = renderDemo();
    fireEvent.click(container.querySelector(`[aria-label="square ${TARGET}"]`) as HTMLButtonElement);
    fireEvent.click(container.querySelector(`[aria-label="square ${NEXT_TARGET}"]`) as HTMLButtonElement);
    expect(container.querySelector(`[data-square="${NEXT_TARGET}"]`)).not.toBeNull();
  });

  it('resets a demo back to its starting position', () => {
    const { container } = renderDemo();
    fireEvent.click(container.querySelector(`[aria-label="square ${TARGET}"]`) as HTMLButtonElement);
    fireEvent.click(screen.getByRole('button', { name: 'Reiniciar' }));
    expect(container.querySelector(`[data-square="${START}"]`)).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- InteractiveDemo.test.tsx`
Expected: FAIL — `./InteractiveDemo` doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```tsx
'use client';

import { useState } from 'react';
import type { Board, CheckersMove, Color, Square } from '@/lib/checkers/types';
import { legalMovesFrom, applyMove } from '@/lib/checkers/moveGeneration';
import { CheckersBoard } from '@/components/CheckersBoard/CheckersBoard';
import { ChipButton } from '@/components/ChipButton/ChipButton';

export interface PieceDemo {
  title: string;
  description: string;
  board: Board;
  square: Square;
}

/**
 * Playable single-piece demo shared by every /aprender subpage with a
 * board (pecas, regras-especiais, fim-de-jogo) -- keeps its own state
 * (board + highlighted square) and calls straight into the rules engine
 * (legalMovesFrom/applyMove) to validate/apply the clicked move. Not a
 * real game: only the highlighted piece ever moves, there's no opponent
 * turn -- but it reuses CheckersBoard's click interaction and slide/
 * capture-fade animation for free, same idea as Chess Sensei's
 * InteractiveDemo.
 *
 * `turn` is passed to CheckersBoard as the color OPPOSITE the
 * protagonist's, held constant for the whole demo -- CheckersBoard infers
 * "whoever just moved" as NOT-turn (see its own doc comment on the
 * animation effect), and since only the protagonist ever moves here, that
 * inference must always resolve back to the protagonist's own color for
 * the slide/capture-fade animation to fire instead of a hard snap.
 */
export function InteractiveDemo({ title, description, board: initialBoard, square: initialSquare }: PieceDemo) {
  const protagonistColor: Color = initialBoard[initialSquare - 1]?.color ?? 'b';
  const opponentColor: Color = protagonistColor === 'b' ? 'w' : 'b';
  const [board, setBoard] = useState<Board>(initialBoard);
  const [square, setSquare] = useState<Square>(initialSquare);
  const [lastMove, setLastMove] = useState<CheckersMove | null>(null);
  const legalMoves = legalMovesFrom(board, protagonistColor, square);
  const legalTargets = legalMoves.map((m) => m.to);

  function handleSquareClick(target: Square) {
    const move = legalMoves.find((m) => m.to === target);
    if (!move) return;
    setBoard(applyMove(board, move));
    setLastMove(move);
    setSquare(move.to);
  }

  function handleReset() {
    setBoard(initialBoard);
    setSquare(initialSquare);
    setLastMove(null);
  }

  return (
    <section className="flex flex-col sm:flex-row gap-4 items-center">
      <div className="w-full sm:w-64 shrink-0 flex flex-col items-center gap-3">
        <CheckersBoard
          board={board}
          turn={opponentColor}
          selectedSquare={square}
          legalTargets={legalTargets}
          mandatoryCaptureSquares={[]}
          lastMove={lastMove}
          interactive
          onSquareClick={handleSquareClick}
        />
        <ChipButton color="pink" onClick={handleReset}>
          Reiniciar
        </ChipButton>
      </div>
      <div>
        <h2 className="text-xl font-semibold text-cyan">{title}</h2>
        <p className="text-lilac/80 mt-1">{description}</p>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- InteractiveDemo.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add components/InteractiveDemo/
git commit -m "feat(ui): InteractiveDemo -- playable single-piece rule demo

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 3: `NavCard` component

**Files:**
- Create: `components/NavCard/NavCard.tsx`

**Interfaces:**
- Produces: `NavCard({ href, title, description }): ReactElement`. Consumed
  by Task 4 (`/aprender` hub).

Verbatim-shaped port of Chess Sensei's `NavCard.tsx`, minus its optional
`meta` prop — nothing in this plan needs it (it exists in the sibling repo
to show an opening's line names in the aberturas list, which isn't built
yet). No test file, matching the sibling repo's own precedent for this
trivial link-card component.

- [ ] **Step 1: Write the implementation**

```tsx
import Link from 'next/link';

/**
 * Link card "title + description" -- the hub's tile shell. `meta` (an
 * optional third line) is deliberately NOT included here even though
 * Chess Sensei's version has one for its openings list -- nothing in this
 * repo needs it yet (the openings/traps trainer is a later phase); add it
 * back if/when that phase's NavCard usage needs it.
 */
export function NavCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border-2 border-purple/40 bg-ink-soft p-4 transition-colors hover:border-cyan"
    >
      <p className="font-semibold text-white">{title}</p>
      <p className="text-sm text-lilac/80">{description}</p>
    </Link>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: no type errors (nothing imports this file yet, so this only
checks the file itself compiles).

- [ ] **Step 3: Commit**

```bash
git add components/NavCard/
git commit -m "feat(ui): NavCard -- title/description link tile

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 4: `/aprender` hub

**Files:**
- Create: `app/aprender/page.tsx`

**Interfaces:**
- Consumes: `NavCard` (Task 3), `PageGlow`/`PageHeader`/`ChipButton`
  (already exist, Phase 5).

Six tiles: the five subpages this plan builds (Tasks 5-9) plus
`/aprender/aberturas`, which doesn't exist until a later phase — a
deliberately temporary 404, same tolerance already used for the home menu's
own forward link to `/aprender` before this phase existed. No automated
test, matching the sibling repo's own precedent (its hub page has no test
file either — nearly all static links, negligible logic).

- [ ] **Step 1: Write `app/aprender/page.tsx`**

```tsx
'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { NavCard } from '@/components/NavCard/NavCard';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';

// /aprender/aberturas doesn't exist until a later phase (the openings/traps
// trainer, design spec §13 phase 7) -- this tile links ahead of it
// deliberately, same tolerance already used for the home menu's "Aprender
// a jogar" tile before this very phase existed.
const TOPICS = [
  {
    href: '/aprender/pecas',
    title: 'Peças e movimento',
    description: 'Como se movem as peças normais e as damas, e como se dá a promoção.',
  },
  {
    href: '/aprender/regras-especiais',
    title: 'Regras especiais',
    description: 'Captura obrigatória e sequências de capturas encadeadas.',
  },
  {
    href: '/aprender/fim-de-jogo',
    title: 'Fim de jogo',
    description: 'Como se perde por falta de jogadas e as regras de empate.',
  },
  {
    href: '/aprender/estrategia',
    title: 'Estratégia',
    description: 'Princípios para jogar melhor: centro, última linha, trocas favoráveis.',
  },
  {
    href: '/aprender/centipawns',
    title: 'Avaliação e qualidade das jogadas',
    description: 'O que significam os selos de qualidade que vês durante o jogo.',
  },
  {
    href: '/aprender/aberturas',
    title: 'Aberturas e armadilhas',
    description: 'Aberturas conhecidas para estudar e praticar.',
  },
];

export default function AprenderPage() {
  return (
    <main className="relative min-h-screen max-w-2xl mx-auto p-8 flex flex-col gap-6 overflow-hidden bg-ink">
      <PageGlow position="fixed" pinkOpacity={0.2} />
      <div>
        <PageHeader>Aprender a jogar</PageHeader>
        <p className="mt-3">
          <ChipButton color="purple" href="/">
            Menu inicial
          </ChipButton>
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {TOPICS.map((topic) => (
          <li key={topic.href}>
            <NavCard href={topic.href} title={topic.title} description={topic.description} />
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 2: Verify manually**

Run: `npm run dev`, open `/aprender`. Expected: six link tiles; the first
five will 404 until their own tasks below land (in the same plan run,
sequentially), the sixth (aberturas) is expected to 404 for the whole
plan.

- [ ] **Step 3: Commit**

```bash
git add app/aprender/page.tsx
git commit -m "feat(app): /aprender hub -- 6 tiles, aberturas links ahead of Phase 7

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 5: `/aprender/pecas`

**Files:**
- Create: `app/aprender/pecas/page.tsx`
- Test: `app/aprender/pecas/page.test.tsx`

**Interfaces:**
- Consumes: `InteractiveDemo`/`PieceDemo` (Task 2), `MAN_MOVEMENT_DEMO`/
  `KING_MOVEMENT_DEMO`/`PROMOTION_DEMO` (Task 1).

Three demos: man movement, king movement, promotion. The test file's
queries are scoped to each demo's own `<section>` (found via its heading)
— **this is load-bearing, not a style choice**: `CheckersBoard` renders a
button for all 32 dark squares regardless of occupancy, so with three
demos on one page, an unscoped `container.querySelector('[aria-label=...]
')` would match whichever demo's board happens to render first in the DOM,
not necessarily the one the test means to click.

- [ ] **Step 1: Write the test**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { squareAt } from '@/lib/checkers/demoBoards';
import PecasPage from './page';

function demoSection(headingText: string): HTMLElement {
  return screen.getByRole('heading', { name: headingText }).closest('section') as HTMLElement;
}

describe('PecasPage', () => {
  it('moves the man-movement demo piece to a legal target', () => {
    render(<PecasPage />);
    const section = demoSection('Movimento da peça (homem)');
    const target = squareAt(4, 3);
    fireEvent.click(section.querySelector(`[aria-label="square ${target}"]`) as HTMLButtonElement);
    expect(section.querySelector(`[data-square="${target}"]`)).not.toBeNull();
  });

  it('promotes the promotion-demo piece to a king when it reaches the back row', () => {
    render(<PecasPage />);
    const section = demoSection('Promoção a dama');
    const target = squareAt(7, 2);
    fireEvent.click(section.querySelector(`[aria-label="square ${target}"]`) as HTMLButtonElement);
    const pieceAtTarget = section.querySelector(`[data-square="${target}"]`);
    expect(pieceAtTarget?.querySelector('polygon')).not.toBeNull(); // crown = king
  });

  it('renders an independent reset button for each of the three demos', () => {
    render(<PecasPage />);
    expect(screen.getAllByRole('button', { name: 'Reiniciar' })).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- app/aprender/pecas/page.test.tsx`
Expected: FAIL — `./page` doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```tsx
'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';
import { InteractiveDemo, type PieceDemo } from '@/components/InteractiveDemo/InteractiveDemo';
import { MAN_MOVEMENT_DEMO, KING_MOVEMENT_DEMO, PROMOTION_DEMO } from '@/lib/checkers/demoBoards';

const DEMOS: PieceDemo[] = [
  {
    title: 'Movimento da peça (homem)',
    description:
      'Uma peça normal só se move na diagonal, uma casa de cada vez, sempre para a frente -- nunca para trás.',
    ...MAN_MOVEMENT_DEMO,
  },
  {
    title: 'Movimento da dama',
    description:
      'Quando uma peça chega à última linha do lado adversário, é promovida a dama. A dama move-se na diagonal em qualquer das quatro direções, para a frente ou para trás.',
    ...KING_MOVEMENT_DEMO,
  },
  {
    title: 'Promoção a dama',
    description:
      'Uma peça normal que alcance a última linha do lado adversário torna-se imediatamente dama -- experimenta mover esta peça até à linha do fundo.',
    ...PROMOTION_DEMO,
  },
];

export default function PecasPage() {
  return (
    <main className="relative min-h-screen max-w-3xl mx-auto p-8 flex flex-col gap-8 overflow-hidden bg-ink">
      <PageGlow position="fixed" pinkOpacity={0.2} />
      <div>
        <PageHeader>Peças e movimento</PageHeader>
        <p className="mt-3">
          <ChipButton color="purple" href="/aprender">
            Voltar ao tutorial
          </ChipButton>
        </p>
      </div>
      {DEMOS.map((demo) => (
        <InteractiveDemo key={demo.title} {...demo} />
      ))}
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- app/aprender/pecas/page.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/aprender/pecas/
git commit -m "feat(app): /aprender/pecas -- man/king movement + promotion demos

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 6: `/aprender/regras-especiais`

**Files:**
- Create: `app/aprender/regras-especiais/page.tsx`
- Test: `app/aprender/regras-especiais/page.test.tsx`

**Interfaces:**
- Consumes: `InteractiveDemo`/`PieceDemo` (Task 2), `MANDATORY_CAPTURE_DEMO`/
  `MULTI_JUMP_DEMO` (Task 1).

Two demos: mandatory capture, chained multi-jump. Same section-scoping
requirement as Task 5's test.

- [ ] **Step 1: Write the test**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { squareAt } from '@/lib/checkers/demoBoards';
import RegrasEspeciaisPage from './page';

function demoSection(headingText: string): HTMLElement {
  return screen.getByRole('heading', { name: headingText }).closest('section') as HTMLElement;
}

// A legal-target square renders exactly one child <span> marker (see
// CheckersBoard.tsx) -- counting buttons that contain one is a robust way
// to count how many targets are actually offered, without depending on a
// CSS class selector.
function legalTargetButtons(section: HTMLElement): HTMLButtonElement[] {
  return Array.from(section.querySelectorAll('button')).filter((btn) => btn.querySelector('span')) as HTMLButtonElement[];
}

describe('RegrasEspeciaisPage', () => {
  it('the mandatory-capture demo only offers the jump as a legal target', () => {
    render(<RegrasEspeciaisPage />);
    const section = demoSection('Captura obrigatória');
    expect(legalTargetButtons(section)).toHaveLength(1);
  });

  // CheckersBoard keeps a captured piece in the DOM (fading out) for
  // CAPTURE_FADE_MS=300ms before actually removing it -- fake timers and
  // an explicit advance past that duration are required before asserting
  // removal, same pattern as CheckersBoard.test.tsx's own capture-fade
  // test. (This was NOT part of the original plan text -- Task 6's
  // implementation surfaced the gap and this was the ruled fix; kept here
  // so the plan matches what was actually built.)
  it('captures the jumped piece when the mandatory-capture demo target is clicked', () => {
    vi.useFakeTimers();
    try {
      render(<RegrasEspeciaisPage />);
      const section = demoSection('Captura obrigatória');
      const landing = squareAt(4, 3);
      const jumpedSquare = squareAt(3, 2);
      fireEvent.click(section.querySelector(`[aria-label="square ${landing}"]`) as HTMLButtonElement);
      expect(section.querySelector(`[data-square="${landing}"]`)).not.toBeNull();
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(section.querySelector(`[data-square="${jumpedSquare}"]`)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('captures both pieces in the multi-jump demo with a single click', () => {
    vi.useFakeTimers();
    try {
      render(<RegrasEspeciaisPage />);
      const section = demoSection('Sequência de capturas (lance múltiplo)');
      const finalLanding = squareAt(4, 5);
      const firstJumped = squareAt(1, 2);
      const secondJumped = squareAt(3, 4);
      fireEvent.click(section.querySelector(`[aria-label="square ${finalLanding}"]`) as HTMLButtonElement);
      expect(section.querySelector(`[data-square="${finalLanding}"]`)).not.toBeNull();
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(section.querySelector(`[data-square="${firstJumped}"]`)).toBeNull();
      expect(section.querySelector(`[data-square="${secondJumped}"]`)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- app/aprender/regras-especiais/page.test.tsx`
Expected: FAIL — `./page` doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```tsx
'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';
import { InteractiveDemo, type PieceDemo } from '@/components/InteractiveDemo/InteractiveDemo';
import { MANDATORY_CAPTURE_DEMO, MULTI_JUMP_DEMO } from '@/lib/checkers/demoBoards';

const DEMOS: PieceDemo[] = [
  {
    title: 'Captura obrigatória',
    description:
      'Se uma peça pode capturar, a captura é obrigatória -- não é possível fazer um movimento simples enquanto houver uma captura disponível para essa cor. Clica na peça preta para saltar sobre a peça branca.',
    ...MANDATORY_CAPTURE_DEMO,
  },
  {
    title: 'Sequência de capturas (lance múltiplo)',
    description:
      'Uma única jogada pode encadear várias capturas seguidas, desde que cada salto aterre numa casa livre. Clica na peça preta para veres as duas peças brancas capturadas na mesma jogada.',
    ...MULTI_JUMP_DEMO,
  },
];

export default function RegrasEspeciaisPage() {
  return (
    <main className="relative min-h-screen max-w-3xl mx-auto p-8 flex flex-col gap-8 overflow-hidden bg-ink">
      <PageGlow position="fixed" pinkOpacity={0.2} />
      <div>
        <PageHeader>Regras especiais</PageHeader>
        <p className="mt-3">
          <ChipButton color="purple" href="/aprender">
            Voltar ao tutorial
          </ChipButton>
        </p>
      </div>
      {DEMOS.map((demo) => (
        <InteractiveDemo key={demo.title} {...demo} />
      ))}
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- app/aprender/regras-especiais/page.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/aprender/regras-especiais/
git commit -m "feat(app): /aprender/regras-especiais -- mandatory capture + multi-jump demos

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 7: `/aprender/fim-de-jogo`

**Files:**
- Create: `app/aprender/fim-de-jogo/page.tsx`
- Test: `app/aprender/fim-de-jogo/page.test.tsx`

**Interfaces:**
- Consumes: `InteractiveDemo`/`PieceDemo` (Task 2), `NO_LEGAL_MOVES_DEMO`
  (Task 1).

One demo (no-legal-moves loss) plus a text-only section explaining both
draw conditions from `lib/checkers/gameStatus.ts`'s `computeStatus`
(`NO_CAPTURE_DRAW_PLIES = 80` plies without a capture, or the same
position occurring 3 times).

- [ ] **Step 1: Write the test**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { squareAt } from '@/lib/checkers/demoBoards';
import FimDeJogoPage from './page';

describe('FimDeJogoPage', () => {
  it('the no-legal-moves demo piece has no clickable legal target', () => {
    render(<FimDeJogoPage />);
    const section = screen.getByRole('heading', { name: 'Sem jogadas legais' }).closest('section') as HTMLElement;
    const targets = Array.from(section.querySelectorAll('button')).filter((btn) => btn.querySelector('span'));
    expect(targets).toHaveLength(0);
  });

  it('clicking elsewhere does not move the stuck piece', () => {
    render(<FimDeJogoPage />);
    const section = screen.getByRole('heading', { name: 'Sem jogadas legais' }).closest('section') as HTMLElement;
    const start = squareAt(6, 7);
    const somewhereElse = squareAt(0, 1);
    fireEvent.click(section.querySelector(`[aria-label="square ${somewhereElse}"]`) as HTMLButtonElement);
    expect(section.querySelector(`[data-square="${start}"]`)).not.toBeNull();
  });

  it('explains the two draw conditions', () => {
    render(<FimDeJogoPage />);
    expect(screen.getByRole('heading', { name: 'Empate' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- app/aprender/fim-de-jogo/page.test.tsx`
Expected: FAIL — `./page` doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```tsx
'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';
import { InteractiveDemo, type PieceDemo } from '@/components/InteractiveDemo/InteractiveDemo';
import { NO_LEGAL_MOVES_DEMO } from '@/lib/checkers/demoBoards';

const DEMOS: PieceDemo[] = [
  {
    title: 'Sem jogadas legais',
    description:
      'Se, na tua vez, não tiveres nenhuma jogada legal disponível -- nem simples nem de captura -- perdes o jogo de imediato. Esta peça está bloqueada: experimenta clicar nela.',
    ...NO_LEGAL_MOVES_DEMO,
  },
];

export default function FimDeJogoPage() {
  return (
    <main className="relative min-h-screen max-w-3xl mx-auto p-8 flex flex-col gap-8 overflow-hidden bg-ink">
      <PageGlow position="fixed" pinkOpacity={0.2} />
      <div>
        <PageHeader>Fim de jogo</PageHeader>
        <p className="mt-3">
          <ChipButton color="purple" href="/aprender">
            Voltar ao tutorial
          </ChipButton>
        </p>
      </div>
      {DEMOS.map((demo) => (
        <InteractiveDemo key={demo.title} {...demo} />
      ))}

      <section>
        <h2 className="text-xl font-semibold text-cyan">Empate</h2>
        <p className="text-lilac/80 mt-1">
          O jogo também pode terminar em empate: quando 40 jogadas completas (80 meio-lances) passam sem qualquer
          captura, ou quando a mesma posição se repete três vezes.
        </p>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- app/aprender/fim-de-jogo/page.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/aprender/fim-de-jogo/
git commit -m "feat(app): /aprender/fim-de-jogo -- no-legal-moves demo + draw conditions

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 8: `/aprender/estrategia`

**Files:**
- Create: `app/aprender/estrategia/page.tsx`

Text-only, no board. Five checkers strategy principles per design spec §5:
control the center, keep the back row, avoid edge columns, force favorable
trades, king safety. No test, matching the sibling repo's own precedent for
this page (a static list with no interactive logic).

- [ ] **Step 1: Write `app/aprender/estrategia/page.tsx`**

```tsx
'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';

const PRINCIPLES = [
  {
    title: 'Controla o centro',
    text: 'As peças no centro do tabuleiro têm mais opções de movimento e são mais difíceis de imobilizar do que as peças presas nas colunas laterais.',
  },
  {
    title: 'Mantém a última linha',
    text: 'As peças que ficam na tua própria linha do fundo atrasam a promoção das damas adversárias -- não as adiantes sem necessidade logo nas primeiras jogadas.',
  },
  {
    title: 'Evita as colunas laterais',
    text: 'Uma peça na coluna mais à esquerda ou mais à direita só tem uma diagonal disponível (em vez de duas), o que a torna mais fácil de imobilizar.',
  },
  {
    title: 'Procura trocas favoráveis',
    text: 'Trocar peças costuma favorecer quem está a ganhar material -- simplifica o jogo e reduz as hipóteses de o adversário reverter a posição.',
  },
  {
    title: 'Protege as tuas damas',
    text: 'Uma dama vale significativamente mais do que uma peça normal (275 contra 100, no sistema de avaliação do motor) -- não a exponhas a uma captura evitável só para ganhar uma peça.',
  },
];

export default function EstrategiaPage() {
  return (
    <main className="relative min-h-screen max-w-2xl mx-auto p-8 flex flex-col gap-6 overflow-hidden bg-ink">
      <PageGlow position="fixed" pinkOpacity={0.2} />
      <div>
        <PageHeader>Estratégia</PageHeader>
        <p className="mt-3">
          <ChipButton color="purple" href="/aprender">
            Voltar ao tutorial
          </ChipButton>
        </p>
      </div>
      <ul className="flex flex-col gap-4">
        {PRINCIPLES.map((principle) => (
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

- [ ] **Step 2: Verify**

Run: `npm test && npm run build`
Expected: full suite still passes, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/aprender/estrategia/
git commit -m "feat(app): /aprender/estrategia -- 5 checkers strategy principles

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 9: `/aprender/centipawns`

**Files:**
- Create: `app/aprender/centipawns/page.tsx`

**Interfaces:**
- Consumes: `describeMoveQuality` (already exists,
  `lib/checkers/moveExplanation.ts`), `MoveQuality` (already exists,
  `lib/checkers/moveClassification.ts`).

Explains the engine-evaluation/move-quality badge system used by Learning
Mode's toasts (design spec §5 — "same 3-badge system, checkers framing").
Route slug `centipawns` is reused verbatim from the spec (checkers has no
literal centipawns; the page explains the engine's actual man=100/king=275
point scale instead). Badge label text comes from `describeMoveQuality`
directly (not re-typed) so this page can never drift out of sync with what
a real Learning Mode toast says. No test, matching the sibling repo's own
precedent for this page.

- [ ] **Step 1: Write `app/aprender/centipawns/page.tsx`**

```tsx
'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';
import { describeMoveQuality } from '@/lib/checkers/moveExplanation';
import type { MoveQuality } from '@/lib/checkers/moveClassification';

const CONCEPTS = [
  {
    title: 'Avaliação da posição',
    text: 'Depois de cada jogada, o motor calcula uma pontuação que resume quem está melhor posicionado -- material (peças e damas) mais alguns fatores posicionais, como o controlo do centro e o avanço das peças.',
  },
  {
    title: 'Perda de avaliação',
    text: 'Quando ativas o Modo de Aprendizagem, cada jogada é comparada com a melhor jogada que o motor encontrou na mesma posição -- a diferença entre as duas é a "perda" dessa jogada.',
  },
];

// Same color family as Toast.tsx's TONE_ACCENT (emerald/amber/red) -- a
// reader who sees a move-quality toast during a game should recognize
// the same colors here.
const QUALITY_BADGE_CLASS: Record<MoveQuality, string> = {
  boa: 'bg-emerald-900/60 text-emerald-200',
  imprecisao: 'bg-amber-900/60 text-amber-200',
  erro: 'bg-red-900/60 text-red-200',
};

const QUALITY_TEXTS: Record<MoveQuality, string> = {
  boa: 'A jogada está muito próxima da melhor jogada encontrada pelo motor -- perda pequena ou nula.',
  imprecisao: 'A jogada perde algum valor face à melhor alternativa, mas não compromete a posição.',
  erro: 'A jogada perde valor significativo -- normalmente uma peça (ou mais) que podia ter sido evitada.',
};

const QUALITY_LEVELS: MoveQuality[] = ['boa', 'imprecisao', 'erro'];

export default function CentipawnsPage() {
  return (
    <main className="relative min-h-screen max-w-2xl mx-auto p-8 flex flex-col gap-6 overflow-hidden bg-ink">
      <PageGlow position="fixed" pinkOpacity={0.2} />
      <div>
        <PageHeader>Avaliação e qualidade das jogadas</PageHeader>
        <p className="mt-3">
          <ChipButton color="purple" href="/aprender">
            Voltar ao tutorial
          </ChipButton>
        </p>
      </div>
      <ul className="flex flex-col gap-4">
        {CONCEPTS.map((concept) => (
          <li key={concept.title} className="rounded-xl border-2 border-purple/40 bg-ink-soft p-4">
            <p className="font-semibold text-white">{concept.title}</p>
            <p className="text-lilac/80 mt-1">{concept.text}</p>
          </li>
        ))}
      </ul>
      <div>
        <p className="font-semibold text-white mb-3">Os três níveis de qualidade</p>
        <ul className="flex flex-col gap-3">
          {QUALITY_LEVELS.map((level) => (
            <li key={level} className="rounded-xl border-2 border-purple/40 bg-ink-soft p-4 flex flex-col gap-2">
              <span className={`self-start rounded-full px-3 py-1 text-sm font-semibold ${QUALITY_BADGE_CLASS[level]}`}>
                {describeMoveQuality(level, 'pt')}
              </span>
              <p className="text-lilac/80">{QUALITY_TEXTS[level]}</p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm test && npm run build`
Expected: full suite still passes, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/aprender/centipawns/
git commit -m "feat(app): /aprender/centipawns -- engine-evaluation/quality-badge explainer

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 10: Close out the phase in `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

Per the project's own process rule ("updated at the end of every
implementation-plan phase with whatever new non-obvious convention that
phase introduced"). No test — documentation only.

- [ ] **Step 1: Update the `Structure` section**

Add entries for every new path this plan touched: `lib/checkers/
demoBoards.ts` (row/col-built, engine-verified tutorial positions),
`components/InteractiveDemo/InteractiveDemo.tsx`, `components/NavCard/
NavCard.tsx`, and `app/aprender/` (hub + 5 subpages), noting `aberturas`
is a deliberately temporary 404 until a later phase.

- [ ] **Step 2: Add a `Conventions` entry documenting `demoBoards.ts`'s
  row/col convention**

Record that this is the first place in the codebase to systematically
avoid hand-typed square numbers (per the existing CLAUDE.md entry flagging
that anti-pattern) — `squareAt(row, col)`/`buildBoard(pieces)` resolve
coordinates through the real `rowColToSquare`, and every named position is
verified against `legalMovesFrom` in the same task's test before any page
renders it. Note this as a pattern future demo/test content should follow
instead of hand-indexing squares directly.

- [ ] **Step 3: Add a `Conventions` entry documenting `InteractiveDemo`'s
  `turn` prop trick**

Record why `InteractiveDemo` passes `CheckersBoard` the color OPPOSITE the
protagonist's, held constant — `CheckersBoard`'s animation effect infers
the mover as NOT-`turn`, and since only the protagonist ever moves in a
demo, holding `turn` fixed at the opposite color is what makes that
inference always resolve correctly, letting the slide/capture-fade
animation fire instead of a hard snap on every demo move.

- [ ] **Step 4: Add a `Conventions` entry noting `/aprender/aberturas` is
  out of scope for this phase**

Record that the openings/traps trainer is a separate, later phase (design
spec §13 phase 7) — the hub's sixth tile links to it anyway (a
deliberately temporary 404), matching the tolerance already established
for the home menu's own forward link to `/aprender` before this phase
existed.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: close out Tutorial Hub phase in CLAUDE.md

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```
