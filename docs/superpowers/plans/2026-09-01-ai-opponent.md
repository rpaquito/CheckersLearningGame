# AI Opponent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a custom checkers AI (no off-the-shelf engine binary — this is a
from-scratch minimax/alpha-beta engine, unlike Chess Sensei's vendored
Stockfish) running in a Web Worker, with three difficulty levels, and wire it
into `/jogar` via a new `/configurar` difficulty/color picker, so a human can
play a real game against the computer.

**Architecture:** All search/evaluation logic lives in plain, worker-independent,
fully unit-testable `lib/checkers/*.ts` modules (`evaluate.ts`, `search.ts`,
`difficulty.ts`, `selectMove.ts`, `moveClassification.ts`) — none of them import
`Worker` or anything DOM-specific. `checkersEngine.worker.ts` is a thin message-
handler shim over those modules, bundled as a native module worker via Next.js's
`new Worker(new URL('./checkersEngine.worker.ts', import.meta.url))` (no
external/public asset, unlike Stockfish's prebuilt WASM binary — Turbopack
compiles our own TS source for the worker same as it does the main bundle).
`checkersEngineClient.ts` wraps that worker behind a promise-serialized
request/response API, injectable for testing (mirrors the "why serialize"
reasoning in Chess Sensei's `stockfishClient.ts`, but simpler: no UCI text
protocol, no WASM-load readiness handshake, since the worker runs our own TS
directly). `app/configurar/page.tsx` and the AI-mode extension to
`app/jogar/page.tsx` stay plain Tailwind/hardcoded-Portuguese, matching
`/jogar`'s established style from the previous phase — they do **not** import
Chess Sensei's `ChipButton`/`PageChrome`/`useTranslation`/`GameSetup`/
`ToggleGroup`, none of which exist in this repo yet (those arrive in Phase 5).

**Tech Stack:** Same as the previous plan — Next.js 16.3.1 (Turbopack), React
19.2.8, Tailwind v4, TypeScript strict, Vitest + jsdom + Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-31-checkers-sensei-design.md` — this
plan implements spec §3 (AI opponent, including its "Move-quality grading"
subsection's pure functions — see Global Constraints for what's explicitly
deferred) and the vs-computer slice of §5's feature parity map (`/configurar`,
`/jogar`'s `mode=ai` handling).

## Global Constraints

- No worktrees, no feature branches — every task commits directly to `main`,
  pushed immediately after (`git push origin main`).
- TypeScript strict mode; every task must typecheck and lint clean before commit.
- **Difficulty table** (spec §3, provisional numbers — already fixed, don't
  re-derive):

  | Difficulty | maxDepth | timeBudgetMs | randomness |
  |---|---|---|---|
  | facil | 3 | 200 | 0.8 |
  | medio | 6 | 600 | 0.35 |
  | dificil | 10 | 1800 | 0 |

- **Move-quality grading is scoped to its pure functions only, in this plan.**
  Spec §3 bundles `moveClassification.ts` under the AI-opponent section
  because the engine's own evaluator is what feeds it — so this plan builds
  `evalLoss`/`classifyMove` (cheap, self-contained, ~15 lines) and the
  worker's `evaluate` message (a full-strength, `randomness: 0` search to a
  given depth). It does **not** wire any UI around them (no toast, no move
  suggestion overlay, no learning panel) — that's Phase 4 (learning mode) per
  the design spec's build-phasing (§13), which needs highlighting UI that
  doesn't exist yet.
- **No `ChipButton`/`PageChrome`/`useTranslation`/`GameSetup`/`ToggleGroup`
  imports.** None of Chess Sensei's chrome/i18n system exists in this repo yet
  (Phase 5/8). `/configurar` and `/jogar`'s AI wiring use plain Tailwind and
  hardcoded Portuguese strings, matching `/jogar`'s existing style
  (`STATUS_LABEL`, `turnLabel` etc. in `app/jogar/page.tsx`).
- **Worker/client-wrapper code is not unit-tested for its worker plumbing
  itself** (`checkersEngine.worker.ts`'s `self.onmessage` handler) — this
  matches Chess Sensei's own precedent (`lib/chess/stockfishClient.ts` has no
  test file; jsdom has no real Worker implementation to exercise it against).
  `checkersEngineClient.ts` **is** unit-tested despite this, via a
  dependency-injected fake "worker-like" object (see Task 6) — this is a
  deliberate improvement over Chess Sensei's precedent, not a full reversal
  of it: only the promise-serialization logic is made testable this way, not
  real threading or the actual search algorithm (already covered by Task 5's
  tests against `search.ts` directly).
- Evaluation/search modules never import anything from `components/` or
  `app/` — dependency flows one direction, same as the rest of `lib/checkers/`.
- Board/move types (`Board`, `Color`, `CheckersMove`, `Square`) are reused
  from `@/lib/checkers/types` — never redefined.

---

### Task 1: `lib/checkers/difficulty.ts` — difficulty presets

**Files:**
- Create: `lib/checkers/difficulty.ts`
- Test: `lib/checkers/difficulty.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `Difficulty` type, `EngineOptions` interface
  (`{ maxDepth: number; timeBudgetMs: number; randomness: number }`),
  `difficultyToEngineOptions(difficulty: Difficulty): EngineOptions` — consumed
  by Task 5 (`search.ts`), Task 6 (`checkersEngine.worker.ts`/
  `checkersEngineClient.ts`), and Task 7 (`/configurar`).

- [ ] **Step 1: Write the failing test**

```ts
// lib/checkers/difficulty.test.ts
import { describe, it, expect } from 'vitest';
import { difficultyToEngineOptions } from './difficulty';

describe('difficultyToEngineOptions', () => {
  it('returns facil options', () => {
    expect(difficultyToEngineOptions('facil')).toEqual({ maxDepth: 3, timeBudgetMs: 200, randomness: 0.8 });
  });

  it('returns medio options', () => {
    expect(difficultyToEngineOptions('medio')).toEqual({ maxDepth: 6, timeBudgetMs: 600, randomness: 0.35 });
  });

  it('returns dificil options with zero randomness (always the best move)', () => {
    expect(difficultyToEngineOptions('dificil')).toEqual({ maxDepth: 10, timeBudgetMs: 1800, randomness: 0 });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/checkers/difficulty.test.ts`
Expected: FAIL — `Cannot find module './difficulty'`.

- [ ] **Step 3: Write `lib/checkers/difficulty.ts`**

