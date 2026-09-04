'use client';

import { useEffect } from 'react';
import { MODAL_BACKDROP_CLASS, PageTitle } from '@/components/PageChrome/PageChrome';
import { useFocusTrap } from '@/lib/ui/useFocusTrap';
import { useTranslation } from '@/lib/i18n/useTranslation';

export interface RulesModalProps {
  open: boolean;
  onClose: () => void;
}

// Chrome ported from Chess Sensei's own RulesModal.tsx (see
// docs/superpowers/plans/2026-09-04-ui-parity-and-game-completion.md).
// Content is unchanged from before this restyle -- man/king movement,
// mandatory capture, multi-jump, promotion, draw conditions (design spec
// §5's checkers-specific list), read from the shared dictionary
// (t.rulesModal) same as before.
export function RulesModal({ open, onClose }: RulesModalProps) {
  const { t } = useTranslation();
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

  const sections = [
    { title: t.rulesModal.movementTitle, items: [t.rulesModal.man, t.rulesModal.king] },
    { title: t.rulesModal.mandatoryCaptureTitle, items: [t.rulesModal.mandatoryCapture, t.rulesModal.multiJump] },
    { title: t.rulesModal.promotionTitle, items: [t.rulesModal.promotion] },
    { title: t.rulesModal.drawTitle, items: [t.rulesModal.repetition, t.rulesModal.noCaptureDraw] },
  ];

  return (
    <div data-testid="rules-modal-backdrop" onClick={onClose} className={MODAL_BACKDROP_CLASS}>
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={t.rulesModal.title}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-2xl border-2 border-purple bg-ink-soft p-6 text-lilac outline-none"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <PageTitle as="h2" size="text-2xl" strokeWidth={1}>
            {t.rulesModal.title}
          </PageTitle>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="rounded-full h-8 w-8 shrink-0 bg-pink text-[#3A0B1F] font-bold hover:scale-110 transition-transform"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-5">
          {sections.map((section) => (
            <section key={section.title}>
              <h3 className="mb-2 font-semibold text-cyan">{section.title}</h3>
              <dl className="flex flex-col gap-2">
                {section.items.map((item) => (
                  <div key={item.title}>
                    <dt className="font-medium text-white">{item.title}</dt>
                    <dd className="text-sm text-lilac/80">{item.text}</dd>
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
