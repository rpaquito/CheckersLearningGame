# Learning Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-game, persisted "Modo de aprendizagem" toggle to `/jogar` that gates two new features -- a full-strength move suggestion and a last-move-quality toast -- reusing the AI engine, `moveClassification.ts`, and `Toast` machinery already built in earlier phases.

**Architecture:** A new pure module (`gradeMove.ts`) wraps two already-existing `evaluate()` worker calls (before/after the move, same fixed depth) into a `MoveQuality` via the already-built-but-unused `moveClassification.ts`. A second new pure module (`moveExplanation.ts`) turns a move + its grade into canned PT/EN sentences. `/jogar/page.tsx` wires these to a new presentational `LearningPanel` component and a small `suggestedMove` highlight on `CheckersBoard`, using a second, independently-lifecycled engine client for local two-player games (vs-computer games reuse the existing opponent engine).

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest + Testing Library, Tailwind v4 -- identical to every prior phase in this repo.

**Spec:** `docs/superpowers/specs/2026-08-31-checkers-sensei-design.md` §5 ("Learning mode" + "Move-explanation phrases" + "Toasts/modals"), §13 (phase 4). This plan's toggle-gating, both-modes scope, grading approach, and locale-handling decisions were confirmed in a brainstorming session that preceded this plan and are not re-derivable from the spec alone -- read the task comments for the reasoning, not just the spec.

## Global Constraints

