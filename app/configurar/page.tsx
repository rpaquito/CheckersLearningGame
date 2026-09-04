'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';
import { GameSetup } from '@/components/GameSetup/GameSetup';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function ConfigurarPage() {
  const { t } = useTranslation();

  return (
    <main className="relative flex flex-col items-center justify-start p-8 overflow-hidden bg-ink">
      <PageGlow pinkOpacity={0.25} />
      <div className="relative w-full max-w-sm">
        <PageHeader size="text-3xl">{t.configurar.title}</PageHeader>
        <p className="mt-3">
          <ChipButton color="purple" href="/">
            {t.common.mainMenu}
          </ChipButton>
        </p>
      </div>
      <div className="relative w-full max-w-sm mt-8">
        <GameSetup />
      </div>
    </main>
  );
}
