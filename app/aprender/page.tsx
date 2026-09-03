'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { NavCard } from '@/components/NavCard/NavCard';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function AprenderPage() {
  const { t } = useTranslation();

  const topics = [
    { href: '/aprender/pecas', title: t.aprenderHub.piecesTitle, description: t.aprenderHub.piecesDesc },
    {
      href: '/aprender/regras-especiais',
      title: t.aprenderHub.specialRulesTitle,
      description: t.aprenderHub.specialRulesDesc,
    },
    { href: '/aprender/fim-de-jogo', title: t.aprenderHub.endgameTitle, description: t.aprenderHub.endgameDesc },
    { href: '/aprender/estrategia', title: t.aprenderHub.strategyTitle, description: t.aprenderHub.strategyDesc },
    {
      href: '/aprender/centipawns',
      title: t.aprenderHub.centipawnsTitle,
      description: t.aprenderHub.centipawnsDesc,
    },
    { href: '/aprender/aberturas', title: t.aprenderHub.openingsTitle, description: t.aprenderHub.openingsDesc },
  ];

  return (
    <main className="relative min-h-screen max-w-2xl mx-auto p-8 flex flex-col gap-6 overflow-hidden bg-ink">
      <PageGlow position="fixed" pinkOpacity={0.2} />
      <div>
        <PageHeader>{t.aprenderHub.title}</PageHeader>
        <p className="mt-3">
          <ChipButton color="purple" href="/">
            {t.common.mainMenu}
          </ChipButton>
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {topics.map((topic) => (
          <li key={topic.href}>
            <NavCard href={topic.href} title={topic.title} description={topic.description} />
          </li>
        ))}
      </ul>
    </main>
  );
}
