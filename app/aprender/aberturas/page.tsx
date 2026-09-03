'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { NavCard } from '@/components/NavCard/NavCard';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';
import { OPENINGS } from '@/lib/openings/data';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function AberturasPage() {
  const { t, locale } = useTranslation();

  return (
    <main className="relative min-h-screen max-w-2xl mx-auto p-8 flex flex-col gap-6 overflow-hidden bg-ink">
      <PageGlow position="fixed" pinkOpacity={0.2} />
      <div>
        <PageHeader>{t.openings.hubTitle}</PageHeader>
        <p className="mt-3">
          <ChipButton color="purple" href="/aprender">
            {t.common.backToTutorial}
          </ChipButton>
        </p>
        <p className="text-sm text-lilac/60 mt-3">{t.openings.disclaimer}</p>
      </div>
      <ul className="flex flex-col gap-3">
        {OPENINGS.map((opening) => (
          <li key={opening.id}>
            <NavCard
              href={`/aprender/aberturas/${opening.id}`}
              title={opening.name[locale]}
              description={opening.description[locale]}
              meta={opening.lines.map((line) => line.name[locale]).join(' · ')}
            />
          </li>
        ))}
      </ul>
    </main>
  );
}
