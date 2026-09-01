'use client';

import { useEffect } from 'react';
import { useFocusTrap } from '@/lib/ui/useFocusTrap';

export interface RulesModalProps {
  open: boolean;
  onClose: () => void;
}

// Content per design spec §5's explicit list for this modal's checkers
// version: man/king movement, mandatory capture, multi-jump, promotion,
// draw conditions. Hardcoded Portuguese -- no i18n dictionary yet (Phase 8),
// unlike Chess Sensei's t.rulesModal.*-driven content.
const SECTIONS = [
  {
    title: 'Movimento',
    items: [
      { title: 'Peça (homem)', text: 'Move-se uma casa na diagonal, sempre para a frente, para uma casa escura vazia.' },
      { title: 'Dama', text: 'Move-se uma casa na diagonal, em qualquer das quatro direções.' },
    ],
  },
  {
    title: 'Captura obrigatória',
    items: [
      {
        title: 'Quando há uma captura disponível',
        text: 'És obrigado a capturar -- não podes fazer um lance simples se alguma das tuas peças puder capturar.',
      },
      {
        title: 'Captura encadeada (lance múltiplo)',
        text: 'Se depois de capturares uma peça a mesma peça puder capturar outra, a captura continua no mesmo lance.',
      },
    ],
  },
  {
    title: 'Promoção a dama',
    items: [
      {
        title: 'Chegar à última linha',
        text: 'Uma peça que chegue à última linha do adversário torna-se dama imediatamente -- mesmo a meio de uma sequência de capturas, o lance termina aí.',
      },
    ],
  },
  {
    title: 'Empate',
    items: [
      { title: 'Repetição de posição', text: 'A mesma posição repete-se três vezes.' },
      { title: 'Sem capturas', text: '40 lances seguidos (de cada jogador) sem nenhuma captura.' },
    ],
  },
];

export function RulesModal({ open, onClose }: RulesModalProps) {
  const panelRef = useFocusTrap(open);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      data-testid="rules-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Regras do jogo"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-2xl border-2 border-stone-700 bg-white p-6 text-stone-900 outline-none"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-2xl font-bold">Regras do jogo</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-full h-8 w-8 shrink-0 bg-stone-200 font-bold hover:scale-110 transition-transform"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-5">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h3 className="mb-2 font-semibold text-sky-700">{section.title}</h3>
              <dl className="flex flex-col gap-2">
                {section.items.map((item) => (
                  <div key={item.title}>
                    <dt className="font-medium">{item.title}</dt>
                    <dd className="text-sm text-stone-700">{item.text}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
