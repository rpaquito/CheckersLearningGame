# Openings & Traps Trainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 7 of the design spec's build phasing (§13): the openings/traps trainer — `lib/openings/` (data + replay engine, 8 real-named checkers openings, every move validated against the actual rules engine), `/aprender/aberturas` (list), `/aprender/aberturas/[id]` (study mode — step through a line with explanations), `/aprender/aberturas/[id]/praticar` (practice mode — play the line yourself against an auto-playing opponent).

**Architecture:** `lib/openings/types.ts` defines the data shape (`Opening`/`OpeningLine`/`OpeningMove`) per design spec §6, using checkers' own numeric notation (`"11-15"`) instead of chess's SAN. `lib/openings/replayLine.ts` replays a line from the initial position through the real rules engine (`allLegalMoves`/`applyMove` from `lib/checkers/moveGeneration.ts`) — this is both how the study/practice UI gets its board states and the safety net that guarantees every line in `lib/openings/data.ts` is actually legal (`data.test.ts` replays every real line). `OpeningStudy`/`OpeningPractice`/`LineTabs`/`OpeningPageHeader` are ported from Chess Sensei, adapted to checkers' `Board`/`Square`/`CheckersBoard` instead of chess.js/FEN/`ChessBoard`, and — matching every prior phase's convention — stripped of `useTranslation()`/i18n (hardcoded Portuguese; no i18n system exists until Phase 8).

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest + Testing Library, Tailwind v4 — identical to every prior phase in this repo.

**Spec:** `docs/superpowers/specs/2026-08-31-checkers-sensei-design.md` §6 ("Openings/traps trainer"), §13 (phase 7). Two deliberate, user-confirmed deviations from the spec's literal suggestions, both explained in Global Constraints below: 8 openings (the low end of the spec's "8-12" range, not 12) and a single main line per opening (no named variations, unlike the spec's "main line + 1-2 variations") — both a scope reduction made explicitly to bound the effort of hand-authoring checkers opening content, confirmed with the user before writing this plan.

## Global Constraints

- No worktrees, no feature branches. Commit each task's changes directly to
  `main` and push (`git push origin main`) once its tests pass, before
  starting the next task — never batch multiple tasks into one unpushed
  commit (CLAUDE.md §Process rules).
- Portuguese-only in every UI string outside `lib/openings/data.ts`'s own
  bilingual content (hardcoded, no i18n system exists until Phase 8) — same
  convention every prior phase has followed. `lib/openings/data.ts` itself
  IS bilingual from day one (`Record<Locale, string>` per move/line/opening),
  per design spec §6's explicit instruction, but every UI call site in this
  plan hardcodes reading the `.pt` half only — there is no locale toggle
  anywhere in the app yet, matching `lib/checkers/moveExplanation.ts`'s own
  precedent from the Learning Mode phase.
- **`Locale` is defined locally in `lib/openings/types.ts`** (`'pt' | 'en'`),
  not imported from `lib/checkers/moveExplanation.ts` or
  `lib/settings/settings.ts` (both of which already declare an identical,
  independently-defined `Locale`) — matching this repo's established
  pattern (see CLAUDE.md) of keeping these modules decoupled until Phase 8
  folds them into a shared `lib/i18n/types.ts`.
- **Module location: `lib/openings/`** (top-level, sibling to `lib/checkers/`
  and `lib/settings/`), mirroring Chess Sensei's own `lib/openings/` path
  exactly — not nested inside `lib/checkers/`. This is the choice the spec
  asked to be made and documented (§6: "pick one during implementation").
- **8 openings, not 12; one line per opening, no named variations.** The
  design spec suggests 8-12 openings with "a main line + 1-2 named
  variations" each. This plan builds 8 openings (the spec's own candidate
  list has 13 names; this plan uses `old-fourteenth`, `single-corner`,
  `defiance`, `alma`, `cross`, `switcher`, `double-corner`,
  `laird-and-lady`) with exactly one line each. This was a deliberate,
  user-confirmed scope reduction: hand-authoring accurate, engine-validated
  checkers opening theory at the "informational, not tournament-verified"
  rigor the spec itself allows (§6: "the *classification/name* of an
  opening is informational rather than tournament-verified") is real
  content work: this plan hand-derives real theory for each opening's
  *first move* (checkers openings are genuinely classified primarily by
  which of Black's 7 legal opening moves is played — a documented fact of
  real checkers theory, already asserted as a test in
  `moveGeneration.test.ts`) and each opening's *defining second move* (the
  reply that gives the named system its character), each verified safe
  (no forced capture) by hand during planning; the remaining 4 moves per
  line use a generic, structurally-safe "develop a second piece, fill the
  gap left behind" pattern rather than reproducing exact textbook
  continuations from memory. Extending to more openings or more
  variations per opening is real, well-scoped future content work — not
  attempted here.
- **Every line in `lib/openings/data.ts` MUST pass `data.test.ts`'s
  legality check before that task is considered done.** The moves given in
  this plan for each opening were hand-derived and spot-checked for safety
  during planning, but were NOT run through the real engine — that is
  exactly `data.test.ts`'s job, and it is normal, expected work for Task 2
  to discover that one or more of a line's later moves (typically move 5
  or 6 — the generic development moves, not the two theory-verified
  opening moves) needs adjusting to a different legal target square for
  that same piece. This is NOT a signal to escalate/report BLOCKED — fix
  the specific failing move (pick a different legal destination for the
  same piece, staying as close as possible to the original intent: a
  "develop toward the center" move stays a "develop toward the center"
  move) and re-run the test until every line replays cleanly. Only escalate
  if a fix genuinely cannot be found after a few attempts.
- `Opening`/`OpeningLine`/`OpeningMove` have **no `eco` field** — American
  checkers has no ECO-equivalent universal classification code (per spec
  §6, this is a deliberate difference from the chess twin's data shape,
  not an oversight).
- `OpeningPractice`'s protagonist is **always black** — unlike chess (which
  splits systems into White openings and Black defenses,
  `protagonistColorFor` branching on the opening's `id` prefix), every
  checkers opening in this plan is defined by Black's own first move (the
  side that always moves first in checkers), so there is no
  White/Black-system split to model. Do not port chess's
  `protagonistColorFor` function — it has no checkers equivalent.
- `CheckersBoard` has no `orientation`/board-flip prop (unlike chess's
  `ChessBoard`) — don't try to add or use one; render the board exactly as
  `CheckersBoard` already does today, matching every other consumer of it
  in this repo.
- `OpeningStudy`/`OpeningPractice` do **not** pass `boardTheme`/`pieceStyle`
  props to `CheckersBoard` — matching `/jogar`'s own current, documented,
  still-unwired state (CLAUDE.md: `CheckersBoard`'s theme props exist and
  are tested since Phase 5, but no page wires real `Settings` values into
  them yet). This plan doesn't change that.

---

## Task 1: `lib/openings/types.ts` + `lib/openings/replayLine.ts`

**Files:**
- Create: `lib/openings/types.ts`
- Create: `lib/openings/replayLine.ts`
- Test: `lib/openings/replayLine.test.ts`

