'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { PageHeader } from '@/components/PageChrome/PageChrome';
import type { Opening } from '@/lib/openings/types';
import { useTranslation } from '@/lib/i18n/useTranslation';

export function OpeningPageHeader({ opening, variant }: { opening: Opening; variant: 'study' | 'practice' }) {
  const { t, locale } = useTranslation();
  const name = opening.name[locale];
  const title = variant === 'practice' ? t.openings.practiceTitle(name) : name;

  return (
    <div>
      <PageHeader>{title}</PageHeader>
      {variant === 'study' ? (
        <>
          <p className="mt-2 text-lilac/80">{opening.description[locale]}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <ChipButton color="purple" href="/aprender/aberturas">
              {t.openings.backToOpenings}
            </ChipButton>
            <ChipButton color="gold" href={`/aprender/aberturas/${opening.id}/praticar`}>
              {t.openings.practiceThisOpening}
            </ChipButton>
          </div>
        </>
      ) : (
        <p className="mt-3">
          <ChipButton color="purple" href={`/aprender/aberturas/${opening.id}`}>
            {t.openings.backToStudy}
          </ChipButton>
        </p>
      )}
    </div>
  );
}
