'use client';

import { useEffect } from 'react';
import { MODAL_BACKDROP_CLASS, PageTitle } from '@/components/PageChrome/PageChrome';
import { ChipButton } from '@/components/ChipButton/ChipButton';
import { useFocusTrap } from '@/lib/ui/useFocusTrap';

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// Generic confirmation popup -- same self-contained pattern as GameEndModal/
// RulesModal (backdrop, role="dialog", focus trap, Escape closes), but no
// ✕ button: with only two actions (confirm/cancel), a third place to say
// "no" would be redundant. Escape and a backdrop click both count as
// cancel, same as clicking cancelLabel explicitly. Chrome ported from
// Chess Sensei's own ConfirmModal.tsx (see docs/superpowers/plans/
// 2026-09-04-ui-parity-and-game-completion.md) -- the same
// MODAL_BACKDROP_CLASS/PageTitle/ChipButton building blocks GameEndModal
// already uses in this repo. Props/behavior are unchanged from before this
// restyle.
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const panelRef = useFocusTrap(open);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div data-testid="confirm-modal-backdrop" onClick={onCancel} className={MODAL_BACKDROP_CLASS}>
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border-2 border-purple bg-ink-soft p-6 text-lilac outline-none"
      >
        <PageTitle as="h2" size="text-xl" strokeWidth={1} className="mb-2">
          {title}
        </PageTitle>
        <p className="mb-5 text-sm text-lilac/80">{message}</p>
        <div className="flex gap-3">
          <ChipButton color="pink" onClick={onConfirm}>
            {confirmLabel}
          </ChipButton>
          <ChipButton color="purple" onClick={onCancel}>
            {cancelLabel}
          </ChipButton>
        </div>
      </div>
    </div>
  );
}