```ts
export type Difficulty = 'facil' | 'medio' | 'dificil';

export interface EngineOptions {
  maxDepth: number;
  timeBudgetMs: number;
  // 0 = always play the engine's single best-scoring candidate move. Above
  // 0, a weighted-random pick among the top-scoring root candidates (see
  // selectMove.ts) -- makes lower difficulties feel like an imperfect human
  // opponent instead of a depth-capped engine that still finds its best
  // idea every single time.
  randomness: number;
}

// Provisional numbers from the design spec (§3) -- write these as a first
// guess, then adjust based on how the AI actually plays/feels in manual
// testing. Not treated as final without playing a few games.
const DIFFICULTY_OPTIONS: Record<Difficulty, EngineOptions> = {
  facil: { maxDepth: 3, timeBudgetMs: 200, randomness: 0.8 },
  medio: { maxDepth: 6, timeBudgetMs: 600, randomness: 0.35 },
  dificil: { maxDepth: 10, timeBudgetMs: 1800, randomness: 0 },
};

export function difficultyToEngineOptions(difficulty: Difficulty): EngineOptions {
  return DIFFICULTY_OPTIONS[difficulty];
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/checkers/difficulty.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck, lint, commit and push**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

```bash
git add lib/checkers/difficulty.ts lib/checkers/difficulty.test.ts
git commit -m "feat(checkers): difficulty presets (facil/medio/dificil)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

### Task 2: `lib/checkers/evaluate.ts` — position evaluation

**Files:**
- Create: `lib/checkers/evaluate.ts`
- Test: `lib/checkers/evaluate.test.ts`

**Interfaces:**
- Consumes: `Board`, `Color` from `./types`; `squareToRowCol`, `isBackRowFor`
  from `./board`; `allLegalMoves` from `./moveGeneration`.
- Produces: `evaluate(board: Board, color: Color): number` — consumed by
  Task 5 (`search.ts`'s leaf nodes) and Task 6 (the worker's `evaluate`
  message ultimately calls into search, which calls this).

- [ ] **Step 1: Write the failing tests**

```ts
// lib/checkers/evaluate.test.ts
import { describe, it, expect } from 'vitest';
import type { Piece } from './types';
import { createInitialBoard } from './board';
import { evaluate } from './evaluate';

function emptyBoard(): (Piece | null)[] {
  return new Array(32).fill(null);
}

describe('evaluate', () => {
  it('is zero for an empty board', () => {
    expect(evaluate(emptyBoard(), 'b')).toBe(0);
  });

  it('is exactly antisymmetric between the two colors on the same board', () => {
    // Every term evaluate() sums is signed by (piece.color === color ? 1 : -1),
    // and the mobility term is a plain difference of each side's own legal-
    // move count -- so evaluating the same board from the opposite color's
    // perspective must always negate the result, for any board.
    const board = createInitialBoard();
    expect(evaluate(board, 'w')).toBe(-evaluate(board, 'b'));
  });

  it('values a king strictly higher than a man', () => {
    const withKing = emptyBoard();
    withKing[0] = { color: 'b', kind: 'king' }; // square 1
    const withMan = emptyBoard();
    withMan[0] = { color: 'b', kind: 'man' }; // square 1
    // A lone king is worth strictly more material than a lone man on the
    // same square, and is never LESS mobile (kings move in all 4
    // directions, men in 2) -- so this holds regardless of the exact
    // positional-term magnitudes.
    expect(evaluate(withKing, 'b')).toBeGreaterThan(evaluate(withMan, 'b'));
  });

  it('favors the color with a decisive material advantage', () => {
    const board = emptyBoard();
    board[0] = { color: 'b', kind: 'man' }; // square 1
    board[3] = { color: 'b', kind: 'man' }; // square 4
    board[6] = { color: 'b', kind: 'man' }; // square 7
    board[27] = { color: 'w', kind: 'man' }; // square 28
    // Black has 3 men to white's 1 -- a 200+ material edge that no
    // plausible combination of this evaluator's small positional/mobility
    // terms (each worth single digits per piece) can overcome.
    expect(evaluate(board, 'b')).toBeGreaterThan(0);
  });

  it('rewards a man staying on its own back row over advancing one row forward', () => {
    const onBackRow = emptyBoard();
    onBackRow[0] = { color: 'b', kind: 'man' }; // square 1: row 0, col 1 (black's back row, non-center column)
    const advancedOne = emptyBoard();
    advancedOne[5] = { color: 'b', kind: 'man' }; // square 6: row 1, col 2 (one row forward, still non-center)
    // Back-row bonus (8) exceeds the one-row advancement bonus (2) gained by
    // moving forward, and both squares are non-center columns (so the
    // center-column bonus is 0 for both, not a confound); the mobility
    // difference between a lone man on these two squares is at most ±2,
    // which can't overturn a 6-point margin.
    expect(evaluate(onBackRow, 'b')).toBeGreaterThan(evaluate(advancedOne, 'b'));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/checkers/evaluate.test.ts`
Expected: FAIL — `Cannot find module './evaluate'`.

- [ ] **Step 3: Write `lib/checkers/evaluate.ts`**

```ts
import type { Board, Color } from './types';
import { squareToRowCol, isBackRowFor } from './board';
import { allLegalMoves } from './moveGeneration';

const MAN_VALUE = 100;
const KING_VALUE = 275;
const BACK_ROW_BONUS = 8;
const CENTER_COLUMN_BONUS = 4;
const ADVANCEMENT_WEIGHT = 2;
const MOBILITY_WEIGHT = 1;
const CENTER_COLUMNS = new Set([3, 4]);

// Returns a score from `color`'s perspective: positive favors `color`,
// negative favors the opponent, zero is balanced. Combines material (the
// dominant term, man=100/king=275 per spec §3) with light positional terms
// documented there: back-row retention (a real checkers opening principle
// -- keeping men on your own back row delays the opponent's kinging),
// center-column control, advancement toward promotion, and mobility
// (legal move count) as a tie-breaker only, weighted far below material.
// Every term is signed identically by each piece's color relative to
// `color`, and the mobility term is a plain difference of each side's own
// move count -- so evaluate(board, other-color) === -evaluate(board, color)
// always (see evaluate.test.ts's antisymmetry test).
export function evaluate(board: Board, color: Color): number {
  const opponent: Color = color === 'b' ? 'w' : 'b';
  let score = 0;
  for (let s = 1; s <= 32; s++) {
    const piece = board[s - 1];
    if (!piece) continue;
    const sign = piece.color === color ? 1 : -1;
    score += sign * (piece.kind === 'king' ? KING_VALUE : MAN_VALUE);
    const { row, col } = squareToRowCol(s);
    if (piece.kind === 'man') {
      if (isBackRowFor(s, piece.color)) score += sign * BACK_ROW_BONUS;
      const advancement = piece.color === 'b' ? row : 7 - row;
      score += sign * advancement * ADVANCEMENT_WEIGHT;
    }
    if (CENTER_COLUMNS.has(col)) score += sign * CENTER_COLUMN_BONUS;
  }
  score += MOBILITY_WEIGHT * (allLegalMoves(board, color).length - allLegalMoves(board, opponent).length);
  return score;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/checkers/evaluate.test.ts`
Expected: PASS, all 5 tests.

- [ ] **Step 5: Typecheck, lint, commit and push**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

