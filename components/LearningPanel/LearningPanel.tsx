'use client';

import { ACTIVE_TOGGLE_STYLE } from '@/lib/ui/activeToggleStyle';
import { useTranslation } from '@/lib/i18n/useTranslation';

export interface LearningPanelProps {
  enabled: boolean;
  onToggle: () => void;
  // Beyond spec §5's exact prop list: LearningPanel is a "dumb" component
  // (same philosophy as CheckersBoard) -- it doesn't know whether it's the
  // human's turn or the game has ended, so the caller (app/jogar/page.tsx)
  // decides via this flag whether the suggestion button is clickable.
  canRequestSuggestion: boolean;
  onRequestSuggestion: () => void;
  suggestionLoading: boolean;
  hasSuggestion: boolean;
  suggestionExplanation: string | null;
}

// Chrome ported from Chess Sensei's own LearningPanel.tsx (see
// docs/superpowers/plans/2026-09-04-ui-parity-and-game-completion.md) --
// container/colors/ACTIVE_TOGGLE_STYLE match, but the enable toggle stays
// a plain button (not chess's checkbox input): this component's onToggle
// is `() => void`, not `(enabled: boolean) => void` -- an established,
// different contract this restyle does not change.
export function LearningPanel({
  enabled,
  onToggle,
  canRequestSuggestion,
  onRequestSuggestion,
  suggestionLoading,
  hasSuggestion,
  suggestionExplanation,
}: LearningPanelProps) {
  const { t } = useTranslation();
  return (
    <aside className="flex flex-col gap-4 w-full max-w-xs border-2 border-cyan rounded-2xl p-4 bg-ink-soft text-lilac">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={enabled}
        style={enabled ? ACTIVE_TOGGLE_STYLE : undefined}
        className={`rounded-xl px-3 py-2 font-semibold text-center transition-transform hover:scale-[1.02] ${
          enabled ? 'shadow-[3px_3px_0_rgba(0,0,0,0.35)]' : 'border-2 border-purple/40 text-lilac'
        }`}
      >
        {enabled ? t.learningPanel.disable : t.learningPanel.enable}
      </button>
      {enabled && (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onRequestSuggestion}
            disabled={!canRequestSuggestion || suggestionLoading}
            className="rounded-lg px-3 py-2 font-semibold text-white shadow-[3px_3px_0_rgba(0,0,0,0.35)] disabled:opacity-50 transition-transform enabled:hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #B87FDB, #7B3FA0)' }}
          >
            {suggestionLoading ? t.learningPanel.suggestionLoading : t.learningPanel.suggestMove}
          </button>
          {hasSuggestion && suggestionExplanation && (
            <p className="text-center text-sm text-lilac/80">{suggestionExplanation}</p>
          )}
        </div>
      )}
    </aside>
  );
}
