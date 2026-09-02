'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { PageHeader } from '@/components/PageChrome/PageChrome';
import type { Opening } from '@/lib/openings/types';

export function OpeningPageHeader({ opening, variant }: { opening: Opening; variant: 'study' | 'practice' }) {
  const name = opening.name.pt.toUpperCase();
  const title = variant === 'practice' ? `Praticar: ${name}` : name;

  return (
    <div>
      <PageHeader>{title}</PageHeader>
      {variant === 'study' ? (
        <>
          <p className="mt-2 text-lilac/80">{opening.description.pt}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <ChipButton color="purple" href="/aprender/aberturas">
              Voltar às aberturas
            </ChipButton>
            <ChipButton color="gold" href={`/aprender/aberturas/${opening.id}/praticar`}>
              Praticar esta abertura
            </ChipButton>
          </div>
        </>
      ) : (
        <p className="mt-3">
          <ChipButton color="purple" href={`/aprender/aberturas/${opening.id}`}>
            Voltar ao estudo
          </ChipButton>
        </p>
      )}
    </div>
  );
}
