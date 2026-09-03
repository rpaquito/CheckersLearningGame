'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function EstrategiaPage() {
  const { t } = useTranslation();

  return (
    <main className="relative min-h-screen max-w-2xl mx-auto p-8 flex flex-col gap-6 overflow-hidden bg-ink">
      <PageGlow position="fixed" pinkOpacity={0.2} />
      <div>
        <PageHeader>{t.estrategia.title}</PageHeader>
        <p className="mt-3">
          <ChipButton color="purple" href="/aprender">
            {t.common.backToTutorial}
          </ChipButton>
        </p>
      </div>
      <ul className="flex flex-col gap-4">
        {t.estrategia.principles.map((principle) => (
          <li key={principle.title} className="rounded-xl border-2 border-purple/40 bg-ink-soft p-4">
            <p className="font-semibold text-white">{principle.title}</p>
            <p className="text-lilac/80 mt-1">{principle.text}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
