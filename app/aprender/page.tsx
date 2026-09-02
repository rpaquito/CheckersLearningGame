'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { NavCard } from '@/components/NavCard/NavCard';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';

// /aprender/aberturas doesn't exist until a later phase (the openings/traps
// trainer, design spec §13 phase 7) -- this tile links ahead of it
// deliberately, matching this repo's established tolerance for forward-
// reaching links to a not-yet-built route.
const TOPICS = [
  {
    href: '/aprender/pecas',
    title: 'Peças e movimento',
    description: 'Como se movem as peças normais e as damas, e como se dá a promoção.',
  },
  {
    href: '/aprender/regras-especiais',
    title: 'Regras especiais',
    description: 'Captura obrigatória e sequências de capturas encadeadas.',
  },
  {
    href: '/aprender/fim-de-jogo',
    title: 'Fim de jogo',
    description: 'Como se perde por falta de jogadas e as regras de empate.',
  },
  {
    href: '/aprender/estrategia',
    title: 'Estratégia',
    description: 'Princípios para jogar melhor: centro, última linha, trocas favoráveis.',
  },
  {
    href: '/aprender/centipawns',
    title: 'Avaliação e qualidade das jogadas',
    description: 'O que significam os selos de qualidade que vês durante o jogo.',
  },
  {
    href: '/aprender/aberturas',
    title: 'Aberturas e armadilhas',
    description: 'Aberturas conhecidas para estudar e praticar.',
  },
];

export default function AprenderPage() {
  return (
    <main className="relative min-h-screen max-w-2xl mx-auto p-8 flex flex-col gap-6 overflow-hidden bg-ink">
      <PageGlow position="fixed" pinkOpacity={0.2} />
      <div>
        <PageHeader>Aprender a jogar</PageHeader>
        <p className="mt-3">
          <ChipButton color="purple" href="/">
            Menu inicial
          </ChipButton>
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {TOPICS.map((topic) => (
          <li key={topic.href}>
            <NavCard href={topic.href} title={topic.title} description={topic.description} />
          </li>
        ))}
      </ul>
    </main>
  );
}
