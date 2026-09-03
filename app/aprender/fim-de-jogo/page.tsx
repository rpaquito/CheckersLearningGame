'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';
import { InteractiveDemo, type PieceDemo } from '@/components/InteractiveDemo/InteractiveDemo';
import { NO_LEGAL_MOVES_DEMO } from '@/lib/checkers/demoBoards';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function FimDeJogoPage() {
  const { t } = useTranslation();

  const demos: PieceDemo[] = [
    { title: t.fimDeJogo.noLegalMoves.title, description: t.fimDeJogo.noLegalMoves.desc, ...NO_LEGAL_MOVES_DEMO },
  ];

  return (
    <main className="relative min-h-screen max-w-3xl mx-auto p-8 flex flex-col gap-8 overflow-hidden bg-ink">
      <PageGlow position="fixed" pinkOpacity={0.2} />
      <div>
        <PageHeader>{t.fimDeJogo.title}</PageHeader>
        <p className="mt-3">
          <ChipButton color="purple" href="/aprender">
            {t.common.backToTutorial}
          </ChipButton>
        </p>
      </div>
      {demos.map((demo) => (
        <InteractiveDemo key={demo.title} {...demo} />
      ))}

      <section>
        <h2 className="text-xl font-semibold text-cyan">{t.fimDeJogo.drawTitle}</h2>
        <p className="text-lilac/80 mt-1">{t.fimDeJogo.drawText}</p>
      </section>
    </main>
  );
}
