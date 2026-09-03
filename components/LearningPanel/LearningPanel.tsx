'use client';

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

// Plain Tailwind, hardcoded Portuguese -- matches every other /jogar
// component so far (no PageChrome/ChipButton until Phase 5, no i18n until
// Phase 8).
export function LearningPanel({
  enabled,
  onToggle,
  canRequestSuggestion,
  onRequestSuggestion,
  suggestionLoading,
  hasSuggestion,
  suggestionExplanation,
}: LearningPanelProps) {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-2">
      <button type="button" onClick={onToggle} className="underline">
        {enabled ? 'Desativar modo de aprendizagem' : 'Ativar modo de aprendizagem'}
      </button>
      {enabled && (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onRequestSuggestion}
            disabled={!canRequestSuggestion || suggestionLoading}
            className="rounded-xl border-2 border-violet-400 bg-white px-4 py-1 text-sm font-medium text-stone-900 disabled:opacity-50"
          >
            {suggestionLoading ? 'A calcular…' : 'Sugerir jogada'}
          </button>
          {hasSuggestion && suggestionExplanation && (
            <p className="text-center text-sm text-stone-700">{suggestionExplanation}</p>
          )}
        </div>
      )}
    </div>
  );
}
