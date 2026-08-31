# Bootstrap & Checkers Rules Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Next.js project exactly like Chess Sensei's tooling, then build and fully test `lib/checkers/` — the American/English checkers rules engine (board representation, legal move generation with mandatory capture and multi-jump chains, promotion, terminal-state detection, and the React hook + animation-diff helper the UI will consume in later phases). No UI is built in this plan — this plan's deliverable is a pure-logic module with complete test coverage.

**Architecture:** A pure, framework-free `lib/checkers/` module (types + functions, no classes, no external checkers library) mirroring the shape of Chess Sensei's `lib/chess/` — immutable `Board` snapshots, functions that take a board and return moves/new boards, a thin `useCheckersGame` React hook wrapping it for state + localStorage persistence, and a board-diffing `inferMove` helper for a later animation phase.

**Tech Stack:** Next.js 16.3.1, React 19.2.8, TypeScript (strict), Tailwind v4, Vitest 4 + jsdom + Testing Library, ESLint 9 — identical toolchain to Chess Sensei, no new dependencies for this plan (no chess.js/stockfish equivalent — the engine is hand-written).

**Spec:** `docs/superpowers/specs/2026-08-31-checkers-sensei-design.md` — this plan implements spec §0 (process rules), §1 (rules variant), §2 (rules engine), and §10 (tech stack, bootstrap portion). Later plans implement the remaining spec sections (§3-13).

## Global Constraints

- No worktrees, no feature branches — every task commits directly to `main`.
- Push to `origin main` immediately after every task's commit (`git push origin main`) — never batch unpushed commits across tasks.
- Rules variant: American/English checkers — 8×8 board, standard mandatory capture (not maximum-capture), non-flying kings, promotion mid-capture-chain stops the chain immediately (spec §1-2, decided, not ambiguous).
- No-capture draw threshold: exactly 80 plies (40 full moves) with no capture, exported as a named constant (spec §2).
- Package/repo naming: `package.json` name `checkers-learning-game` (spec §9) — already the case from Task 1 onward.
- `CLAUDE.md` is updated at the end of this plan (Task 9) with the conventions this plan introduces — not deferred to a later plan.
- TypeScript strict mode, same `tsconfig.json`/`eslint.config.mjs`/`vitest.config.ts` shape as Chess Sensei (spec §10).

---

### Task 1: Bootstrap the Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `vitest.setup.ts`, `.gitignore`
- Create: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- Create: `CLAUDE.md`

**Interfaces:**
- Produces: a working `npm run dev`/`npm run build`/`npm run lint`/`npm test` toolchain every later task relies on. No exported functions from this task.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "checkers-learning-game",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "16.3.1",
    "react": "19.2.8",
    "react-dom": "19.2.8"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@testing-library/dom": "^10.4.1",
    "@testing-library/jest-dom": "^7.0.1",
    "@testing-library/react": "^16.3.2",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^6.0.5",
    "eslint": "^9",
    "eslint-config-next": "16.3.1",
    "jsdom": "^30.0.1",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vitest": "^4.1.10"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Write `next.config.ts`**

```ts
import type { NextConfig } from 'next';

// Set only for the (later) Capacitor iOS build — Vercel's normal `next build`
// never sets this, so the web deploy is unaffected. See design spec §9/§11.
const isCapacitorBuild = process.env.BUILD_TARGET === 'capacitor';

const nextConfig: NextConfig = {
  ...(isCapacitorBuild ? { output: 'export' } : {}),
};

export default nextConfig;
```

- [ ] **Step 4: Write `postcss.config.mjs`**

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

- [ ] **Step 5: Write `eslint.config.mjs`**

```js
import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Extend with globalIgnores() in a later phase once vendored/generated
  // directories exist (e.g. a native iOS shell) — none do yet.
]);

export default eslintConfig;
```

- [ ] **Step 6: Write `vitest.config.ts`**

```ts
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mirrors tsconfig.json's "paths": { "@/*": ["./*"] } — Next.js resolves
    // this itself at build time, but Vitest runs on plain Vite and needs the
    // alias spelled out explicitly.
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
});
```

- [ ] **Step 7: Write `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

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

// NOTE for a later phase: once lib/settings/useSettings.ts exists, add a
// beforeEach here that clears localStorage, calls
// __resetSettingsCacheForTests(), and seeds the PT locale — matching Chess
// Sensei's vitest.setup.ts. Not needed yet — no settings module exists.
```

- [ ] **Step 8: Write `.gitignore`**

```
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# testing
/coverage

# next.js
/.next/
/out/
# regenerated automatically by `next dev`/`next build` — intentionally not
# tracked as stock scaffold boilerplate. CLAUDE.md is NOT auto-rewritten as
# long as AGENTS.md exists, and carries real project documentation, so it's
# tracked deliberately — see CLAUDE.md itself.
/AGENTS.md

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files (can opt-in for committing if needed)
.env*

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# superpowers SDD workspace
.superpowers/

# git worktrees — not used in this project (see CLAUDE.md), kept for parity
# with the twin project's tooling expectations
.claude/worktrees/
```

- [ ] **Step 9: Write `app/globals.css`**

```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

body {
  background: var(--background);
  color: var(--foreground);
}
```

- [ ] **Step 10: Write `app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Checkers Sensei',
  description: 'Checkers Sensei — placeholder layout, replaced in a later phase.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 11: Write `app/page.tsx`**

```tsx
export default function Home() {
  return (
    <main>
      <h1>Checkers Sensei</h1>
      <p>Bootstrap placeholder — replaced by the real menu in a later phase.</p>
    </main>
  );
}
```

- [ ] **Step 12: Write `CLAUDE.md` v1**

```markdown
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
```

## Deploy

Vercel only (same as Chess Sensei — Docker/self-host is not supported). No
environment variables needed — no backend, no auth, no API routes.
```

- [ ] **Step 13: Install dependencies**

Run: `npm install`
Expected: completes with no error, creates `package-lock.json` and `node_modules/`.

- [ ] **Step 14: Verify build, lint, and test all pass on the empty scaffold**

Run: `npm run build`
Expected: `✓ Compiled successfully`, no type errors.

Run: `npm run lint`
Expected: no errors (warnings acceptable).

