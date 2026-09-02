'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';

const PRINCIPLES = [
  {
    title: 'Controla o centro',
    text: 'As peças no centro do tabuleiro têm mais opções de movimento e são mais difíceis de imobilizar do que as peças presas nas colunas laterais.',
  },
  {
    title: 'Mantém a última linha',
    text: 'As peças que ficam na tua própria linha do fundo atrasam a promoção das damas adversárias -- não as adiantes sem necessidade logo nas primeiras jogadas.',
  },
  {
    title: 'Evita as colunas laterais',
    text: 'Uma peça na coluna mais à esquerda ou mais à direita só tem uma diagonal disponível (em vez de duas), o que a torna mais fácil de imobilizar.',
  },
  {
    title: 'Procura trocas favoráveis',
    text: 'Trocar peças costuma favorecer quem está a ganhar material -- simplifica o jogo e reduz as hipóteses de o adversário reverter a posição.',
  },
  {
    title: 'Protege as tuas damas',
    text: 'Uma dama vale significativamente mais do que uma peça normal (275 contra 100, no sistema de avaliação do motor) -- não a exponhas a uma captura evitável só para ganhar uma peça.',
  },
];

export default function EstrategiaPage() {
  return (
    <main className="relative min-h-screen max-w-2xl mx-auto p-8 flex flex-col gap-6 overflow-hidden bg-ink">
      <PageGlow position="fixed" pinkOpacity={0.2} />
      <div>
        <PageHeader>Estratégia</PageHeader>
        <p className="mt-3">
          <ChipButton color="purple" href="/aprender">
            Voltar ao tutorial
          </ChipButton>
        </p>
      </div>
      <ul className="flex flex-col gap-4">
        {PRINCIPLES.map((principle) => (
          <li key={principle.title} className="rounded-xl border-2 border-purple/40 bg-ink-soft p-4">
            <p className="font-semibold text-white">{principle.title}</p>
            <p className="text-lilac/80 mt-1">{principle.text}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