- No worktrees, no feature branches. Commit each task's changes directly to `main` and push (`git push origin main`) once its tests pass, before starting the next task -- never batch multiple tasks into one unpushed commit (CLAUDE.md §Process rules).
- Portuguese-only in every UI string (hardcoded, no i18n system exists until Phase 8) -- `moveExplanation.ts` is the one deliberate exception: it takes a `Locale` param and has both PT and EN phrase sets from day one (spec §5), but every call site in this plan still passes `'pt'`.
- Checkers material scale: man = 100, king = 275 (`lib/checkers/evaluate.ts`) -- any material-magnitude phrasing in `moveExplanation.ts` must use these values, not chess's pawn/piece scale.
- `evaluate(board, color)` is antisymmetric: `evaluate(board, other) === -evaluate(board, color)` always (`evaluate.ts`'s own doc comment, asserted in `evaluate.test.ts`). Any code comparing two `evaluate()` calls across colors must negate, never assume same-sign.
- Two `evaluate()` (or `findBestMove`) calls are only comparable when they share the same `maxDepth` -- CLAUDE.md's "Search scores are mate-distance-relative and NOT normalized across searches" section. This plan's grading always uses one fixed depth constant for both calls it makes per move.
- Every engine request must settle (`checkersEngineClient.ts`'s documented invariant) -- this plan adds no new worker message types, so this is inherited, not something this plan's tasks need to re-verify.
- `CheckersBoard` stays "dumb": it never decides legality, only renders exactly what it's given. The new `suggestedMove` prop follows this -- the board doesn't know or care whether Learning Mode is on, it just draws a highlight if given one.

---

## Task 1: Dedicated full-strength engine options for suggestions

**Files:**
- Modify: `lib/checkers/difficulty.ts`
- Test: `lib/checkers/difficulty.test.ts`

**Interfaces:**
- Produces: `SUGGESTION_ENGINE_OPTIONS: EngineOptions` (exported constant), consumed by Task 7 (`app/jogar/page.tsx`'s suggestion handler).

A move suggestion must reflect the engine's real best move "regardless of game difficulty" (spec §5), not whatever `Difficulty` the current game happens to be configured with. `dificil`'s numbers already are exactly this (`randomness: 0` = always the single best-scoring move) -- but importing `DIFFICULTY_OPTIONS.dificil` directly would silently change suggestion strength if a future phase ever retunes `dificil`'s numbers for opponent-play-feel reasons unrelated to suggestion quality. A separate, explicitly-named constant keeps those two concerns independent even though their values start identical.

- [ ] **Step 1: Write the failing test**

Add to `lib/checkers/difficulty.test.ts`:

```ts
import { SUGGESTION_ENGINE_OPTIONS } from './difficulty';

describe('SUGGESTION_ENGINE_OPTIONS', () => {
  it('is a full-strength, deterministic configuration independent of any Difficulty', () => {
    expect(SUGGESTION_ENGINE_OPTIONS).toEqual({ maxDepth: 10, timeBudgetMs: 1800, randomness: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- difficulty.test.ts`
Expected: FAIL with "SUGGESTION_ENGINE_OPTIONS is not exported" (or similar TS/import error).

- [ ] **Step 3: Write minimal implementation**

In `lib/checkers/difficulty.ts`, after `DIFFICULTY_OPTIONS`:

```ts
// A move suggestion must reflect the engine's real best move "regardless of
// game difficulty" (spec §5) -- deliberately NOT a reference to
// DIFFICULTY_OPTIONS.dificil, even though the numbers start identical, so a
// future retuning of "hard opponent feel" can never silently also change
// suggestion strength.
export const SUGGESTION_ENGINE_OPTIONS: EngineOptions = { maxDepth: 10, timeBudgetMs: 1800, randomness: 0 };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- difficulty.test.ts`
Expected: PASS (4 tests: the 3 existing `difficultyToEngineOptions` cases + this new one).

- [ ] **Step 5: Commit**

```bash
git add lib/checkers/difficulty.ts lib/checkers/difficulty.test.ts
git commit -m "feat(checkers): add SUGGESTION_ENGINE_OPTIONS, independent of game difficulty

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

## Task 2: `gradeMove` -- turn two `evaluate()` calls into a `MoveQuality`

**Files:**
- Create: `lib/checkers/gradeMove.ts`
- Test: `lib/checkers/gradeMove.test.ts`

**Interfaces:**
- Consumes: `evalLoss`/`classifyMove`/`MoveQuality` from `./moveClassification` (already built, `moveClassification.ts:7-23`); only needs an object shaped `{ evaluate(board, color, depth): Promise<number> }` -- structurally compatible with `CheckersEngineClient` from `./checkersEngineClient` but not importing that type, so a test fake needs no unrelated methods.
- Produces: `GRADE_DEPTH: number`, `MoveGrade { quality: MoveQuality; loss: number }`, `gradeMove(engine, boardBeforeMove, moverColor, boardAfterMove, opponentColor): Promise<MoveGrade>` -- consumed by Task 7 (`app/jogar/page.tsx`'s post-move grading effect).

This is the "already-built-but-unused machinery" CLAUDE.md flags finally getting a caller: `evaluate(board, turn, depth)` already returns a single-fixed-depth `bestScore` (see `checkersEngine.worker.ts`'s `evaluate` handler, which calls `findBestMove` with `randomness: 0` and the requested `maxDepth` -- exactly the "single fixed-depth search" CLAUDE.md's comparability rule requires). Grading a move needs no new worker message type: call it once on the pre-move board (what the mover could have achieved) and once on the post-move board from the opponent's turn, negated (what the mover actually achieved, per `evaluate.ts`'s antisymmetry).

- [ ] **Step 1: Write the failing test**

Create `lib/checkers/gradeMove.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { gradeMove, GRADE_DEPTH } from './gradeMove';
import { createInitialBoard } from './board';
import { applyMove } from './moveGeneration';

const board = createInitialBoard();
const afterBoard = applyMove(board, { from: 11, to: 15, captures: [], promotes: false });

describe('gradeMove', () => {
  it('grades a move with zero loss as boa', async () => {
    const evaluate = vi.fn().mockResolvedValueOnce(20).mockResolvedValueOnce(-20);
    const result = await gradeMove({ evaluate }, board, 'b', afterBoard, 'w');
    expect(result).toEqual({ quality: 'boa', loss: 0 });
  });

  it('grades a large drop in evaluation as erro', async () => {
    const evaluate = vi.fn().mockResolvedValueOnce(50).mockResolvedValueOnce(60);
    const result = await gradeMove({ evaluate }, board, 'b', afterBoard, 'w');
    // bestEval=50, playedEval=-60 -> loss=110
    expect(result).toEqual({ quality: 'erro', loss: 110 });
  });

  it('calls evaluate on the pre-move board for the mover, then the post-move board for the opponent, both at GRADE_DEPTH', async () => {
    const evaluate = vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    await gradeMove({ evaluate }, board, 'b', afterBoard, 'w');
    expect(evaluate).toHaveBeenNthCalledWith(1, board, 'b', GRADE_DEPTH);
    expect(evaluate).toHaveBeenNthCalledWith(2, afterBoard, 'w', GRADE_DEPTH);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- gradeMove.test.ts`
Expected: FAIL -- `Cannot find module './gradeMove'`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/checkers/gradeMove.ts`:

```ts
import type { Board, Color } from './types';
import { evalLoss, classifyMove, type MoveQuality } from './moveClassification';

// Both evaluate() calls below MUST share this exact depth -- CLAUDE.md's
// "Search scores are mate-distance-relative and NOT normalized across
// searches" section: two evaluate()/findBestMove() calls are only
// comparable when they completed the same maxDepth. This is deliberately
// NOT tied to any Difficulty/EngineOptions -- grading strength is its own
// concern, independent of both the opponent's configured difficulty and
// SUGGESTION_ENGINE_OPTIONS's suggestion strength (see difficulty.ts).
// 8 is a first guess (deep enough to see most tactics, shallow enough that
// two sequential grading calls stay well under a second combined on
// realistic hardware) -- provisional, same "verify by playing" caveat as
// difficulty.ts's numbers.
export const GRADE_DEPTH = 8;

export interface MoveGrade {
  quality: MoveQuality;
  loss: number;
}

// Structurally compatible with CheckersEngineClient's evaluate() method,
// but declared locally so callers/tests don't need the whole engine-client
// shape (getBestMove, terminate) just to grade a move.
export interface Evaluator {
  evaluate: (board: Board, color: Color, depth: number) => Promise<number>;
}

// Grades a move that was already applied to the board. `boardBeforeMove`/
// `moverColor` describe the position the mover chose from; `boardAfterMove`/
// `opponentColor` describe the resulting position from the OTHER side's
// perspective (evaluate()'s antisymmetry -- see evaluate.ts's doc comment --
// means negating that score gives the played move's value from the mover's
// own perspective).
export async function gradeMove(
  engine: Evaluator,
  boardBeforeMove: Board,
  moverColor: Color,
  boardAfterMove: Board,
  opponentColor: Color,
): Promise<MoveGrade> {
  const bestEval = await engine.evaluate(boardBeforeMove, moverColor, GRADE_DEPTH);
  const opponentEval = await engine.evaluate(boardAfterMove, opponentColor, GRADE_DEPTH);
  const playedEval = -opponentEval;
  const loss = evalLoss(bestEval, playedEval);
  return { quality: classifyMove(loss), loss };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- gradeMove.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/checkers/gradeMove.ts lib/checkers/gradeMove.test.ts
git commit -m "feat(checkers): gradeMove -- wire evaluate()+moveClassification into a MoveGrade

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

## Task 3: `moveExplanation.ts` -- canned-phrase move descriptions, bilingual from day one

**Files:**
- Create: `lib/checkers/moveExplanation.ts`
- Test: `lib/checkers/moveExplanation.test.ts`

**Interfaces:**
- Consumes: `Board`/`CheckersMove`/`Color` from `./types`; `isBackRowFor`/`squareToRowCol` from `./board`; `allLegalMoves` from `./moveGeneration`; `MoveQuality` from `./moveClassification`.
- Produces: `Locale = 'pt' | 'en'`, `explainMove(params): string`, `describeMoveQuality(quality, locale): string`, `materialFeel(loss, locale): string | null`, `describeMoveForToast(params): string` -- all consumed by Task 7 (`app/jogar/page.tsx`, for both the suggestion explanation and the move-quality toast message).

Per spec §5, this module is deliberately bilingual (`Locale` param, both phrase sets written now) even though every other module in this repo (`gameEndMessage.ts`, `RulesModal.tsx`) is hardcoded Portuguese until Phase 8's i18n pass -- this plan's call sites (Task 7) all pass `locale: 'pt'`; nothing here adds a locale toggle to the UI.

- [ ] **Step 1: Write the failing test**

Create `lib/checkers/moveExplanation.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { explainMove, describeMoveQuality, materialFeel, describeMoveForToast } from './moveExplanation';
import { createInitialBoard } from './board';
import { applyMove } from './moveGeneration';
import type { Piece } from './types';

function emptyBoard(): (Piece | null)[] {
  return new Array(32).fill(null);
}

describe('explainMove', () => {
  it('describes a single capture', () => {
    const board = emptyBoard();
    board[10] = { color: 'b', kind: 'man' }; // 11
    board[14] = { color: 'w', kind: 'man' }; // 15
    const move = { from: 11, to: 18, captures: [15], promotes: false };
    const after = applyMove(board, move);
    const text = explainMove({ move, boardBeforeMove: board, boardAfterMove: after, moverColor: 'b', locale: 'pt' });
    expect(text).toBe('Captura uma peça.');
  });

  it('describes a multi-jump capture with the count', () => {
    const board = emptyBoard();
    board[10] = { color: 'b', kind: 'man' }; // 11
    board[14] = { color: 'w', kind: 'man' }; // 15
    board[21] = { color: 'w', kind: 'man' }; // 22
    const move = { from: 11, to: 29, captures: [15, 22], promotes: false };
    const after = applyMove(board, move);
    const text = explainMove({ move, boardBeforeMove: board, boardAfterMove: after, moverColor: 'b', locale: 'pt' });
    expect(text).toBe('Captura 2 peças.');
  });

  it('describes a promotion', () => {
    const board = emptyBoard();
    board[24] = { color: 'b', kind: 'man' }; // 25
    const move = { from: 25, to: 29, captures: [], promotes: true };
    const after = applyMove(board, move);
    const text = explainMove({ move, boardBeforeMove: board, boardAfterMove: after, moverColor: 'b', locale: 'pt' });
    expect(text).toBe('Torna-se dama.');
  });

  it('warns when the move leaves the moved piece capturable (hangs a piece)', () => {
    const board = emptyBoard();
    board[10] = { color: 'b', kind: 'man' }; // 11
    board[17] = { color: 'w', kind: 'man' }; // 18
    const move = { from: 11, to: 15, captures: [], promotes: false };
    const after = applyMove(board, move);
    const text = explainMove({ move, boardBeforeMove: board, boardAfterMove: after, moverColor: 'b', locale: 'pt' });
    expect(text).toBe('Entrega uma peça -- o adversário pode capturar de volta.');
  });

  it('describes abandoning back-row defense', () => {
    const board = emptyBoard();
    // Square 1 is (row 0, col 1) -- black's own back row is white's
    // crowning row (row 0), per evaluate.ts's doc comment.
    board[0] = { color: 'b', kind: 'man' }; // 1
    const move = { from: 1, to: 6, captures: [], promotes: false }; // 6 is (row 1, col 2)
    const after = applyMove(board, move);
    const text = explainMove({ move, boardBeforeMove: board, boardAfterMove: after, moverColor: 'b', locale: 'pt' });
    expect(text).toBe('Abandona a defesa da última linha.');
  });

  it('describes occupying the center', () => {
    const board = emptyBoard();
    board[5] = { color: 'b', kind: 'man' }; // 6 is (row 1, col 2) -- not a center column
    const move = { from: 6, to: 10, captures: [], promotes: false }; // 10 is (row 2, col 3) -- a center column
    const after = applyMove(board, move);
    const text = explainMove({ move, boardBeforeMove: board, boardAfterMove: after, moverColor: 'b', locale: 'pt' });
    expect(text).toBe('Ocupa o centro do tabuleiro.');
  });

  it('falls back to a generic advance description', () => {
    const board = emptyBoard();
    board[20] = { color: 'b', kind: 'man' }; // 21
    const move = { from: 21, to: 25, captures: [], promotes: false };
    const after = applyMove(board, move);
    const text = explainMove({ move, boardBeforeMove: board, boardAfterMove: after, moverColor: 'b', locale: 'pt' });
    expect(text).toBe('Avança em direção à promoção.');
  });

  it('returns English phrases for locale "en"', () => {
    const board = emptyBoard();
    board[10] = { color: 'b', kind: 'man' }; // 11
    board[14] = { color: 'w', kind: 'man' }; // 15
    const move = { from: 11, to: 18, captures: [15], promotes: false };
    const after = applyMove(board, move);
    const text = explainMove({ move, boardBeforeMove: board, boardAfterMove: after, moverColor: 'b', locale: 'en' });
    expect(text).toBe('Captures a piece.');
  });
});

describe('describeMoveQuality', () => {
  it('labels boa/imprecisao/erro in Portuguese', () => {
    expect(describeMoveQuality('boa', 'pt')).toBe('Boa jogada!');
    expect(describeMoveQuality('imprecisao', 'pt')).toBe('Imprecisão.');
    expect(describeMoveQuality('erro', 'pt')).toBe('Erro.');
  });

  it('labels boa/imprecisao/erro in English', () => {
    expect(describeMoveQuality('boa', 'en')).toBe('Good move!');
    expect(describeMoveQuality('imprecisao', 'en')).toBe('Inaccuracy.');
    expect(describeMoveQuality('erro', 'en')).toBe('Mistake.');
  });
});

describe('materialFeel', () => {
  it('returns null for a small loss', () => {
    expect(materialFeel(10, 'pt')).toBeNull();
  });

  it('describes a loss near a man\'s value', () => {
    expect(materialFeel(90, 'pt')).toBe('quase perdeu uma peça');
  });

  it('describes a loss near a king\'s value', () => {
    expect(materialFeel(230, 'pt')).toBe('quase perdeu uma dama');
  });
});

describe('describeMoveForToast', () => {
  it('combines the quality label and the move explanation', () => {
    const board = emptyBoard();
    board[10] = { color: 'b', kind: 'man' }; // 11
    board[14] = { color: 'w', kind: 'man' }; // 15
    const move = { from: 11, to: 18, captures: [15], promotes: false };
    const after = applyMove(board, move);
    const text = describeMoveForToast({
      quality: 'boa',
      loss: 0,
      move,
      boardBeforeMove: board,
      boardAfterMove: after,
      moverColor: 'b',
      locale: 'pt',
    });
    expect(text).toBe('Boa jogada! Captura uma peça.');
  });

  it('appends a material-feel note when the loss is large', () => {
    const board = createInitialBoard();
    // 9-13 (not 11-15): 11-15 lands on square 15, a center column, which
    // would trip the center-occupation branch instead of the fallback this
    // test means to exercise -- 9-13 lands on square 13 (row 3, col 0), not
    // a center column, and neither endpoint is on black's own back row.
    const move = { from: 9, to: 13, captures: [], promotes: false };
    const after = applyMove(board, move);
    const text = describeMoveForToast({
      quality: 'erro',
      loss: 100,
      move,
      boardBeforeMove: board,
      boardAfterMove: after,
      moverColor: 'b',
      locale: 'pt',
    });
    expect(text).toBe('Erro. Avança em direção à promoção. Quase perdeu uma peça.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- moveExplanation.test.ts`
Expected: FAIL -- `Cannot find module './moveExplanation'`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/checkers/moveExplanation.ts`:

```ts
import type { Board, CheckersMove, Color } from './types';
import { isBackRowFor, squareToRowCol } from './board';
import { allLegalMoves } from './moveGeneration';
import type { MoveQuality } from './moveClassification';

// Deliberate exception to this repo's usual "PT-only, i18n deferred to
// Phase 8" convention (see gameEndMessage.ts, RulesModal.tsx) -- spec §5
// calls for this specific module to be bilingual from day one, unlike
// Chess Sensei's retrofitted lib/chess/moveExplanation.ts. Every call site
// in this phase (app/jogar/page.tsx) still hardcodes 'pt': there is no UI
// locale toggle yet.
export type Locale = 'pt' | 'en';

// Mirrors evaluate.ts's private CENTER_COLUMNS -- not imported from there
// because evaluate.ts doesn't export it and this module has no other
// reason to depend on evaluate.ts.
const CENTER_COLUMNS = new Set([3, 4]);

const MAN_VALUE = 100;
const KING_VALUE = 275;

export interface ExplainMoveParams {
  move: CheckersMove;
  boardBeforeMove: Board;
  boardAfterMove: Board;
  moverColor: Color;
  locale: Locale;
}

// Checks whether the piece that just moved (now sitting on move.to) is
// capturable by the opponent on the resulting board -- i.e. this move
// "hangs" that piece. Deliberately does not distinguish "this was already
// unavoidable" from "this move caused it": spec §5 only asks to detect
// "moving into a forced capture", not to prove the alternative was safe.
function hangsThePiece(boardAfterMove: Board, move: CheckersMove, opponentColor: Color): boolean {
  return allLegalMoves(boardAfterMove, opponentColor).some((m) => m.captures.includes(move.to));
}

// A man's "own back row" in the checkers-strategy sense is the OPPONENT's
// crowning row (see evaluate.ts's doc comment) -- the row it started the
// game defending, not the row it promotes on.
function isOwnBackRow(square: number, moverColor: Color): boolean {
  const opponent: Color = moverColor === 'b' ? 'w' : 'b';
  return isBackRowFor(square, opponent);
}

function isCenterColumn(square: number): boolean {
  return CENTER_COLUMNS.has(squareToRowCol(square).col);
}

export function explainMove({ move, boardBeforeMove, boardAfterMove, moverColor, locale }: ExplainMoveParams): string {
  const opponentColor: Color = moverColor === 'b' ? 'w' : 'b';

  if (move.captures.length > 1) {
    return locale === 'pt' ? `Captura ${move.captures.length} peças.` : `Captures ${move.captures.length} pieces.`;
  }
  if (move.captures.length === 1) {
    return locale === 'pt' ? 'Captura uma peça.' : 'Captures a piece.';
  }
  if (move.promotes) {
    return locale === 'pt' ? 'Torna-se dama.' : 'Becomes a king.';
  }
  if (hangsThePiece(boardAfterMove, move, opponentColor)) {
    return locale === 'pt'
      ? 'Entrega uma peça -- o adversário pode capturar de volta.'
      : 'Hangs a piece -- the opponent can capture it back.';
  }
  if (isOwnBackRow(move.from, moverColor) && !isOwnBackRow(move.to, moverColor)) {
    return locale === 'pt' ? 'Abandona a defesa da última linha.' : 'Abandons back-row defense.';
  }
  if (isCenterColumn(move.to) && !isCenterColumn(move.from)) {
    return locale === 'pt' ? 'Ocupa o centro do tabuleiro.' : 'Occupies the center of the board.';
  }
  return locale === 'pt' ? 'Avança em direção à promoção.' : 'Advances toward promotion.';
}

const QUALITY_LABELS: Record<Locale, Record<MoveQuality, string>> = {
  pt: { boa: 'Boa jogada!', imprecisao: 'Imprecisão.', erro: 'Erro.' },
  en: { boa: 'Good move!', imprecisao: 'Inaccuracy.', erro: 'Mistake.' },
};

export function describeMoveQuality(quality: MoveQuality, locale: Locale): string {
  return QUALITY_LABELS[locale][quality];
}

// Checkers' equivalent of chess's "centipawnFeel" -- translates a raw
// evalLoss() number into an intuitive man/king-scale phrase (per spec §5),
// using evaluate.ts's own material constants (man=100/king=275). Returns
// null for a loss too small to read as "about a piece", so callers can
// skip the sentence entirely rather than print a hollow one.
export function materialFeel(loss: number, locale: Locale): string | null {
  if (loss >= KING_VALUE * 0.8) {
    return locale === 'pt' ? 'quase perdeu uma dama' : 'nearly lost a king';
  }
  if (loss >= MAN_VALUE * 0.8) {
    return locale === 'pt' ? 'quase perdeu uma peça' : 'nearly lost a piece';
  }
  return null;
}

function capitalize(sentence: string): string {
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

export interface DescribeMoveForToastParams extends ExplainMoveParams {
  quality: MoveQuality;
  loss: number;
}

// Composes the full move-quality toast message: quality label + what the
// move did + (only for a large loss) a material-feel note. Also reused for
// the suggestion explanation by callers that only want explainMove()'s half
// (Task 7 calls explainMove() directly for suggestions, since a suggestion
// has no MoveQuality/loss of its own to report).
export function describeMoveForToast(params: DescribeMoveForToastParams): string {
  const { quality, loss, locale } = params;
  const parts = [describeMoveQuality(quality, locale), explainMove(params)];
  const feel = materialFeel(loss, locale);
  if (feel) parts.push(capitalize(feel) + '.');
  return parts.join(' ');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- moveExplanation.test.ts`
Expected: PASS (14 tests). If the "abandoning back-row defense" or "occupying the center" fixtures don't hit the intended branch (square numbering is easy to get subtly wrong by hand -- CLAUDE.md's own noted recurring failure mode), recompute the intended squares with `squareToRowCol`/`isBackRowFor` from `board.ts` directly rather than guessing, and adjust the fixture, not the implementation.

- [ ] **Step 5: Commit**

```bash
git add lib/checkers/moveExplanation.ts lib/checkers/moveExplanation.test.ts
git commit -m "feat(checkers): moveExplanation -- canned PT/EN move-description phrases

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

## Task 4: Persisted Learning Mode toggle hook

**Files:**
- Create: `lib/checkers/useLearningModePreference.ts`
- Test: `lib/checkers/useLearningModePreference.test.ts`

**Interfaces:**
- Produces: `LEARNING_MODE_STORAGE_KEY: string`, `useLearningModePreference(): [enabled: boolean, toggle: () => void]` -- consumed by Task 7 (`app/jogar/page.tsx`).

Same SSR-hydration-safe shape as `useCheckersGame`'s persistence (CLAUDE.md: "reads `localStorage` only inside a `useEffect`, after the initial render") -- built correctly from the start rather than repeating Chess Sensei's known hydration bug.

- [ ] **Step 1: Write the failing test**

Create `lib/checkers/useLearningModePreference.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLearningModePreference, LEARNING_MODE_STORAGE_KEY } from './useLearningModePreference';

describe('useLearningModePreference', () => {
  beforeEach(() => {
    window.localStorage.removeItem(LEARNING_MODE_STORAGE_KEY);
  });

  it('starts disabled when nothing is saved', () => {
    const { result } = renderHook(() => useLearningModePreference());
    expect(result.current[0]).toBe(false);
  });

  it('toggling flips the value and persists it', () => {
    const { result } = renderHook(() => useLearningModePreference());
    act(() => {
      result.current[1]();
    });
    expect(result.current[0]).toBe(true);
    expect(window.localStorage.getItem(LEARNING_MODE_STORAGE_KEY)).toBe('true');
  });

  it('starts enabled when a previous session saved it as enabled', () => {
    window.localStorage.setItem(LEARNING_MODE_STORAGE_KEY, 'true');
    const { result } = renderHook(() => useLearningModePreference());
    expect(result.current[0]).toBe(true);
  });

  it('toggling twice returns to disabled and persists that', () => {
    const { result } = renderHook(() => useLearningModePreference());
    act(() => {
      result.current[1]();
      result.current[1]();
    });
    expect(result.current[0]).toBe(false);
    expect(window.localStorage.getItem(LEARNING_MODE_STORAGE_KEY)).toBe('false');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useLearningModePreference.test.ts`
Expected: FAIL -- `Cannot find module './useLearningModePreference'`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/checkers/useLearningModePreference.ts`:

```ts
'use client';

import { useCallback, useEffect, useState } from 'react';

export const LEARNING_MODE_STORAGE_KEY = 'checkers-learning-game-learning-mode';

// Same SSR-hydration-safe shape as useCheckersGame: always starts `false`
// (correct for both server and the initial client render, since window is
// unavailable during SSR) and only reads localStorage inside a useEffect,
// after that first render -- see CLAUDE.md's "useCheckersGame persistence
// follows the SSR-hydration-safe pattern from day one" entry for why a
// lazy useState initializer would NOT be safe here.
export function useLearningModePreference(): [boolean, () => void] {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(LEARNING_MODE_STORAGE_KEY) === 'true') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEnabled(true);
    }
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      window.localStorage.setItem(LEARNING_MODE_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return [enabled, toggle];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- useLearningModePreference.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/checkers/useLearningModePreference.ts lib/checkers/useLearningModePreference.test.ts
git commit -m "feat(checkers): useLearningModePreference -- persisted learning-mode toggle

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

## Task 5: `CheckersBoard` -- render a suggested-move highlight

**Files:**
- Modify: `components/CheckersBoard/CheckersBoard.tsx`
- Test: `components/CheckersBoard/CheckersBoard.test.tsx`

**Interfaces:**
- Produces: new optional prop `suggestedMove?: CheckersMove | null` on `CheckersBoardProps` -- consumed by Task 7 (`app/jogar/page.tsx`).

Optional and defaulting to no highlight, so every existing call site/test (which never passes it) is unaffected -- `CheckersBoard` stays "dumb": it draws whatever `suggestedMove` it's given without knowing whether Learning Mode is even on.

- [ ] **Step 1: Write the failing test**

Add to `components/CheckersBoard/CheckersBoard.test.tsx`, inside `describe('CheckersBoard interaction', ...)`:

```ts
  it('applies the suggestion outline class to the suggested move\'s from/to squares', () => {
    const { container } = render(
      <CheckersBoard
        board={createInitialBoard()}
        turn="b"
        selectedSquare={null}
        legalTargets={[]}
        mandatoryCaptureSquares={[]}
        lastMove={null}
        suggestedMove={{ from: 11, to: 15, captures: [], promotes: false }}
        onSquareClick={() => {}}
      />,
    );
    const from = container.querySelector('[aria-label="square 11"]');
    const to = container.querySelector('[aria-label="square 15"]');
    const other = container.querySelector('[aria-label="square 1"]');
    expect(from?.className).toContain('outline-violet-400');
    expect(to?.className).toContain('outline-violet-400');
    expect(other?.className).not.toContain('outline-violet-400');
  });

  it('renders no suggestion outline when suggestedMove is null', () => {
    const { container } = render(
      <CheckersBoard
        board={createInitialBoard()}
        turn="b"
        selectedSquare={null}
        legalTargets={[]}
        mandatoryCaptureSquares={[]}
        lastMove={null}
        suggestedMove={null}
        onSquareClick={() => {}}
      />,
    );
    expect(container.querySelector('.outline-violet-400')).toBeNull();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- CheckersBoard.test.tsx`
Expected: FAIL -- the outline class is never applied (prop doesn't exist yet / TypeScript error on the unknown prop).

- [ ] **Step 3: Write minimal implementation**

In `components/CheckersBoard/CheckersBoard.tsx`:

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
  onSquareClick?: (square: Square) => void;
}
```

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
  onSquareClick,
}: CheckersBoardProps): ReactElement {
```

Inside the square-rendering loop, alongside the existing `isMandatory`/`isLastMove` checks:

```ts
      const isSuggested = suggestedMove !== null && (square === suggestedMove.from || square === suggestedMove.to);
```

And add it to the `className` array (violet is otherwise unused among the board's accent colors -- sky for selection, amber for mandatory capture, yellow for last move -- so it reads as a distinct signal):

```ts
          className={[
            'relative aspect-square min-h-0 min-w-0 overflow-hidden bg-stone-700',
            isLastMove ? 'ring-4 ring-yellow-400' : '',
            isSelected ? 'outline outline-4 outline-sky-500' : '',
            isMandatory ? 'outline outline-4 outline-amber-400' : '',
            isSuggested ? 'outline outline-4 outline-violet-400' : '',
          ]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- CheckersBoard.test.tsx`
Expected: PASS (all prior tests plus the 2 new ones).

- [ ] **Step 5: Commit**

```bash
git add components/CheckersBoard/CheckersBoard.tsx components/CheckersBoard/CheckersBoard.test.tsx
git commit -m "feat(ui): CheckersBoard -- optional suggestedMove highlight

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

## Task 6: `LearningPanel` -- the toggle + suggestion control

**Files:**
- Create: `components/LearningPanel/LearningPanel.tsx`
- Test: `components/LearningPanel/LearningPanel.test.tsx`

**Interfaces:**
- Produces: `LearningPanelProps { enabled, onToggle, canRequestSuggestion, onRequestSuggestion, suggestionLoading, hasSuggestion, suggestionExplanation }`, component `LearningPanel` -- consumed by Task 7 (`app/jogar/page.tsx`).

Matches spec §5's named `LearningPanel` props (`enabled`/`onToggle`/`onRequestSuggestion`/`suggestionLoading`/`hasSuggestion`/`suggestionExplanation`) with one deliberate addition beyond that list: `canRequestSuggestion: boolean`. `LearningPanel` stays "dumb" the same way `CheckersBoard` does -- it doesn't know it's not the human's turn or that the game has ended, it just disables the button when told to. Plain Tailwind, hardcoded Portuguese, matching every other `/jogar`-adjacent component built so far -- no `PageChrome`/`ChipButton` (Phase 5), no i18n (Phase 8).

- [ ] **Step 1: Write the failing test**

Create `components/LearningPanel/LearningPanel.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LearningPanel } from './LearningPanel';

const baseProps = {
  enabled: true,
  onToggle: () => {},
  canRequestSuggestion: true,
  onRequestSuggestion: () => {},
  suggestionLoading: false,
  hasSuggestion: false,
  suggestionExplanation: null,
};

describe('LearningPanel', () => {
  it('shows the toggle button labeled by its current state', () => {
    render(<LearningPanel {...baseProps} enabled={false} />);
    expect(screen.getByText('Ativar modo de aprendizagem')).not.toBeNull();
  });

  it('shows the "on" label and the suggestion button when enabled', () => {
    render(<LearningPanel {...baseProps} enabled={true} />);
    expect(screen.getByText('Desativar modo de aprendizagem')).not.toBeNull();
    expect(screen.getByText('Sugerir jogada')).not.toBeNull();
  });

  it('does not show the suggestion button when disabled', () => {
    render(<LearningPanel {...baseProps} enabled={false} />);
    expect(screen.queryByText('Sugerir jogada')).toBeNull();
  });

  it('calls onToggle when the toggle button is clicked', () => {
    const onToggle = vi.fn();
    render(<LearningPanel {...baseProps} onToggle={onToggle} />);
    fireEvent.click(screen.getByText('Desativar modo de aprendizagem'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onRequestSuggestion when the suggestion button is clicked', () => {
    const onRequestSuggestion = vi.fn();
    render(<LearningPanel {...baseProps} onRequestSuggestion={onRequestSuggestion} />);
    fireEvent.click(screen.getByText('Sugerir jogada'));
    expect(onRequestSuggestion).toHaveBeenCalledTimes(1);
  });

  it('disables the suggestion button when canRequestSuggestion is false', () => {
    render(<LearningPanel {...baseProps} canRequestSuggestion={false} />);
    expect(screen.getByText('Sugerir jogada')).toBeDisabled();
  });

  it('disables the suggestion button and shows a loading label while loading', () => {
    render(<LearningPanel {...baseProps} suggestionLoading={true} />);
    expect(screen.getByText('A calcular...')).toBeDisabled();
  });

  it('shows the suggestion explanation once one exists', () => {
    render(<LearningPanel {...baseProps} hasSuggestion={true} suggestionExplanation="Captura uma peça." />);
    expect(screen.getByText('Captura uma peça.')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- LearningPanel.test.tsx`
Expected: FAIL -- `Cannot find module './LearningPanel'`.

- [ ] **Step 3: Write minimal implementation**

Create `components/LearningPanel/LearningPanel.tsx`:

```tsx
'use client';

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

// Plain Tailwind, hardcoded Portuguese -- matches every other /jogar
// component so far (no PageChrome/ChipButton until Phase 5, no i18n until
// Phase 8).
export function LearningPanel({
  enabled,
  onToggle,
  canRequestSuggestion,
  onRequestSuggestion,
  suggestionLoading,
  hasSuggestion,
  suggestionExplanation,
}: LearningPanelProps) {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-2">
      <button type="button" onClick={onToggle} className="underline">
        {enabled ? 'Desativar modo de aprendizagem' : 'Ativar modo de aprendizagem'}
      </button>
      {enabled && (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onRequestSuggestion}
            disabled={!canRequestSuggestion || suggestionLoading}
            className="rounded-xl border-2 border-violet-400 bg-white px-4 py-1 text-sm font-medium text-stone-900 disabled:opacity-50"
          >
            {suggestionLoading ? 'A calcular...' : 'Sugerir jogada'}
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- LearningPanel.test.tsx`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add components/LearningPanel/LearningPanel.tsx components/LearningPanel/LearningPanel.test.tsx
git commit -m "feat(ui): LearningPanel -- toggle + suggestion control, text/button only

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

## Task 7: Wire Learning Mode into `/jogar`

**Files:**
- Modify: `app/jogar/page.tsx`

**Interfaces:**
- Consumes: `useLearningModePreference` (Task 4), `gradeMove`/`GRADE_DEPTH` (Task 2), `explainMove`/`describeMoveForToast` (Task 3), `SUGGESTION_ENGINE_OPTIONS` (Task 1), `LearningPanel` (Task 6), `CheckersBoard`'s new `suggestedMove` prop (Task 5), `useToast` from `@/components/Toast/ToastProvider` (already built, unused until now).
- Produces: nothing new for later tasks -- this is the last code task, only CLAUDE.md documentation follows.

No dedicated test file: `app/jogar/page.tsx` has never had one (it depends on `useSearchParams`/`useRouter` and drives two async engine lifecycles), matching this repo's existing precedent of keeping page-level wiring untested while every piece of logic it calls (`gradeMove`, `moveExplanation`, `useLearningModePreference`) is unit-tested on its own. Verify this task by running the dev server and manually exercising both modes (steps given after the code changes).

Two design points worth restating before the code, since they're easy to get subtly wrong:

- **Engine sharing**: in vs-computer mode, Learning Mode reuses the *existing* AI-opponent engine (`engineRef`) for suggestions/grading -- it does NOT spin up a second worker, and toggling Learning Mode on/off never touches `engineRef`'s lifecycle (so it can never interrupt an in-flight AI move request). In local two-player mode, a *separate* `learningEngineRef` is lazily created only while Learning Mode is on, independent of anything else.
- **Grading only fires for human-made moves**: the AI's own move (made by the `isAiTurn` effect, not by `handleSquareClick`) never gets a pending-grade entry, so it's never graded -- this falls out of *where* the pending-grade ref gets set, not an explicit color check.

- [ ] **Step 1: Add imports and new state**

```ts
import { useLearningModePreference } from '@/lib/checkers/useLearningModePreference';
import { gradeMove } from '@/lib/checkers/gradeMove';
import { explainMove, describeMoveForToast } from '@/lib/checkers/moveExplanation';
import { SUGGESTION_ENGINE_OPTIONS } from '@/lib/checkers/difficulty';
import { LearningPanel } from '@/components/LearningPanel/LearningPanel';
import { useToast } from '@/components/Toast/ToastProvider';
```

And widen the existing type-only import from `@/lib/checkers/types` (do not add a second import statement from the same module -- merge into this line):

```ts
import type { Board, CheckersMove, Color, Square } from '@/lib/checkers/types';
```

In `JogarPageInner`, alongside the other `useState`/`useRef` declarations:

```ts
  const { show } = useToast();
  const [learningModeEnabled, toggleLearningMode] = useLearningModePreference();
  const [suggestedMove, setSuggestedMove] = useState<CheckersMove | null>(null);
  const [suggestionExplanation, setSuggestionExplanation] = useState<string | null>(null);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const learningEngineRef = useRef<CheckersEngineClient | null>(null);
  const pendingGradeRef = useRef<{ boardBeforeMove: Board; moverColor: Color } | null>(null);
```

- [ ] **Step 2: Lazily create/terminate the local-mode learning engine**

Right after the existing `engineRef` creation effect:

```ts
  // Vs-computer mode reuses `engineRef` (see getLearningEngine below) --
  // this effect only ever creates a SEPARATE engine for local two-player
  // games, and only while Learning Mode is on. Deliberately independent of
  // isAiMode/engineRef's lifecycle: toggling Learning Mode on/off in a
  // vs-computer game must never recreate/terminate the opponent's engine
  // mid-think.
  useEffect(() => {
    if (isAiMode || !learningModeEnabled) return;
    const client = createCheckersEngineClient();
    learningEngineRef.current = client;
    return () => {
      client.terminate();
      learningEngineRef.current = null;
    };
  }, [isAiMode, learningModeEnabled]);

  function getLearningEngine(): CheckersEngineClient | null {
    return isAiMode ? engineRef.current : learningEngineRef.current;
  }
```

- [ ] **Step 3: Clear suggestion state whenever a new move is made**

Right after the existing game-end-modal effect:

```ts
  // A suggestion refers to a specific board position -- once any move is
  // made (by either side), that suggestion no longer applies to the
  // current position and must not linger on the board or in the panel.
  useEffect(() => {
    setSuggestedMove(null);
    setSuggestionExplanation(null);
  }, [state.lastMove]);
```

- [ ] **Step 4: Capture the pre-move position for grading, inside `handleSquareClick`**

Modify the existing move-making branch of `handleSquareClick`:

```ts
  function handleSquareClick(square: Square) {
    if (state.isGameOver) return;
    if (isAiMode && state.turn === aiColor) return;

    if (selected !== null && legalTargets.includes(square)) {
      if (learningModeEnabled) {
        pendingGradeRef.current = { boardBeforeMove: state.board, moverColor: state.turn };
      }
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
```

(Only the new `if (learningModeEnabled) { ... }` block and the comment above it are additions -- everything else in this function is unchanged.)

- [ ] **Step 5: Grade the move once it lands, and show the toast**

New effect, placed after the suggestion-clearing effect from Step 3:

```ts
  // Runs once per move (state.lastMove changes to a new object every move).
  // Only fires for moves handleSquareClick captured a pending grade for --
  // the AI's own moves (made by the isAiTurn effect above, never through
  // handleSquareClick) never populate pendingGradeRef, so they're never
  // graded, satisfying "grade every human-made move, never the engine's".
  useEffect(() => {
    const pending = pendingGradeRef.current;
    pendingGradeRef.current = null;
    if (!pending) return;
    // Learning Mode may have been toggled off between the click and this
    // effect running -- don't surface a toast for a grading the player no
    // longer asked for.
    if (!learningModeEnabled) return;
    const engine = getLearningEngine();
    if (!engine) return;
    const move = state.lastMove;
    if (!move) return;
    const boardAfterMove = state.board;
    const opponentColor: Color = pending.moverColor === 'b' ? 'w' : 'b';

    let cancelled = false;
    gradeMove(engine, pending.boardBeforeMove, pending.moverColor, boardAfterMove, opponentColor)
      .then(({ quality, loss }) => {
        if (cancelled) return;
        const message = describeMoveForToast({
          quality,
          loss,
          move,
          boardBeforeMove: pending.boardBeforeMove,
          boardAfterMove,
          moverColor: pending.moverColor,
          locale: 'pt',
        });
        show(message, quality);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // Quiet failure by design: grading is a nice-to-have overlay, not
        // core gameplay -- unlike the AI-move-request failure above, this
        // must never surface as a blocking error or disrupt play.
        console.error('[jogar] move grading failed:', error);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastMove]);
```

- [ ] **Step 6: Suggestion request handler**

```ts
  function handleRequestSuggestion() {
    const engine = getLearningEngine();
    if (!engine) return;
    setSuggestionLoading(true);
    engine
      .getBestMove(state.board, state.turn, SUGGESTION_ENGINE_OPTIONS)
      .then((move) => {
        setSuggestedMove(move);
        setSuggestionExplanation(
          explainMove({
            move,
            boardBeforeMove: state.board,
            boardAfterMove: applyMove(state.board, move),
            moverColor: state.turn,
            locale: 'pt',
          }),
        );
      })
      .catch((error: unknown) => {
        // Same quiet-failure reasoning as grading: a failed suggestion
        // request must not block or disrupt play.
        console.error('[jogar] suggestion request failed:', error);
      })
      .finally(() => {
        setSuggestionLoading(false);
      });
  }
```

Add the import this needs:

```ts
import { applyMove } from '@/lib/checkers/moveGeneration';
```

- [ ] **Step 7: Render `LearningPanel` and pass `suggestedMove` to `CheckersBoard`**

```tsx
      <CheckersBoard
        board={state.board}
        turn={state.turn}
        selectedSquare={selected}
        legalTargets={legalTargets}
        mandatoryCaptureSquares={state.mandatoryCaptureSquares}
        lastMove={state.lastMove}
        suggestedMove={suggestedMove}
        interactive={boardInteractive}
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
```

(Placed directly below the existing `<CheckersBoard .../>`, above the "Menu inicial"/"Reiniciar partida" links div.)

- [ ] **Step 8: Run the full test suite**

Run: `npm test`
Expected: PASS -- every existing test still passes (no existing test exercises `/jogar/page.tsx` directly, so there's nothing here to newly break at the unit level; this step is confirming Tasks 1-6's changes didn't regress).

- [ ] **Step 9: Manual verification with the dev server**

Run: `npm run dev`, then in a browser:

1. Navigate to `/jogar` (local two-player). Click "Ativar modo de aprendizagem" -- the label flips to "Desativar modo de aprendizagem" and a "Sugerir jogada" button appears.
2. Click "Sugerir jogada" -- after a short delay, a violet outline appears on two squares (the suggested move) and an explanation sentence appears under the button.
3. Make any legal move -- a toast appears in the top-center with a quality label + explanation; the violet suggestion outline clears.
4. Reload the page -- "Modo de aprendizagem" is still enabled (persisted).
5. Click "Desativar modo de aprendizagem" -- the suggestion button and any lingering explanation disappear; making a move no longer shows a toast.
6. Navigate to `/jogar?mode=ai&difficulty=facil&color=b`. Enable Learning Mode, make a move -- confirm a toast appears for your move but never for the AI's reply move.
7. With the browser's devtools open on the Network tab (or just watching for console errors), confirm no uncaught errors/rejections appear during any of the above -- especially toggling Learning Mode on/off *while* the AI is mid-think (click "Desativar..." immediately after the AI's turn begins in a slower difficulty) to confirm the AI's move still completes normally (this is the scenario the Step 2 comment calls out).

- [ ] **Step 10: Commit**

```bash
git add app/jogar/page.tsx
git commit -m "feat(checkers): wire Learning Mode (suggestion + move-quality toast) into /jogar

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

## Task 8: Close out the phase in `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

Document the conventions this phase introduced, same as every prior phase's closing task.

- [ ] **Step 1: Update the Structure section**

In the `lib/checkers/` block, add after the `gameEndMessage.ts` line:

```
  gradeMove.ts               # gradeMove -- wraps two fixed-depth evaluate()
                              # calls (before/after a move) into a MoveGrade
                              # via moveClassification.ts, finally giving
                              # that phase's unused machinery a caller
  moveExplanation.ts         # explainMove/describeMoveQuality/materialFeel/
                              # describeMoveForToast -- canned-phrase move
                              # descriptions, bilingual (Locale: 'pt'|'en')
                              # from day one per spec §5, though every call
                              # site today hardcodes 'pt' -- no UI locale
                              # toggle exists until Phase 8
  useLearningModePreference.ts # persisted (localStorage) Learning Mode
                                # toggle, same SSR-hydration-safe pattern as
                                # useCheckersGame
```

In the `components/CheckersBoard/` block, adjust the existing comment to mention the new prop:

Find:
```
  CheckersBoard.tsx   # "dumb" 8x8 board -- never decides legality, renders
                       # whatever the caller computed (selectedSquare/
                       # legalTargets/mandatoryCaptureSquares/lastMove props).
```

Replace with:
```
  CheckersBoard.tsx   # "dumb" 8x8 board -- never decides legality, renders
                       # whatever the caller computed (selectedSquare/
                       # legalTargets/mandatoryCaptureSquares/lastMove/
                       # suggestedMove props).
```

Add a new block after `components/RulesModal/`:

```
components/LearningPanel/
  LearningPanel.tsx       # toggle + suggestion button/explanation -- "dumb"
                           # like CheckersBoard, doesn't know whose turn it
                           # is or whether the game ended (canRequestSuggestion
                           # is how the caller controls that)
```

- [ ] **Step 2: Add Conventions entries**

Append to the end of the `## Conventions` section:

```markdown
### Learning Mode's suggestion strength is a dedicated constant, not `dificil` itself

`lib/checkers/difficulty.ts`'s `SUGGESTION_ENGINE_OPTIONS` starts with the
exact same numbers as `DIFFICULTY_OPTIONS.dificil` (`maxDepth: 10,
timeBudgetMs: 1800, randomness: 0`) but is a separate exported constant.
This is deliberate: a future retuning of `dificil` for opponent-play-feel
reasons must never silently also change what a move suggestion recommends
-- "full-strength hint regardless of game difficulty" (spec §5) means
independent of *any* `Difficulty`, including whichever one currently
happens to share its numbers.

### Move-quality grading finally has a caller — and needs no new worker message

`lib/checkers/gradeMove.ts`'s `gradeMove()` is the first real consumer of
the `evaluate` worker message and `moveClassification.ts`'s
`evalLoss`/`classifyMove`, both built (but unused) in the AI-opponent
phase. It works by calling `evaluate(boardBeforeMove, moverColor,
GRADE_DEPTH)` and `evaluate(boardAfterMove, opponentColor, GRADE_DEPTH)` --
the SAME fixed `GRADE_DEPTH` for both, negating the second (per
`evaluate.ts`'s antisymmetry) to get the played move's value from the
mover's own perspective. `GRADE_DEPTH` (currently 8, in `gradeMove.ts`) is
its own constant, independent of both the opponent's configured
`Difficulty` and `SUGGESTION_ENGINE_OPTIONS` — this is what keeps the two
`evaluate()` calls comparable per CLAUDE.md's "Search scores are
mate-distance-relative and NOT normalized across searches" section: two
single-fixed-depth searches at the *same* depth are exactly the
comparable case that section anticipates, unlike comparing two different
`findBestMove` calls at whatever depth iterative deepening happened to
reach.

### Grading and suggestion failures are silent by design; the AI-move failure is not

`app/jogar/page.tsx` already had one engine-failure path before this phase
(`setEngineError`, surfaced in the `aria-live` status line) for when the
AI's own move request fails — that failure blocks play, so it must be
visible. Learning Mode's two new engine calls (`gradeMove` in the
post-move grading effect, `getBestMove` in `handleRequestSuggestion`) are
a nice-to-have overlay on top of a game that works fine without them, so
both `catch` blocks only `console.error` and return — no toast, no status
line change, no `setEngineError`. A player whose grading silently stops
working (engine error, or Learning Mode toggled off mid-flight) simply
sees no toast for that move and can keep playing uninterrupted.

### Vs-computer mode shares its engine with Learning Mode; local mode gets a second, independent one

`app/jogar/page.tsx`'s `getLearningEngine()` returns `engineRef.current`
when `isAiMode` is true (the same worker already running the opponent's
moves) and `learningEngineRef.current` otherwise (a second worker, created
lazily only while Learning Mode is on in a local two-player game).
Sharing in vs-computer mode is deliberate, not just an optimization:
`learningEngineRef`'s creation effect depends only on `[isAiMode,
learningModeEnabled]`, and `isAiMode` never changes during a game, so
toggling Learning Mode on/off in a vs-computer game never touches
`engineRef`'s lifecycle — an earlier design that instead made ONE engine
effect depend on `learningModeEnabled` even when `isAiMode` was true would
have recreated/terminated that engine on every toggle, and
`checkersEngineClient.ts`'s `terminate()` rejects every in-flight request —
silently cancelling an outstanding AI move request mid-think as a side
effect of the player flipping a Learning Mode switch. Local mode has no
such shared engine to protect, so it simply gets its own.

### A move suggestion is graded by nothing; a played move is graded by `gradeMove`

`moveExplanation.ts`'s `explainMove()` (what a move does) and
`describeMoveForToast()` (quality label + `explainMove()` + an optional
material-feel note) are separate exports on purpose: `/jogar`'s suggestion
handler calls `explainMove()` directly (a suggestion has no `MoveQuality`
or `evalLoss` of its own — it's *the* engine's own top pick, not something
being graded against it), while the post-move grading effect calls
`describeMoveForToast()`, which needs the `MoveQuality`/`loss` that
`gradeMove()` just computed.

### `moveExplanation.ts` is bilingual from day one — a deliberate, narrow exception

Unlike `gameEndMessage.ts`/`RulesModal.tsx` (hardcoded Portuguese, i18n
deferred to Phase 8), `lib/checkers/moveExplanation.ts` takes an explicit
`Locale` (`'pt' | 'en'`) parameter and has both phrase sets written now,
per spec §5's explicit call-out that this module (unlike Chess Sensei's
retrofitted `lib/chess/moveExplanation.ts`) should never need a bilingual
retrofit later. Every call site built in this phase (`app/jogar/page.tsx`)
still hardcodes `locale: 'pt'` — there is no UI locale toggle anywhere in
the app yet. Revisit call sites once Phase 8 introduces one.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: close out Learning Mode phase in CLAUDE.md

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012unWkJVCeZ9vhPex9faUSd"
git push origin main
```

---

## Plan self-review notes

- **Spec coverage**: legal-move/mandatory-capture highlighting (already built, unchanged by this plan, confirmed against current `app/jogar/page.tsx`/`CheckersBoard.tsx`), move suggestion (Tasks 1, 6, 7), last-move-quality toast (Tasks 2, 3, 6, 7), `moveExplanation.ts` (Task 3), `Toast`/`ToastProvider` reuse (Task 7, no changes to those components needed — `useToast()`'s existing `show(message, tone)` signature already fits). Not covered by this plan, deliberately deferred per spec §13's phasing: `RulesModal`'s content already covers movement/mandatory-capture/multi-jump/promotion/draws (built in the toast-modal-chrome phase, not touched here) — nothing in spec §5's Learning Mode section depends on further `RulesModal` changes.
- **Placeholder scan**: no TBD/TODO; every step has real code, not a description of code.
- **Type consistency**: `MoveGrade { quality: MoveQuality; loss: number }` (Task 2) flows unchanged into `DescribeMoveForToastParams extends ExplainMoveParams { quality: MoveQuality; loss: number }` (Task 3) and the grading effect's `describeMoveForToast(...)` call (Task 7) — same field names throughout. `LearningPanelProps` (Task 6) matches exactly how `app/jogar/page.tsx` calls `<LearningPanel .../>` in Task 7, including the plan-specific `canRequestSuggestion` addition (documented as a deliberate deviation from spec §5's literal prop list in both Task 6's write-up and CLAUDE.md).
- **Engine-lifecycle correctness**: the vs-computer/local-mode engine-sharing design (Task 7 Step 2) was chosen specifically to avoid a scenario this plan's self-review caught while drafting — an engine effect keyed on `learningModeEnabled` alone would terminate (and thus reject every in-flight request on) the SAME engine instance the AI-move effect depends on, if that effect ever shared `engineRef`. Keeping `learningEngineRef` entirely separate from `engineRef`, with `engineRef`'s own effect untouched by `learningModeEnabled`, avoids this without needing any cross-effect coordination.