```bash
git add lib/checkers/evaluate.ts lib/checkers/evaluate.test.ts
git commit -m "feat(checkers): position evaluation (material + positional terms)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

### Task 3: `lib/checkers/selectMove.ts` — weighted move selection

**Files:**
- Create: `lib/checkers/selectMove.ts`
- Test: `lib/checkers/selectMove.test.ts`

**Interfaces:**
- Consumes: nothing (generic, engine-agnostic).
- Produces: `MoveCandidate<T>` interface (`{ move: T; score: number }`),
  `selectWeightedMove<T>(candidates: MoveCandidate<T>[], randomness: number, random?: () => number): T`
  — consumed by Task 5 (`search.ts`, with `T = CheckersMove`).

Ported from Chess Sensei's `lib/chess/selectMove.ts`, generalized from a UCI
move string to a generic `T` (checkers moves are `CheckersMove` objects, not
strings) — a deliberate, documented deviation from "reuse verbatim": the
weighting *algorithm* is unchanged line-for-line, only its type parameter is
generalized. Precondition: callers must pass `candidates` with the
best-scoring one at index 0 (this file doesn't sort) — `search.ts` does that
sorting before calling in.

- [ ] **Step 1: Write the failing tests**

```ts
// lib/checkers/selectMove.test.ts
import { describe, it, expect } from 'vitest';
import { selectWeightedMove } from './selectMove';

