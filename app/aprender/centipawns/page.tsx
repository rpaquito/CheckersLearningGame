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
