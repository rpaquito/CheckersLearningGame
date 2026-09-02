'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { NavCard } from '@/components/NavCard/NavCard';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';
import { OPENINGS } from '@/lib/openings/data';

export default function AberturasPage() {
  return (
    <main className="relative min-h-screen max-w-2xl mx-auto p-8 flex flex-col gap-6 overflow-hidden bg-ink">
      <PageGlow position="fixed" pinkOpacity={0.2} />
      <div>
        <PageHeader>Aberturas e armadilhas</PageHeader>
        <p className="mt-3">
          <ChipButton color="purple" href="/aprender">
            Voltar ao tutorial
          </ChipButton>
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {OPENINGS.map((opening) => (
          <li key={opening.id}>
            <NavCard
              href={`/aprender/aberturas/${opening.id}`}
              title={opening.name.pt}
              description={opening.description.pt}
              meta={opening.lines.map((line) => line.name.pt).join(' · ')}
            />
          </li>
        ))}
      </ul>
    </main>
  );
}
