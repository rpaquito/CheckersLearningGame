'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Difficulty } from '@/lib/checkers/difficulty';
import { resolvePlayerColor, type PlayerColor } from '@/lib/checkers/playerColor';
import { clearSavedGame } from '@/lib/checkers/useCheckersGame';
import { useSettings } from '@/lib/settings/useSettings';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { ToggleGroup } from '@/components/ToggleGroup/ToggleGroup';

// Difficulty/color pre-fill from the saved Settings, but choosing here is
// only for this one game -- it never writes back to Settings (only
// /opcoes does that). Uses the "override" pattern (nullable useState +
// `?? settings.default...`), NOT a plain `useState(settings.x)`
// initializer like Chess Sensei's own GameSetup -- see CLAUDE.md
// ("`/configurar`'s initial difficulty/color reads from `useSettings()`
// via an "override" pattern") for why the plain form is wrong here:
// useSyncExternalStore's server/first-render snapshot is always
// DEFAULT_SETTINGS, and a plain initializer freezes on that value
// forever instead of picking up the real settings once they load
// post-hydration. This is exactly the pattern /configurar/page.tsx
// itself used before this component existed.
export function GameSetup() {
  const router = useRouter();
  const { settings } = useSettings();
  const { t } = useTranslation();
  const [difficultyOverride, setDifficultyOverride] = useState<Difficulty | null>(null);
  const [colorOverride, setColorOverride] = useState<PlayerColor | null>(null);
  const difficulty = difficultyOverride ?? settings.defaultDifficulty;
  const color = colorOverride ?? settings.defaultColor;

  const difficultyOptions: { value: Difficulty; label: string }[] = [
    { value: 'facil', label: t.difficulty.facil },
    { value: 'medio', label: t.difficulty.medio },
    { value: 'dificil', label: t.difficulty.dificil },
  ];

  const colorOptions: { value: PlayerColor; label: string }[] = [
    { value: 'b', label: t.color.black },
    { value: 'w', label: t.color.white },
    { value: 'random', label: t.color.random },
  ];

  function handleStart() {
    clearSavedGame();
    // Resolve 'random' HERE, once per game, and put the concrete 'b'/'w'
    // in the URL -- see CLAUDE.md ("`color=random` is resolved by
    // `/configurar`, never by `/jogar`") for why /jogar must never see
    // `color=random` in its own URL.
    const params = new URLSearchParams({ mode: 'ai', difficulty, color: resolvePlayerColor(color) });
    router.push(`/jogar?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-6 max-w-sm mx-auto w-full">
      <ToggleGroup
        legend={t.configurar.difficultyLegend}
        options={difficultyOptions}
        value={difficulty}
        onChange={setDifficultyOverride}
      />
      <ToggleGroup
        legend={t.configurar.colorLegend}
        options={colorOptions}
        value={color}
        onChange={setColorOverride}
      />
      <button
        type="button"
        onClick={handleStart}
        className="rounded-xl px-4 py-3 font-bold text-[#0B2E30] shadow-[4px_4px_0_rgba(0,0,0,0.35)] transition-transform hover:scale-[1.02]"
        style={{ background: 'linear-gradient(135deg, #FFD600, #FFA800)' }}
      >
        {t.configurar.start}
      </button>
    </div>
  );
}
