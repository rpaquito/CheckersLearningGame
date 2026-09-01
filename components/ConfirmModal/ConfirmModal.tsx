'use client';

import { useEffect } from 'react';
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
// cancel, same as clicking cancelLabel explicitly. Used by /jogar (Task 7)
// to confirm "Reiniciar partida"/"Menu inicial" when there's progress to
// lose, but generic enough for other call sites later.
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
    <div
      data-testid="confirm-modal-backdrop"
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border-2 border-stone-700 bg-white p-6 text-stone-900 outline-none"
      >
        <h2 className="mb-2 text-xl font-bold">{title}</h2>
        <p className="mb-5 text-sm text-stone-700">{message}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white"
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl bg-stone-200 px-4 py-2 font-bold text-stone-900"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
