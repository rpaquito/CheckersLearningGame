'use client';

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
    <div className="flex w-full max-w-md flex-col items-center gap-2">
      <button type="button" onClick={onToggle} className="underline">
        {enabled ? t.learningPanel.disable : t.learningPanel.enable}
      </button>
      {enabled && (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onRequestSuggestion}
            disabled={!canRequestSuggestion || suggestionLoading}
            className="rounded-xl border-2 border-violet-400 bg-white px-4 py-1 text-sm font-medium text-stone-900 disabled:opacity-50"
          >
            {suggestionLoading ? t.learningPanel.suggestionLoading : t.learningPanel.suggestMove}
          </button>
          {hasSuggestion && suggestionExplanation && (
            <p className="text-center text-sm text-stone-700">{suggestionExplanation}</p>
          )}
        </div>
      )}
    </div>
  );
}
