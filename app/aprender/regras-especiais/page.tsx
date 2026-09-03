'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';
import { InteractiveDemo, type PieceDemo } from '@/components/InteractiveDemo/InteractiveDemo';
import { MANDATORY_CAPTURE_DEMO, MULTI_JUMP_DEMO } from '@/lib/checkers/demoBoards';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function RegrasEspeciaisPage() {
  const { t } = useTranslation();

  const demos: PieceDemo[] = [
    {
      title: t.regrasEspeciais.mandatoryCapture.title,
      description: t.regrasEspeciais.mandatoryCapture.desc,
      ...MANDATORY_CAPTURE_DEMO,
    },
    { title: t.regrasEspeciais.multiJump.title, description: t.regrasEspeciais.multiJump.desc, ...MULTI_JUMP_DEMO },
  ];

  return (
    <main className="relative min-h-screen max-w-3xl mx-auto p-8 flex flex-col gap-8 overflow-hidden bg-ink">
      <PageGlow position="fixed" pinkOpacity={0.2} />
      <div>
        <PageHeader>{t.regrasEspeciais.title}</PageHeader>
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
