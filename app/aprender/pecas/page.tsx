'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';
import { InteractiveDemo, type PieceDemo } from '@/components/InteractiveDemo/InteractiveDemo';
import { MAN_MOVEMENT_DEMO, KING_MOVEMENT_DEMO, PROMOTION_DEMO } from '@/lib/checkers/demoBoards';

const DEMOS: PieceDemo[] = [
  {
    title: 'Movimento da peça (homem)',
    description:
      'Uma peça normal só se move na diagonal, uma casa de cada vez, sempre para a frente -- nunca para trás.',
    ...MAN_MOVEMENT_DEMO,
  },
  {
    title: 'Movimento da dama',
    description:
      'Quando uma peça chega à última linha do lado adversário, é promovida a dama. A dama move-se na diagonal em qualquer das quatro direções, para a frente ou para trás.',
    ...KING_MOVEMENT_DEMO,
  },
  {
    title: 'Promoção a dama',
    description:
      'Uma peça normal que alcance a última linha do lado adversário torna-se imediatamente dama -- experimenta mover esta peça até à linha do fundo.',
    ...PROMOTION_DEMO,
  },
];

export default function PecasPage() {
  return (
    <main className="relative min-h-screen max-w-3xl mx-auto p-8 flex flex-col gap-8 overflow-hidden bg-ink">
      <PageGlow position="fixed" pinkOpacity={0.2} />
      <div>
        <PageHeader>Peças e movimento</PageHeader>
        <p className="mt-3">
          <ChipButton color="purple" href="/aprender">
            Voltar ao tutorial
          </ChipButton>
        </p>
      </div>
      {DEMOS.map((demo) => (
        <InteractiveDemo key={demo.title} {...demo} />
      ))}
    </main>
  );
}
