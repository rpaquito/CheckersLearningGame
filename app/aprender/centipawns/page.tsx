'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';
import { describeMoveQuality } from '@/lib/checkers/moveExplanation';
import type { MoveQuality } from '@/lib/checkers/moveClassification';
import { useTranslation } from '@/lib/i18n/useTranslation';

// Same color family as Toast.tsx's TONE_ACCENT (emerald/amber/red) -- a
// reader who sees a move-quality toast during a game should recognize
// the same colors here.
const QUALITY_BADGE_CLASS: Record<MoveQuality, string> = {
  boa: 'bg-emerald-900/60 text-emerald-200',
  imprecisao: 'bg-amber-900/60 text-amber-200',
  erro: 'bg-red-900/60 text-red-200',
};

const QUALITY_LEVELS: MoveQuality[] = ['boa', 'imprecisao', 'erro'];

export default function CentipawnsPage() {
  const { t, locale } = useTranslation();

  const concepts = [t.centipawnsPage.positionEvaluation, t.centipawnsPage.evalLoss];

  return (
    <main className="relative min-h-screen max-w-2xl mx-auto p-8 flex flex-col gap-6 overflow-hidden bg-ink">
      <PageGlow position="fixed" pinkOpacity={0.2} />
      <div>
        <PageHeader>{t.centipawnsPage.title}</PageHeader>
        <p className="mt-3">
          <ChipButton color="purple" href="/aprender">
            {t.common.backToTutorial}
          </ChipButton>
        </p>
      </div>
      <ul className="flex flex-col gap-4">
        {concepts.map((concept) => (
          <li key={concept.title} className="rounded-xl border-2 border-purple/40 bg-ink-soft p-4">
            <p className="font-semibold text-white">{concept.title}</p>
            <p className="text-lilac/80 mt-1">{concept.text}</p>
          </li>
        ))}
      </ul>
      <div>
        <p className="font-semibold text-white mb-3">{t.centipawnsPage.levelsHeading}</p>
        <ul className="flex flex-col gap-3">
          {QUALITY_LEVELS.map((level) => (
            <li key={level} className="rounded-xl border-2 border-purple/40 bg-ink-soft p-4 flex flex-col gap-2">
              <span className={`self-start rounded-full px-3 py-1 text-sm font-semibold ${QUALITY_BADGE_CLASS[level]}`}>
                {describeMoveQuality(level, locale)}
              </span>
              <p className="text-lilac/80">{t.centipawnsPage.qualityTexts[level]}</p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
