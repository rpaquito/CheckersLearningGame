# Board UI & Local Two-Player Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real, clickable, animated checkers board and wire it into a playable local two-player game at `/jogar`. Fix the known `makeMove` return-value bug from the previous plan as this plan's first task, since this is the first plan that actually calls it from UI.

**Architecture:** `components/CheckersBoard/` — a "dumb" 8×8 board component (mirrors Chess Sensei's `ChessBoard.tsx`: never decides legality, only renders what `lib/checkers/` computes, derives move animation via `inferMove` board-diffing rather than being told what moved). `app/jogar/page.tsx` owns the click-to-select-then-click-to-move interaction state machine on top of `useCheckersGame`. Single piece style (`classico`) and plain-color squares for this plan — the multi-style/textured-theme system arrives with Phase 5's visual-identity work, not duplicated here.

**Tech Stack:** Same as the previous plan — Next.js 16.3.1, React 19.2.8, Tailwind v4, TypeScript strict, Vitest + jsdom + Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-31-checkers-sensei-design.md` — this plan implements spec §4 (board & pieces) and the local-2P slice of §5 (feature parity map), scoped down (single piece style, no themes yet, no tutorial/openings/learning-mode UI — those are later phases).

## Global Constraints

- No worktrees, no feature branches — every task commits directly to `main`, pushed immediately after (`git push origin main`).
- Board sizing: reuse the exact viewport-fit formula from Chess Sensei, learned the hard way there — `w-[min(98vw,62dvh,560px)] sm:w-[min(92vw,62dvh,560px)]` on the board's own root element.
- The board component never validates legality — it only ever renders squares/highlights the caller (ultimately `lib/checkers/`, via the page's use of `useCheckersGame`) computed. No move-legality logic lives in `components/`.
- Board geometry (`squareToRowCol`/`rowColToSquare`) is reused directly from `lib/checkers/board.ts` — never re-derived in the component layer.
- `makeMove`'s known capture-chain tie-break (when 3+ routes from the same piece share a final square with different captures — verified rare, endgame-only) resolves deterministically to the first matching move found; no interactive disambiguation UI in this plan. Documented, not solved, here.
- Single piece style (`classico`) and flat Tailwind colors for squares in this plan. `PieceIcon`/board-square rendering must be structured so a `pieceStyle`/`boardTheme` prop can be added later (Phase 5) without restructuring — but do not build the multi-style dispatch machinery now.
- TypeScript strict mode; every task must typecheck and lint clean before commit.

---

### Task 1: Fix `makeMove`'s return-value bug

**Files:**
- Modify: `lib/checkers/useCheckersGame.ts`
- Modify: `lib/checkers/useCheckersGame.test.ts`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: `legalMovesFrom`, `applyMove`, `hasAnyCapture` from `./moveGeneration`; `computeStatus`, `boardKey` from `./gameStatus`; `createInitialBoard` from `./board`; existing types from `./types`.
- Produces: same public `UseCheckersGameResult` shape as before — `makeMove`'s *behavior* changes (now reliable on every call), not its signature. Every later task in this plan depends on `makeMove`'s return value being trustworthy.

Known bug (from the previous plan's final review, independently reproduced 3 ways): `makeMove`'s `let didMove = false; setGame(prev => { didMove = true; ... }); return didMove;` pattern only works for the *first* call on a given hook instance — React's `useState` functional updater is only invoked "eagerly" (synchronously) for the first queued update on a fiber; every call after that defers the updater to the render pass, so `didMove` is read before it's ever set, and the return value is `false` even when the move legally succeeded. Game *state* always lands correctly — only the boolean lies.

**Fix:** compute legality and the resulting game state synchronously, using a `ref` that mirrors the latest state (kept fresh every render), instead of relying on a `setState` updater's side effect for the return value.

- [ ] **Step 1: Write the failing test**

Append to `lib/checkers/useCheckersGame.test.ts`:

```ts
it('makeMove returns the correct result for every call, not just the first', () => {
  const { result } = renderHook(() => useCheckersGame(false));
  act(() => {
    expect(result.current.makeMove(11, 15)).toBe(true);
  });
  act(() => {
    expect(result.current.makeMove(24, 20)).toBe(true); // white's known-quiet reply, see Task 8's plan comment
  });
  act(() => {
    expect(result.current.makeMove(11, 99)).toBe(false); // 99 is never a real square target -- illegal
  });
  act(() => {
    expect(result.current.makeMove(9, 13)).toBe(true); // fourth call -- still correct
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/checkers/useCheckersGame.test.ts`
Expected: FAIL — the second `expect(...).toBe(true)` receives `false` (reproducing the known bug).

- [ ] **Step 3: Fix `lib/checkers/useCheckersGame.ts`**

Add a `useRef` import and a `gameRef` that mirrors `game`, then rewrite `makeMove` and `reset` to read/write it directly instead of relying on `setGame`'s updater for the return value:

```ts
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
```

Replace the body of `useCheckersGame` from the `useState` declaration through `reset` with:

```ts
export function useCheckersGame(persist: boolean = true): UseCheckersGameResult {
  const [game, setGame] = useState<PersistedGame>(initialGame);
  // Mirrors `game` for synchronous reads inside callbacks. React's useState
  // functional-updater is only invoked "eagerly" (before the setter call
  // returns) for the FIRST queued update on a fiber -- every later call in
  // the same render cycle/lifetime defers the updater to the render pass.
  // A side-effect flag set inside the updater (the previous approach) is
  // therefore unreliable after the first call. Reading/writing this ref
  // directly sidesteps that timing hazard entirely.
  const gameRef = useRef(game);
  gameRef.current = game;

  useEffect(() => {
    if (!persist) return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isValidPersistedGame(parsed)) {
        gameRef.current = parsed;
        setGame(parsed);
      }
    } catch {
      // Corrupted save -- ignore, keep the fresh initial game.
    }
  }, [persist]);

  useEffect(() => {
    if (!persist) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  }, [game, persist]);

  const makeMove = useCallback((from: Square, to: Square): boolean => {
    const current = gameRef.current;
    // Tie-break, documented (see CLAUDE.md): if a piece has multiple legal
    // capture chains that share the same final `to` but capture different
    // pieces (rare -- needs 3+ simultaneous routes, endgame-only), the
    // first one found wins, deterministically. No disambiguation UI yet.
    const move = legalMovesFromEngine(current.board, current.turn, from).find((m) => m.to === to);
    if (!move) return false;
    const nextBoard = applyMove(current.board, move) as (Piece | null)[];
    const nextTurn: Color = current.turn === 'b' ? 'w' : 'b';
    const nextPlySinceLastCapture = move.captures.length > 0 ? 0 : current.plySinceLastCapture + 1;
    const key = boardKey(nextBoard, nextTurn);
    const counts = new Map(current.positionCounts);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    const next: PersistedGame = {
      board: nextBoard,
      turn: nextTurn,
      lastMove: move,
      plySinceLastCapture: nextPlySinceLastCapture,
      positionCounts: Array.from(counts.entries()),
    };
    gameRef.current = next; // stays fresh even if called again before a re-render
    setGame(next);
    return true;
  }, []);

  const reset = useCallback(() => {
    const fresh = initialGame();
    gameRef.current = fresh;
    setGame(fresh);
    if (persist) clearSavedGame();
  }, [persist]);
```

Leave everything from `const status = computeStatus(...)` through the end of the function unchanged.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/checkers/useCheckersGame.test.ts`
Expected: PASS, all tests including the new one.

- [ ] **Step 5: Run the full suite, typecheck, lint**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: all pass, no errors.

- [ ] **Step 6: Update `CLAUDE.md`**

Add a new subsection under `## Conventions`, after the existing "`useCheckersGame` persistence follows the SSR-hydration-safe pattern from day one" subsection:

```markdown
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
```

- [ ] **Step 7: Commit and push**

```bash
git add lib/checkers/useCheckersGame.ts lib/checkers/useCheckersGame.test.ts CLAUDE.md
git commit -m "fix(checkers): make useCheckersGame's makeMove return value reliable

Computes legality and next state synchronously against a ref-mirrored
game state, instead of relying on a setState updater's side effect —
the updater is only invoked eagerly for the first queued update on a
fiber, so the old pattern's return value was stale after move #1.
Documents the makeMove tie-break/from-eq-to known limitation.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

### Task 2: `PieceIcon` + `classico` piece shapes

**Files:**
- Create: `components/CheckersBoard/pieceStyles/classico.tsx`
- Create: `components/CheckersBoard/PieceIcon.tsx`
- Test: `components/CheckersBoard/PieceIcon.test.tsx`

**Interfaces:**
- Consumes: `PieceKind` from `@/lib/checkers/types`.
- Produces: `PieceShape({ type }: { type: PieceKind }): ReactElement` (from `pieceStyles/classico.tsx`), `PieceIcon({ type }: { type: PieceKind }): ReactElement` (from `PieceIcon.tsx`) — consumed by Task 4's `CheckersBoard`.

- [ ] **Step 1: Write the failing test**

```tsx
// components/CheckersBoard/PieceIcon.test.tsx
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
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/CheckersBoard/PieceIcon.test.tsx`
Expected: FAIL — `Cannot find module './PieceIcon'`.

- [ ] **Step 3: Write `components/CheckersBoard/pieceStyles/classico.tsx`**

```tsx
import type { ReactElement } from 'react';
import type { PieceKind } from '@/lib/checkers/types';

// A simple checkers-disc silhouette: a filled outer circle plus an inset
// ring to suggest a real checker piece's rim, with a small crown polygon
// added on top for kings. This is the only piece style built in this
// plan ("classico") -- see PieceIcon.tsx for the seam Phase 5 will use
// to add "moderno"/"anime" styles alongside Chess Sensei's equivalents.
const CROWN_POINTS = '30,42 38,28 50,40 62,28 70,42 66,50 34,50';

export function PieceShape({ type }: { type: PieceKind }): ReactElement {
  return (
    <>
      <circle cx="50" cy="50" r="38" />
      <circle cx="50" cy="50" r="27" fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="4" />
      {type === 'king' && <polygon points={CROWN_POINTS} fill="currentColor" opacity="0.9" />}
    </>
  );
}
```

- [ ] **Step 4: Write `components/CheckersBoard/PieceIcon.tsx`**

```tsx
import type { ReactElement } from 'react';
import type { PieceKind } from '@/lib/checkers/types';
import { PieceShape } from './pieceStyles/classico';

export interface PieceIconProps {
  type: PieceKind;
}

// Single-style dispatch for now (classico only). Phase 5 will turn this
// into a `SHAPES: Record<PieceStyle, ...>` lookup keyed by a `style` prop,
// the same pattern Chess Sensei's PieceIcon.tsx uses -- not built yet
// because there's only one style to dispatch to.
export function PieceIcon({ type }: PieceIconProps): ReactElement {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" className="h-[78%] w-[78%]" aria-hidden="true">
      <PieceShape type={type} />
    </svg>
  );
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run components/CheckersBoard/PieceIcon.test.tsx`
Expected: PASS.

- [ ] **Step 6: Typecheck, lint, commit and push**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

```bash
git add components/CheckersBoard/pieceStyles/classico.tsx components/CheckersBoard/PieceIcon.tsx components/CheckersBoard/PieceIcon.test.tsx
git commit -m "feat(checkers): PieceIcon + classico piece shapes (man, king)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

### Task 3: `CheckersBoard` — static rendering

**Files:**
- Create: `components/CheckersBoard/CheckersBoard.tsx`
- Test: `components/CheckersBoard/CheckersBoard.test.tsx`

**Interfaces:**
- Consumes: `squareToRowCol`, `rowColToSquare` from `@/lib/checkers/board`; `Board`, `Color`, `CheckersMove`, `Square` from `@/lib/checkers/types`; `PieceIcon` from `./PieceIcon`.
- Produces: `CheckersBoardProps` interface and the `CheckersBoard` component — consumed by Task 4 (click handling, same file, extended), Task 5 (animation, same file, extended), and Task 6 (`/jogar` page).

```ts
export interface CheckersBoardProps {
  board: Board;
  turn: Color;
  selectedSquare: Square | null;
  legalTargets: Square[];
  mandatoryCaptureSquares: Square[];
  lastMove: CheckersMove | null;
  interactive?: boolean;
  onSquareClick?: (square: Square) => void;
}
```

- [ ] **Step 1: Write the failing test**

```tsx
// components/CheckersBoard/CheckersBoard.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { createInitialBoard } from '@/lib/checkers/board';
import { CheckersBoard } from './CheckersBoard';

describe('CheckersBoard', () => {
  it('renders 32 clickable dark squares and 24 pieces at the initial position', () => {
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
    expect(container.querySelectorAll('button')).toHaveLength(32);
    expect(container.querySelectorAll('svg')).toHaveLength(24);
  });

  it('has role="grid" on the square grid', () => {
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
    expect(container.querySelector('[role="grid"]')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/CheckersBoard/CheckersBoard.test.tsx`
Expected: FAIL — `Cannot find module './CheckersBoard'`.

- [ ] **Step 3: Write `components/CheckersBoard/CheckersBoard.tsx`**

```tsx
'use client';

import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { Board, CheckersMove, Color, PieceKind, Square } from '@/lib/checkers/types';
import { rowColToSquare, squareToRowCol } from '@/lib/checkers/board';
import { inferMove } from '@/lib/checkers/inferMove';
import { PieceIcon } from './PieceIcon';

export interface CheckersBoardProps {
  board: Board;
  turn: Color;
  selectedSquare: Square | null;
  legalTargets: Square[];
  mandatoryCaptureSquares: Square[];
  lastMove: CheckersMove | null;
  interactive?: boolean;
  onSquareClick?: (square: Square) => void;
}

interface DisplayPiece {
  id: string;
  color: Color;
  kind: PieceKind;
  square: Square;
  removing: boolean;
}

const CAPTURE_FADE_MS = 300;

function initialDisplayPieces(board: Board): DisplayPiece[] {
  const pieces: DisplayPiece[] = [];
  for (let s = 1; s <= 32; s++) {
    const piece = board[s - 1];
    if (piece) pieces.push({ id: `p${s}-${piece.color}`, color: piece.color, kind: piece.kind, square: s, removing: false });
  }
  return pieces;
}

export function CheckersBoard({
  board,
  turn,
  selectedSquare,
  legalTargets,
  mandatoryCaptureSquares,
  lastMove,
  interactive = true,
  onSquareClick,
}: CheckersBoardProps): ReactElement {
  const [displayPieces, setDisplayPieces] = useState<DisplayPiece[]>(() => initialDisplayPieces(board));
  const prevBoardRef = useRef<Board>(board);

  useEffect(() => {
    const prevBoard = prevBoardRef.current;
    prevBoardRef.current = board;
    if (prevBoard === board) return;

    // The mover was whichever color is NOT the side to move now (turn
    // already flipped by the time this board is passed in).
    const moverColor: Color = turn === 'b' ? 'w' : 'b';
    const move = inferMove(prevBoard, moverColor, board);

    if (!move) {
      // No single legal move connects the two positions (reset, loaded
      // save, etc.) -- snap to the new position, nothing to animate.
      setDisplayPieces(initialDisplayPieces(board));
      return;
    }

    setDisplayPieces((prev) => {
      const withCaptures = prev.map((piece) =>
        move.captures.includes(piece.square) ? { ...piece, removing: true } : piece,
      );
      return withCaptures.map((piece) =>
        !piece.removing && piece.square === move.from && piece.color === moverColor
          ? { ...piece, square: move.to, kind: move.promotes ? ('king' as const) : piece.kind }
          : piece,
      );
    });

    const timer = setTimeout(() => {
      setDisplayPieces((prev) => prev.filter((piece) => !piece.removing));
    }, CAPTURE_FADE_MS);
    return () => clearTimeout(timer);
  }, [board, turn]);

  const squares: ReactElement[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = rowColToSquare(row, col);
      if (square === null) {
        squares.push(<div key={`light-${row}-${col}`} className="bg-stone-200" aria-hidden="true" />);
        continue;
      }
      const isSelected = square === selectedSquare;
      const isLegalTarget = legalTargets.includes(square);
      const isMandatory = mandatoryCaptureSquares.includes(square);
      const isLastMove = lastMove !== null && (square === lastMove.from || square === lastMove.to);
      squares.push(
        <button
          key={square}
          type="button"
          disabled={!interactive}
          onClick={() => onSquareClick?.(square)}
          aria-label={`square ${square}`}
          className={[
            'relative aspect-square min-h-0 min-w-0 overflow-hidden bg-stone-700',
            isLastMove ? 'ring-4 ring-yellow-400' : '',
            isSelected ? 'outline outline-4 outline-sky-500' : '',
            isMandatory ? 'outline outline-4 outline-amber-400' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {isLegalTarget && <span className="absolute inset-0 m-auto h-1/4 w-1/4 rounded-full bg-emerald-400/70" />}
        </button>,
      );
    }
  }

  return (
    <div className="relative w-[min(98vw,62dvh,560px)] sm:w-[min(92vw,62dvh,560px)]">
      <div role="grid" className="grid aspect-square grid-cols-8 grid-rows-8">
        {squares}
      </div>
      <div className="pointer-events-none absolute inset-0">
        {displayPieces.map((piece) => {
          const { row, col } = squareToRowCol(piece.square);
          return (
            <div
              key={piece.id}
              data-square={piece.square}
              className={[
                'absolute flex items-center justify-center transition-all duration-400 motion-reduce:transition-none',
                piece.color === 'b' ? 'text-stone-900' : 'text-stone-50',
                piece.removing ? 'opacity-0 scale-75 duration-300' : 'opacity-100',
              ].join(' ')}
              style={{ left: `${col * 12.5}%`, top: `${row * 12.5}%`, width: '12.5%', height: '12.5%' }}
            >
              <PieceIcon type={piece.kind} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run components/CheckersBoard/CheckersBoard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Typecheck, lint, commit and push**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

```bash
git add components/CheckersBoard/CheckersBoard.tsx components/CheckersBoard/CheckersBoard.test.tsx
git commit -m "feat(checkers): CheckersBoard component -- static rendering

8x8 grid, dark squares only clickable, pieces as a separate absolutely-
positioned layer (foundation for the animation added in the next task).
Reuses lib/checkers/board.ts's geometry directly, never re-derives it.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

### Task 4: `CheckersBoard` — click handling and highlights

**Files:**
- Modify: `components/CheckersBoard/CheckersBoard.test.tsx`

**Interfaces:**
- Consumes/produces: no new exports — this task only adds test coverage for interaction behavior already implemented in Task 3's `CheckersBoard.tsx` (click callback, legal-target dot, selected/mandatory/last-move highlight classes). If any test fails, it means Task 3's implementation has a real bug to fix, not that new code is needed first.

- [ ] **Step 1: Write the tests**

Append to `components/CheckersBoard/CheckersBoard.test.tsx`. Add `fireEvent` to the existing `@testing-library/react` import line and `vi` to the existing `vitest` import line at the top of the file (merge into the existing statements — don't add duplicate `import` lines from the same module, matching this project's established convention).

```tsx
describe('CheckersBoard interaction', () => {
  it('calls onSquareClick with the clicked square number', () => {
    const handleClick = vi.fn();
    const { container } = render(
      <CheckersBoard
        board={createInitialBoard()}
        turn="b"
        selectedSquare={null}
        legalTargets={[]}
        mandatoryCaptureSquares={[]}
        lastMove={null}
        onSquareClick={handleClick}
      />,
    );
    const buttons = container.querySelectorAll('button');
    fireEvent.click(buttons[0]); // first dark square scanning row-major is square 1
    expect(handleClick).toHaveBeenCalledWith(1);
  });

  it('does not call onSquareClick when interactive is false', () => {
    const handleClick = vi.fn();
    const { container } = render(
      <CheckersBoard
        board={createInitialBoard()}
        turn="b"
        selectedSquare={null}
        legalTargets={[]}
        mandatoryCaptureSquares={[]}
        lastMove={null}
        interactive={false}
        onSquareClick={handleClick}
      />,
    );
    fireEvent.click(container.querySelectorAll('button')[0]);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('shows a legal-target indicator only on squares listed in legalTargets', () => {
    const { container } = render(
      <CheckersBoard
        board={createInitialBoard()}
        turn="b"
        selectedSquare={11}
        legalTargets={[15, 16]}
        mandatoryCaptureSquares={[]}
        lastMove={null}
        onSquareClick={() => {}}
      />,
    );
    const targetButtons = Array.from(container.querySelectorAll('button')).filter(
      (btn) => btn.getAttribute('aria-label') === 'square 15' || btn.getAttribute('aria-label') === 'square 16',
    );
    expect(targetButtons).toHaveLength(2);
    for (const btn of targetButtons) {
      expect(btn.querySelector('span')).not.toBeNull();
    }
    const nonTarget = container.querySelector('[aria-label="square 1"]');
    expect(nonTarget?.querySelector('span')).toBeNull();
  });

  it('applies the mandatory-capture outline class to the given squares', () => {
    const { container } = render(
      <CheckersBoard
        board={createInitialBoard()}
        turn="b"
        selectedSquare={null}
        legalTargets={[]}
        mandatoryCaptureSquares={[11]}
        lastMove={null}
        onSquareClick={() => {}}
      />,
    );
    const square11 = container.querySelector('[aria-label="square 11"]');
    expect(square11?.className).toContain('outline-amber-400');
  });
});
```

- [ ] **Step 2: Run to verify current status**

Run: `npx vitest run components/CheckersBoard/CheckersBoard.test.tsx`
Expected: PASS (Task 3's implementation already covers this behavior — if anything fails, it's a real bug in Task 3's code; fix `CheckersBoard.tsx` directly, minimally, to make the test pass, then note the fix in the report).

- [ ] **Step 3: Typecheck, lint, commit and push**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

```bash
git add components/CheckersBoard/CheckersBoard.test.tsx
git commit -m "test(checkers): cover CheckersBoard click handling and highlights

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

(If Task 3's code needed a real fix to pass these tests, `git add` the modified `CheckersBoard.tsx` too and mention the fix in the commit message and report.)

---

### Task 5: `CheckersBoard` — move animation

**Files:**
- Modify: `components/CheckersBoard/CheckersBoard.test.tsx`

**Interfaces:**
- No new exports — verifies the animation logic already written in Task 3's `CheckersBoard.tsx` (the `useEffect` that diffs `board` via `inferMove` and updates `displayPieces`). Same note as Task 4: a failing test here means a real bug to fix in `CheckersBoard.tsx`, not new production code to design.

- [ ] **Step 1: Write the tests**

Append to `components/CheckersBoard/CheckersBoard.test.tsx`. Add `act` to the existing `@testing-library/react` import line (merge, don't duplicate). Add two new import lines (these modules aren't imported in this file yet): `import { applyMove } from '@/lib/checkers/moveGeneration';` and `import type { Piece } from '@/lib/checkers/types';`.

```tsx
function emptyBoard(): (Piece | null)[] {
  return new Array(32).fill(null);
}

describe('CheckersBoard animation', () => {
  it('moves a piece to its new square when the board prop reflects a simple move', () => {
    const board1 = createInitialBoard();
    const move = { from: 11, to: 15, captures: [], promotes: false };
    const board2 = applyMove(board1, move);
    const { container, rerender } = render(
      <CheckersBoard board={board1} turn="b" selectedSquare={null} legalTargets={[]} mandatoryCaptureSquares={[]} lastMove={null} onSquareClick={() => {}} />,
    );
    rerender(
      <CheckersBoard board={board2} turn="w" selectedSquare={null} legalTargets={[]} mandatoryCaptureSquares={[]} lastMove={move} onSquareClick={() => {}} />,
    );
    expect(container.querySelector('[data-square="15"]')).not.toBeNull();
    expect(container.querySelector('[data-square="11"]')).toBeNull();
  });

  it('fades a captured piece out and removes it after the fade duration', () => {
    vi.useFakeTimers();
    try {
      const board1 = emptyBoard();
      board1[10] = { color: 'b', kind: 'man' }; // 11
      board1[14] = { color: 'w', kind: 'man' }; // 15
      const move = { from: 11, to: 18, captures: [15], promotes: false };
      const board2 = applyMove(board1, move);
      const { container, rerender } = render(
        <CheckersBoard board={board1} turn="b" selectedSquare={null} legalTargets={[]} mandatoryCaptureSquares={[]} lastMove={null} onSquareClick={() => {}} />,
      );
      rerender(
        <CheckersBoard board={board2} turn="w" selectedSquare={null} legalTargets={[]} mandatoryCaptureSquares={[]} lastMove={move} onSquareClick={() => {}} />,
      );
      expect(container.querySelector('[data-square="15"]')).not.toBeNull(); // still present, fading
      expect(container.querySelector('[data-square="18"]')).not.toBeNull(); // the moved piece has arrived
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(container.querySelector('[data-square="15"]')).toBeNull(); // removed after the fade
    } finally {
      vi.useRealTimers();
    }
  });

  it('snaps to a fresh position (no animation) when no legal move connects the two boards', () => {
    const board1 = createInitialBoard();
    const board2 = emptyBoard(); // unrelated position, e.g. after a reset
    const { container, rerender } = render(
      <CheckersBoard board={board1} turn="b" selectedSquare={null} legalTargets={[]} mandatoryCaptureSquares={[]} lastMove={null} onSquareClick={() => {}} />,
    );
    rerender(
      <CheckersBoard board={board2} turn="b" selectedSquare={null} legalTargets={[]} mandatoryCaptureSquares={[]} lastMove={null} onSquareClick={() => {}} />,
    );
    expect(container.querySelectorAll('[data-square]')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run to verify current status**

Run: `npx vitest run components/CheckersBoard/CheckersBoard.test.tsx`
Expected: PASS. If anything fails, fix `CheckersBoard.tsx`'s animation `useEffect` minimally to make it pass, and note the fix.

- [ ] **Step 3: Run the full suite, typecheck, lint**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: all pass.

- [ ] **Step 4: Commit and push**

```bash
git add components/CheckersBoard/CheckersBoard.test.tsx
git commit -m "test(checkers): cover CheckersBoard move/capture animation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

(If `CheckersBoard.tsx` needed a real fix, include it in this commit and describe it in the report.)

---

### Task 6: `/jogar` page — local two-player game loop

**Files:**
- Create: `app/jogar/page.tsx`

**Interfaces:**
- Consumes: `useCheckersGame` from `@/lib/checkers/useCheckersGame`; `CheckersBoard` from `@/components/CheckersBoard/CheckersBoard`; `Square` from `@/lib/checkers/types`.
- Produces: the `/jogar` route. No other file consumes this in this plan (it's a leaf page) — a later phase (AI, Phase 3) will extend this same file to add `mode=ai`/difficulty querystring handling, per the design spec's `app/jogar/page.tsx` role as "the integration point."

This page does not get a dedicated automated test file, matching Chess Sensei's own convention for its equivalent "big glue page" (`app/jogar/page.tsx` has no `.test.tsx` there either — it's verified by exercising the already-tested `useCheckersGame` hook and `CheckersBoard` component it composes, plus manual verification). **You must manually verify this page actually works** by running the dev server and playing a few moves — see Step 2.

- [ ] **Step 1: Write `app/jogar/page.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCheckersGame } from '@/lib/checkers/useCheckersGame';
import { CheckersBoard } from '@/components/CheckersBoard/CheckersBoard';
import type { Square } from '@/lib/checkers/types';

const STATUS_LABEL: Record<string, string> = {
  playing: '',
  'no-moves': 'Fim de jogo — sem jogadas possíveis',
  'draw-repetition': 'Empate por repetição de posição',
  'draw-no-capture': 'Empate — 40 lances sem captura',
};

export default function JogarPage() {
  const { state, legalMovesFrom, makeMove, reset } = useCheckersGame(true);
  const [selected, setSelected] = useState<Square | null>(null);

  const legalTargets = selected !== null ? legalMovesFrom(selected) : [];

  function handleSquareClick(square: Square) {
    if (state.isGameOver) return;

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

  function handleReset() {
    reset();
    setSelected(null);
  }

  const turnLabel = state.turn === 'b' ? 'Vez das pretas' : 'Vez das brancas';

  return (
    <main className="flex min-h-dvh flex-col items-center gap-4 p-4">
      <p aria-live="polite">{state.isGameOver ? STATUS_LABEL[state.status] : turnLabel}</p>
      <CheckersBoard
        board={state.board}
        turn={state.turn}
        selectedSquare={selected}
        legalTargets={legalTargets}
        mandatoryCaptureSquares={state.mandatoryCaptureSquares}
        lastMove={state.lastMove}
        interactive={!state.isGameOver}
        onSquareClick={handleSquareClick}
      />
      <div className="flex gap-4">
        <Link href="/" className="underline">
          Menu inicial
        </Link>
        <button type="button" onClick={handleReset} className="underline">
          Reiniciar partida
        </button>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Manually verify in the browser**

Run: `npm run dev`

Open `http://localhost:3000/jogar` and play through: click a black man, confirm its two legal targets highlight, click one, confirm the piece slides there and it becomes white's turn. Set up (by playing moves, or temporarily editing the initial position in a scratch test if needed — revert after) at least one capture and confirm: (a) the capturing piece is the only one offering legal targets when a capture is mandatory elsewhere, (b) the captured piece fades out, (c) a multi-jump chain completes in one click-sequence per the engine's `captureMovesFrom` semantics (selecting the piece, then clicking the final landing square executes the whole chain in one `makeMove` call — you do not click through each hop, since `legalMovesFrom` already returns the chain's final `to`). Confirm "Reiniciar partida" resets the board and "Menu inicial" navigates to `/` (a 404 is expected and fine — the menu page doesn't exist yet, out of scope for this plan).

Stop the dev server after verifying.

- [ ] **Step 3: Run the full suite, typecheck, lint**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: all pass (this page has no dedicated tests, but must not break anything or fail to build).

Run: `npm run build`
Expected: `✓ Compiled successfully` (confirms the new route builds; `/` will 404 at runtime until a later phase, but the build itself must succeed).

- [ ] **Step 4: Commit and push**

```bash
git add app/jogar/page.tsx
git commit -m "feat(checkers): /jogar -- local two-player game loop

Click-to-select-then-click-to-move on top of useCheckersGame +
CheckersBoard. Manually verified: simple moves, mandatory-capture
enforcement, multi-jump chains, capture fade animation, reset.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

### Task 7: Close out the phase in `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:** none — documentation only.

- [ ] **Step 1: Update `## Structure`**

Extend the existing `lib/checkers/` block and add a new one for `components/` and `app/jogar/`:

```markdown
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

- [ ] **Step 2: Add to `## Conventions`**

Insert before `## Deploy`:

```markdown
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
```

- [ ] **Step 3: Commit and push**

```bash
git add CLAUDE.md
git commit -m "docs: close out board-UI-and-local-2P phase in CLAUDE.md

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

## Plan self-review notes

- **Spec coverage:** implements spec §4 (board & pieces — CheckersBoard, PieceIcon/pieceStyles, animation, mandatory-capture highlight repurposing "threatened squares") and the local-2P slice of §5's feature parity map (the `/jogar` route, click-to-move flow). Deliberately deferred, per this plan's own scope decisions and noted in `CLAUDE.md`: multi-style piece theming, textured board squares, `ChipButton`/menu chrome, `GameEndModal`/toasts, and true stepwise multi-hop animation — all explicitly out of scope here, picked up by later phases (§5-§9 of the spec).
- **Placeholder scan:** no TBD/TODO; every step has real, runnable code. Tasks 4 and 5 are structured as test-only tasks verifying Task 3's already-written implementation (a legitimate pattern for UI code written and tested together) rather than "write tests for the above" placeholders — the code they test already exists in full in Task 3's Step 3, so there is no gap between what's asserted and what's implemented.
- **Type consistency:** `CheckersBoardProps`, `DisplayPiece`, and the `lastMove`/`mandatoryCaptureSquares` prop names match `UseCheckersGameResult`'s `CheckersGameState` shape from the previous plan exactly (`state.lastMove`, `state.mandatoryCaptureSquares`) — no renaming drift between the hook and the component consuming it in Task 6.
