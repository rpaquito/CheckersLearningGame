# i18n Mechanism & Dictionary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first half of Phase 8 of the design spec's build phasing (§13): the i18n mechanism itself (`lib/i18n/`) and a complete, structurally-validated bilingual (PT/EN) dictionary covering every hardcoded Portuguese string in the app built so far. This plan does **not** retrofit any existing page or component to actually use the dictionary — that is a deliberately separate follow-up plan ("Plan 8b"), the same way this project split "Toast/Modal chrome" out as its own phase earlier. This plan's own deliverable is fully self-contained and independently testable: a working `useTranslation()` hook returning correct, complete PT/EN content, wired to `Settings.language` (which has existed, unused, since the Menu/Settings/Visual-Identity phase).

**Architecture:** `lib/i18n/types.ts` defines `Locale`/`VALID_LOCALES` (the canonical version — every other module's locally-declared `Locale` from earlier phases stays as-is for now; folding those into this one is Plan 8b's job, not this plan's, since changing `lib/checkers/moveExplanation.ts`/`lib/settings/settings.ts`/`lib/openings/types.ts` touches code this plan doesn't otherwise need to modify). `lib/i18n/dictionaries/types.ts` defines the `Dictionary` interface; `pt.ts`/`en.ts` are the two concrete dictionaries, written together (per design spec §7, hand-written for both locales, not machine-translated); `dictionaries/index.ts` exports `DICTIONARIES: Record<Locale, Dictionary>`. `lib/i18n/useTranslation.ts` is a thin hook reading `useSettings().settings.language` and returning the matching dictionary — no new React Context (the only Context this app has is `ToastProvider`'s, per CLAUDE.md). `lib/settings/settings.ts` gains real browser-language auto-detection (`detectLocale`), the one piece of Phase 5's `Settings.language` that was explicitly deferred until i18n had a real effect to detect *for*.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest + Testing Library, Tailwind v4 — identical to every prior phase in this repo.

**Spec:** `docs/superpowers/specs/2026-08-31-checkers-sensei-design.md` §7 ("i18n" subsection), §13 (phase 8). This plan's scope split (mechanism+dictionary now, UI retrofit later) is this plan's own decision, not spec-mandated — the spec describes Phase 8 as one phase; splitting it is the same kind of pragmatic sequencing call this project already made once (Toast/Modal chrome).

## Global Constraints

- No worktrees, no feature branches. Commit each task's changes directly to
  `main` and push (`git push origin main`) once its tests pass, before
  starting the next task — never batch multiple tasks into one unpushed
  commit (CLAUDE.md §Process rules).
- **This plan touches zero existing pages or components.** Every file this
  plan creates or modifies is either brand new (`lib/i18n/**`) or a file
  whose only consumers don't exist yet (`lib/settings/settings.ts`'s
  `detectLocale` integration is the one exception — see its own task's
  notes on why that's safe). No `app/**` or `components/**` file (other
  than test setup) is touched. Retrofitting them to actually call
  `useTranslation()` is Plan 8b.
- **Dictionary values in `pt.ts` must be copied VERBATIM from the app's
  current hardcoded strings** (collected during this plan's own research —
  every value below was read directly from the actual source files as they
  exist today), not paraphrased. This matters concretely: Plan 8b will
  swap each hardcoded string for a `t.xxx.yyy` lookup, and every existing
  test in this repo that asserts exact rendered text (e.g. `getByRole
  ('button', { name: 'Reiniciar' })`) must keep passing unchanged once that
  swap happens — which only holds if `pt.ts`'s value is byte-identical to
  today's hardcoded string.
- **One deliberate exception, called out explicitly**: `/jogar`'s "A
  pensar..." (three literal periods) and `/aprender/aberturas/[id]/
  praticar`'s "A pensar…" (a real ellipsis character) are currently two
  different strings for the same concept. This plan unifies both into one
  `common.thinking` key using the ellipsis-character form, since
  `OpeningPractice.test.tsx` (built in an earlier phase) already asserts
  that exact value and `/jogar` has no test locking in the three-dots
  form. Plan 8b will pick up the unified value automatically.
- `Locale` in `lib/i18n/types.ts` is the CANONICAL version going forward —
  but this plan does not migrate `lib/checkers/moveExplanation.ts`'s,
  `lib/settings/settings.ts`'s, or `lib/openings/types.ts`'s own
  independently-declared `Locale` types to import from it. They stay
  structurally identical (`'pt' | 'en'`) and interchangeable via
  TypeScript's structural typing without any import changes needed. Plan
  8b (or a later cleanup) can consolidate them; this plan doesn't need to.
- Every new dictionary value's Portuguese and English text must be
  genuinely different prose (not machine-translated one-liners, not the
  same string in both slots) — same rigor the design spec asks for,
  matching `lib/checkers/moveExplanation.ts`'s and `lib/openings/data.ts`'s
  own established bilingual-content precedent. The two exceptions,
  matching real-world UX convention: `opcoes.portuguese` ("Português") and
  `opcoes.english` ("English") are identical in both dictionaries — a
  language switcher's own option labels conventionally show each
  language's name in itself, not translated.

---

## Task 1: `lib/i18n/types.ts` + `lib/i18n/detectLocale.ts`

**Files:**
- Create: `lib/i18n/types.ts`
- Create: `lib/i18n/detectLocale.ts`
- Test: `lib/i18n/detectLocale.test.ts`

**Interfaces:**
- Produces: `Locale = 'pt' | 'en'`, `VALID_LOCALES: readonly Locale[]`,
  `detectLocale(navigatorLanguage?: string): Locale`. Consumed by Task 2
  (dictionary types), Task 3 (`useTranslation`, `settings.ts`'s new
  auto-detection).

- [ ] **Step 1: Write the test**

```ts
import { describe, expect, it } from 'vitest';
import { detectLocale } from './detectLocale';

