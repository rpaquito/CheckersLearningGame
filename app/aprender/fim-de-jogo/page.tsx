'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';
import { InteractiveDemo, type PieceDemo } from '@/components/InteractiveDemo/InteractiveDemo';
import { NO_LEGAL_MOVES_DEMO } from '@/lib/checkers/demoBoards';

const DEMOS: PieceDemo[] = [
  {
    title: 'Sem jogadas legais',
    description:
      'Se, na tua vez, não tiveres nenhuma jogada legal disponível -- nem simples nem de captura -- perdes o jogo de imediato. Esta peça está bloqueada: repara que nenhuma casa fica destacada, porque não há nenhuma jogada legal disponível.',
    ...NO_LEGAL_MOVES_DEMO,
  },
];

export default function FimDeJogoPage() {
  return (
    <main className="relative min-h-screen max-w-3xl mx-auto p-8 flex flex-col gap-8 overflow-hidden bg-ink">
      <PageGlow position="fixed" pinkOpacity={0.2} />
      <div>
        <PageHeader>Fim de jogo</PageHeader>
        <p className="mt-3">
          <ChipButton color="purple" href="/aprender">
            Voltar ao tutorial
          </ChipButton>
        </p>
      </div>
      {DEMOS.map((demo) => (
        <InteractiveDemo key={demo.title} {...demo} />
      ))}

      <section>
        <h2 className="text-xl font-semibold text-cyan">Empate</h2>
        <p className="text-lilac/80 mt-1">
          O jogo também pode terminar em empate: quando 40 jogadas completas (80 meio-lances) passam sem qualquer
          captura, ou quando a mesma posição se repete três vezes.
        </p>
      </section>
    </main>
  );
}