describe('selectWeightedMove', () => {
  it('always returns the single candidate when there is only one', () => {
    const move = selectWeightedMove([{ move: 'A', score: 20 }], 1, () => 0.999);
    expect(move).toBe('A');
  });

  it('always returns the best (first) candidate when randomness is 0', () => {
    const candidates = [
      { move: 'A', score: 100 },
      { move: 'B', score: -500 },
    ];
    // Even a random() that would favor the worse move at higher randomness
    // must not matter when randomness is 0.
    const move = selectWeightedMove(candidates, 0, () => 0.999);
    expect(move).toBe('A');
  });

  it('almost always returns the best candidate when randomness is very low', () => {
    const candidates = [
      { move: 'A', score: 100 },
      { move: 'B', score: 0 },
    ];
    const move = selectWeightedMove(candidates, 0.05, () => 0.99);
    expect(move).toBe('A');
  });

  it('can return a weaker candidate when randomness is high and the draw favors it', () => {
    const candidates = [
      { move: 'A', score: 100 },
      { move: 'B', score: 0 },
    ];
    const move = selectWeightedMove(candidates, 1, () => 0.9);
    expect(move).toBe('B');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/checkers/selectMove.test.ts`
Expected: FAIL — `Cannot find module './selectMove'`.

- [ ] **Step 3: Write `lib/checkers/selectMove.ts`**

```ts
export interface MoveCandidate<T> {
  move: T;
  score: number; // from the perspective of whoever is choosing; higher is better
}

// Scales `randomness` (0-1) into a softmax temperature. At the top of the
// range (randomness 1), a real evaluation-scale gap between two candidates
// still leaves the weaker one a real (if minority) chance of being picked;
// near 0, even a small gap makes the weaker candidate's weight negligible.
const MAX_TEMPERATURE = 200;

// Picks one move out of the engine's top candidates, weighted toward better
// moves but not always the single best one -- this is what makes lower
// difficulties feel like an imperfect human instead of a depth-capped
// engine that still finds its best idea every time. `randomness` 0 always
// returns candidates[0] (the caller must have it sorted best-first);
// `random` is injectable for deterministic tests.
//
// Ported from Chess Sensei's lib/chess/selectMove.ts's selectWeightedMove,
// generalized from a UCI move string to a generic T -- the weighting
// algorithm itself is unchanged.
export function selectWeightedMove<T>(
  candidates: MoveCandidate<T>[],
  randomness: number,
  random: () => number = Math.random
): T {
  if (candidates.length <= 1 || randomness <= 0) {
    return candidates[0].move;
  }

  const temperature = randomness * MAX_TEMPERATURE;
  const bestScore = Math.max(...candidates.map((c) => c.score));
  const weights = candidates.map((c) => Math.exp((c.score - bestScore) / temperature));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  const draw = random() * totalWeight;
  let cumulative = 0;
  for (let i = 0; i < candidates.length; i++) {
    cumulative += weights[i];
    if (draw < cumulative) return candidates[i].move;
  }
  return candidates[candidates.length - 1].move;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/checkers/selectMove.test.ts`
Expected: PASS, all 4 tests.

- [ ] **Step 5: Typecheck, lint, commit and push**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

```bash
git add lib/checkers/selectMove.ts lib/checkers/selectMove.test.ts
git commit -m "feat(checkers): selectWeightedMove -- softmax pick among top candidates

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

### Task 4: `lib/checkers/moveClassification.ts` — move-quality thresholds

**Files:**
- Create: `lib/checkers/moveClassification.ts`
- Test: `lib/checkers/moveClassification.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `MoveQuality` type (`'boa' | 'imprecisao' | 'erro'`),
  `evalLoss(bestEval: number, playedEval: number): number`,
  `classifyMove(loss: number): MoveQuality` — not consumed by any other task
  in this plan (per Global Constraints, the UI wiring is Phase 4's job); these
  are built now because they're small, self-contained, and spec-mandated
  under §3.

Checkers-recalibrated thresholds per spec §3 (provisional, not centipawn-scale
like chess): ≤15 "boa", ≤50 "imprecisão", else "erro".

- [ ] **Step 1: Write the failing tests**

```ts
// lib/checkers/moveClassification.test.ts
import { describe, it, expect } from 'vitest';
import { evalLoss, classifyMove } from './moveClassification';

describe('evalLoss', () => {
  it('is zero when the played move matches the best move', () => {
    expect(evalLoss(50, 50)).toBe(0);
  });

  it('is the difference when the played move is worse', () => {
    expect(evalLoss(50, 10)).toBe(40);
  });

  it('never goes negative when the played move is better than the reference', () => {
    expect(evalLoss(50, 80)).toBe(0);
  });
});

describe('classifyMove', () => {
  it('classifies 0 loss as a good move', () => {
    expect(classifyMove(0)).toBe('boa');
  });

  it('classifies exactly 15 loss as a good move', () => {
    expect(classifyMove(15)).toBe('boa');
  });

  it('classifies 16 loss as an imprecision', () => {
    expect(classifyMove(16)).toBe('imprecisao');
  });

  it('classifies exactly 50 loss as an imprecision', () => {
    expect(classifyMove(50)).toBe('imprecisao');
  });

  it('classifies 51 loss as a mistake', () => {
    expect(classifyMove(51)).toBe('erro');
  });

  it('throws for a negative loss', () => {
    expect(() => classifyMove(-1)).toThrow(RangeError);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/checkers/moveClassification.test.ts`
Expected: FAIL — `Cannot find module './moveClassification'`.

- [ ] **Step 3: Write `lib/checkers/moveClassification.ts`**

```ts
export type MoveQuality = 'boa' | 'imprecisao' | 'erro';

// Difference between the best available move's evaluation and the played
// move's evaluation, both from the perspective of whoever moved. Never
// negative: a played move that scores better than the reference (can
// happen with a shallower reference search) counts as zero loss.
export function evalLoss(bestEval: number, playedEval: number): number {
  return Math.max(0, bestEval - playedEval);
}

// Checkers-recalibrated thresholds (spec §3) -- NOT chess's centipawn scale.
// Checkers' material scale here is man=100/king=275 and swings are
// generally smaller-magnitude than chess (no queen-scale blunders).
// Provisional, same "verify by playing" caveat as the search depth/time
// numbers in difficulty.ts.
export function classifyMove(loss: number): MoveQuality {
  if (loss < 0) {
    throw new RangeError('loss não pode ser negativo');
  }
  if (loss <= 15) return 'boa';
  if (loss <= 50) return 'imprecisao';
  return 'erro';
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/checkers/moveClassification.test.ts`
Expected: PASS, all 9 tests.

- [ ] **Step 5: Typecheck, lint, commit and push**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

```bash
git add lib/checkers/moveClassification.ts lib/checkers/moveClassification.test.ts
git commit -m "feat(checkers): move-quality classification (evalLoss/classifyMove)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

### Task 5: `lib/checkers/search.ts` — minimax with alpha-beta + iterative deepening

**Files:**
- Create: `lib/checkers/search.ts`
- Test: `lib/checkers/search.test.ts`

**Interfaces:**
- Consumes: `Board`, `Color`, `CheckersMove` from `./types`; `allLegalMoves`,
  `applyMove` from `./moveGeneration`; `evaluate` from `./evaluate`;
  `EngineOptions` from `./difficulty`; `MoveCandidate`, `selectWeightedMove`
  from `./selectMove`.
- Produces: `SearchResult` interface
  (`{ move: CheckersMove; bestScore: number; candidates: MoveCandidate<CheckersMove>[] }`),
  `findBestMove(board: Board, turn: Color, options: EngineOptions, random?: () => number): SearchResult`
  — consumed by Task 6 (`checkersEngine.worker.ts`).

`findBestMove` throws if called with a board/turn that has zero legal moves
(the caller's responsibility to check `state.isGameOver` first — mirrors how
`useCheckersGame`'s `makeMove` already assumes a legal starting position).

- [ ] **Step 1: Write the failing tests**

```ts
// lib/checkers/search.test.ts
import { describe, it, expect } from 'vitest';
import type { Piece } from './types';
import { createInitialBoard } from './board';
import { allLegalMoves } from './moveGeneration';
import { findBestMove } from './search';
import { difficultyToEngineOptions } from './difficulty';

function emptyBoard(): (Piece | null)[] {
  return new Array(32).fill(null);
}

describe('findBestMove', () => {
  it('returns a legal move from the initial position', () => {
    const board = createInitialBoard();
    const result = findBestMove(board, 'b', { maxDepth: 2, timeBudgetMs: 1000, randomness: 0 });
    const legal = allLegalMoves(board, 'b');
    expect(legal).toContainEqual(result.move);
  });

  it('is deterministic when randomness is 0 (same board, same result every call)', () => {
    const board = createInitialBoard();
    const options = { maxDepth: 3, timeBudgetMs: 1000, randomness: 0 };
    const first = findBestMove(board, 'b', options);
    const second = findBestMove(board, 'b', options);
    expect(second.move).toEqual(first.move);
    expect(second.bestScore).toBe(first.bestScore);
  });

  it('looks ahead far enough to avoid hanging a piece to an immediate recapture', () => {
    // Black man at square 9 has exactly two legal quiet moves: 9->13 (safe)
    // and 9->14 (walks into white's man at 18, which can then jump 18 over
    // 14 landing back at the now-empty 9 -- a clean loss of a man for
    // nothing). At maxDepth >= 2 the search sees white's reply and must
    // prefer 9->13.
    const board = emptyBoard();
    board[8] = { color: 'b', kind: 'man' }; // square 9
    board[17] = { color: 'w', kind: 'man' }; // square 18
    const result = findBestMove(board, 'b', { maxDepth: 4, timeBudgetMs: 2000, randomness: 0 });
    expect(result.move).toEqual({ from: 9, to: 13, captures: [], promotes: false });
  });

  it('respects the time budget and returns promptly even with a large maxDepth', () => {
    const board = createInitialBoard();
    const start = Date.now();
    const result = findBestMove(board, 'b', { maxDepth: 12, timeBudgetMs: 50, randomness: 0 });
    const elapsedMs = Date.now() - start;
    expect(elapsedMs).toBeLessThan(2000); // generous margin over the 50ms budget
    expect(allLegalMoves(board, 'b')).toContainEqual(result.move);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/checkers/search.test.ts`
Expected: FAIL — `Cannot find module './search'`.

- [ ] **Step 3: Write `lib/checkers/search.ts`**

```ts
import type { Board, CheckersMove, Color } from './types';
import { allLegalMoves, applyMove } from './moveGeneration';
import { evaluate } from './evaluate';
import type { EngineOptions } from './difficulty';
import { selectWeightedMove, type MoveCandidate } from './selectMove';

export interface SearchResult {
  move: CheckersMove; // possibly a randomness-weighted pick, not always bestScore's move
  bestScore: number; // the single best candidate's score -- always objective, for grading/UI, unaffected by randomness
  candidates: MoveCandidate<CheckersMove>[]; // every root move, ranked best-first
}

// Large enough to dominate any real evaluate()-scale comparison. Subtracting
// depthRemaining below makes a loss found with MORE depth still unexplored
// (i.e. one that happens SOONER, in fewer real moves) score worse than one
// found only after depth is nearly exhausted (happens LATER) -- so the
// search prefers delaying its own forced losses and hastening the
// opponent's, the same "mate distance" sensitivity a chess engine has.
const LOSS_SCORE = -1_000_000;

// Negamax with alpha-beta pruning. Returns a score from `turn`'s
// perspective (positive is good for `turn`). `depthRemaining` counts down
// to 0, at which point the position is scored by evaluate() rather than
// searched further.
function negamax(board: Board, turn: Color, depthRemaining: number, alpha: number, beta: number): number {
  const moves = allLegalMoves(board, turn);
  if (moves.length === 0) {
    // `turn` has no legal moves -- they've lost (matches gameStatus.ts's
    // 'no-moves' rule). Checked before the depth===0 leaf case: a position
    // where the side to move has already lost is not a "position to
    // statically evaluate", it's a terminal node regardless of remaining depth.
    return LOSS_SCORE - depthRemaining;
  }
  if (depthRemaining === 0) {
    return evaluate(board, turn);
  }
  let best = -Infinity;
  for (const move of moves) {
    const nextBoard = applyMove(board, move);
    const nextTurn: Color = turn === 'b' ? 'w' : 'b';
    const score = -negamax(nextBoard, nextTurn, depthRemaining - 1, -beta, -alpha);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break; // beta cutoff
  }
  return best;
}

// Iterative deepening from depth 1 up to options.maxDepth, stopping early
// once options.timeBudgetMs elapses -- except depth 1 always completes in
// full regardless of the time budget, guaranteeing a valid result even
// under an extremely tight budget. Only a FULLY completed depth's
// candidate list is ever kept; a depth abandoned partway through (because
// time ran out mid-scan) is discarded so a partially-searched, artificially
// low/high score from an incomplete scan never wins over a shallower but
// complete one.
export function findBestMove(
  board: Board,
  turn: Color,
  options: EngineOptions,
  random: () => number = Math.random
): SearchResult {
  const rootMoves = allLegalMoves(board, turn);
  if (rootMoves.length === 0) {
    throw new Error('findBestMove called with no legal moves available');
  }

  const deadline = Date.now() + options.timeBudgetMs;
  let candidates: MoveCandidate<CheckersMove>[] = rootMoves.map((move) => ({ move, score: -Infinity }));

  for (let depth = 1; depth <= options.maxDepth; depth++) {
    const depthCandidates: MoveCandidate<CheckersMove>[] = [];
    let ranOutOfTime = false;
    for (const move of rootMoves) {
      if (depth > 1 && Date.now() >= deadline) {
        ranOutOfTime = true;
        break;
      }
      const nextBoard = applyMove(board, move);
      const nextTurn: Color = turn === 'b' ? 'w' : 'b';
      const score = -negamax(nextBoard, nextTurn, depth - 1, -Infinity, Infinity);
      depthCandidates.push({ move, score });
    }
    if (ranOutOfTime) break;
    candidates = depthCandidates;
    if (Date.now() >= deadline) break;
  }

  candidates.sort((a, b) => b.score - a.score);
  const bestScore = candidates[0].score;
  const move = selectWeightedMove(candidates, options.randomness, random);
  return { move, bestScore, candidates };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/checkers/search.test.ts`
Expected: PASS, all 4 tests. If the "avoids hanging a piece" test fails,
double check the test's board setup matches the comment exactly (square
numbers, colors) before suspecting `search.ts` itself — re-verify square 9's
and square 18's neighbor squares against `lib/checkers/board.ts`'s
`neighbor()`/`squareToRowCol()` if in doubt.

- [ ] **Step 5: Run the full suite, typecheck, lint**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: all pass, no errors.

- [ ] **Step 6: Commit and push**

```bash
git add lib/checkers/search.ts lib/checkers/search.test.ts
git commit -m "feat(checkers): minimax search with alpha-beta + iterative deepening

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

### Task 6: `checkersEngine.worker.ts` + `checkersEngineClient.ts`

**Files:**
- Create: `lib/checkers/checkersEngine.worker.ts`
- Create: `lib/checkers/checkersEngineClient.ts`
- Test: `lib/checkers/checkersEngineClient.test.ts`

**Interfaces:**
- Consumes: `findBestMove` from `./search`; `EngineOptions` from
  `./difficulty`; `Board`, `Color`, `CheckersMove` from `./types`.
- Produces: `WorkerRequest`/`WorkerResponse` types (exported from the worker
  file so the client can import them), `CheckersEngineClient` interface
  (`{ getBestMove: (board, turn, options) => Promise<CheckersMove>; evaluate: (board, turn, depth) => Promise<number>; terminate: () => void }`),
  `createCheckersEngineClient(createWorker?: () => WorkerLike): CheckersEngineClient`
  — consumed by Task 8 (`/jogar`'s AI wiring).

Per Global Constraints, the worker file's `self.onmessage` handler is not
unit-tested directly (no real Worker in jsdom) — only manually verified in
Task 8's browser pass. `checkersEngineClient.ts`'s promise-serialization logic
**is** unit-tested, via an injected fake `WorkerLike` (a plain object shaped
like the browser's `Worker`, not a real one) — this is the same reasoning
`stockfishClient.ts` documents for *why* serialization matters (concurrent
`getBestMove`/`evaluate` calls could otherwise cross-resolve), made testable
here without needing real threads.

- [ ] **Step 1: Write `lib/checkers/checkersEngine.worker.ts`**

```ts
import type { Board, CheckersMove, Color } from './types';
import { findBestMove } from './search';
import type { EngineOptions } from './difficulty';

// Worker message shapes -- not a wire protocol standard, internal to this
// app (per design spec §3). No UCI-style text protocol involved: this
// worker runs our own TS search directly, not an external engine binary.
export type WorkerRequest =
  | { type: 'getBestMove'; board: Board; turn: Color; options: EngineOptions }
  | { type: 'evaluate'; board: Board; turn: Color; depth: number };
export type WorkerResponse =
  | { type: 'bestMove'; move: CheckersMove }
  | { type: 'evaluation'; score: number };

// Safety-net time budget for the 'evaluate' message (move-quality grading):
// it's always full-strength/single-best (randomness 0) regardless of what
// difficulty the opponent search left configured, per spec §3 -- this cap
// only matters if `depth` is unexpectedly large; normal grading depths
// (6-10) resolve well under it.
const EVALUATE_TIME_BUDGET_MS = 5000;

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  if (request.type === 'getBestMove') {
    const result = findBestMove(request.board, request.turn, request.options);
    const response: WorkerResponse = { type: 'bestMove', move: result.move };
    self.postMessage(response);
  } else if (request.type === 'evaluate') {
    const result = findBestMove(request.board, request.turn, {
      maxDepth: request.depth,
      timeBudgetMs: EVALUATE_TIME_BUDGET_MS,
      randomness: 0,
    });
    const response: WorkerResponse = { type: 'evaluation', score: result.bestScore };
    self.postMessage(response);
  }
};
```

- [ ] **Step 2: Write the failing tests for `checkersEngineClient.ts`**

```ts
// lib/checkers/checkersEngineClient.test.ts
import { describe, it, expect, vi } from 'vitest';
import type { WorkerRequest, WorkerResponse } from './checkersEngine.worker';
import { createCheckersEngineClient } from './checkersEngineClient';
import { createInitialBoard } from './board';

// A minimal stand-in for the browser's Worker, shaped exactly like the
// subset of it checkersEngineClient.ts actually uses. Lets the test control
// exactly when each request "resolves" and inspect what was posted, without
// any real threading (jsdom has no functional Worker to exercise).
class FakeWorker {
  posted: WorkerRequest[] = [];
  private messageListeners: ((event: MessageEvent<WorkerResponse>) => void)[] = [];
  terminated = false;

  postMessage(message: WorkerRequest) {
    this.posted.push(message);
  }

  addEventListener(type: 'message', listener: (event: MessageEvent<WorkerResponse>) => void) {
    if (type === 'message') this.messageListeners.push(listener);
  }

  removeEventListener(type: 'message', listener: (event: MessageEvent<WorkerResponse>) => void) {
    if (type === 'message') this.messageListeners = this.messageListeners.filter((l) => l !== listener);
  }

  terminate() {
    this.terminated = true;
  }

  // Test helper: simulate the worker replying to the most recent request.
  respond(response: WorkerResponse) {
    for (const listener of this.messageListeners) {
      listener({ data: response } as MessageEvent<WorkerResponse>);
    }
  }
}

describe('createCheckersEngineClient', () => {
  it('posts a getBestMove request and resolves with the response move', async () => {
    const worker = new FakeWorker();
    const client = createCheckersEngineClient(() => worker);
    const board = createInitialBoard();
    const move = { from: 11, to: 15, captures: [], promotes: false };

    const promise = client.getBestMove(board, 'b', { maxDepth: 3, timeBudgetMs: 200, randomness: 0 });
    expect(worker.posted).toEqual([{ type: 'getBestMove', board, turn: 'b', options: { maxDepth: 3, timeBudgetMs: 200, randomness: 0 } }]);
    worker.respond({ type: 'bestMove', move });

    expect(await promise).toEqual(move);
  });

  it('posts an evaluate request and resolves with the response score', async () => {
    const worker = new FakeWorker();
    const client = createCheckersEngineClient(() => worker);
    const board = createInitialBoard();

    const promise = client.evaluate(board, 'w', 8);
    expect(worker.posted).toEqual([{ type: 'evaluate', board, turn: 'w', depth: 8 }]);
    worker.respond({ type: 'evaluation', score: 42 });

    expect(await promise).toBe(42);
  });

  it('serializes concurrent requests so the second is not posted until the first resolves', async () => {
    const worker = new FakeWorker();
    const client = createCheckersEngineClient(() => worker);
    const board = createInitialBoard();

    const firstPromise = client.getBestMove(board, 'b', { maxDepth: 1, timeBudgetMs: 100, randomness: 0 });
    const secondPromise = client.evaluate(board, 'w', 4);

    // Only the first request has been posted so far -- the second is
    // queued behind it, not sent concurrently.
    expect(worker.posted).toHaveLength(1);
    expect(worker.posted[0].type).toBe('getBestMove');

    worker.respond({ type: 'bestMove', move: { from: 11, to: 15, captures: [], promotes: false } });
    await firstPromise;

    // Now that the first resolved, the second's request should have gone out.
    expect(worker.posted).toHaveLength(2);
    expect(worker.posted[1].type).toBe('evaluate');

    worker.respond({ type: 'evaluation', score: 7 });
    expect(await secondPromise).toBe(7);
  });

  it('terminates the underlying worker', () => {
    const worker = new FakeWorker();
    const client = createCheckersEngineClient(() => worker);
    client.terminate();
    expect(worker.terminated).toBe(true);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run lib/checkers/checkersEngineClient.test.ts`
Expected: FAIL — `Cannot find module './checkersEngineClient'`.

- [ ] **Step 4: Write `lib/checkers/checkersEngineClient.ts`**

```ts
import type { Board, CheckersMove, Color } from './types';
import type { EngineOptions } from './difficulty';
import type { WorkerRequest, WorkerResponse } from './checkersEngine.worker';

export interface CheckersEngineClient {
  getBestMove: (board: Board, turn: Color, options: EngineOptions) => Promise<CheckersMove>;
  evaluate: (board: Board, turn: Color, depth: number) => Promise<number>;
  terminate: () => void;
}

// The subset of the browser's real Worker interface this file actually
// uses -- lets tests inject a fake in place of a real thread (see
// checkersEngineClient.test.ts's FakeWorker; jsdom has no functional Worker
// to exercise otherwise).
export interface WorkerLike {
  postMessage(message: WorkerRequest): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<WorkerResponse>) => void): void;
  removeEventListener(type: 'message', listener: (event: MessageEvent<WorkerResponse>) => void): void;
  terminate(): void;
}

function createRealWorker(): WorkerLike {
  // Module worker: Turbopack/webpack bundle our own checkersEngine.worker.ts
  // source directly, same as the main app bundle -- no external/public
  // asset needed (unlike Chess Sensei's prebuilt Stockfish WASM binary,
  // loaded via a plain string path to a static file).
  return new Worker(new URL('./checkersEngine.worker.ts', import.meta.url)) as unknown as WorkerLike;
}

// Serializes every request through the one worker: only one request's
// message listener is ever active at a time, so a response can never be
// delivered to the wrong caller. Without this, concurrent
// getBestMove()/evaluate() calls (e.g. the AI's own-move request racing a
// move-quality check) could cross-resolve, handing the wrong caller an
// answer meant for someone else -- same reasoning as Chess Sensei's
// stockfishClient.ts, simpler here since there's no UCI text protocol or
// WASM-load readiness handshake to also serialize around.
export function createCheckersEngineClient(createWorker: () => WorkerLike = createRealWorker): CheckersEngineClient {
  const worker = createWorker();
  let queue: Promise<unknown> = Promise.resolve();

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = queue.then(task, task);
    queue = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }

  async function getBestMove(board: Board, turn: Color, options: EngineOptions): Promise<CheckersMove> {
    return enqueue(
      () =>
        new Promise<CheckersMove>((resolve) => {
          const onMessage = (event: MessageEvent<WorkerResponse>) => {
            if (event.data.type === 'bestMove') {
              worker.removeEventListener('message', onMessage);
              resolve(event.data.move);
            }
          };
          worker.addEventListener('message', onMessage);
          worker.postMessage({ type: 'getBestMove', board, turn, options });
        })
    );
  }

  async function evaluate(board: Board, turn: Color, depth: number): Promise<number> {
    return enqueue(
      () =>
        new Promise<number>((resolve) => {
          const onMessage = (event: MessageEvent<WorkerResponse>) => {
            if (event.data.type === 'evaluation') {
              worker.removeEventListener('message', onMessage);
              resolve(event.data.score);
            }
          };
          worker.addEventListener('message', onMessage);
          worker.postMessage({ type: 'evaluate', board, turn, depth });
        })
    );
  }

  function terminate() {
    worker.terminate();
  }

  return { getBestMove, evaluate, terminate };
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run lib/checkers/checkersEngineClient.test.ts`
Expected: PASS, all 4 tests.

- [ ] **Step 6: Run the full suite, typecheck, lint**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: all pass, no errors. (`checkersEngine.worker.ts` has no dedicated
test file per this task's design — confirm `tsc`/`eslint` still cover it,
since both type-check and lint every `.ts` file regardless of test coverage.)

- [ ] **Step 7: Commit and push**

```bash
git add lib/checkers/checkersEngine.worker.ts lib/checkers/checkersEngineClient.ts lib/checkers/checkersEngineClient.test.ts
git commit -m "feat(checkers): Web Worker engine + promise-serialized client wrapper

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

### Task 7: `lib/checkers/playerColor.ts` + `app/configurar/page.tsx`

**Files:**
- Create: `lib/checkers/playerColor.ts`
- Test: `lib/checkers/playerColor.test.ts`
- Create: `app/configurar/page.tsx`

**Interfaces:**
- Consumes: `Difficulty` from `./difficulty`; `Color` from `./types`;
  `clearSavedGame` from `./useCheckersGame` (already exported, per
  `lib/checkers/useCheckersGame.ts`).
- Produces: `PlayerColor` type (`Color | 'random'`),
  `resolvePlayerColor(choice: PlayerColor, random?: () => number): Color`
  — consumed by Task 8 (`/jogar`'s AI wiring, to resolve `color=random` into
  an actual `'b'`/`'w'` once per game). The `/configurar` route itself (no
  further consumers in this plan — a leaf page, matching `/jogar`'s own
  Task 6 precedent in the previous plan).

- [ ] **Step 1: Write the failing tests for `playerColor.ts`**

```ts
// lib/checkers/playerColor.test.ts
import { describe, it, expect } from 'vitest';
import { resolvePlayerColor } from './playerColor';

describe('resolvePlayerColor', () => {
  it('returns b unchanged', () => {
    expect(resolvePlayerColor('b')).toBe('b');
  });

  it('returns w unchanged', () => {
    expect(resolvePlayerColor('w')).toBe('w');
  });

  it('resolves random to b when the draw is below 0.5', () => {
    expect(resolvePlayerColor('random', () => 0.2)).toBe('b');
  });

  it('resolves random to w when the draw is 0.5 or above', () => {
    expect(resolvePlayerColor('random', () => 0.7)).toBe('w');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/checkers/playerColor.test.ts`
Expected: FAIL — `Cannot find module './playerColor'`.

- [ ] **Step 3: Write `lib/checkers/playerColor.ts`**

```ts
import type { Color } from './types';

export type PlayerColor = Color | 'random';

// Resolves the human's chosen color for a new AI game into an actual 'b'/'w'
// -- called once per game (see app/jogar/page.tsx's AI wiring), not on every
// render, so a 'random' choice doesn't reshuffle mid-game.
export function resolvePlayerColor(choice: PlayerColor, random: () => number = Math.random): Color {
  if (choice !== 'random') return choice;
  return random() < 0.5 ? 'b' : 'w';
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/checkers/playerColor.test.ts`
Expected: PASS, all 4 tests.

- [ ] **Step 5: Write `app/configurar/page.tsx`**

Plain Tailwind, hardcoded Portuguese strings, matching `/jogar`'s existing
style (per Global Constraints — no Chess Sensei chrome/i18n imports).

```tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Difficulty } from '@/lib/checkers/difficulty';
import type { PlayerColor } from '@/lib/checkers/playerColor';
import { clearSavedGame } from '@/lib/checkers/useCheckersGame';

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

export default function ConfigurarPage() {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<Difficulty>('medio');
  const [color, setColor] = useState<PlayerColor>('b');

  function handleStart() {
    clearSavedGame();
    const params = new URLSearchParams({ mode: 'ai', difficulty, color });
    router.push(`/jogar?${params.toString()}`);
  }

  return (
    <main className="flex min-h-dvh flex-col items-center gap-6 p-4">
      <h1 className="text-2xl font-bold">Jogar contra o computador</h1>

      <fieldset className="flex flex-col items-center gap-2">
        <legend className="mb-1 font-semibold">Dificuldade</legend>
        <div className="flex gap-2">
          {DIFFICULTY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDifficulty(option.value)}
              aria-pressed={difficulty === option.value}
              className={`rounded px-3 py-2 ${difficulty === option.value ? 'bg-stone-700 text-white' : 'bg-stone-200'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col items-center gap-2">
        <legend className="mb-1 font-semibold">Cor</legend>
        <div className="flex gap-2">
          {COLOR_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setColor(option.value)}
              aria-pressed={color === option.value}
              className={`rounded px-3 py-2 ${color === option.value ? 'bg-stone-700 text-white' : 'bg-stone-200'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <button type="button" onClick={handleStart} className="rounded bg-emerald-600 px-6 py-3 font-bold text-white">
        Começar
      </button>

      <Link href="/" className="underline">
        Menu inicial
      </Link>
    </main>
  );
}
```

This page has no dedicated automated test file, matching `/jogar`'s own
precedent (a leaf page composing already-tested pieces — `difficulty.ts`,
`playerColor.ts`, `clearSavedGame` — plus the `URLSearchParams`/`router.push`
call, which is exercised end-to-end in Task 8's manual browser verification
once `/jogar` actually reads these params).

- [ ] **Step 6: Typecheck, lint, commit and push**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

```bash
git add lib/checkers/playerColor.ts lib/checkers/playerColor.test.ts app/configurar/page.tsx
git commit -m "feat(checkers): /configurar -- difficulty/color picker for vs-computer games

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

### Task 8: `/jogar` — AI-mode wiring

**Files:**
- Modify: `app/jogar/page.tsx`

**Interfaces:**
- Consumes: `createCheckersEngineClient` from `@/lib/checkers/checkersEngineClient`;
  `difficultyToEngineOptions` from `@/lib/checkers/difficulty`;
  `resolvePlayerColor` from `@/lib/checkers/playerColor`; everything `/jogar`
  already consumes (`useCheckersGame`, `CheckersBoard`).
- Produces: no new exports — `/jogar` remains the integration point (per the
  previous plan's Task 6 comment: "a later phase (AI, Phase 3) will extend
  this same file to add `mode=ai`/difficulty querystring handling").

`mode=local` (or no `mode` param at all) preserves today's exact behavior
unchanged — both players click through the same board, no AI involved. This
task is purely additive.

`useSearchParams()` requires the component that calls it to be wrapped in a
`<Suspense>` boundary in the Next.js App Router (a build-time requirement,
not just a lint nicety — this repo's `next.config.ts` sets `output: 'export'`
for the Capacitor iOS build, and static export enforces this strictly). The
page is split into an inner component that reads the params and an outer
default export that wraps it in `<Suspense>`.

- [ ] **Step 1: Modify `app/jogar/page.tsx`**

Replace the entire file with:

```tsx
'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCheckersGame } from '@/lib/checkers/useCheckersGame';
import { CheckersBoard } from '@/components/CheckersBoard/CheckersBoard';
import { createCheckersEngineClient, type CheckersEngineClient } from '@/lib/checkers/checkersEngineClient';
import { difficultyToEngineOptions, type Difficulty } from '@/lib/checkers/difficulty';
import { resolvePlayerColor, type PlayerColor } from '@/lib/checkers/playerColor';
import type { Color, Square } from '@/lib/checkers/types';

const STATUS_LABEL: Record<string, string> = {
  playing: '',
  'no-moves': 'Fim de jogo — sem jogadas possíveis',
  'draw-repetition': 'Empate por repetição de posição',
  'draw-no-capture': 'Empate — 40 lances sem captura',
};

function isDifficulty(value: string | null): value is Difficulty {
  return value === 'facil' || value === 'medio' || value === 'dificil';
}

function isPlayerColor(value: string | null): value is PlayerColor {
  return value === 'b' || value === 'w' || value === 'random';
}

function JogarPageInner() {
  const searchParams = useSearchParams();
  const isAiMode = searchParams.get('mode') === 'ai';
  const difficultyParam = searchParams.get('difficulty');
  const difficulty: Difficulty = isDifficulty(difficultyParam) ? difficultyParam : 'medio';
  const colorParam = searchParams.get('color');
  const colorChoice: PlayerColor = isPlayerColor(colorParam) ? colorParam : 'b';

  const { state, legalMovesFrom, makeMove, reset } = useCheckersGame(true);
  const [selected, setSelected] = useState<Square | null>(null);

  // Resolved once per mount (not on every render) so a 'random' choice
  // doesn't reshuffle mid-game -- lazy useState initializer runs exactly once.
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
    client.getBestMove(state.board, state.turn, options).then((move) => {
      if (cancelled) return;
      makeMove(move.from, move.to);
    });
    return () => {
      cancelled = true;
    };
  }, [isAiTurn, state.board, state.turn, difficulty, makeMove]);

  const legalTargets = selected !== null ? legalMovesFrom(selected) : [];

  function handleSquareClick(square: Square) {
    if (state.isGameOver) return;
    if (isAiMode && state.turn === aiColor) return; // ignore clicks during the AI's turn

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
  const boardInteractive = !state.isGameOver && !(isAiMode && state.turn === aiColor);

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
        interactive={boardInteractive}
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

export default function JogarPage() {
  return (
    <Suspense fallback={null}>
      <JogarPageInner />
    </Suspense>
  );
}
```

Note on the AI-move effect's dependency array: it intentionally depends on
`state.board`/`state.turn` (not `state` as a whole) so it only re-fires when
the position actually changes — a re-render for an unrelated reason (e.g. the
human clicking to select/deselect a square, which only touches local
`selected` state) must not accidentally re-trigger a duplicate
`getBestMove` call.

- [ ] **Step 2: Manually verify in the browser**

Run: `npm run dev`

Open `http://localhost:3000/jogar` (no `mode` param) and confirm local
two-player mode still works exactly as before (unaffected by this change).

Then open `http://localhost:3000/configurar`, pick "Fácil" and "Pretas",
click "Começar" — confirm it navigates to `/jogar?mode=ai&difficulty=facil&color=b`
and:
(a) you can click a black piece and move it,
(b) after your move, the white AI automatically thinks briefly and replies on
its own (no click needed) — its move should complete within roughly the
`facil` difficulty's 200ms time budget, so this should feel near-instant,
(c) the board becomes non-interactive while it's the AI's turn (clicking a
square during that window does nothing),
(d) play through to confirm the AI never offers/attempts an illegal move
(trust the engine only returns values from `allLegalMoves`, but watch for any
console errors),
(e) "Reiniciar partida" resets to a fresh AI game (not local mode).

Also test `/configurar` with "Brancas" selected — confirm the AI (now
playing black) moves *first*, automatically, before you get to click anything.

Stop the dev server after verifying.

- [ ] **Step 3: Run the full suite, typecheck, lint, build**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: all pass.

Run: `npm run build`
Expected: `✓ Compiled successfully` (confirms the `Suspense`-wrapped
`useSearchParams()` usage satisfies static-export requirements, and that
`new Worker(new URL(...))` bundles correctly).

- [ ] **Step 4: Commit and push**

```bash
git add app/jogar/page.tsx
git commit -m "feat(checkers): /jogar -- vs-computer mode (mode=ai wiring)

Manually verified: local mode unaffected, AI mode plays both colors
(human as black and as white), board locks during the AI's turn, reset
starts a fresh AI game.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

### Task 9: Close out the phase in `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:** none — documentation only.

- [ ] **Step 1: Update `## Structure`**

Add a new block after the existing `app/jogar/` block:

```markdown
lib/checkers/ (additions this phase)
  difficulty.ts          # Difficulty/EngineOptions, provisional depth/time/
                          # randomness numbers per difficulty (spec §3)
  evaluate.ts             # material + positional scoring, antisymmetric
                           # between colors on the same board
  search.ts                # negamax + alpha-beta + iterative deepening;
                            # findBestMove() is the engine's public entry point
  selectMove.ts              # selectWeightedMove -- ported from Chess
                              # Sensei's lib/chess/selectMove.ts, generalized
                              # to a generic move type instead of a UCI string
  moveClassification.ts        # evalLoss/classifyMove -- built now (spec §3
                                # bundles it here) but NOT wired to any UI
                                # yet; that's Phase 4 (learning mode)
  checkersEngine.worker.ts       # Web Worker entry point -- thin message
                                  # handler over search.ts, bundled as a
                                  # native module worker (no external asset,
                                  # unlike Chess Sensei's prebuilt Stockfish)
  checkersEngineClient.ts          # promise-serialized wrapper around the
                                    # worker, dependency-injectable for tests
  playerColor.ts                    # PlayerColor ('b'|'w'|'random') +
                                     # resolvePlayerColor
app/configurar/
  page.tsx                # difficulty/color picker for vs-computer games;
                           # plain Tailwind, no chrome/i18n system yet (Phase 5/8)
```

- [ ] **Step 2: Add to `## Conventions`**

Insert before `## Deploy`:

```markdown
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
strings, same as `/jogar`'s existing style.

### `useSearchParams()` requires a `Suspense` boundary — enforced at build time, not just lint

`app/jogar/page.tsx` splits into `JogarPageInner` (reads `useSearchParams()`)
and a default-exported `JogarPage` that wraps it in `<Suspense
fallback={null}>`. This repo's `next.config.ts` sets `output: 'export'` for
the Capacitor iOS build, and static export strictly enforces this — omitting
the `Suspense` wrapper fails `npm run build`, not just a lint warning.
```

- [ ] **Step 3: Commit and push**

```bash
git add CLAUDE.md
git commit -m "docs: close out AI-opponent phase in CLAUDE.md

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

## Plan self-review notes

- **Spec coverage:** implements spec §3 in full (`Difficulty`/`EngineOptions`,
  the minimax/alpha-beta search with iterative deepening, the worker message
  protocol exactly as specified, `checkersEngineClient`'s two proven
  patterns, `selectWeightedMove` reuse, and `moveClassification.ts`'s pure
  functions) plus the vs-computer slice of §5 (`/configurar`, `/jogar`'s
  `mode=ai`). Deliberately deferred, per this plan's own Global Constraints
  and noted in `CLAUDE.md`: any UI wiring for move-quality grading
  (toast/suggestion overlay — Phase 4), `ChipButton`/`PageChrome`/i18n/themed
  chrome (Phase 5/8), and openings/traps content (Phase 7).
- **Placeholder scan:** no TBD/TODO; every step has real, runnable code,
  including the two riskiest files (`search.ts`'s negamax and
  `checkersEngineClient.ts`'s queueing) with concrete, hand-verified test
  positions (the "avoids hanging a piece" test's square numbers were traced
  through `board.ts`'s actual `neighbor()`/`squareToRowCol()` geometry, not
  guessed).
- **Type consistency:** `EngineOptions` (Task 1) is consumed identically by
  `search.ts` (Task 5), the worker's `WorkerRequest` (Task 6), and
  `checkersEngineClient.ts` (Task 6) — same three fields throughout.
  `MoveCandidate<T>`/`selectWeightedMove` (Task 3) is consumed by `search.ts`
  with `T = CheckersMove` (Task 5) — no drift. `SearchResult`'s `bestScore`
  (Task 5) is what the worker's `evaluate` handler reports back as
  `WorkerResponse`'s `score` field (Task 6) — consistent naming from search
  through the wire protocol. `PlayerColor` (Task 7) and `Difficulty` (Task 1)
  both flow unchanged from `/configurar`'s `URLSearchParams` through
  `/jogar`'s parsing (Task 8) — same string literal values at both ends
  (`'b'`/`'w'`/`'random'`, `'facil'`/`'medio'`/`'dificil'`).