**Interfaces:**
- Produces: `Locale`, `OpeningMove { notation, explanation }`, `OpeningLine
  { name, moves }`, `Opening { id, name, description, lines }` (types.ts);
  `replayLine(line: OpeningLine): ReplayedMove[]`, `ReplayedMove { board,
  move, notation, explanation }` (replayLine.ts). Consumed by Task 2's test,
  Task 6 (`OpeningStudy`), Task 7 (`OpeningPractice`).

- [ ] **Step 1: Write the test**

```ts
import { describe, expect, it } from 'vitest';
import { replayLine } from './replayLine';
import type { OpeningLine } from './types';

describe('replayLine', () => {
  it('replays a short line move by move, returning board/move/notation/explanation', () => {
    const line: OpeningLine = {
      name: { pt: 'Linha de teste', en: 'Test line' },
      moves: [
        { notation: '11-15', explanation: { pt: 'Ocupa o centro.', en: 'Occupies the center.' } },
        { notation: '23-19', explanation: { pt: 'Resposta simétrica.', en: 'Symmetric reply.' } },
      ],
    };

    const result = replayLine(line);

    expect(result).toHaveLength(2);
    expect(result[0].notation).toBe('11-15');
    expect(result[0].move).toEqual({ from: 11, to: 15, captures: [], promotes: false });
    expect(result[0].explanation).toEqual({ pt: 'Ocupa o centro.', en: 'Occupies the center.' });
    expect(result[0].board[14]).toEqual({ color: 'b', kind: 'man' }); // square 15, index 14
    expect(result[0].board[10]).toBeNull(); // square 11, now vacated

    expect(result[1].notation).toBe('23-19');
    expect(result[1].move).toEqual({ from: 23, to: 19, captures: [], promotes: false });
    expect(result[1].board[18]).toEqual({ color: 'w', kind: 'man' }); // square 19
  });

  it('throws a descriptive error for an illegal move', () => {
    const line: OpeningLine = {
      name: { pt: 'Linha inválida', en: 'Invalid line' },
      moves: [{ notation: '11-20', explanation: { pt: 'Lance impossível.', en: 'Impossible move.' } }],
    };

    expect(() => replayLine(line)).toThrow(/11-20/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- replayLine.test.ts`
Expected: FAIL — `./replayLine` doesn't exist yet.

- [ ] **Step 3: Write `lib/openings/types.ts`**

```ts
/**
 * Defined locally rather than imported from lib/checkers/moveExplanation.ts
 * or lib/settings/settings.ts (both already declare an identical Locale) --
 * see CLAUDE.md: none of these modules should depend on each other just
 * for this type. All three fold into a shared lib/i18n/types.ts in Phase 8.
 */
export type Locale = 'pt' | 'en';

/**
 * A single move of an opening line: checkers' own numeric notation
 * ("11-15", squares 1-32 per lib/checkers/board.ts) plus a hand-written
 * explanation in both locales. No SAN, no capture ("x") notation -- a
 * plain from-to hyphenated pair is enough to identify the intended move
 * among a position's legal moves (see replayLine.ts).
 */
export interface OpeningMove {
  notation: string;
  explanation: Record<Locale, string>;
}

/**
 * A complete, independent line from move 1 -- the main line of an
 * opening (this plan builds exactly one line per opening; no named
 * variations, see CLAUDE.md/this plan's Global Constraints for why).
 */
export interface OpeningLine {
  name: Record<Locale, string>;
  moves: OpeningMove[];
}

export interface Opening {
  /** kebab-case slug, stable -- used as a route segment. */
  id: string;
  name: Record<Locale, string>;
  /** 1-2 sentences, for the /aprender/aberturas list. */
  description: Record<Locale, string>;
  lines: OpeningLine[];
}
```

- [ ] **Step 4: Write `lib/openings/replayLine.ts`**

```ts
import type { Board, CheckersMove, Color, Square } from '@/lib/checkers/types';
import { createInitialBoard } from '@/lib/checkers/board';
import { allLegalMoves, applyMove } from '@/lib/checkers/moveGeneration';
import type { Locale, OpeningLine } from './types';

export interface ReplayedMove {
  board: Board;
  move: CheckersMove;
  notation: string;
  explanation: Record<Locale, string>;
}

function parseSquares(notation: string): { from: Square; to: Square } {
  const [fromStr, toStr] = notation.split('-');
  return { from: Number(fromStr), to: Number(toStr) };
}

/**
 * Replays an opening line from the initial position, move by move,
 * alternating turn starting with black (checkers' side to move first --
 * see lib/checkers/board.ts's numbering convention and CLAUDE.md). Both
 * the study mode (draw the board + show the explanation) and the practice
 * mode (compare the user's move against the expected {from,to}) consume
 * this, so neither has to reimplement line replay.
 *
 * Matches a move's notation against the position's actual legal moves
 * (`allLegalMoves`) by from/to only -- no capture ("x") notation needed,
 * since an opening's early moves practically never hit the documented,
 * rare from/to-ambiguous-capture-chain case (see CLAUDE.md's
 * useCheckersGame.ts conventions).
 *
 * Throws a descriptive error if any notation is illegal in the position
 * it's played in -- should never happen in production (data.test.ts
 * validates every real line in OPENINGS), but is a clear safety net for
 * badly-written content.
 */
export function replayLine(line: OpeningLine): ReplayedMove[] {
  let board: Board = createInitialBoard();
  let turn: Color = 'b';
  const result: ReplayedMove[] = [];

  for (const { notation, explanation } of line.moves) {
    const { from, to } = parseSquares(notation);
    const move = allLegalMoves(board, turn).find((m) => m.from === from && m.to === to);

    if (!move) {
      throw new Error(`Illegal move "${notation}" in line "${line.name.pt}" (turn: ${turn})`);
    }

    board = applyMove(board, move);
    result.push({ board, move, notation, explanation });
    turn = turn === 'b' ? 'w' : 'b';
  }

  return result;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- replayLine.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/openings/types.ts lib/openings/replayLine.ts lib/openings/replayLine.test.ts
git commit -m "feat(openings): types + replayLine -- engine-backed opening-line replay

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 2: `lib/openings/data.ts` — 8 named openings

**Files:**
- Create: `lib/openings/data.ts`
- Test: `lib/openings/data.test.ts`

**Interfaces:**
- Produces: `OPENINGS: Opening[]` (8 entries). Consumed by Task 6
  (`OpeningStudy`), Task 7 (`OpeningPractice`), Task 8 (`/aprender/
  aberturas` list), Task 9 (`[id]` and `[id]/praticar` routes).

**Read this task's note in Global Constraints above before starting** — a
test failure here (an illegal move in one of the 8 lines below) is
expected, normal work, not a blocker.

- [ ] **Step 1: Write the test**

```ts
import { describe, expect, it } from 'vitest';
import { OPENINGS } from './data';
import { replayLine } from './replayLine';

const LOCALES = ['pt', 'en'] as const;

