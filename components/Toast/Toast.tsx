'use client';

import type { MoveQuality } from '@/lib/checkers/moveClassification';
import { useTranslation } from '@/lib/i18n/useTranslation';

// 'boa'/'imprecisao'/'erro' (MoveQuality) reused as tones -- this toast is
// how Phase 4b (learning mode) will surface last-move-quality feedback,
// with the same semantic colors the eventual quality badge will use. No
// 'check' tone here (unlike Chess Sensei's ToastTone): checkers has no
// concept that blocks board interaction until acknowledged (see spec §4 --
// illegal moves are simply never offered, nothing to react to), so every
// tone here auto-dismisses.
export type ToastTone = 'info' | MoveQuality;

export interface ToastState {
  id: number;
  message: string;
  tone: ToastTone;
}

export interface ToastProps {
  toast: ToastState | null;
  onDismiss: () => void;
}

const TONE_ACCENT: Record<ToastTone, string> = {
  info: 'border-sky-500',
  boa: 'border-emerald-500',
  imprecisao: 'border-amber-500',
  erro: 'border-red-500',
};

// Pure toast card -- no timer, closes only manually (via onDismiss) or when
// the provider replaces/auto-dismisses it. The wrapper (role="status"/
// aria-live="polite") stays mounted even with no toast -- only the card
// inside enters/exits, with key={toast.id} forcing React to remount that
// subtree even when the message is identical to the previous one (e.g. two
// "Boa jogada!" toasts in a row would otherwise not re-announce to screen
// readers or show a visible repaint on the second call).
export function Toast({ toast, onDismiss }: ToastProps) {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-[max(1rem,calc(env(safe-area-inset-top)+0.5rem))] left-1/2 -translate-x-1/2 z-[60]"
    >
      {toast && (
        <div
          key={toast.id}
          data-testid="toast-card"
          className={`flex items-center gap-3 rounded-xl border-2 ${TONE_ACCENT[toast.tone]} bg-white px-4 py-2 text-stone-900 shadow-[3px_3px_0_rgba(0,0,0,0.2)]`}
        >
          <p className="text-sm font-medium">{toast.message}</p>
          <button
            type="button"
            onClick={onDismiss}
            aria-label={t.common.close}
            className="rounded-full h-6 w-6 shrink-0 bg-stone-200 font-bold hover:scale-110 transition-transform"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
