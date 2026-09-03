'use client';

import { useEffect } from 'react';
import { useFocusTrap } from '@/lib/ui/useFocusTrap';
import { useTranslation } from '@/lib/i18n/useTranslation';

export interface RulesModalProps {
  open: boolean;
  onClose: () => void;
}

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

  // Content per design spec §5's explicit list for this modal's checkers
  // version: man/king movement, mandatory capture, multi-jump, promotion,
  // draw conditions. Built from the shared dictionary (t.rulesModal) as of
  // the i18n UI retrofit plan (Phase 8b) -- previously a hardcoded PT array.
  const sections = [
    { title: t.rulesModal.movementTitle, items: [t.rulesModal.man, t.rulesModal.king] },
    { title: t.rulesModal.mandatoryCaptureTitle, items: [t.rulesModal.mandatoryCapture, t.rulesModal.multiJump] },
    { title: t.rulesModal.promotionTitle, items: [t.rulesModal.promotion] },
    { title: t.rulesModal.drawTitle, items: [t.rulesModal.repetition, t.rulesModal.noCaptureDraw] },
  ];

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
        aria-label={t.rulesModal.title}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-2xl border-2 border-stone-700 bg-white p-6 text-stone-900 outline-none"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-2xl font-bold">{t.rulesModal.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="rounded-full h-8 w-8 shrink-0 bg-stone-200 font-bold hover:scale-110 transition-transform"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-5">
          {sections.map((section) => (
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