describe('OPENINGS', () => {
  it('has exactly 8 openings', () => {
    expect(OPENINGS).toHaveLength(8);
  });

  it('has unique kebab-case ids', () => {
    const ids = OPENINGS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });

  it('gives every opening a non-empty name and description in both locales', () => {
    for (const opening of OPENINGS) {
      for (const locale of LOCALES) {
        expect(opening.name[locale].length).toBeGreaterThan(0);
        expect(opening.description[locale].length).toBeGreaterThan(0);
      }
    }
  });

  it('gives every opening exactly one line, with 6 moves and a name in both locales', () => {
    for (const opening of OPENINGS) {
      expect(opening.lines).toHaveLength(1);
      const line = opening.lines[0];
      for (const locale of LOCALES) {
        expect(line.name[locale].length).toBeGreaterThan(0);
      }
      expect(line.moves).toHaveLength(6);
      for (const move of line.moves) {
        expect(move.notation).toMatch(/^\d{1,2}-\d{1,2}$/);
        for (const locale of LOCALES) {
          expect(move.explanation[locale].length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('has a genuinely translated (not duplicated) English explanation for every move', () => {
    for (const opening of OPENINGS) {
      for (const line of opening.lines) {
        for (const move of line.moves) {
          expect(move.explanation.en).not.toBe(move.explanation.pt);
        }
      }
    }
  });

  it('has a genuinely different English name/description for every opening', () => {
    for (const opening of OPENINGS) {
      expect(opening.name.en).not.toBe(opening.name.pt);
      expect(opening.description.en).not.toBe(opening.description.pt);
    }
  });

  it('validates every real line as legal against the actual rules engine', () => {
    for (const opening of OPENINGS) {
      for (const line of opening.lines) {
        expect(() => replayLine(line)).not.toThrow();
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/openings/data.test.ts`
Expected: FAIL — `./data` doesn't exist yet.

- [ ] **Step 3: Write `lib/openings/data.ts`**

```ts
import type { Opening } from './types';

export const OPENINGS: Opening[] = [
  {
    id: 'old-fourteenth',
    name: { pt: 'Old Fourteenth', en: 'Old Fourteenth' },
    description: {
      pt: 'Uma das respostas mais estudadas ao movimento de abertura mais popular do jogo (11-15), levando a uma luta equilibrada pelo centro.',
      en: "One of the most studied replies to the game's most popular opening move (11-15), leading to a balanced fight for the center.",
    },
    lines: [
      {
        name: { pt: 'Linha principal', en: 'Main line' },
        moves: [
          { notation: '11-15', explanation: { pt: 'A jogada de abertura mais popular do jogo: ocupa logo a diagonal central.', en: "The game's most popular opening move: occupies the central diagonal right away." } },
          { notation: '23-19', explanation: { pt: 'A resposta que dá nome a esta linha, disputando o centro pelo lado oposto.', en: "The reply that gives this line its name, contesting the center from the opposite side." } },
          { notation: '7-11', explanation: { pt: 'Preenche a casa que a primeira peça deixou livre, mantendo a retaguarda coesa.', en: 'Fills the square the first piece left behind, keeping the back ranks cohesive.' } },
          { notation: '26-23', explanation: { pt: 'O branco faz o mesmo: reocupa o espaço deixado pela peça que avançou.', en: 'White does the same: refills the space left by the piece that advanced.' } },
          { notation: '9-13', explanation: { pt: 'Desenvolve uma segunda peça em direção ao centro, ampliando a presença nessa zona.', en: 'Develops a second piece toward the center, extending the presence there.' } },
          { notation: '24-20', explanation: { pt: 'Resposta simétrica, completando o desenvolvimento inicial de ambos os lados.', en: "A symmetric reply, rounding out both sides' initial development." } },
        ],
      },
    ],
  },
  {
    id: 'single-corner',
    name: { pt: 'Single Corner', en: 'Single Corner' },
    description: {
      pt: 'Também nasce de 11-15, mas a resposta branca evita o contacto direto no centro, preferindo desenvolver pelo lado do canto simples.',
      en: 'Also starts from 11-15, but White replies away from direct central contact, developing instead on the single-corner side.',
    },
    lines: [
      {
        name: { pt: 'Linha principal', en: 'Main line' },
        moves: [
          { notation: '11-15', explanation: { pt: 'A jogada de abertura mais popular do jogo: ocupa logo a diagonal central.', en: "The game's most popular opening move: occupies the central diagonal right away." } },
          { notation: '21-17', explanation: { pt: 'Em vez de disputar o centro de imediato, o branco desenvolve pelo lado do canto simples.', en: "Instead of contesting the center right away, White develops on the single-corner side." } },
          { notation: '7-11', explanation: { pt: 'Preenche a casa que a primeira peça deixou livre, mantendo a retaguarda coesa.', en: 'Fills the square the first piece left behind, keeping the back ranks cohesive.' } },
          { notation: '25-21', explanation: { pt: 'O branco faz o mesmo, reocupando o espaço junto ao canto.', en: 'White does the same, refilling the space near the corner.' } },
          { notation: '9-13', explanation: { pt: 'Desenvolve uma segunda peça em direção ao centro.', en: 'Develops a second piece toward the center.' } },
          { notation: '24-20', explanation: { pt: 'O branco desenvolve pelo outro flanco, equilibrando a posição.', en: 'White develops on the other flank, balancing the position.' } },
        ],
      },
    ],
  },
  {
    id: 'defiance',
    name: { pt: 'Defiance', en: 'Defiance' },
    description: {
      pt: 'Um sistema mais agressivo para as pretas, que ocupa cedo a coluna central esquerda em vez da clássica 11-15.',
      en: 'A more aggressive system for Black, occupying the left-center column early instead of the classic 11-15.',
    },
    lines: [
      {
        name: { pt: 'Linha principal', en: 'Main line' },
        moves: [
          { notation: '9-14', explanation: { pt: 'Ocupa cedo a coluna central esquerda, um plano mais direto do que 11-15.', en: 'Occupies the left-center column early, a more direct plan than 11-15.' } },
          { notation: '24-20', explanation: { pt: 'O branco desenvolve pelo flanco direito, evitando contacto imediato.', en: "White develops on the right flank, avoiding immediate contact." } },
          { notation: '5-9', explanation: { pt: 'Preenche a casa que a primeira peça deixou livre, mantendo a retaguarda coesa.', en: 'Fills the square the first piece left behind, keeping the back ranks cohesive.' } },
          { notation: '27-24', explanation: { pt: 'O branco faz o mesmo, reocupando o espaço deixado pela peça que avançou.', en: 'White does the same, refilling the space left by the piece that advanced.' } },
          { notation: '11-16', explanation: { pt: 'Desenvolve uma segunda peça, alargando a presença no centro-direita.', en: 'Develops a second piece, extending the presence toward the center-right.' } },
          { notation: '22-18', explanation: { pt: 'O branco responde no centro, equilibrando o desenvolvimento.', en: 'White replies in the center, balancing development.' } },
        ],
      },
    ],
  },
  {
    id: 'alma',
    name: { pt: 'Alma', en: 'Alma' },
    description: {
      pt: 'Preta abre pelo lado do canto duplo com 9-13, construindo uma estrutura sólida e paciente.',
      en: 'Black opens on the double-corner side with 9-13, building a solid, patient structure.',
    },
    lines: [
      {
        name: { pt: 'Linha principal', en: 'Main line' },
        moves: [
          { notation: '9-13', explanation: { pt: 'Abre pelo lado do canto duplo, uma das sete jogadas de abertura legais.', en: "Opens on the double-corner side, one of the seven legal opening moves." } },
          { notation: '23-18', explanation: { pt: 'O branco desenvolve pelo centro, sem entrar em contacto direto.', en: 'White develops through the center, without direct contact.' } },
          { notation: '5-9', explanation: { pt: 'Preenche a casa que a primeira peça deixou livre, mantendo a retaguarda coesa.', en: 'Fills the square the first piece left behind, keeping the back ranks cohesive.' } },
          { notation: '27-23', explanation: { pt: 'O branco faz o mesmo, reocupando o espaço deixado pela peça que avançou.', en: 'White does the same, refilling the space left by the piece that advanced.' } },
          { notation: '10-14', explanation: { pt: 'Desenvolve uma segunda peça em direção ao centro.', en: 'Develops a second piece toward the center.' } },
          { notation: '22-17', explanation: { pt: 'O branco desenvolve pelo lado do canto simples, completando o quadro inicial.', en: "White develops on the single-corner side, rounding out the initial picture." } },
        ],
      },
    ],
  },
  {
    id: 'cross',
    name: { pt: 'Cross', en: 'Cross' },
    description: {
      pt: 'O movimento 10-14 cria uma disposição em cruz no centro do tabuleiro, dando nome à abertura.',
      en: 'The move 10-14 creates a cross-shaped arrangement in the center of the board, giving the opening its name.',
    },
    lines: [
      {
        name: { pt: 'Linha principal', en: 'Main line' },
        moves: [
          { notation: '10-14', explanation: { pt: 'Cria uma disposição em cruz no centro, dando nome a esta abertura.', en: 'Creates a cross-shaped arrangement in the center, giving this opening its name.' } },
          { notation: '23-19', explanation: { pt: 'O branco disputa o centro pelo lado oposto.', en: 'White contests the center from the opposite side.' } },
          { notation: '6-10', explanation: { pt: 'Preenche a casa que a primeira peça deixou livre, mantendo a retaguarda coesa.', en: 'Fills the square the first piece left behind, keeping the back ranks cohesive.' } },
          { notation: '26-23', explanation: { pt: 'O branco faz o mesmo, reocupando o espaço deixado pela peça que avançou.', en: 'White does the same, refilling the space left by the piece that advanced.' } },
          { notation: '12-16', explanation: { pt: 'Desenvolve uma segunda peça pelo flanco direito.', en: 'Develops a second piece on the right flank.' } },
          { notation: '21-17', explanation: { pt: 'O branco desenvolve pelo canto simples, equilibrando a posição.', en: 'White develops on the single-corner side, balancing the position.' } },
        ],
      },
    ],
  },
  {
    id: 'switcher',
    name: { pt: 'Switcher', en: 'Switcher' },
    description: {
      pt: 'Preta troca a diagonal habitual com 10-15, alternando o padrão de desenvolvimento mais comum.',
      en: 'Black switches the usual diagonal with 10-15, alternating away from the most common development pattern.',
    },
    lines: [
      {
        name: { pt: 'Linha principal', en: 'Main line' },
        moves: [
          { notation: '10-15', explanation: { pt: 'Troca a diagonal habitual, alternando o padrão de desenvolvimento mais comum.', en: 'Switches the usual diagonal, alternating away from the most common development pattern.' } },
          { notation: '22-17', explanation: { pt: 'O branco desenvolve pelo canto simples, sem contacto direto.', en: 'White develops on the single-corner side, without direct contact.' } },
          { notation: '6-10', explanation: { pt: 'Preenche a casa que a primeira peça deixou livre, mantendo a retaguarda coesa.', en: 'Fills the square the first piece left behind, keeping the back ranks cohesive.' } },
          { notation: '25-22', explanation: { pt: 'O branco faz o mesmo, reocupando o espaço junto ao canto.', en: 'White does the same, refilling the space near the corner.' } },
          { notation: '9-13', explanation: { pt: 'Desenvolve uma segunda peça pelo lado do canto duplo.', en: 'Develops a second piece on the double-corner side.' } },
          { notation: '24-19', explanation: { pt: 'O branco desenvolve pelo centro-direita, completando o quadro inicial.', en: "White develops toward the center-right, rounding out the initial picture." } },
        ],
      },
    ],
  },
  {
    id: 'double-corner',
    name: { pt: 'Double Corner', en: 'Double Corner' },
    description: {
      pt: 'Preta avança para o lado do canto duplo com 11-16, preparando uma estrutura defensiva sólida nesse flanco.',
      en: 'Black advances toward the double-corner side with 11-16, preparing a solid defensive structure on that flank.',
    },
    lines: [
      {
        name: { pt: 'Linha principal', en: 'Main line' },
        moves: [
          { notation: '11-16', explanation: { pt: 'Avança para o lado do canto duplo, preparando uma estrutura defensiva sólida.', en: 'Advances toward the double-corner side, preparing a solid defensive structure.' } },
          { notation: '22-18', explanation: { pt: 'O branco desenvolve pelo centro, sem entrar em contacto direto.', en: 'White develops through the center, without direct contact.' } },
          { notation: '7-11', explanation: { pt: 'Preenche a casa que a primeira peça deixou livre, mantendo a retaguarda coesa.', en: 'Fills the square the first piece left behind, keeping the back ranks cohesive.' } },
          { notation: '26-22', explanation: { pt: 'O branco faz o mesmo, reocupando o espaço deixado pela peça que avançou.', en: 'White does the same, refilling the space left by the piece that advanced.' } },
          { notation: '9-13', explanation: { pt: 'Desenvolve uma segunda peça pelo lado do canto duplo.', en: 'Develops a second piece on the double-corner side.' } },
          { notation: '24-19', explanation: { pt: 'O branco desenvolve pelo centro-direita, completando o quadro inicial.', en: "White develops toward the center-right, rounding out the initial picture." } },
        ],
      },
    ],
  },
  {
    id: 'laird-and-lady',
    name: { pt: 'Laird and Lady', en: 'Laird and Lady' },
    description: {
      pt: 'Uma abertura clássica que começa com 12-16, uma das sete jogadas de abertura legais mais raramente vista nas outras aberturas desta lista.',
      en: 'A classic opening starting with 12-16, one of the seven legal opening moves rarely seen among the other openings in this list.',
    },
    lines: [
      {
        name: { pt: 'Linha principal', en: 'Main line' },
        moves: [
          { notation: '12-16', explanation: { pt: 'Uma das sete jogadas de abertura legais, pouco vista nas outras aberturas desta lista.', en: 'One of the seven legal opening moves, rarely seen among the other openings in this list.' } },
          { notation: '23-18', explanation: { pt: 'O branco desenvolve pelo centro, sem entrar em contacto direto.', en: 'White develops through the center, without direct contact.' } },
          { notation: '8-12', explanation: { pt: 'Preenche a casa que a primeira peça deixou livre, mantendo a retaguarda coesa.', en: 'Fills the square the first piece left behind, keeping the back ranks cohesive.' } },
          { notation: '27-23', explanation: { pt: 'O branco faz o mesmo, reocupando o espaço deixado pela peça que avançou.', en: 'White does the same, refilling the space left by the piece that advanced.' } },
          { notation: '9-13', explanation: { pt: 'Desenvolve uma segunda peça pelo lado do canto duplo.', en: 'Develops a second piece on the double-corner side.' } },
          { notation: '21-17', explanation: { pt: 'O branco desenvolve pelo canto simples, completando o quadro inicial.', en: "White develops on the single-corner side, rounding out the initial picture." } },
        ],
      },
    ],
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/openings/data.test.ts`
Expected: PASS (7 tests). **If "validates every real line as legal" fails**,
read the error — it names the exact illegal `notation` and which opening's
line it's in. Fix ONLY that move: pick a different legal destination
square for the same piece (check `lib/checkers/board.ts`'s
`squareToRowCol`/`rowColToSquare` to reason about which squares are
adjacent, or just try the piece's other legal direction if it has one),
update both `data.ts` (the `notation`) and, if the explanation text
specifically named the old square, its `explanation` strings too. Re-run.
Repeat until all 8 lines pass. This is expected work for this task, not a
sign anything else is wrong — see this plan's Global Constraints.

- [ ] **Step 5: Commit**

```bash
git add lib/openings/data.ts lib/openings/data.test.ts
git commit -m "feat(openings): 8 named checkers openings, engine-validated

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 3: `NavCard` gains an optional `meta` prop

**Files:**
- Modify: `components/NavCard/NavCard.tsx`

**Interfaces:**
- Produces: `NavCard` gains an optional `meta?: string` third line.
  Consumed by Task 8 (`/aprender/aberturas` list, showing each opening's
  line name as `meta`).

Phase 6 built `NavCard` explicitly WITHOUT `meta`, noting in its own doc
comment: "add it back if/when a later phase needs it." This is that phase.
No new test — `NavCard` has never had one (Phase 6's own precedent), and
this is a small, additive, optional prop.

- [ ] **Step 1: Read the current file, then add the prop**

Read `components/NavCard/NavCard.tsx` first. Add an optional `meta?:
string` parameter to the props destructuring and type, and render it as a
third `<p>` when present:

```tsx
import Link from 'next/link';

/**
 * Link card "title + description [+ meta]" -- the hub's tile shell.
 * `meta` was deliberately omitted when this component was first built
 * (Phase 6, Tutorial Hub) since nothing needed it yet; the openings list
 * (Phase 7) is the first real consumer, showing each opening's line name.
 */
export function NavCard({
  href,
  title,
  description,
  meta,
}: {
  href: string;
  title: string;
  description: string;
  meta?: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border-2 border-purple/40 bg-ink-soft p-4 transition-colors hover:border-cyan"
    >
      <p className="font-semibold text-white">{title}</p>
      <p className="text-sm text-lilac/80">{description}</p>
      {meta && <p className="text-xs text-lilac/60 mt-1">{meta}</p>}
    </Link>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm test && npm run build`
Expected: full suite still passes (Task 4 of the Tutorial Hub plan's hub
page renders `NavCard` without `meta` — must keep working unchanged since
the prop is optional), build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/NavCard/NavCard.tsx
git commit -m "feat(ui): NavCard -- add back the optional meta line for Phase 7

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 4: `LineTabs` component

**Files:**
- Create: `components/LineTabs/LineTabs.tsx`

**Interfaces:**
- Produces: `LineTabs({ lines, activeIndex, onSelect, children })`.
  Consumed by Task 6 (`OpeningStudy`), Task 7 (`OpeningPractice`).

Ported from Chess Sensei's `LineTabs.tsx` (a game-agnostic tablist —
`lines: { name: string }[]` never touches chess or checkers types) with
`useTranslation()` stripped (hardcoded `aria-label`). No dedicated test for
this task — its keyboard/ARIA-tab behavior is exercised end-to-end through
Task 6/7's own tests (which click tabs and check `role="tab"` state), this
plan's own deliberate reduction in scope (documented above).

- [ ] **Step 1: Write the implementation**

```tsx
'use client';

import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { ACTIVE_TOGGLE_STYLE } from '@/lib/ui/activeToggleStyle';

/**
 * Tablist shared by OpeningStudy and OpeningPractice. Owns the
 * `role="tabpanel"` wrapping `children`: the passed content (board +
 * controls + explanation) IS the panel for the selected line, so it lives
 * inside this component instead of each consumer repeating the
 * id/aria-labelledby wiring itself.
 *
 * ARIA APG "tabs" pattern with automatic activation: moving focus with
 * the arrow keys already selects the line (no Enter/Space needed after),
 * roving `tabIndex` (only the active tab is Tab-reachable, arrows jump
 * between the others).
 */
export function LineTabs({
  lines,
  activeIndex,
  onSelect,
  children,
}: {
  lines: { name: string }[];
  activeIndex: number;
  onSelect: (index: number) => void;
  children: ReactNode;
}) {
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function focusAndSelect(index: number) {
    onSelect(index);
    tabRefs.current[index]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (index + 1) % lines.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (index - 1 + lines.length) % lines.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = lines.length - 1;
    }
    if (nextIndex === null) return;
    event.preventDefault();
    focusAndSelect(nextIndex);
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 justify-start" role="tablist" aria-label="Linhas desta abertura">
        {lines.map((line, index) => (
          <button
            key={index}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            id={`${baseId}-tab-${index}`}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            aria-controls={`${baseId}-panel`}
            tabIndex={index === activeIndex ? 0 : -1}
            onClick={() => focusAndSelect(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            style={index === activeIndex ? ACTIVE_TOGGLE_STYLE : undefined}
            className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-transform hover:scale-[1.02] ${
              index === activeIndex ? 'border-transparent shadow-[3px_3px_0_rgba(0,0,0,0.35)]' : 'border-purple/40 text-lilac'
            }`}
          >
            {line.name}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${activeIndex}`}
        tabIndex={-1}
        className="contents"
      >
        {children}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add components/LineTabs/
git commit -m "feat(ui): LineTabs -- ARIA tablist for opening lines

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 5: `OpeningPageHeader` component

**Files:**
- Create: `components/OpeningPageHeader/OpeningPageHeader.tsx`

**Interfaces:**
- Produces: `OpeningPageHeader({ opening, variant: 'study' | 'practice'
  })`. Consumed by Task 9 (both `[id]` route pages).

Ported from Chess Sensei's version (extracted from the page component
itself because `generateStaticParams`-exporting page files can't be
`'use client'`), `useTranslation()` stripped for hardcoded Portuguese and
`opening.name.pt`/`opening.description.pt` (hardcoded locale, matching
every other call site in this plan). No dedicated test — matches the
sibling repo's own precedent of no test for this small header component,
same deliberate reduction as Task 4.

- [ ] **Step 1: Write the implementation**

```tsx
'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { PageHeader } from '@/components/PageChrome/PageChrome';
import type { Opening } from '@/lib/openings/types';

export function OpeningPageHeader({ opening, variant }: { opening: Opening; variant: 'study' | 'practice' }) {
  const name = opening.name.pt.toUpperCase();
  const title = variant === 'practice' ? `Praticar: ${name}` : name;

  return (
    <div>
      <PageHeader>{title}</PageHeader>
      {variant === 'study' ? (
        <>
          <p className="mt-2 text-lilac/80">{opening.description.pt}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <ChipButton color="purple" href="/aprender/aberturas">
              Voltar às aberturas
            </ChipButton>
            <ChipButton color="gold" href={`/aprender/aberturas/${opening.id}/praticar`}>
              Praticar esta abertura
            </ChipButton>
          </div>
        </>
      ) : (
        <p className="mt-3">
          <ChipButton color="purple" href={`/aprender/aberturas/${opening.id}`}>
            Voltar ao estudo
          </ChipButton>
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add components/OpeningPageHeader/
git commit -m "feat(ui): OpeningPageHeader -- study/practice page header

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 6: `OpeningStudy` component

**Files:**
- Create: `components/OpeningStudy/OpeningStudy.tsx`
- Test: `components/OpeningStudy/OpeningStudy.test.tsx`

**Interfaces:**
- Consumes: `LineTabs` (Task 4), `replayLine`/`ReplayedMove` (Task 1),
  `OPENINGS` (Task 2, test only), `CheckersBoard` (already exists).
- Produces: `OpeningStudy({ opening: Opening })`. Consumed by Task 9
  (`[id]` study route).

Step-by-step viewer: Previous/Next through a line's moves, showing the
board at each step plus that move's explanation. Ported from Chess
Sensei's `OpeningStudy.tsx`, adapted to `Board`/`Square`/`CheckersBoard`
and checkers' black-moves-first numbering (no check-square concept to
track, unlike chess).

- [ ] **Step 1: Write the test**

```tsx
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { OpeningStudy } from './OpeningStudy';
import { OPENINGS } from '@/lib/openings/data';

const oldFourteenth = OPENINGS.find((o) => o.id === 'old-fourteenth')!;

describe('OpeningStudy', () => {
  it('has an aria-label on the line tablist and marks the explanation card as a live region', () => {
    render(<OpeningStudy opening={oldFourteenth} />);
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-label', 'Linhas desta abertura');
    expect(screen.getByText(/Posição inicial/).closest('[aria-live]')).toHaveAttribute('aria-live', 'polite');
  });

  it('starts at the initial position with "Anterior" disabled', () => {
    render(<OpeningStudy opening={oldFourteenth} />);
    expect(screen.getByText(/Posição inicial/)).toBeInTheDocument();
    expect(screen.getByText('0 / 6')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
  });

  it('advances one move per "Seguinte" click, with correct move labels', () => {
    render(<OpeningStudy opening={oldFourteenth} />);
    const next = screen.getByRole('button', { name: 'Seguinte' });

    fireEvent.click(next);
    expect(screen.getByText('1. 11-15')).toBeInTheDocument();

    fireEvent.click(next);
    expect(screen.getByText('1...23-19')).toBeInTheDocument();
  });

  it('disables "Seguinte" at the last move and does not overshoot on extra clicks', () => {
    render(<OpeningStudy opening={oldFourteenth} />);
    const next = screen.getByRole('button', { name: 'Seguinte' });

    for (let i = 0; i < 6; i++) fireEvent.click(next);
    expect(screen.getByText('6 / 6')).toBeInTheDocument();
    expect(next).toBeDisabled();

    fireEvent.click(next);
    expect(screen.getByText('6 / 6')).toBeInTheDocument();
  });

  it('steps back with "Anterior"', () => {
    render(<OpeningStudy opening={oldFourteenth} />);
    const next = screen.getByRole('button', { name: 'Seguinte' });
    const prev = screen.getByRole('button', { name: 'Anterior' });

    for (let i = 0; i < 6; i++) fireEvent.click(next);
    fireEvent.click(prev);
    expect(screen.getByText('5 / 6')).toBeInTheDocument();
  });

  it('switching lines resets to the initial position', () => {
    render(<OpeningStudy opening={oldFourteenth} />);
    const next = screen.getByRole('button', { name: 'Seguinte' });
    fireEvent.click(next);
    fireEvent.click(next);
    expect(screen.getByText('2 / 6')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Linha principal' }));
    expect(screen.getByText('0 / 6')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- OpeningStudy.test.tsx`
Expected: FAIL — `./OpeningStudy` doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```tsx
'use client';

import { useMemo, useRef, useState } from 'react';
import { createInitialBoard } from '@/lib/checkers/board';
import { CheckersBoard } from '@/components/CheckersBoard/CheckersBoard';
import { ChipButton } from '@/components/ChipButton/ChipButton';
import { LineTabs } from '@/components/LineTabs/LineTabs';
import { replayLine, type ReplayedMove } from '@/lib/openings/replayLine';
import type { Opening } from '@/lib/openings/types';

const START_BOARD = createInitialBoard();

/** "1. " for black's move, "1..." for white's reply -- checkers' lines
 * always start with black (see lib/checkers/board.ts). */
function moveLabel(stepIndex: number): string {
  const fullmove = Math.ceil(stepIndex / 2);
  return stepIndex % 2 === 1 ? `${fullmove}. ` : `${fullmove}...`;
}

export function OpeningStudy({ opening }: { opening: Opening }) {
  const tabLines = useMemo(() => opening.lines.map((line) => ({ name: line.name.pt })), [opening]);
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
      <LineTabs lines={tabLines} activeIndex={lineIndex} onSelect={selectLine}>
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
              Anterior
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
              Seguinte
            </ChipButton>
          </div>

          <div className="w-full rounded-xl border-2 border-purple/40 bg-ink-soft p-4 text-center" aria-live="polite">
            {current ? (
              <>
                <p className="font-semibold text-cyan">
                  {moveLabel(stepIndex)}{current.notation}
                </p>
                <p className="text-lilac/80 mt-1">{current.explanation.pt}</p>
              </>
            ) : (
              <p className="text-lilac/80">Posição inicial.</p>
            )}
          </div>
        </div>
      </LineTabs>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- OpeningStudy.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add components/OpeningStudy/
git commit -m "feat(ui): OpeningStudy -- step-by-step opening-line viewer

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 7: `OpeningPractice` component

**Files:**
- Create: `components/OpeningPractice/OpeningPractice.tsx`
- Test: `components/OpeningPractice/OpeningPractice.test.tsx`

**Interfaces:**
- Consumes: `LineTabs` (Task 4), `replayLine` (Task 1), `OPENINGS` (Task
  2, test only), `CheckersBoard` (already exists), `legalMovesFrom`
  (already exists, `lib/checkers/moveGeneration.ts`).
- Produces: `OpeningPractice({ opening: Opening })`. Consumed by Task 9
  (`[id]/praticar` route).

The user plays black (see Global Constraints — always black, no
`protagonistColorFor` branching needed); white auto-plays the line's own
moves after a fixed delay. A wrong-but-legal move shows the expected move
via `CheckersBoard`'s existing `suggestedMove` highlight.

- [ ] **Step 1: Write the test**

```tsx
import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { OpeningPractice } from './OpeningPractice';
import { OPENINGS } from '@/lib/openings/data';
import type { Opening } from '@/lib/openings/types';

afterEach(() => {
  vi.useRealTimers();
});

const oldFourteenth = OPENINGS.find((o) => o.id === 'old-fourteenth')!;

// Short, synthetic line just for the completion test -- avoids writing
// out a real opening's full 6 moves by hand just to reach its end.
const shortOpening: Opening = {
  id: 'abertura-teste',
  name: { pt: 'Abertura de Teste', en: 'Test Opening' },
  description: { pt: 'Linha curta só para testes.', en: 'Short line for tests only.' },
  lines: [
    {
      name: { pt: 'Linha única', en: 'Single line' },
      moves: [{ notation: '11-15', explanation: { pt: 'Ocupa o centro.', en: 'Occupies the center.' } }],
    },
  ],
};

function clickSquare(container: HTMLElement, square: number) {
  fireEvent.click(container.querySelector(`[aria-label="square ${square}"]`) as HTMLButtonElement);
}

describe('OpeningPractice', () => {
  it('marks the turn/feedback panel as a live region', () => {
    render(<OpeningPractice opening={oldFourteenth} />);
    expect(screen.getByText('A tua vez: encontra o lance da linha.').closest('[aria-live]')).toHaveAttribute(
      'aria-live',
      'polite'
    );
  });

  it('is interactive on the first move and accepts the correct move', () => {
    const { container } = render(<OpeningPractice opening={oldFourteenth} />);
    expect(screen.getByText('A tua vez: encontra o lance da linha.')).toBeInTheDocument();

    clickSquare(container, 11);
    clickSquare(container, 15);

    expect(screen.queryByText('A tua vez: encontra o lance da linha.')).not.toBeInTheDocument();
    expect(screen.getByText('A pensar…')).toBeInTheDocument();
  });

  it('rejects a legal-but-wrong move and reveals the expected one', () => {
    const { container } = render(<OpeningPractice opening={oldFourteenth} />);

    clickSquare(container, 11);
    clickSquare(container, 16);

    expect(screen.getByText('Não é esse — o lance da linha é 11-15. Tenta de novo.')).toBeInTheDocument();
  });

  it('keeps the revealed hint visible while reselecting a piece, only clearing it once a move is played', () => {
    const { container } = render(<OpeningPractice opening={oldFourteenth} />);

    clickSquare(container, 11);
    clickSquare(container, 16);
    expect(screen.getByText('Não é esse — o lance da linha é 11-15. Tenta de novo.')).toBeInTheDocument();

    clickSquare(container, 11);
    expect(screen.getByText('Não é esse — o lance da linha é 11-15. Tenta de novo.')).toBeInTheDocument();

    clickSquare(container, 15);
    expect(screen.queryByText('Não é esse — o lance da linha é 11-15. Tenta de novo.')).not.toBeInTheDocument();
  });

  it("auto-plays the opponent's move after a delay once the user plays correctly", () => {
    vi.useFakeTimers();
    const { container } = render(<OpeningPractice opening={oldFourteenth} />);

    clickSquare(container, 11);
    clickSquare(container, 15);
    expect(screen.getByText('A pensar…')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.queryByText('A pensar…')).not.toBeInTheDocument();
    expect(screen.getByText('A tua vez: encontra o lance da linha.')).toBeInTheDocument();
  });

  it('shows the completion card once the line is finished', () => {
    vi.useFakeTimers();
    const { container } = render(<OpeningPractice opening={shortOpening} />);

    clickSquare(container, 11);
    clickSquare(container, 15);

    expect(screen.getByText('Linha completa!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Praticar outra vez' })).toBeInTheDocument();
  });

  it('switching lines resets progress', () => {
    const { container } = render(<OpeningPractice opening={oldFourteenth} />);

    clickSquare(container, 11);
    clickSquare(container, 15);
    expect(screen.getByText('A pensar…')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Linha principal' }));
    expect(screen.getByText('A tua vez: encontra o lance da linha.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- OpeningPractice.test.tsx`
Expected: FAIL — `./OpeningPractice` doesn't exist yet.

- [ ] **Step 3: Write the implementation**

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

const START_BOARD = createInitialBoard();
const OPPONENT_MOVE_DELAY_MS = 500;

export function OpeningPractice({ opening }: { opening: Opening }) {
  const tabLines = useMemo(() => opening.lines.map((line) => ({ name: line.name.pt })), [opening]);
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
      <LineTabs lines={tabLines} activeIndex={lineIndex} onSelect={selectLine}>
        <div className="w-[min(98vw,62dvh,560px)] sm:w-[min(92vw,62dvh,560px)] flex flex-col items-center gap-3">
          <CheckersBoard
            board={board}
            turn={nextMoverColor === 'b' ? 'w' : 'b'}
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
              <p className="font-semibold text-gold">Linha completa!</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <ChipButton color="pink" onClick={restartLine}>
                  Praticar outra vez
                </ChipButton>
                <ChipButton color="purple" href="/aprender/aberturas">
                  Voltar às aberturas
                </ChipButton>
              </div>
            </div>
          ) : (
            <div className="w-full rounded-xl border-2 border-purple/40 bg-ink-soft p-4 text-center" aria-live="polite">
              {isUserTurn ? (
                wrongAttempt ? (
                  <p className="text-lilac/80">Não é esse — o lance da linha é {expected!.notation}. Tenta de novo.</p>
                ) : (
                  <p className="text-lilac/80">A tua vez: encontra o lance da linha.</p>
                )
              ) : (
                <p className="text-lilac/80">A pensar…</p>
              )}
            </div>
          )}
        </div>
      </LineTabs>
    </div>
  );
}
```

Note: `turn` passed to `CheckersBoard` is the color OPPOSITE the next
mover — same reasoning as `InteractiveDemo` (Tutorial Hub phase): the
board's animation inference reads "who just moved" as NOT-`turn`, so
after white's auto-play move lands (`nextMoverColor` flips to `'b'`),
`turn` must read `'w'` for the animation to correctly infer white as the
mover, and vice versa.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- OpeningPractice.test.tsx`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add components/OpeningPractice/
git commit -m "feat(ui): OpeningPractice -- play an opening line against auto-play

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 8: `/aprender/aberturas` list

**Files:**
- Create: `app/aprender/aberturas/page.tsx`

**Interfaces:**
- Consumes: `NavCard` (Task 3), `OPENINGS` (Task 2), `PageGlow`/
  `PageHeader`/`ChipButton` (already exist).

No automated test — matches every prior list-of-`NavCard`s hub page in
this repo (the `/aprender` hub itself has no test for its own tile list;
Phase 6's link-coverage test was for that hub specifically after a real
final-review finding, not a pattern extended here without one).

- [ ] **Step 1: Write `app/aprender/aberturas/page.tsx`**

```tsx
'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { NavCard } from '@/components/NavCard/NavCard';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';
import { OPENINGS } from '@/lib/openings/data';

export default function AberturasPage() {
  return (
    <main className="relative min-h-screen max-w-2xl mx-auto p-8 flex flex-col gap-6 overflow-hidden bg-ink">
      <PageGlow position="fixed" pinkOpacity={0.2} />
      <div>
        <PageHeader>Aberturas e armadilhas</PageHeader>
        <p className="mt-3">
          <ChipButton color="purple" href="/aprender">
            Voltar ao tutorial
          </ChipButton>
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {OPENINGS.map((opening) => (
          <li key={opening.id}>
            <NavCard
              href={`/aprender/aberturas/${opening.id}`}
              title={opening.name.pt}
              description={opening.description.pt}
              meta={opening.lines.map((line) => line.name.pt).join(' · ')}
            />
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm test && npm run build`
Expected: full suite still passes, build succeeds. Manually confirm via
`npm run dev` that `/aprender/aberturas` now lists all 8 openings (the
hub's own "Aberturas e armadilhas" tile, built in Phase 6, resolves for
the first time as a result of this task).

- [ ] **Step 3: Commit**

```bash
git add app/aprender/aberturas/page.tsx
git commit -m "feat(app): /aprender/aberturas -- openings list, resolves the Phase 6 tile

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 9: `/aprender/aberturas/[id]` + `/aprender/aberturas/[id]/praticar`

**Files:**
- Create: `app/aprender/aberturas/[id]/page.tsx`
- Create: `app/aprender/aberturas/[id]/praticar/page.tsx`

**Interfaces:**
- Consumes: `OpeningPageHeader` (Task 5), `OpeningStudy` (Task 6),
  `OpeningPractice` (Task 7), `OPENINGS` (Task 2), `PageGlow` (already
  exists).

Both are thin server-component route wrappers with `generateStaticParams`
(so all 8 openings prerender statically) — no automated test, matching the
sibling repo's own precedent for these two files.

- [ ] **Step 1: Write `app/aprender/aberturas/[id]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { PageGlow } from '@/components/PageChrome/PageChrome';
import { OPENINGS } from '@/lib/openings/data';
import { OpeningStudy } from '@/components/OpeningStudy/OpeningStudy';
import { OpeningPageHeader } from '@/components/OpeningPageHeader/OpeningPageHeader';

export async function generateStaticParams() {
  return OPENINGS.map((opening) => ({ id: opening.id }));
}

export default async function OpeningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opening = OPENINGS.find((o) => o.id === id);
  if (!opening) notFound();

  return (
    <main className="relative min-h-screen max-w-2xl mx-auto p-8 flex flex-col gap-6 overflow-hidden bg-ink">
      <PageGlow position="fixed" pinkOpacity={0.2} />
      <OpeningPageHeader opening={opening} variant="study" />
      <OpeningStudy key={opening.id} opening={opening} />
    </main>
  );
}
```

- [ ] **Step 2: Write `app/aprender/aberturas/[id]/praticar/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { PageGlow } from '@/components/PageChrome/PageChrome';
import { OPENINGS } from '@/lib/openings/data';
import { OpeningPractice } from '@/components/OpeningPractice/OpeningPractice';
import { OpeningPageHeader } from '@/components/OpeningPageHeader/OpeningPageHeader';

export async function generateStaticParams() {
  return OPENINGS.map((opening) => ({ id: opening.id }));
}

export default async function PraticarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opening = OPENINGS.find((o) => o.id === id);
  if (!opening) notFound();

  return (
    <main className="relative min-h-screen max-w-2xl mx-auto p-8 flex flex-col gap-6 overflow-hidden bg-ink">
      <PageGlow position="fixed" pinkOpacity={0.2} />
      <OpeningPageHeader opening={opening} variant="practice" />
      <OpeningPractice key={opening.id} opening={opening} />
    </main>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm test && npm run build`
Expected: full suite still passes, build succeeds with 8 statically
prerendered pages under each of `/aprender/aberturas/[id]` and
`/aprender/aberturas/[id]/praticar` (16 new static routes total).
Manually confirm via `npm run dev`: visit `/aprender/aberturas/
old-fourteenth` (study mode works, Previous/Next step through the line)
and `/aprender/aberturas/old-fourteenth/praticar` (clicking square 11 then
15 plays the correct first move; white auto-replies after ~500ms).

- [ ] **Step 4: Commit**

```bash
git add "app/aprender/aberturas/[id]/page.tsx" "app/aprender/aberturas/[id]/praticar/page.tsx"
git commit -m "feat(app): /aprender/aberturas/[id] + [id]/praticar -- study and practice routes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 10: Close out the phase in `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

Per the project's own process rule. No test — documentation only.

- [ ] **Step 1: Update the `Structure` section**

Add entries for `lib/openings/` (types.ts/replayLine.ts/data.ts, noting
the top-level location choice and the 8-openings/one-line-each scope
decision), `components/LineTabs/`, `components/OpeningPageHeader/`,
`components/OpeningStudy/`, `components/OpeningPractice/`, `NavCard.tsx`'s
restored `meta` prop, and `app/aprender/aberturas/` (list + `[id]` +
`[id]/praticar`).

- [ ] **Step 2: Add a `Conventions` entry documenting the content-scope decision**

Record, in CLAUDE.md's own voice: 8 openings (not 12) with one line each
(not main-line-plus-variations) was a deliberate, user-confirmed scope
reduction given the cost of hand-authoring accurate checkers opening
content; each opening's first move and defining second (reply) move are
real, hand-verified theory (checkers openings are genuinely classified by
Black's first move — one of exactly 7 legal options, already a tested fact
in `moveGeneration.test.ts`), while the remaining 4 moves per line follow
a generic, structurally-safe "develop a second piece, fill the vacated
gap" pattern rather than reproducing exact textbook continuations from
memory. Note that extending this (more openings, real variations, deeper
authentic lines) is real, well-scoped future content work.

- [ ] **Step 3: Add a `Conventions` entry documenting checkers-vs-chess
  opening-trainer differences**

Record the deviations from the Chess Sensei precedent this phase's own
Global Constraints already established: no `eco` field (no ECO-equivalent
in checkers), `OpeningPractice`'s protagonist is always black (no
White-system/Black-defense split to model, unlike chess), `CheckersBoard`
has no orientation/flip prop, `OpeningStudy`/`OpeningPractice` don't wire
`boardTheme`/`pieceStyle` (matching `/jogar`'s own still-unwired state).

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: close out Openings & Traps Trainer phase in CLAUDE.md

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```