Run: `npm test`
Expected: `No test files found` (Vitest exits 0 — no test files exist yet, that's correct for this step).

- [ ] **Step 15: Commit and push**

```bash
git add -A
git commit -m "chore: bootstrap Next.js project

Same toolchain as Chess Sensei: Next.js 16.3.1, React 19.2.8, Tailwind v4,
TypeScript strict, Vitest + jsdom + Testing Library, ESLint 9. CLAUDE.md v1
documents process rules (no worktrees, commit+push every task to main).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

### Task 2: Board geometry — `lib/checkers/types.ts` + `lib/checkers/board.ts`

**Files:**
- Create: `lib/checkers/types.ts`
- Create: `lib/checkers/board.ts`
- Test: `lib/checkers/board.test.ts`

**Interfaces:**
- Consumes: nothing (first logic module).
- Produces:
  - `type Square = number` (1-32), `type Color = 'b' | 'w'`, `type PieceKind = 'man' | 'king'`, `interface Piece { color: Color; kind: PieceKind }`, `type Board = ReadonlyArray<Piece | null>` (length 32, index = square-1), `interface CheckersMove { from: Square; to: Square; captures: Square[]; promotes: boolean }`, `type GameStatus = 'playing' | 'no-moves' | 'draw-repetition' | 'draw-no-capture'` — all from `types.ts`, imported by every later module.
  - `squareToRowCol(square: Square): { row: number; col: number }`, `rowColToSquare(row: number, col: number): Square | null`, `type Direction = 'nw' | 'ne' | 'sw' | 'se'`, `neighbor(square: Square, direction: Direction): Square | null`, `ALL_DIRECTIONS: Direction[]`, `FORWARD_DIRECTIONS: Record<Color, Direction[]>`, `isBackRowFor(square: Square, color: Color): boolean`, `createInitialBoard(): Board` — from `board.ts`, consumed by Tasks 3-9.

- [ ] **Step 1: Write `lib/checkers/types.ts`**

```ts
export type Square = number; // 1-32, standard checkers board numbering

export type Color = 'b' | 'w';
export type PieceKind = 'man' | 'king';

export interface Piece {
  color: Color;
  kind: PieceKind;
}

// Length 32, index = square - 1. Only the 32 dark squares of an 8x8 board
// are represented — light squares never hold a piece in checkers.
export type Board = ReadonlyArray<Piece | null>;

export interface CheckersMove {
  from: Square;
  to: Square;
  captures: Square[]; // squares of captured pieces, in order, [] if a simple move
  promotes: boolean;  // true if this move ends with the piece becoming a king
}

export type GameStatus =
  | 'playing'
  | 'no-moves'        // side to move has zero legal moves -> they lose
  | 'draw-repetition'
  | 'draw-no-capture';
```

- [ ] **Step 2: Write the failing test for board geometry**

```ts
// lib/checkers/board.test.ts
import { describe, it, expect } from 'vitest';
import {
  squareToRowCol,
  rowColToSquare,
  neighbor,
  createInitialBoard,
  isBackRowFor,
} from './board';

describe('squareToRowCol / rowColToSquare', () => {
  it('maps square 1 to row 0, col 1', () => {
    expect(squareToRowCol(1)).toEqual({ row: 0, col: 1 });
  });

  it('maps square 32 to row 7, col 6', () => {
    expect(squareToRowCol(32)).toEqual({ row: 7, col: 6 });
  });

  it('round-trips every square 1-32', () => {
    for (let s = 1; s <= 32; s++) {
      const { row, col } = squareToRowCol(s);
      expect(rowColToSquare(row, col)).toBe(s);
    }
  });

  it('returns null for a light (non-playable) square', () => {
    expect(rowColToSquare(0, 0)).toBeNull();
  });

  it('returns null out of bounds', () => {
    expect(rowColToSquare(-1, 1)).toBeNull();
    expect(rowColToSquare(8, 1)).toBeNull();
  });
});

describe('neighbor', () => {
  it('reproduces the real opening move 11-15 (black, southwest)', () => {
    expect(neighbor(11, 'sw')).toBe(15);
  });

  it('reproduces the real opening reply 23-19 (white, northeast)', () => {
    expect(neighbor(23, 'ne')).toBe(19);
  });

  it('returns null off the edge of the board', () => {
    expect(neighbor(1, 'nw')).toBeNull();
  });
});

describe('createInitialBoard', () => {
  it('places 12 black men on squares 1-12, empty middle, 12 white men on 21-32', () => {
    const board = createInitialBoard();
    for (let s = 1; s <= 12; s++) expect(board[s - 1]).toEqual({ color: 'b', kind: 'man' });
    for (let s = 13; s <= 20; s++) expect(board[s - 1]).toBeNull();
    for (let s = 21; s <= 32; s++) expect(board[s - 1]).toEqual({ color: 'w', kind: 'man' });
  });
});

describe('isBackRowFor', () => {
  it('row 7 (squares 29-32) is black\'s back row', () => {
    expect(isBackRowFor(30, 'b')).toBe(true);
    expect(isBackRowFor(11, 'b')).toBe(false);
  });

  it('row 0 (squares 1-4) is white\'s back row', () => {
    expect(isBackRowFor(2, 'w')).toBe(true);
    expect(isBackRowFor(23, 'w')).toBe(false);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run lib/checkers/board.test.ts`
Expected: FAIL — `Cannot find module './board'` (file doesn't exist yet).

- [ ] **Step 4: Write `lib/checkers/board.ts`**

```ts
import type { Board, Color, Piece, Square } from './types';

export interface RowCol {
  row: number; // 0 (top) to 7 (bottom)
  col: number; // 0 (left) to 7 (right)
}

// Standard checkers board numbering: 32 dark squares, 4 per row, numbered
// row-major from the top. Verified against real checkers notation during
// design — see board.test.ts's "reproduces the real opening move" cases.
export function squareToRowCol(square: Square): RowCol {
  const idx = square - 1;
  const row = Math.floor(idx / 4);
  const k = idx % 4;
  const col = row % 2 === 0 ? 2 * k + 1 : 2 * k;
  return { row, col };
}

export function rowColToSquare(row: number, col: number): Square | null {
  if (row < 0 || row > 7 || col < 0 || col > 7) return null;
  const isDark = row % 2 === 0 ? col % 2 === 1 : col % 2 === 0;
  if (!isDark) return null;
  const k = row % 2 === 0 ? (col - 1) / 2 : col / 2;
  return row * 4 + k + 1;
}

export type Direction = 'nw' | 'ne' | 'sw' | 'se';

const DIRECTION_DELTAS: Record<Direction, { dr: number; dc: number }> = {
  nw: { dr: -1, dc: -1 },
  ne: { dr: -1, dc: 1 },
  sw: { dr: 1, dc: -1 },
  se: { dr: 1, dc: 1 },
};

export function neighbor(square: Square, direction: Direction): Square | null {
  const { row, col } = squareToRowCol(square);
  const { dr, dc } = DIRECTION_DELTAS[direction];
  return rowColToSquare(row + dr, col + dc);
}

export const ALL_DIRECTIONS: Direction[] = ['nw', 'ne', 'sw', 'se'];

// Black starts at the top (rows 0-2, squares 1-12) and advances south
// (toward row 7). White starts at the bottom (rows 5-7, squares 21-32) and
// advances north (toward row 0). Kings ignore this and use ALL_DIRECTIONS.
export const FORWARD_DIRECTIONS: Record<Color, Direction[]> = {
  b: ['se', 'sw'],
  w: ['ne', 'nw'],
};

export function isBackRowFor(square: Square, color: Color): boolean {
  const { row } = squareToRowCol(square);
  return color === 'b' ? row === 7 : row === 0;
}

export function createInitialBoard(): Board {
  const board: (Piece | null)[] = new Array(32).fill(null);
  for (let s = 1; s <= 12; s++) board[s - 1] = { color: 'b', kind: 'man' };
  for (let s = 21; s <= 32; s++) board[s - 1] = { color: 'w', kind: 'man' };
  return board;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run lib/checkers/board.test.ts`
Expected: PASS, all assertions green.

- [ ] **Step 6: Typecheck, lint, commit and push**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

```bash
git add lib/checkers/types.ts lib/checkers/board.ts lib/checkers/board.test.ts
git commit -m "feat(checkers): board geometry and standard 1-32 numbering

squareToRowCol/rowColToSquare/neighbor/createInitialBoard, cross-checked
against real checkers notation (11-15, 23-19).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

### Task 3: Simple move generation — `lib/checkers/moveGeneration.ts` (part 1)

**Files:**
- Create: `lib/checkers/moveGeneration.ts`
- Test: `lib/checkers/moveGeneration.test.ts`

**Interfaces:**
- Consumes: `Board`, `Color`, `Square`, `CheckersMove`, `Piece` from `./types`; `ALL_DIRECTIONS`, `FORWARD_DIRECTIONS`, `neighbor`, `isBackRowFor`, `Direction`, `createInitialBoard` from `./board`.
- Produces: `simpleMovesFrom(board: Board, square: Square): CheckersMove[]` — consumed by Task 5 (`legalMovesFrom`) and later UI tasks.

- [ ] **Step 1: Write the failing test**

```ts
// lib/checkers/moveGeneration.test.ts
import { describe, it, expect } from 'vitest';
import { createInitialBoard } from './board';
import { simpleMovesFrom } from './moveGeneration';
import type { Piece } from './types';

export function emptyBoard(): (Piece | null)[] {
  return new Array(32).fill(null);
}

describe('simpleMovesFrom', () => {
  it('a black man on square 11 has two forward targets at the start of the game (15 and 16 are both empty)', () => {
    const board = createInitialBoard();
    const moves = simpleMovesFrom(board, 11);
    expect(moves.map((m) => m.to).sort((a, b) => a - b)).toEqual([15, 16]);
    expect(moves.every((m) => m.captures.length === 0 && !m.promotes)).toBe(true);
  });

  it('a black man on the edge (square 12) has only one forward target', () => {
    const board = createInitialBoard();
    expect(simpleMovesFrom(board, 12)).toEqual([
      { from: 12, to: 16, captures: [], promotes: false },
    ]);
  });

  it('a king can move in all four diagonal directions when they are all empty', () => {
    const board = emptyBoard();
    board[15] = { color: 'b', kind: 'king' }; // square 16
    const moves = simpleMovesFrom(board, 16);
    expect(moves.map((m) => m.to).sort((a, b) => a - b)).toEqual([11, 12, 19, 20]);
  });

  it('returns no moves for an empty square', () => {
    const board = emptyBoard();
    expect(simpleMovesFrom(board, 11)).toEqual([]);
  });

  it('a simple move onto the back row sets promotes: true', () => {
    const board = emptyBoard();
    board[26] = { color: 'b', kind: 'man' }; // square 27
    // square 27 -> 31 or 32 (row 7, black's back row)
    const moves = simpleMovesFrom(board, 27);
    expect(moves.every((m) => m.promotes)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/checkers/moveGeneration.test.ts`
Expected: FAIL — `Cannot find module './moveGeneration'`.

- [ ] **Step 3: Write `lib/checkers/moveGeneration.ts` (simple moves only for now)**

```ts
import { ALL_DIRECTIONS, FORWARD_DIRECTIONS, isBackRowFor, neighbor, type Direction } from './board';
import type { Board, CheckersMove, Piece, Square } from './types';

function directionsFor(piece: Piece): Direction[] {
  return piece.kind === 'king' ? ALL_DIRECTIONS : FORWARD_DIRECTIONS[piece.color];
}

export function simpleMovesFrom(board: Board, square: Square): CheckersMove[] {
  const piece = board[square - 1];
  if (!piece) return [];
  const moves: CheckersMove[] = [];
  for (const dir of directionsFor(piece)) {
    const to = neighbor(square, dir);
    if (to !== null && board[to - 1] === null) {
      moves.push({
        from: square,
        to,
        captures: [],
        promotes: piece.kind === 'man' && isBackRowFor(to, piece.color),
      });
    }
  }
  return moves;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/checkers/moveGeneration.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck, lint, commit and push**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

```bash
git add lib/checkers/moveGeneration.ts lib/checkers/moveGeneration.test.ts
git commit -m "feat(checkers): simple (non-capturing) move generation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

### Task 4: Capture move generation — multi-jump chains and the promotion-stops-chain rule

**Files:**
- Modify: `lib/checkers/moveGeneration.ts`
- Modify: `lib/checkers/moveGeneration.test.ts`

**Interfaces:**
- Consumes: same as Task 3, plus `Color`, `PieceKind` from `./types`.
- Produces: `captureMovesFrom(board: Board, square: Square): CheckersMove[]` — consumed by Task 5.

- [ ] **Step 1: Add the failing tests**

Append to `lib/checkers/moveGeneration.test.ts`:

```ts
import { captureMovesFrom } from './moveGeneration';

describe('captureMovesFrom', () => {
  it('captures a single adjacent enemy man and lands beyond it', () => {
    const board = emptyBoard();
    board[10] = { color: 'b', kind: 'man' }; // 11
    board[14] = { color: 'w', kind: 'man' }; // 15
    expect(captureMovesFrom(board, 11)).toEqual([
      { from: 11, to: 18, captures: [15], promotes: false },
    ]);
  });

  it('does not allow capturing your own piece', () => {
    const board = emptyBoard();
    board[10] = { color: 'b', kind: 'man' }; // 11
    board[14] = { color: 'b', kind: 'man' }; // 15
    expect(captureMovesFrom(board, 11)).toEqual([]);
  });

  it('does not allow a capture with no empty landing square beyond', () => {
    const board = emptyBoard();
    board[10] = { color: 'b', kind: 'man' }; // 11
    board[14] = { color: 'w', kind: 'man' }; // 15
    board[17] = { color: 'w', kind: 'man' }; // 18, blocks the landing square
    expect(captureMovesFrom(board, 11)).toEqual([]);
  });

  it('chains a double jump into a single move', () => {
    const board = emptyBoard();
    board[10] = { color: 'b', kind: 'man' }; // 11
    board[14] = { color: 'w', kind: 'man' }; // 15
    board[21] = { color: 'w', kind: 'man' }; // 22
    expect(captureMovesFrom(board, 11)).toEqual([
      { from: 11, to: 25, captures: [15, 22], promotes: false },
    ]);
  });

  it('a man that reaches the king row stops immediately, even if a further capture would be geometrically possible as a king', () => {
    const board = emptyBoard();
    board[21] = { color: 'b', kind: 'man' }; // 22
    board[25] = { color: 'w', kind: 'man' }; // 26 -- captured, landing 31 is the back row
    board[26] = { color: 'w', kind: 'man' }; // 27 -- only reachable from 31 if the chain continued as a king (it must not)
    expect(captureMovesFrom(board, 22)).toEqual([
      { from: 22, to: 31, captures: [26], promotes: true },
    ]);
  });

  it('a king can chain captures through both backward and forward directions', () => {
    const board = emptyBoard();
    board[17] = { color: 'b', kind: 'king' }; // 18
    board[14] = { color: 'w', kind: 'man' }; // 15 -- captured going "backward" (north) for black
    board[6] = { color: 'w', kind: 'man' }; // 7 -- captured continuing backward from the landing square
    expect(captureMovesFrom(board, 18)).toEqual([
      { from: 18, to: 2, captures: [15, 7], promotes: false },
    ]);
  });
});
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `npx vitest run lib/checkers/moveGeneration.test.ts`
Expected: FAIL — `captureMovesFrom is not a function` (or similar).

- [ ] **Step 3: Extend `lib/checkers/moveGeneration.ts` with capture generation**

Append to `lib/checkers/moveGeneration.ts`:

```ts
import type { Color, PieceKind } from './types';

interface ChainResult {
  to: Square;
  captures: Square[];
  promotes: boolean;
}

function captureChainsFrom(
  workingBoard: (Piece | null)[],
  color: Color,
  kind: PieceKind,
  current: Square,
  capturedSoFar: readonly Square[],
): ChainResult[] {
  const directions = kind === 'king' ? ALL_DIRECTIONS : FORWARD_DIRECTIONS[color];
  const results: ChainResult[] = [];

  for (const dir of directions) {
    const mid = neighbor(current, dir);
    if (mid === null) continue;
    const midPiece = workingBoard[mid - 1];
    if (!midPiece || midPiece.color === color) continue;
    if (capturedSoFar.includes(mid)) continue; // can't capture the same piece twice

    const landing = neighbor(mid, dir);
    if (landing === null) continue;
    if (workingBoard[landing - 1] !== null) continue;

    const nowCaptured = [...capturedSoFar, mid];
    const justPromoted = kind === 'man' && isBackRowFor(landing, color);

    if (justPromoted) {
      // A man reaching the king row stops immediately — it does not
      // continue capturing in the same turn as a newly-crowned king. See
      // design spec §2/§12 and CLAUDE.md's "promotion mid-chain" note.
      results.push({ to: landing, captures: nowCaptured, promotes: true });
      continue;
    }

    // Temporarily relocate the piece for the recursive lookahead. Captured
    // pieces stay on the working board (matches official rules: they're
    // only removed once the whole move finishes), but the moving piece
    // itself must vacate `current` so a chain that loops back through its
    // own trail sees the correct occupancy.
    const savedCurrent = workingBoard[current - 1];
    workingBoard[current - 1] = null;
    workingBoard[landing - 1] = savedCurrent;
    const further = captureChainsFrom(workingBoard, color, kind, landing, nowCaptured);
    workingBoard[landing - 1] = null;
    workingBoard[current - 1] = savedCurrent;

    if (further.length === 0) {
      results.push({ to: landing, captures: nowCaptured, promotes: false });
    } else {
      results.push(...further);
    }
  }

  return results;
}

export function captureMovesFrom(board: Board, square: Square): CheckersMove[] {
  const piece = board[square - 1];
  if (!piece) return [];
  const working = board.slice() as (Piece | null)[];
  return captureChainsFrom(working, piece.color, piece.kind, square, []).map((r) => ({
    from: square,
    to: r.to,
    captures: r.captures,
    promotes: r.promotes,
  }));
}
```

- [ ] **Step 4: Run to verify all tests pass**

Run: `npx vitest run lib/checkers/moveGeneration.test.ts`
Expected: PASS, all tests including the double-jump and promotion-stops-chain cases.

- [ ] **Step 5: Typecheck, lint, commit and push**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

```bash
git add lib/checkers/moveGeneration.ts lib/checkers/moveGeneration.test.ts
git commit -m "feat(checkers): capture generation with multi-jump chains

Recursive chain search with correct self-trail backtracking; a man
promoting mid-chain stops immediately per the design spec's American-
checkers convention (verified by a dedicated test).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

### Task 5: Mandatory capture + legal move aggregation

**Files:**
- Modify: `lib/checkers/moveGeneration.ts`
- Modify: `lib/checkers/moveGeneration.test.ts`

**Interfaces:**
- Consumes: `simpleMovesFrom`, `captureMovesFrom` (this file); `Board`, `Color`, `Square`, `CheckersMove` from `./types`.
- Produces: `hasAnyCapture(board: Board, turn: Color): boolean`, `legalMovesFrom(board: Board, turn: Color, square: Square): CheckersMove[]`, `allLegalMoves(board: Board, turn: Color): CheckersMove[]` — consumed by Task 7 (`gameStatus.ts`) and Task 8 (`useCheckersGame`).

- [ ] **Step 1: Add the failing tests**

Append to `lib/checkers/moveGeneration.test.ts`:

```ts
import { hasAnyCapture, legalMovesFrom, allLegalMoves } from './moveGeneration';

describe('mandatory capture', () => {
  it('hasAnyCapture is true only for the color that actually has one', () => {
    const board = emptyBoard();
    board[10] = { color: 'b', kind: 'man' }; // 11
    board[14] = { color: 'w', kind: 'man' }; // 15 -- diagonally adjacent to 11, so without a
    // blocker white could ALSO capture black here (15 --'ne'--> 11, landing 8) -- checkers
    // captures are symmetric by geometry, not one-directional. Block white's landing square
    // so this scenario actually isolates "only black has a capture," which is the property
    // under test.
    board[7] = { color: 'w', kind: 'man' }; // 8 -- blocks white's own capture landing square
    expect(hasAnyCapture(board, 'b')).toBe(true);
    expect(hasAnyCapture(board, 'w')).toBe(false);
  });

  it('legalMovesFrom only offers captures when a capture is mandatory anywhere for that color', () => {
    const board = emptyBoard();
    board[10] = { color: 'b', kind: 'man' }; // 11, has a capture
    board[14] = { color: 'w', kind: 'man' }; // 15
    board[8] = { color: 'b', kind: 'man' }; // 9, would have simple moves otherwise
    expect(legalMovesFrom(board, 'b', 9)).toEqual([]); // must sit out
    expect(legalMovesFrom(board, 'b', 11).map((m) => m.to)).toEqual([18]);
  });

  it('legalMovesFrom returns simple moves when no capture is mandatory', () => {
    const board = createInitialBoard();
    const moves = legalMovesFrom(board, 'b', 11);
    // Square 11 has two open forward targets at the start of the game (15 and
    // 16, same as simpleMovesFrom's own test) -- see moveGeneration.test.ts's
    // simpleMovesFrom test for the geometry.
    expect(moves.map((m) => m.to).sort((a, b) => a - b)).toEqual([15, 16]);
  });

  it('allLegalMoves at the start of the game returns exactly the 7 standard opening moves for black', () => {
    const board = createInitialBoard();
    expect(allLegalMoves(board, 'b').length).toBe(7);
  });
});
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `npx vitest run lib/checkers/moveGeneration.test.ts`
Expected: FAIL — `hasAnyCapture is not a function`.

- [ ] **Step 3: Extend `lib/checkers/moveGeneration.ts`**

Append:

```ts
export function hasAnyCapture(board: Board, turn: Color): boolean {
  for (let s = 1; s <= 32; s++) {
    const piece = board[s - 1];
    if (piece && piece.color === turn && captureMovesFrom(board, s).length > 0) return true;
  }
  return false;
}

export function legalMovesFrom(board: Board, turn: Color, square: Square): CheckersMove[] {
  const piece = board[square - 1];
  if (!piece || piece.color !== turn) return [];
  if (hasAnyCapture(board, turn)) return captureMovesFrom(board, square);
  return simpleMovesFrom(board, square);
}

export function allLegalMoves(board: Board, turn: Color): CheckersMove[] {
  const moves: CheckersMove[] = [];
  for (let s = 1; s <= 32; s++) {
    const piece = board[s - 1];
    if (piece && piece.color === turn) moves.push(...legalMovesFrom(board, turn, s));
  }
  return moves;
}
```

- [ ] **Step 4: Run to verify all tests pass**

Run: `npx vitest run lib/checkers/moveGeneration.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck, lint, commit and push**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

```bash
git add lib/checkers/moveGeneration.ts lib/checkers/moveGeneration.test.ts
git commit -m "feat(checkers): mandatory-capture enforcement and legal-move aggregation

hasAnyCapture/legalMovesFrom/allLegalMoves — a UI built on legalMovesFrom
never needs its own 'you must capture' logic, matching Chess Sensei's
'board stays dumb' philosophy.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

### Task 6: Applying a move to a board

**Files:**
- Modify: `lib/checkers/moveGeneration.ts`
- Modify: `lib/checkers/moveGeneration.test.ts`

**Interfaces:**
- Consumes: `Board`, `CheckersMove`, `Piece` from `./types`.
- Produces: `applyMove(board: Board, move: CheckersMove): Board` — consumed by Task 8 (`useCheckersGame`) and Task 9 (`inferMove`), and by every future game/AI/openings-trainer module.

- [ ] **Step 1: Add the failing tests**

Append to `lib/checkers/moveGeneration.test.ts`:

```ts
import { applyMove } from './moveGeneration';

describe('applyMove', () => {
  it('moves the piece and removes captured pieces', () => {
    const board = emptyBoard();
    board[10] = { color: 'b', kind: 'man' }; // 11
    board[14] = { color: 'w', kind: 'man' }; // 15
    const next = applyMove(board, { from: 11, to: 18, captures: [15], promotes: false });
    expect(next[10]).toBeNull();
    expect(next[14]).toBeNull();
    expect(next[17]).toEqual({ color: 'b', kind: 'man' });
  });

  it('promotes the piece to a king when the move says so', () => {
    const board = emptyBoard();
    board[21] = { color: 'b', kind: 'man' }; // 22
    board[25] = { color: 'w', kind: 'man' }; // 26
    const next = applyMove(board, { from: 22, to: 31, captures: [26], promotes: true });
    expect(next[30]).toEqual({ color: 'b', kind: 'king' });
    expect(next[21]).toBeNull();
    expect(next[25]).toBeNull();
  });

  it('does not mutate the input board', () => {
    const board = emptyBoard();
    board[10] = { color: 'b', kind: 'man' }; // 11
    const before = board.slice();
    applyMove(board, { from: 11, to: 15, captures: [], promotes: false });
    expect(board).toEqual(before);
  });

  it('throws if there is no piece at the from square', () => {
    const board = emptyBoard();
    expect(() => applyMove(board, { from: 1, to: 5, captures: [], promotes: false })).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `npx vitest run lib/checkers/moveGeneration.test.ts`
Expected: FAIL — `applyMove is not a function`.

- [ ] **Step 3: Extend `lib/checkers/moveGeneration.ts`**

Append:

```ts
export function applyMove(board: Board, move: CheckersMove): Board {
  const piece = board[move.from - 1];
  if (!piece) throw new Error(`applyMove: no piece at square ${move.from}`);
  const next = board.slice() as (Piece | null)[];
  next[move.from - 1] = null;
  for (const captured of move.captures) next[captured - 1] = null;
  next[move.to - 1] = move.promotes ? { color: piece.color, kind: 'king' } : piece;
  return next;
}
```

- [ ] **Step 4: Run to verify all tests pass**

Run: `npx vitest run lib/checkers/moveGeneration.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck, lint, commit and push**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

```bash
git add lib/checkers/moveGeneration.ts lib/checkers/moveGeneration.test.ts
git commit -m "feat(checkers): applyMove — immutable board update

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

### Task 7: Terminal-state detection — `lib/checkers/gameStatus.ts`

**Files:**
- Create: `lib/checkers/gameStatus.ts`
- Test: `lib/checkers/gameStatus.test.ts`

**Interfaces:**
- Consumes: `allLegalMoves` from `./moveGeneration`; `Board`, `Color`, `GameStatus` from `./types`; `createInitialBoard` from `./board`.
- Produces: `NO_CAPTURE_DRAW_PLIES: number`, `boardKey(board: Board, turn: Color): string`, `computeStatus(board: Board, turn: Color, plySinceLastCapture: number, positionCounts: ReadonlyMap<string, number>, positionKey: string): GameStatus` — consumed by Task 8 (`useCheckersGame`).

- [ ] **Step 1: Write the failing test**

```ts
// lib/checkers/gameStatus.test.ts
import { describe, it, expect } from 'vitest';
import { computeStatus, boardKey, NO_CAPTURE_DRAW_PLIES } from './gameStatus';
import { createInitialBoard } from './board';
import type { Piece } from './types';

function emptyBoard(): (Piece | null)[] {
  return new Array(32).fill(null);
}

describe('computeStatus', () => {
  it('is "playing" at the start of the game', () => {
    const board = createInitialBoard();
    expect(computeStatus(board, 'b', 0, new Map(), boardKey(board, 'b'))).toBe('playing');
  });

  it('is "no-moves" when the side to move has zero legal moves', () => {
    const board = emptyBoard();
    board[0] = { color: 'b', kind: 'man' }; // 1 — the only black piece
    board[4] = { color: 'w', kind: 'man' }; // 5 — blocks the simple move; capture is off-board
    board[5] = { color: 'w', kind: 'man' }; // 6 — blocks the simple move
    board[9] = { color: 'w', kind: 'man' }; // 10 — blocks the capture landing square behind 6
    expect(computeStatus(board, 'b', 0, new Map(), boardKey(board, 'b'))).toBe('no-moves');
  });

  it('is "draw-no-capture" once the no-capture ply counter reaches the threshold', () => {
    const board = createInitialBoard();
    const key = boardKey(board, 'b');
    expect(computeStatus(board, 'b', NO_CAPTURE_DRAW_PLIES, new Map(), key)).toBe('draw-no-capture');
    expect(computeStatus(board, 'b', NO_CAPTURE_DRAW_PLIES - 1, new Map(), key)).toBe('playing');
  });

  it('is "draw-repetition" once a position has occurred 3 times', () => {
    const board = createInitialBoard();
    const key = boardKey(board, 'b');
    const counts = new Map([[key, 3]]);
    expect(computeStatus(board, 'b', 0, counts, key)).toBe('draw-repetition');
  });
});

describe('boardKey', () => {
  it('differs by turn and matches for equal positions', () => {
    const board = createInitialBoard();
    expect(boardKey(board, 'b')).not.toBe(boardKey(board, 'w'));
    expect(boardKey(board, 'b')).toBe(boardKey(createInitialBoard(), 'b'));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/checkers/gameStatus.test.ts`
Expected: FAIL — `Cannot find module './gameStatus'`.

- [ ] **Step 3: Write `lib/checkers/gameStatus.ts`**

```ts
import type { Board, Color, GameStatus } from './types';
import { allLegalMoves } from './moveGeneration';

// 40 full moves (80 plies) with no capture by either side — the commonly-
// cited simplified version of checkers' no-progress rule. Informational,
// not a tournament-federation-verified threshold — see design spec §2 and
// CLAUDE.md.
export const NO_CAPTURE_DRAW_PLIES = 80;

export function boardKey(board: Board, turn: Color): string {
  return board.map((p) => (p ? `${p.color}${p.kind === 'king' ? 'K' : 'm'}` : '-')).join('') + turn;
}

export function computeStatus(
  board: Board,
  turn: Color,
  plySinceLastCapture: number,
  positionCounts: ReadonlyMap<string, number>,
  positionKey: string,
): GameStatus {
  if (allLegalMoves(board, turn).length === 0) return 'no-moves';
  if (plySinceLastCapture >= NO_CAPTURE_DRAW_PLIES) return 'draw-no-capture';
  if ((positionCounts.get(positionKey) ?? 0) >= 3) return 'draw-repetition';
  return 'playing';
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/checkers/gameStatus.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck, lint, commit and push**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

```bash
git add lib/checkers/gameStatus.ts lib/checkers/gameStatus.test.ts
git commit -m "feat(checkers): terminal-state detection (no-moves, both draw rules)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

### Task 8: `useCheckersGame` hook

**Files:**
- Create: `lib/checkers/useCheckersGame.ts`
- Test: `lib/checkers/useCheckersGame.test.ts`

**Interfaces:**
- Consumes: `legalMovesFrom`, `allLegalMoves` (unused directly but conceptually implied via `computeStatus`), `applyMove` from `./moveGeneration`; `computeStatus`, `boardKey` from `./gameStatus`; `createInitialBoard` from `./board`; `Board`, `Color`, `Square`, `CheckersMove`, `GameStatus`, `Piece` from `./types`.
- Produces: `STORAGE_KEY: string`, `clearSavedGame(): void`, `interface CheckersGameState { board: Board; turn: Color; status: GameStatus; isGameOver: boolean; lastMove: CheckersMove | null; mandatoryCaptureSquares: Square[] }`, `interface UseCheckersGameResult { state: CheckersGameState; legalMovesFrom: (square: Square) => Square[]; makeMove: (from: Square, to: Square) => boolean; reset: () => void }`, `useCheckersGame(persist?: boolean): UseCheckersGameResult` — consumed by every future UI phase (board component, `/jogar`-equivalent route, AI integration).

- [ ] **Step 1: Write the failing test**

```ts
// lib/checkers/useCheckersGame.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCheckersGame, clearSavedGame, STORAGE_KEY } from './useCheckersGame';

describe('useCheckersGame', () => {
  beforeEach(() => {
    clearSavedGame();
  });

  it('starts with the standard initial position and black to move', () => {
    const { result } = renderHook(() => useCheckersGame(false));
    expect(result.current.state.turn).toBe('b');
    expect(result.current.state.status).toBe('playing');
    expect(result.current.state.board[10]).toEqual({ color: 'b', kind: 'man' }); // square 11
  });

  it('makeMove applies a legal move and flips the turn', () => {
    const { result } = renderHook(() => useCheckersGame(false));
    act(() => {
      expect(result.current.makeMove(11, 15)).toBe(true);
    });
    expect(result.current.state.turn).toBe('w');
    expect(result.current.state.board[10]).toBeNull();
    expect(result.current.state.board[14]).toEqual({ color: 'b', kind: 'man' });
    expect(result.current.state.lastMove).toEqual({ from: 11, to: 15, captures: [], promotes: false });
  });

  it('makeMove rejects an illegal move and returns false', () => {
    const { result } = renderHook(() => useCheckersGame(false));
    act(() => {
      expect(result.current.makeMove(11, 20)).toBe(false);
    });
    expect(result.current.state.turn).toBe('b');
  });

  it('legalMovesFrom reflects the mandatory-capture rule', () => {
    const { result } = renderHook(() => useCheckersGame(false));
    act(() => {
      result.current.makeMove(11, 15);
    });
    act(() => {
      // NOT 23-19 -- that's the real checkers "exchange" line: 15 and 19 end
      // up diagonally adjacent with an open landing square, which would
      // hand black a mandatory capture and defeat the point of this test.
      // 24-20 is a genuinely quiet reply, nowhere near black's man at 15.
      result.current.makeMove(24, 20);
    });
    // Black to move again with no forced capture -- square 9 has its normal simple moves.
    expect(result.current.legalMovesFrom(9).sort((a, b) => a - b)).toEqual([13, 14]);
  });

  it('reset returns to the initial position', () => {
    const { result } = renderHook(() => useCheckersGame(false));
    act(() => {
      result.current.makeMove(11, 15);
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.state.turn).toBe('b');
    expect(result.current.state.board[10]).toEqual({ color: 'b', kind: 'man' });
  });

  it('persists to localStorage when persist=true and reloads on next mount', () => {
    const first = renderHook(() => useCheckersGame(true));
    act(() => {
      first.result.current.makeMove(11, 15);
    });
    first.unmount();
    const second = renderHook(() => useCheckersGame(true));
    expect(second.result.current.state.turn).toBe('w');
    expect(second.result.current.state.board[14]).toEqual({ color: 'b', kind: 'man' });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/checkers/useCheckersGame.test.ts`
Expected: FAIL — `Cannot find module './useCheckersGame'`.

- [ ] **Step 3: Write `lib/checkers/useCheckersGame.ts`**

```ts
'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { Board, Color, Square, CheckersMove, GameStatus, Piece } from './types';
import { createInitialBoard } from './board';
import { legalMovesFrom as legalMovesFromEngine, applyMove, hasAnyCapture } from './moveGeneration';
import { computeStatus, boardKey } from './gameStatus';

export const STORAGE_KEY = 'checkers-learning-game-board';

export interface CheckersGameState {
  board: Board;
  turn: Color;
  status: GameStatus;
  isGameOver: boolean;
  lastMove: CheckersMove | null;
  mandatoryCaptureSquares: Square[];
}

export interface UseCheckersGameResult {
  state: CheckersGameState;
  legalMovesFrom: (square: Square) => Square[];
  makeMove: (from: Square, to: Square) => boolean;
  reset: () => void;
}

interface PersistedGame {
  board: (Piece | null)[];
  turn: Color;
  lastMove: CheckersMove | null;
  plySinceLastCapture: number;
  positionCounts: [string, number][];
}

function initialGame(): PersistedGame {
  return {
    board: createInitialBoard() as (Piece | null)[],
    turn: 'b',
    lastMove: null,
    plySinceLastCapture: 0,
    positionCounts: [],
  };
}

function mandatoryCaptureSquaresFor(board: Board, turn: Color): Square[] {
  if (!hasAnyCapture(board, turn)) return [];
  const squares: Square[] = [];
  for (let s = 1; s <= 32; s++) {
    const piece = board[s - 1];
    if (piece && piece.color === turn && legalMovesFromEngine(board, turn, s).length > 0) {
      squares.push(s);
    }
  }
  return squares;
}

export function clearSavedGame(): void {
  if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY);
}

export function useCheckersGame(persist: boolean = true): UseCheckersGameResult {
  const [game, setGame] = useState<PersistedGame>(initialGame);

  // Same SSR-hydration-safe pattern as Chess Sensei's useSettings: start
  // from a fresh game on every render's initial pass, then load the real
  // saved game post-mount, in an effect.
  useEffect(() => {
    if (!persist) return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      setGame(JSON.parse(raw) as PersistedGame);
    } catch {
      // Corrupted save — ignore, keep the fresh initial game.
    }
  }, [persist]);

  useEffect(() => {
    if (!persist) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  }, [game, persist]);

  const makeMove = useCallback((from: Square, to: Square): boolean => {
    let didMove = false;
    setGame((prev) => {
      const move = legalMovesFromEngine(prev.board, prev.turn, from).find((m) => m.to === to);
      if (!move) return prev;
      didMove = true;
      const nextBoard = applyMove(prev.board, move);
      const nextTurn: Color = prev.turn === 'b' ? 'w' : 'b';
      const nextPlySinceLastCapture = move.captures.length > 0 ? 0 : prev.plySinceLastCapture + 1;
      const key = boardKey(nextBoard, nextTurn);
      const counts = new Map(prev.positionCounts);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return {
        board: nextBoard,
        turn: nextTurn,
        lastMove: move,
        plySinceLastCapture: nextPlySinceLastCapture,
        positionCounts: Array.from(counts.entries()),
      };
    });
    return didMove;
  }, []);

  const reset = useCallback(() => {
    setGame(initialGame());
    if (persist) clearSavedGame();
  }, [persist]);

  const status = computeStatus(
    game.board,
    game.turn,
    game.plySinceLastCapture,
    new Map(game.positionCounts),
    boardKey(game.board, game.turn),
  );

  const state: CheckersGameState = useMemo(
    () => ({
      board: game.board,
      turn: game.turn,
      status,
      isGameOver: status !== 'playing',
      lastMove: game.lastMove,
      mandatoryCaptureSquares: mandatoryCaptureSquaresFor(game.board, game.turn),
    }),
    [game, status],
  );

  return {
    state,
    legalMovesFrom: (square: Square) => legalMovesFromEngine(game.board, game.turn, square).map((m) => m.to),
    makeMove,
    reset,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/checkers/useCheckersGame.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck, lint, commit and push**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

```bash
git add lib/checkers/useCheckersGame.ts lib/checkers/useCheckersGame.test.ts
git commit -m "feat(checkers): useCheckersGame hook — state, mandatory-capture squares, localStorage persistence

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

### Task 9: `inferMove` (animation support) + close out the phase in `CLAUDE.md`

**Files:**
- Create: `lib/checkers/inferMove.ts`
- Test: `lib/checkers/inferMove.test.ts`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: `allLegalMoves`, `applyMove` from `./moveGeneration`; `Board`, `Color`, `CheckersMove` from `./types`.
- Produces: `inferMove(prevBoard: Board, turn: Color, nextBoard: Board): CheckersMove | null` — consumed by a later UI/animation phase (not used yet in this plan).

- [ ] **Step 1: Write the failing test**

```ts
// lib/checkers/inferMove.test.ts
import { describe, it, expect } from 'vitest';
import { createInitialBoard } from './board';
import { applyMove } from './moveGeneration';
import { inferMove } from './inferMove';
import type { Piece } from './types';

function emptyBoard(): (Piece | null)[] {
  return new Array(32).fill(null);
}

describe('inferMove', () => {
  it('infers a simple move between two consecutive positions', () => {
    const board = createInitialBoard();
    const move = { from: 11, to: 15, captures: [], promotes: false };
    const next = applyMove(board, move);
    expect(inferMove(board, 'b', next)).toEqual(move);
  });

  it('infers a multi-jump capture move', () => {
    const board = emptyBoard();
    board[10] = { color: 'b', kind: 'man' }; // 11
    board[14] = { color: 'w', kind: 'man' }; // 15
    board[21] = { color: 'w', kind: 'man' }; // 22
    const move = { from: 11, to: 25, captures: [15, 22], promotes: false };
    const next = applyMove(board, move);
    expect(inferMove(board, 'b', next)).toEqual(move);
  });

  it('returns null when no legal move connects the two positions', () => {
    const board = createInitialBoard();
    const unrelated = emptyBoard();
    expect(inferMove(board, 'b', unrelated)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/checkers/inferMove.test.ts`
Expected: FAIL — `Cannot find module './inferMove'`.

- [ ] **Step 3: Write `lib/checkers/inferMove.ts`**

```ts
import type { Board, CheckersMove, Color } from './types';
import { allLegalMoves, applyMove } from './moveGeneration';

function boardsEqual(a: Board, b: Board): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const pa = a[i];
    const pb = b[i];
    if (pa === null && pb === null) continue;
    if (!pa || !pb) return false;
    if (pa.color !== pb.color || pa.kind !== pb.kind) return false;
  }
  return true;
}

// Discovers which legal move connects two consecutive positions, by testing
// every legal move from prevBoard until one produces nextBoard. Used only
// for the sliding-piece animation in a later UI phase — never for
// validating/vetoing anything (same role as Chess Sensei's inferMove.ts).
export function inferMove(prevBoard: Board, turn: Color, nextBoard: Board): CheckersMove | null {
  for (const move of allLegalMoves(prevBoard, turn)) {
    if (boardsEqual(applyMove(prevBoard, move), nextBoard)) return move;
  }
  return null;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/checkers/inferMove.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full test suite for the whole plan**

Run: `npm test`
Expected: all test files pass (`board.test.ts`, `moveGeneration.test.ts`, `gameStatus.test.ts`, `useCheckersGame.test.ts`, `inferMove.test.ts`).

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 6: Update `CLAUDE.md` with the conventions this phase introduced**

Replace the `## Structure` section and add a new `## Conventions` section before `## Deploy`:

```markdown
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
```

- [ ] **Step 7: Commit and push, closing out the phase**

```bash
git add lib/checkers/inferMove.ts lib/checkers/inferMove.test.ts CLAUDE.md
git commit -m "feat(checkers): inferMove for move animation; update CLAUDE.md

Documents the rules-engine conventions this phase introduced: the verified
board-numbering scheme, the 'dumb board' / mandatory-capture-in-engine
philosophy, the promotion-mid-chain rule, the draw-rule threshold, and the
hydration-safe persistence pattern. Closes out the bootstrap + rules-engine
phase — lib/checkers/ is fully implemented and tested; no UI yet.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

## Plan self-review notes

- **Spec coverage**: this plan implements design spec §0 (process rules — Task 1 & every task's commit/push), §1 (rules variant — Task 4's promotion test, Task 1's Global Constraints), §2 (rules engine — Tasks 2-9 cover every function/type listed in the spec's §2 code blocks: `Square`/`Color`/`GameStatus`/`CheckersMove`, `legalMovesFrom`/`allLegalMoves`/`hasAnyCapture`/`applyMove`, `useCheckersGame`, `inferMove`), and the bootstrap portion of §10 (tech stack — Task 1). Spec §3-9 and §11-13 (AI, board/piece UI, feature parity, visual assets, naming/deploy details, native iOS, testing strategy beyond this module) are explicitly out of scope for this plan — later plans, one per remaining §13 phase.
- **Placeholder scan**: no TBD/TODO; every step has real, runnable code; no step says "similar to Task N" without the actual code repeated in place.
- **Type consistency**: `CheckersMove`, `Board`, `Piece`, `Square`, `Color`, `PieceKind`, `GameStatus` are defined once in Task 2 and used with identical names/shapes through Task 9. `legalMovesFrom` (engine-level, `moveGeneration.ts`) and the hook's own `legalMovesFrom` (square-list-returning wrapper) are intentionally different signatures at different layers — the hook's version is aliased internally as `legalMovesFromEngine` to avoid confusing the two, called out explicitly in Task 8.
