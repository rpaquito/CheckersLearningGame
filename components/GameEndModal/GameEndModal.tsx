'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import type { Color, GameStatus } from '@/lib/checkers/types';
import { describeGameEnd } from '@/lib/checkers/gameEndMessage';
import { useFocusTrap } from '@/lib/ui/useFocusTrap';
import { useTranslation } from '@/lib/i18n/useTranslation';

export interface GameEndModalProps {
  open: boolean;
  status: GameStatus;
  mode: 'ai' | 'local';
  humanColor: Color;
  turn: Color;
  onClose: () => void;
  onPlayAgain: () => void;
}

const KIND_ACCENT: Record<'win' | 'lose' | 'draw', string> = {
  win: 'border-emerald-500',
  lose: 'border-red-500',
  draw: 'border-amber-500',
};

// Self-contained like ConfirmModal/RulesModal (backdrop, role="dialog",
// focus trap, Escape closes) rather than going through ToastProvider --
// only /jogar uses it and needs page-specific callbacks (onPlayAgain).
// Text/button only in this plan -- no mascot illustration or confetti
// (Phase 10, see this plan's Global Constraints).
export function GameEndModal({ open, status, mode, humanColor, turn, onClose, onPlayAgain }: GameEndModalProps) {
  const { t, locale } = useTranslation();
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
  const result = describeGameEnd(status, mode, humanColor, turn, locale);
  if (!result) return null;
  const { title, kind } = result;

  return (
    <div
      data-testid="game-end-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className={`w-full max-w-sm rounded-2xl border-2 ${KIND_ACCENT[kind]} bg-white p-6 text-stone-900 outline-none`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="rounded-full h-8 w-8 shrink-0 bg-stone-200 font-bold hover:scale-110 transition-transform"
          >
            ✕
          </button>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onPlayAgain}
            className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white"
          >
            {t.gameEndModal.playAgain}
          </button>
          <Link href="/" className="rounded-xl bg-stone-200 px-4 py-2 font-bold text-stone-900">
            {t.common.mainMenu}
          </Link>
        </div>
      </div>
    </div>
  );
}