describe('detectLocale', () => {
  it('detects Portuguese from any pt-* browser language', () => {
    expect(detectLocale('pt-PT')).toBe('pt');
    expect(detectLocale('pt-BR')).toBe('pt');
    expect(detectLocale('pt')).toBe('pt');
  });

  it('is case-insensitive', () => {
    expect(detectLocale('PT-pt')).toBe('pt');
  });

  it('falls back to English for any non-Portuguese language', () => {
    expect(detectLocale('en-US')).toBe('en');
    expect(detectLocale('fr-FR')).toBe('en');
    expect(detectLocale('es-ES')).toBe('en');
  });

  it('falls back to English when no language is given', () => {
    expect(detectLocale(undefined)).toBe('en');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- detectLocale.test.ts`
Expected: FAIL — `./detectLocale` doesn't exist yet.

- [ ] **Step 3: Write `lib/i18n/types.ts`**

```ts
export type Locale = 'pt' | 'en';

export const VALID_LOCALES: readonly Locale[] = ['pt', 'en'];
```

- [ ] **Step 4: Write `lib/i18n/detectLocale.ts`**

```ts
import type { Locale } from './types';

// English is the fallback of the fallback: any browser language that
// doesn't start with "pt" (including a failed/undefined detection) lands
// on English, not Portuguese -- an explicit choice, the reverse of
// DEFAULT_SETTINGS's own 'pt' default (which only applies when nothing
// has been detected/saved yet at all -- see settings.ts).
export function detectLocale(navigatorLanguage?: string): Locale {
  return navigatorLanguage?.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- detectLocale.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/i18n/types.ts lib/i18n/detectLocale.ts lib/i18n/detectLocale.test.ts
git commit -m "feat(i18n): Locale type + detectLocale

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 2: The dictionary — `lib/i18n/dictionaries/`

**Files:**
- Create: `lib/i18n/dictionaries/types.ts`
- Create: `lib/i18n/dictionaries/pt.ts`
- Create: `lib/i18n/dictionaries/en.ts`
- Create: `lib/i18n/dictionaries/index.ts`
- Test: `lib/i18n/dictionaries/dictionaries.test.ts`

**Interfaces:**
- Produces: `Dictionary` (interface), `pt: Dictionary`, `en: Dictionary`,
  `DICTIONARIES: Record<Locale, Dictionary>`. Consumed by Task 3
  (`useTranslation`). Every leaf key here is what Plan 8b's retrofit tasks
  will read from — the exact key paths are load-bearing for that future
  plan, not just this one.

This is the largest task in this plan by volume, but structurally simple:
one interface, two object literals matching it, one re-export, one test
verifying structural parity (every leaf key present in both locales, none
empty) plus a spot-check that Portuguese and English text genuinely
differ.

- [ ] **Step 1: Write the test**

```ts
import { describe, expect, it } from 'vitest';
import { DICTIONARIES } from './index';
import { VALID_LOCALES } from '../types';

// Recursively collects every leaf VALUE (skipping function-typed leaves,
// e.g. openings.wrongMove, which are parameterized message builders, not
// plain strings) as a flat "a.b.c" -> value map, so both structural
// parity and the different-string checks can walk the whole tree without
// hand-listing every key.
function flattenLeaves(obj: unknown, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      Object.assign(result, flattenLeaves(item, `${prefix}[${index}]`));
    });
    return result;
  }
  if (obj !== null && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      Object.assign(result, flattenLeaves(value, prefix ? `${prefix}.${key}` : key));
    }
    return result;
  }
  result[prefix] = obj;
  return result;
}

describe('DICTIONARIES', () => {
  it('has an entry for every valid locale', () => {
    for (const locale of VALID_LOCALES) {
      expect(DICTIONARIES[locale]).toBeDefined();
    }
  });

  it('has identical leaf key paths in both locales', () => {
    const ptKeys = Object.keys(flattenLeaves(DICTIONARIES.pt)).sort();
    const enKeys = Object.keys(flattenLeaves(DICTIONARIES.en)).sort();
    expect(enKeys).toEqual(ptKeys);
  });

  it('has no empty-string leaves in either locale', () => {
    for (const locale of VALID_LOCALES) {
      const leaves = flattenLeaves(DICTIONARIES[locale]);
      for (const [key, value] of Object.entries(leaves)) {
        if (typeof value === 'function') continue;
        expect(value, `${locale}.${key} is empty`).not.toBe('');
      }
    }
  });

  it('has genuinely different PT/EN text for every leaf, except the two documented language-name exceptions', () => {
    const SAME_BY_DESIGN = new Set(['opcoes.portuguese', 'opcoes.english']);
    const ptLeaves = flattenLeaves(DICTIONARIES.pt);
    const enLeaves = flattenLeaves(DICTIONARIES.en);
    for (const key of Object.keys(ptLeaves)) {
      if (typeof ptLeaves[key] === 'function') continue;
      if (SAME_BY_DESIGN.has(key)) continue;
      expect(enLeaves[key], `${key} is identical in pt and en`).not.toBe(ptLeaves[key]);
    }
  });

  it('formats openings.wrongMove identically in shape between locales (both are functions)', () => {
    expect(typeof DICTIONARIES.pt.openings.wrongMove).toBe('function');
    expect(typeof DICTIONARIES.en.openings.wrongMove).toBe('function');
    expect(DICTIONARIES.pt.openings.wrongMove('11-15')).toContain('11-15');
    expect(DICTIONARIES.en.openings.wrongMove('11-15')).toContain('11-15');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- dictionaries.test.ts`
Expected: FAIL — none of `./index`, `pt`, `en` exist yet.

- [ ] **Step 3: Write `lib/i18n/dictionaries/types.ts`**

```ts
export interface Dictionary {
  common: {
    mainMenu: string;
    close: string;
    cancel: string;
    thinking: string;
    backToTutorial: string;
  };
  menu: {
    title: string;
    playVsComputer: string;
    twoPlayers: string;
    learnToPlay: string;
    options: string;
  };
  opcoes: {
    title: string;
    defaultDifficultyLegend: string;
    defaultColorLegend: string;
    boardTheme: string;
    pieceStyle: string;
    backgroundImage: string;
    language: string;
    portuguese: string;
    english: string;
    toastDifficultyChanged: string;
    toastColorChanged: string;
    toastBoardThemeChanged: string;
    toastPieceStyleChanged: string;
    toastBackgroundChanged: string;
    toastLanguageChanged: string;
  };
  difficulty: { facil: string; medio: string; dificil: string };
  color: { black: string; white: string; random: string };
  pieceStyleLabel: { classico: string; moderno: string; anime: string };
  configurar: { title: string; difficultyLegend: string; colorLegend: string; start: string };
  jogar: {
    turnBlack: string;
    turnWhite: string;
    gameOver: string;
    engineUnavailable: string;
    restart: string;
    confirmRestartTitle: string;
    confirmRestartMessage: string;
    confirmRestartButton: string;
    confirmMenuTitle: string;
    confirmMenuMessage: string;
    confirmMenuButton: string;
  };
  learningPanel: {
    enable: string;
    disable: string;
    suggestMove: string;
    suggestionLoading: string;
  };
  rulesModal: {
    title: string;
    movementTitle: string;
    man: { title: string; text: string };
    king: { title: string; text: string };
    mandatoryCaptureTitle: string;
    mandatoryCapture: { title: string; text: string };
    multiJump: { title: string; text: string };
    promotionTitle: string;
    promotion: { title: string; text: string };
    drawTitle: string;
    repetition: { title: string; text: string };
    noCaptureDraw: { title: string; text: string };
  };
  gameEndModal: { playAgain: string };
  gameEndMessage: {
    aiLose: string;
    aiWin: string;
    localBlackWins: string;
    localWhiteWins: string;
    drawRepetition: string;
    drawNoCapture: string;
  };
  aprenderHub: {
    title: string;
    piecesTitle: string;
    piecesDesc: string;
    specialRulesTitle: string;
    specialRulesDesc: string;
    endgameTitle: string;
    endgameDesc: string;
    strategyTitle: string;
    strategyDesc: string;
    centipawnsTitle: string;
    centipawnsDesc: string;
    openingsTitle: string;
    openingsDesc: string;
  };
  pecas: {
    title: string;
    manMovement: { title: string; desc: string };
    kingMovement: { title: string; desc: string };
    promotion: { title: string; desc: string };
  };
  regrasEspeciais: {
    title: string;
    mandatoryCapture: { title: string; desc: string };
    multiJump: { title: string; desc: string };
  };
  fimDeJogo: {
    title: string;
    noLegalMoves: { title: string; desc: string };
    drawTitle: string;
    drawText: string;
  };
  estrategia: {
    title: string;
    principles: { title: string; text: string }[];
  };
  centipawnsPage: {
    title: string;
    positionEvaluation: { title: string; text: string };
    evalLoss: { title: string; text: string };
    levelsHeading: string;
    qualityTexts: { boa: string; imprecisao: string; erro: string };
  };
  openings: {
    hubTitle: string;
    disclaimer: string;
    backToOpenings: string;
    practiceThisOpening: string;
    practicePrefix: string;
    backToStudy: string;
    linesTablistLabel: string;
    previous: string;
    next: string;
    startPosition: string;
    lineComplete: string;
    practiceAgain: string;
    wrongMove: (notation: string) => string;
    yourTurn: string;
  };
  interactiveDemo: { reset: string };
}
```

- [ ] **Step 4: Write `lib/i18n/dictionaries/pt.ts`**

```ts
import type { Dictionary } from './types';

export const pt: Dictionary = {
  common: {
    mainMenu: 'Menu inicial',
    close: 'Fechar',
    cancel: 'Cancelar',
    thinking: 'A pensar…',
    backToTutorial: 'Voltar ao tutorial',
  },
  menu: {
    title: 'Checkers Sensei',
    playVsComputer: 'Jogar contra o computador',
    twoPlayers: 'Dois jogadores',
    learnToPlay: 'Aprender a jogar',
    options: 'Opções',
  },
  opcoes: {
    title: 'Opções',
    defaultDifficultyLegend: 'Dificuldade por omissão',
    defaultColorLegend: 'Cor por omissão',
    boardTheme: 'Tema do tabuleiro',
    pieceStyle: 'Estilo das peças',
    backgroundImage: 'Imagem de fundo',
    language: 'Idioma',
    portuguese: 'Português',
    english: 'English',
    toastDifficultyChanged: 'Dificuldade por omissão atualizada.',
    toastColorChanged: 'Cor por omissão atualizada.',
    toastBoardThemeChanged: 'Tema do tabuleiro atualizado.',
    toastPieceStyleChanged: 'Estilo das peças atualizado.',
    toastBackgroundChanged: 'Imagem de fundo atualizada.',
    toastLanguageChanged: 'Idioma atualizado.',
  },
  difficulty: { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' },
  color: { black: 'Pretas', white: 'Brancas', random: 'Aleatório' },
  pieceStyleLabel: { classico: 'Clássico', moderno: 'Moderno', anime: 'Anime' },
  configurar: {
    title: 'Jogar contra o computador',
    difficultyLegend: 'Dificuldade',
    colorLegend: 'Cor',
    start: 'Começar',
  },
  jogar: {
    turnBlack: 'Vez das pretas',
    turnWhite: 'Vez das brancas',
    gameOver: 'Fim de jogo',
    engineUnavailable: 'Erro no motor de jogo — reinicie a partida',
    restart: 'Reiniciar partida',
    confirmRestartTitle: 'Reiniciar partida?',
    confirmRestartMessage: 'Vais perder o progresso desta partida.',
    confirmRestartButton: 'Reiniciar',
    confirmMenuTitle: 'Sair para o menu?',
    confirmMenuMessage: 'Vais perder o progresso desta partida.',
    confirmMenuButton: 'Sair',
  },
  learningPanel: {
    enable: 'Ativar modo de aprendizagem',
    disable: 'Desativar modo de aprendizagem',
    suggestMove: 'Sugerir jogada',
    suggestionLoading: 'A calcular...',
  },
  rulesModal: {
    title: 'Regras do jogo',
    movementTitle: 'Movimento',
    man: { title: 'Peça (homem)', text: 'Move-se uma casa na diagonal, sempre para a frente, para uma casa escura vazia.' },
    king: { title: 'Dama', text: 'Move-se uma casa na diagonal, em qualquer das quatro direções.' },
    mandatoryCaptureTitle: 'Captura obrigatória',
    mandatoryCapture: {
      title: 'Quando há uma captura disponível',
      text: 'És obrigado a capturar -- não podes fazer um lance simples se alguma das tuas peças puder capturar.',
    },
    multiJump: {
      title: 'Captura encadeada (lance múltiplo)',
      text: 'Se depois de capturares uma peça a mesma peça puder capturar outra, a captura continua no mesmo lance.',
    },
    promotionTitle: 'Promoção a dama',
    promotion: {
      title: 'Chegar à última linha',
      text: 'Uma peça que chegue à última linha do adversário torna-se dama imediatamente -- mesmo a meio de uma sequência de capturas, o lance termina aí.',
    },
    drawTitle: 'Empate',
    repetition: { title: 'Repetição de posição', text: 'A mesma posição repete-se três vezes.' },
    noCaptureDraw: { title: 'Sem capturas', text: '40 lances seguidos (de cada jogador) sem nenhuma captura.' },
  },
  gameEndModal: { playAgain: 'Jogar novamente' },
  gameEndMessage: {
    aiLose: 'Perdeste — sem jogadas possíveis',
    aiWin: 'Ganhaste — o adversário ficou sem jogadas possíveis',
    localWhiteWins: 'Brancas vencem — pretas sem jogadas possíveis',
    localBlackWins: 'Pretas vencem — brancas sem jogadas possíveis',
    drawRepetition: 'Empate por repetição de posição',
    drawNoCapture: 'Empate — 40 lances sem captura',
  },
  aprenderHub: {
    title: 'Aprender a jogar',
    piecesTitle: 'Peças e movimento',
    piecesDesc: 'Como se movem as peças normais e as damas, e como se dá a promoção.',
    specialRulesTitle: 'Regras especiais',
    specialRulesDesc: 'Captura obrigatória e sequências de capturas encadeadas.',
    endgameTitle: 'Fim de jogo',
    endgameDesc: 'Como se perde por falta de jogadas e as regras de empate.',
    strategyTitle: 'Estratégia',
    strategyDesc: 'Princípios para jogar melhor: centro, última linha, trocas favoráveis.',
    centipawnsTitle: 'Avaliação e qualidade das jogadas',
    centipawnsDesc: 'O que significam os selos de qualidade que vês durante o jogo.',
    openingsTitle: 'Aberturas e armadilhas',
    openingsDesc: 'Aberturas conhecidas para estudar e praticar.',
  },
  pecas: {
    title: 'Peças e movimento',
    manMovement: {
      title: 'Movimento da peça (homem)',
      desc: 'Uma peça normal só se move na diagonal, uma casa de cada vez, sempre para a frente -- nunca para trás.',
    },
    kingMovement: {
      title: 'Movimento da dama',
      desc: 'Quando uma peça chega à última linha do lado adversário, é promovida a dama. A dama move-se na diagonal em qualquer das quatro direções, para a frente ou para trás.',
    },
    promotion: {
      title: 'Promoção a dama',
      desc: 'Uma peça normal que alcance a última linha do lado adversário torna-se imediatamente dama -- experimenta mover esta peça até à linha do fundo.',
    },
  },
  regrasEspeciais: {
    title: 'Regras especiais',
    mandatoryCapture: {
      title: 'Captura obrigatória',
      desc: 'Se uma peça pode capturar, a captura é obrigatória -- não é possível fazer um movimento simples enquanto houver uma captura disponível para essa cor. Clica na casa destacada para saltar sobre a peça branca.',
    },
    multiJump: {
      title: 'Sequência de capturas (lance múltiplo)',
      desc: 'Uma única jogada pode encadear várias capturas seguidas, desde que cada salto aterre numa casa livre. Clica na casa destacada para veres as duas peças brancas capturadas na mesma jogada.',
    },
  },
  fimDeJogo: {
    title: 'Fim de jogo',
    noLegalMoves: {
      title: 'Sem jogadas legais',
      desc: 'Se, na tua vez, não tiveres nenhuma jogada legal disponível -- nem simples nem de captura -- perdes o jogo de imediato. Esta peça está bloqueada: repara que nenhuma casa fica destacada, porque não há nenhuma jogada legal disponível.',
    },
    drawTitle: 'Empate',
    drawText: 'O jogo também pode terminar em empate: quando 40 jogadas completas (80 meio-lances) passam sem qualquer captura, ou quando a mesma posição se repete três vezes.',
  },
  estrategia: {
    title: 'Estratégia',
    principles: [
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
    ],
  },
  centipawnsPage: {
    title: 'Avaliação e qualidade das jogadas',
    positionEvaluation: {
      title: 'Avaliação da posição',
      text: 'Depois de cada jogada, o motor calcula uma pontuação que resume quem está melhor posicionado -- material (peças e damas) mais alguns fatores posicionais, como o controlo do centro e o avanço das peças.',
    },
    evalLoss: {
      title: 'Perda de avaliação',
      text: 'Quando ativas o Modo de Aprendizagem, cada jogada é comparada com a melhor jogada que o motor encontrou na mesma posição -- a diferença entre as duas é a "perda" dessa jogada.',
    },
    levelsHeading: 'Os três níveis de qualidade',
    qualityTexts: {
      boa: 'A jogada está muito próxima da melhor jogada encontrada pelo motor -- perda pequena ou nula.',
      imprecisao: 'A jogada perde algum valor face à melhor alternativa, mas não compromete a posição.',
      erro: 'A jogada perde valor significativo -- normalmente uma peça (ou mais) que podia ter sido evitada.',
    },
  },
  openings: {
    hubTitle: 'Aberturas e armadilhas',
    disclaimer: 'Os nomes e classificações destas aberturas são informativos, não verificados por uma federação de damas.',
    backToOpenings: 'Voltar às aberturas',
    practiceThisOpening: 'Praticar esta abertura',
    practicePrefix: 'Praticar: ',
    backToStudy: 'Voltar ao estudo',
    linesTablistLabel: 'Linhas desta abertura',
    previous: 'Anterior',
    next: 'Seguinte',
    startPosition: 'Posição inicial.',
    lineComplete: 'Linha completa!',
    practiceAgain: 'Praticar outra vez',
    wrongMove: (notation: string) => `Não é esse — o lance da linha é ${notation}. Tenta de novo.`,
    yourTurn: 'A tua vez: encontra o lance da linha.',
  },
  interactiveDemo: { reset: 'Reiniciar' },
};
```

- [ ] **Step 5: Write `lib/i18n/dictionaries/en.ts`**

```ts
import type { Dictionary } from './types';

export const en: Dictionary = {
  common: {
    mainMenu: 'Main menu',
    close: 'Close',
    cancel: 'Cancel',
    thinking: 'Thinking…',
    backToTutorial: 'Back to tutorial',
  },
  menu: {
    title: 'Checkers Sensei',
    playVsComputer: 'Play vs computer',
    twoPlayers: 'Two players',
    learnToPlay: 'Learn to play',
    options: 'Options',
  },
  opcoes: {
    title: 'Options',
    defaultDifficultyLegend: 'Default difficulty',
    defaultColorLegend: 'Default color',
    boardTheme: 'Board theme',
    pieceStyle: 'Piece style',
    backgroundImage: 'Background image',
    language: 'Language',
    portuguese: 'Português',
    english: 'English',
    toastDifficultyChanged: 'Default difficulty updated.',
    toastColorChanged: 'Default color updated.',
    toastBoardThemeChanged: 'Board theme updated.',
    toastPieceStyleChanged: 'Piece style updated.',
    toastBackgroundChanged: 'Background image updated.',
    toastLanguageChanged: 'Language updated.',
  },
  difficulty: { facil: 'Easy', medio: 'Medium', dificil: 'Hard' },
  color: { black: 'Black', white: 'White', random: 'Random' },
  pieceStyleLabel: { classico: 'Classic', moderno: 'Modern', anime: 'Anime' },
  configurar: {
    title: 'Play vs computer',
    difficultyLegend: 'Difficulty',
    colorLegend: 'Color',
    start: 'Start',
  },
  jogar: {
    turnBlack: "Black's turn",
    turnWhite: "White's turn",
    gameOver: 'Game over',
    engineUnavailable: 'Engine error — restart the game',
    restart: 'Restart game',
    confirmRestartTitle: 'Restart game?',
    confirmRestartMessage: "You'll lose this game's progress.",
    confirmRestartButton: 'Restart',
    confirmMenuTitle: 'Exit to menu?',
    confirmMenuMessage: "You'll lose this game's progress.",
    confirmMenuButton: 'Exit',
  },
  learningPanel: {
    enable: 'Enable learning mode',
    disable: 'Disable learning mode',
    suggestMove: 'Suggest move',
    suggestionLoading: 'Calculating...',
  },
  rulesModal: {
    title: 'Game rules',
    movementTitle: 'Movement',
    man: { title: 'Piece (man)', text: 'Moves one square diagonally, always forward, onto an empty dark square.' },
    king: { title: 'King', text: 'Moves one square diagonally, in any of the four directions.' },
    mandatoryCaptureTitle: 'Mandatory capture',
    mandatoryCapture: {
      title: 'When a capture is available',
      text: "You must capture -- you can't make a simple move if any of your pieces can capture.",
    },
    multiJump: {
      title: 'Chained capture (multi-jump)',
      text: 'If, after capturing a piece, the same piece can capture another, the capture continues in the same move.',
    },
    promotionTitle: 'Promotion to king',
    promotion: {
      title: 'Reaching the last row',
      text: "A piece that reaches the opponent's last row immediately becomes a king -- even mid-capture-sequence, the move ends there.",
    },
    drawTitle: 'Draw',
    repetition: { title: 'Position repetition', text: 'The same position occurs three times.' },
    noCaptureDraw: { title: 'No captures', text: '40 moves in a row (by each player) with no capture.' },
  },
  gameEndModal: { playAgain: 'Play again' },
  gameEndMessage: {
    aiLose: 'You lost — no moves available',
    aiWin: 'You won — your opponent had no moves left',
    localWhiteWins: 'White wins — Black has no moves left',
    localBlackWins: 'Black wins — White has no moves left',
    drawRepetition: 'Draw by position repetition',
    drawNoCapture: 'Draw — 40 moves without a capture',
  },
  aprenderHub: {
    title: 'Learn to play',
    piecesTitle: 'Pieces and movement',
    piecesDesc: 'How regular pieces and kings move, and how promotion works.',
    specialRulesTitle: 'Special rules',
    specialRulesDesc: 'Mandatory capture and chained capture sequences.',
    endgameTitle: 'Endgame',
    endgameDesc: 'How you lose by running out of moves, and the draw rules.',
    strategyTitle: 'Strategy',
    strategyDesc: 'Principles for playing better: center, back row, favorable trades.',
    centipawnsTitle: 'Evaluation and move quality',
    centipawnsDesc: 'What the quality badges you see during the game mean.',
    openingsTitle: 'Openings and traps',
    openingsDesc: 'Known openings to study and practice.',
  },
  pecas: {
    title: 'Pieces and movement',
    manMovement: {
      title: 'Man movement',
      desc: 'A regular piece only moves diagonally, one square at a time, always forward -- never backward.',
    },
    kingMovement: {
      title: 'King movement',
      desc: "When a piece reaches the opponent's last row, it's promoted to a king. A king moves diagonally in any of the four directions, forward or backward.",
    },
    promotion: {
      title: 'Promotion to king',
      desc: "A regular piece that reaches the opponent's last row immediately becomes a king -- try moving this piece to the back row.",
    },
  },
  regrasEspeciais: {
    title: 'Special rules',
    mandatoryCapture: {
      title: 'Mandatory capture',
      desc: "If a piece can capture, capturing is mandatory -- you can't make a simple move while a capture is available for that color. Click the highlighted square to jump over the white piece.",
    },
    multiJump: {
      title: 'Capture sequence (multi-jump)',
      desc: 'A single move can chain several captures in a row, as long as each jump lands on a free square. Click the highlighted square to see both white pieces captured in the same move.',
    },
  },
  fimDeJogo: {
    title: 'Endgame',
    noLegalMoves: {
      title: 'No legal moves',
      desc: "If, on your turn, you have no legal move available -- neither simple nor a capture -- you lose immediately. This piece is stuck: notice no square is highlighted, because there's no legal move available.",
    },
    drawTitle: 'Draw',
    drawText: 'The game can also end in a draw: when 40 full moves (80 plies) pass with no capture, or when the same position repeats three times.',
  },
  estrategia: {
    title: 'Strategy',
    principles: [
      {
        title: 'Control the center',
        text: 'Pieces in the center of the board have more movement options and are harder to trap than pieces stuck on the side columns.',
      },
      {
        title: 'Keep your back row',
        text: "Pieces that stay on your own back row delay the opponent's kings from being crowned -- don't advance them needlessly in the opening.",
      },
      {
        title: 'Avoid the side columns',
        text: 'A piece on the leftmost or rightmost column only has one diagonal available (instead of two), making it easier to trap.',
      },
      {
        title: 'Look for favorable trades',
        text: "Trading pieces usually favors whoever is ahead on material -- it simplifies the game and reduces the opponent's chances of turning the position around.",
      },
      {
        title: 'Protect your kings',
        text: "A king is worth significantly more than a regular piece (275 versus 100, in the engine's evaluation system) -- don't expose it to an avoidable capture just to win a piece.",
      },
    ],
  },
  centipawnsPage: {
    title: 'Evaluation and move quality',
    positionEvaluation: {
      title: 'Position evaluation',
      text: "After each move, the engine calculates a score summarizing who's better positioned -- material (pieces and kings) plus some positional factors, like center control and piece advancement.",
    },
    evalLoss: {
      title: 'Evaluation loss',
      text: 'When you turn on Learning Mode, each move is compared with the best move the engine found in the same position -- the difference between the two is that move\'s "loss".',
    },
    levelsHeading: 'The three quality levels',
    qualityTexts: {
      boa: 'The move is very close to the best move the engine found -- little or no loss.',
      imprecisao: "The move loses some value compared to the best alternative, but doesn't compromise the position.",
      erro: 'The move loses significant value -- usually a piece (or more) that could have been avoided.',
    },
  },
  openings: {
    hubTitle: 'Openings and traps',
    disclaimer: "These openings' names and classifications are informational, not verified by a checkers federation.",
    backToOpenings: 'Back to openings',
    practiceThisOpening: 'Practice this opening',
    practicePrefix: 'Practice: ',
    backToStudy: 'Back to study',
    linesTablistLabel: 'Lines in this opening',
    previous: 'Previous',
    next: 'Next',
    startPosition: 'Starting position.',
    lineComplete: 'Line complete!',
    practiceAgain: 'Practice again',
    wrongMove: (notation: string) => `Not quite — the line's move is ${notation}. Try again.`,
    yourTurn: "Your turn: find the line's move.",
  },
  interactiveDemo: { reset: 'Reset' },
};
```

- [ ] **Step 6: Write `lib/i18n/dictionaries/index.ts`**

```ts
import type { Locale } from '../types';
import type { Dictionary } from './types';
import { pt } from './pt';
import { en } from './en';

export type { Dictionary };
export const DICTIONARIES: Record<Locale, Dictionary> = { pt, en };
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- dictionaries.test.ts`
Expected: PASS (5 tests). If the "identical leaf key paths" or "no
empty-string leaves" assertion fails, it means `pt.ts`/`en.ts` drifted
from the `Dictionary` interface while transcribing — fix the object
literal to match, don't weaken the test.

- [ ] **Step 8: Commit**

```bash
git add lib/i18n/dictionaries/
git commit -m "feat(i18n): complete PT/EN dictionary for every page built so far

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 3: `useTranslation` + `Settings.language` auto-detection

**Files:**
- Create: `lib/i18n/useTranslation.ts`
- Modify: `lib/settings/settings.ts`
- Modify: `lib/settings/settings.test.ts`
- Modify: `vitest.setup.ts`

**Interfaces:**
- Produces: `useTranslation(): { t: Dictionary; locale: Locale }`.
  Consumed by nothing in this plan (Plan 8b's whole job) — but this task's
  own tests exercise it directly via `renderHook`.
- Modifies: `loadSettings()` (from Task 5 of the Menu/Settings/Visual-
  Identity plan) gains real browser-language detection on first load,
  exactly the piece that phase's own CLAUDE.md entry said was deliberately
  missing "since there's no i18n dictionary system yet... to actually act
  on it." That system now exists.

**This task changes test-suite-wide behavior — read carefully before
starting.** Every existing test in this whole repo that asserts exact
rendered Portuguese text currently passes because `DEFAULT_SETTINGS.
language` is `'pt'` and nothing auto-detects otherwise. Once this task adds
real detection, `jsdom`'s default `navigator.language` (`'en-US'`) would
make `loadSettings()` resolve to `'en'` for every test that doesn't
explicitly seed a saved `'pt'` value first — which would be most of this
repo's existing test suite, in files this plan doesn't touch. This is
solved by adding a locale seed to the *global* `vitest.setup.ts`
`beforeEach` (which already runs before every test in the whole repo) —
the same fix the sibling Chess Sensei project applied when it added this
exact feature.

- [ ] **Step 1: Write the test**

```ts
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTranslation } from './useTranslation';
import { __resetSettingsCacheForTests } from '@/lib/settings/useSettings';
import { saveSettings, DEFAULT_SETTINGS } from '@/lib/settings/settings';

describe('useTranslation', () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetSettingsCacheForTests();
  });

  it('returns the PT dictionary and locale when settings.language is "pt"', () => {
    saveSettings({ ...DEFAULT_SETTINGS, language: 'pt' });
    const { result } = renderHook(() => useTranslation());
    expect(result.current.locale).toBe('pt');
    expect(result.current.t.common.mainMenu).toBe('Menu inicial');
  });

  it('returns the EN dictionary and locale when settings.language is "en"', () => {
    saveSettings({ ...DEFAULT_SETTINGS, language: 'en' });
    const { result } = renderHook(() => useTranslation());
    expect(result.current.locale).toBe('en');
    expect(result.current.t.common.mainMenu).toBe('Main menu');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Write the test from Step 1 to `lib/i18n/useTranslation.test.ts`, then run:

`npm test -- lib/i18n/useTranslation.test.ts`

Expected: FAIL — `./useTranslation` doesn't exist yet.

- [ ] **Step 3: Write `lib/i18n/useTranslation.ts`**

```ts
'use client';

import { useSettings } from '@/lib/settings/useSettings';
import { DICTIONARIES, type Dictionary } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/lib/i18n/types';

export interface UseTranslationResult {
  t: Dictionary;
  locale: Locale;
}

/**
 * No new Context -- this app's only Context stays ToastProvider's (see
 * CLAUDE.md). `language` is just another field read through the already-
 * existing useSettings().
 */
export function useTranslation(): UseTranslationResult {
  const { settings } = useSettings();
  return { t: DICTIONARIES[settings.language], locale: settings.language };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/i18n/useTranslation.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Add auto-detection to `lib/settings/settings.ts`**

Read the current file first. Add an import and a `resolveInitialLocale`
helper, then change `loadSettings`'s `language` resolution to detect (and
persist the detection) when no saved value exists — but keep a previously
*saved* value authoritative once one exists, so detection only ever runs
once per installation:

```ts
import { detectLocale } from '@/lib/i18n/detectLocale';
```

Add this helper near the top of the file, after the existing `pickValid`
helper:

```ts
function resolveInitialLocale(): Locale {
  return detectLocale(typeof navigator !== 'undefined' ? navigator.language : undefined);
}
```

Change `loadSettings`'s body. Currently the `language` field is resolved
the same way as every other field, via `pickValid(candidate.language,
VALID_LOCALES, DEFAULT_SETTINGS.language)`. Replace just that one field's
resolution with detection-aware logic, and persist the result when
detection actually ran (so it only ever happens once):

```ts
export function loadSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    const candidate: Record<string, unknown> =
      typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};

    const languageWasStored =
      typeof candidate.language === 'string' && (VALID_LOCALES as readonly string[]).includes(candidate.language);
    const language = languageWasStored ? (candidate.language as Locale) : resolveInitialLocale();

    const result: Settings = {
      defaultDifficulty: pickValid(candidate.defaultDifficulty, VALID_DIFFICULTIES, DEFAULT_SETTINGS.defaultDifficulty),
      defaultColor: pickValid(candidate.defaultColor, VALID_COLORS, DEFAULT_SETTINGS.defaultColor),
      boardTheme: pickValid(candidate.boardTheme, VALID_BOARD_THEMES, DEFAULT_SETTINGS.boardTheme),
      backgroundTheme: pickValid(candidate.backgroundTheme, VALID_BACKGROUND_THEMES, DEFAULT_SETTINGS.backgroundTheme),
      pieceStyle: pickValid(candidate.pieceStyle, VALID_PIECE_STYLES, DEFAULT_SETTINGS.pieceStyle),
      language,
    };

    // Only saves if detection actually ran (language wasn't already
    // stored) -- doesn't re-write on every load once a real value exists.
    if (!languageWasStored) saveSettings(result);

    return result;
  } catch {
    return { ...DEFAULT_SETTINGS, language: resolveInitialLocale() };
  }
}
```

You'll also need to add `VALID_LOCALES` as a local constant in this file
(it does NOT import `lib/i18n/types.ts`'s `VALID_LOCALES` — per this
plan's Global Constraints, `settings.ts`'s own `Locale` type stays
independently declared, and importing just the validation array from
`lib/i18n/types.ts` while keeping the type itself separate would be an
inconsistent half-measure; keep this file exactly as self-contained as it
already was):

```ts
const VALID_LOCALES: readonly Locale[] = ['pt', 'en'];
```

- [ ] **Step 6: Add tests for the new detection behavior to `settings.test.ts`**

Read the current file first, then add this new `describe` block:

```ts
describe('loadSettings — language auto-detection', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('detects and saves the language when nothing is saved yet', () => {
    vi.stubGlobal('navigator', { language: 'en-US' });
    const settings = loadSettings();
    expect(settings.language).toBe('en');
    const saved = JSON.parse(window.localStorage.getItem('checkers-settings')!);
    expect(saved.language).toBe('en');
  });

  it('detects Portuguese when the browser asks for Portuguese', () => {
    vi.stubGlobal('navigator', { language: 'pt-PT' });
    expect(loadSettings().language).toBe('pt');
  });

  it('uses the saved language without detecting again', () => {
    window.localStorage.setItem('checkers-settings', JSON.stringify({ language: 'en' }));
    vi.stubGlobal('navigator', { language: 'pt-PT' }); // detection would say 'pt' -- must not be used
    expect(loadSettings().language).toBe('en');
  });

  it('treats an invalid saved language as missing', () => {
    window.localStorage.setItem('checkers-settings', JSON.stringify({ language: 'fr' }));
    vi.stubGlobal('navigator', { language: 'pt-PT' });
    expect(loadSettings().language).toBe('pt');
  });

  it('detects on an installation from before this feature, preserving other already-saved fields', () => {
    window.localStorage.setItem(
      'checkers-settings',
      JSON.stringify({ defaultDifficulty: 'dificil', pieceStyle: 'anime' })
    );
    vi.stubGlobal('navigator', { language: 'pt-PT' });

    const settings = loadSettings();
    expect(settings.language).toBe('pt');
    expect(settings.defaultDifficulty).toBe('dificil');
    expect(settings.pieceStyle).toBe('anime');

    const saved = JSON.parse(window.localStorage.getItem('checkers-settings')!);
    expect(saved.defaultDifficulty).toBe('dificil');
    expect(saved.pieceStyle).toBe('anime');
  });
});
```

You'll also need `vi` imported in this test file if it isn't already (`
import { describe, expect, it, beforeEach, vi } from 'vitest';`).

- [ ] **Step 7: Update `vitest.setup.ts`**

Read the current file first. Its existing global `beforeEach` (added when
`useSettings.ts` was built) currently does:

```ts
beforeEach(() => {
  window.localStorage.clear();
  __resetSettingsCacheForTests();
});
```

Change it to also seed a saved Portuguese language, so every OTHER test
file in this repo — none of which know or care about i18n — keeps
rendering Portuguese by default regardless of `jsdom`'s own
`navigator.language`:

```ts
// Seeds a saved 'pt' language for every test, so any component using
// useTranslation() (once Plan 8b wires it up) renders the PT dictionary
// by default -- matching the hardcoded PT text nearly every existing test
// in this repo already asserts. Without this, jsdom's own default
// navigator.language ('en-US') would make the new auto-detection in
// settings.ts resolve every test's language to 'en' instead.
beforeEach(() => {
  window.localStorage.clear();
  __resetSettingsCacheForTests();
  window.localStorage.setItem('checkers-settings', JSON.stringify({ language: 'pt' }));
});
```

- [ ] **Step 8: Run the full suite**

Run: `npm test`
Expected: PASS — every test in the whole repo, not just this task's new
ones. This is the critical check for this task: confirm the global
`beforeEach` change didn't break anything in a file this plan never
touches. If something fails, read why carefully before changing anything
— it likely means some other test seeds `checkers-settings` itself in a
way that now conflicts with the language field also being present; fix
that test's own local setup, don't weaken the global seed.

- [ ] **Step 9: Commit**

```bash
git add lib/i18n/useTranslation.ts lib/i18n/useTranslation.test.ts lib/settings/settings.ts lib/settings/settings.test.ts vitest.setup.ts
git commit -m "feat(i18n): useTranslation hook + Settings.language auto-detection

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Task 4: Close out this plan in `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

Per the project's own process rule. No test — documentation only.

- [ ] **Step 1: Update the `Structure` section**

Add entries for `lib/i18n/` (`types.ts`, `detectLocale.ts`,
`useTranslation.ts`, `dictionaries/` — `types.ts`/`pt.ts`/`en.ts`/
`index.ts`), and note the `Settings.language` auto-detection addition in
`lib/settings/settings.ts`'s own existing entry.

- [ ] **Step 2: Add a `Conventions` entry: this is half of Phase 8, deliberately**

Record that Phase 8 (i18n) was split into two plans: this one (mechanism +
complete dictionary, done) and a follow-up ("Plan 8b") that retrofits
every existing page/component to actually call `useTranslation()` instead
of its current hardcoded Portuguese. Note explicitly that **no page or
component in this repo actually uses the dictionary yet** — `useSettings
().settings.language` can be changed (e.g. via a future `/opcoes` language
toggle, itself part of Plan 8b) with zero visible effect until that
follow-up plan lands, exactly the same "built but not wired up yet"
shape this project has used for several earlier phases' groundwork.

- [ ] **Step 3: Add a `Conventions` entry documenting the global test-locale seed**

Record that `vitest.setup.ts`'s global `beforeEach` now seeds
`{ language: 'pt' }` into `checkers-settings` before every test in the
whole repo — load-bearing for every existing test that asserts hardcoded
Portuguese text to keep passing once Plan 8b swaps those strings for
dictionary lookups, since `Settings.language` now has real browser-based
auto-detection that would otherwise resolve to `'en'` under jsdom's
default `navigator.language`. Any future test needing to exercise the
English dictionary must explicitly `saveSettings({ ..., language: 'en'
})` (or override `navigator.language` before calling `loadSettings()`
directly) rather than relying on the global default.

- [ ] **Step 4: Add a `Conventions` entry noting the `Locale` type duplication is intentional, for now**

Record that `lib/i18n/types.ts`'s `Locale` is the canonical version going
forward, but `lib/checkers/moveExplanation.ts`, `lib/settings/settings.ts`,
and `lib/openings/types.ts` each still declare their own structurally-
identical `Locale` locally (a pattern each of those phases' own CLAUDE.md
entries already documented as deliberate, decoupled-until-i18n-exists).
Now that i18n exists, consolidating them onto `lib/i18n/types.ts`'s
version is legitimate future cleanup — not required by anything in this
plan or its follow-up, since TypeScript's structural typing already makes
the duplicates fully interchangeable without it.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: close out i18n Mechanism & Dictionary plan in CLAUDE.md

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```
