'use client';

import { ChipButton } from '@/components/ChipButton/ChipButton';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';
import { InteractiveDemo, type PieceDemo } from '@/components/InteractiveDemo/InteractiveDemo';
import { MANDATORY_CAPTURE_DEMO, MULTI_JUMP_DEMO } from '@/lib/checkers/demoBoards';

const DEMOS: PieceDemo[] = [
  {
    title: 'Captura obrigatória',
    description:
      'Se uma peça pode capturar, a captura é obrigatória -- não é possível fazer um movimento simples enquanto houver uma captura disponível para essa cor. Clica na peça preta para saltar sobre a peça branca.',
    ...MANDATORY_CAPTURE_DEMO,
  },
  {
    title: 'Sequência de capturas (lance múltiplo)',
    description:
      'Uma única jogada pode encadear várias capturas seguidas, desde que cada salto aterre numa casa livre. Clica na peça preta para veres as duas peças brancas capturadas na mesma jogada.',
    ...MULTI_JUMP_DEMO,
  },
];

export default function RegrasEspeciaisPage() {
  return (
    <main className="relative min-h-screen max-w-3xl mx-auto p-8 flex flex-col gap-8 overflow-hidden bg-ink">
      <PageGlow position="fixed" pinkOpacity={0.2} />
      <div>
        <PageHeader>Regras especiais</PageHeader>
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
