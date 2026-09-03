'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Difficulty } from '@/lib/checkers/difficulty';
import { resolvePlayerColor, type PlayerColor } from '@/lib/checkers/playerColor';
import { clearSavedGame } from '@/lib/checkers/useCheckersGame';
import { useSettings } from '@/lib/settings/useSettings';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function ConfigurarPage() {
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
    // Resolve 'random' HERE, once per game, and put the concrete 'b'/'w' in
    // the URL. /jogar restores a saved position from localStorage on mount,
    // so if the URL still said `color=random` a mid-game reload would
    // re-roll the coin and hand the human the opposite side of the board it
    // had been playing half the time.
    const params = new URLSearchParams({ mode: 'ai', difficulty, color: resolvePlayerColor(color) });
    router.push(`/jogar?${params.toString()}`);
  }

  return (
    <main className="flex min-h-dvh flex-col items-center gap-6 p-4">
      <h1 className="text-2xl font-bold">{t.configurar.title}</h1>

      <fieldset className="flex flex-col items-center gap-2">
        <legend className="mb-1 font-semibold">{t.configurar.difficultyLegend}</legend>
        <div className="flex gap-2">
          {difficultyOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDifficultyOverride(option.value)}
              aria-pressed={difficulty === option.value}
              className={`rounded px-3 py-2 ${difficulty === option.value ? 'bg-stone-700 text-white' : 'bg-stone-200'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col items-center gap-2">
        <legend className="mb-1 font-semibold">{t.configurar.colorLegend}</legend>
        <div className="flex gap-2">
          {colorOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setColorOverride(option.value)}
              aria-pressed={color === option.value}
              className={`rounded px-3 py-2 ${color === option.value ? 'bg-stone-700 text-white' : 'bg-stone-200'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <button type="button" onClick={handleStart} className="rounded bg-emerald-600 px-6 py-3 font-bold text-white">
        {t.configurar.start}
      </button>

      <Link href="/" className="underline">
        {t.common.mainMenu}
      </Link>
    </main>
  );
}
