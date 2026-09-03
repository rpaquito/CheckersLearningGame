'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';
import { InteractiveDemo, type PieceDemo } from '@/components/InteractiveDemo/InteractiveDemo';
import { MAN_MOVEMENT_DEMO, KING_MOVEMENT_DEMO, PROMOTION_DEMO } from '@/lib/checkers/demoBoards';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function PecasPage() {
  const { t } = useTranslation();

  const demos: PieceDemo[] = [
    { title: t.pecas.manMovement.title, description: t.pecas.manMovement.desc, ...MAN_MOVEMENT_DEMO },
    { title: t.pecas.kingMovement.title, description: t.pecas.kingMovement.desc, ...KING_MOVEMENT_DEMO },
    { title: t.pecas.promotion.title, description: t.pecas.promotion.desc, ...PROMOTION_DEMO },
  ];

  return (
    <main className="relative min-h-screen max-w-3xl mx-auto p-8 flex flex-col gap-8 overflow-hidden bg-ink">
      <PageGlow position="fixed" pinkOpacity={0.2} />
      <div>
        <PageHeader>{t.pecas.title}</PageHeader>
        <p className="mt-3">
          <ChipButton color="purple" href="/aprender">
            {t.common.backToTutorial}
          </ChipButton>
        </p>
      </div>
      {demos.map((demo) => (
        <InteractiveDemo key={demo.title} {...demo} />
      ))}
    </main>
  );
}
