'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Difficulty } from '@/lib/checkers/difficulty';
import { resolvePlayerColor, type PlayerColor } from '@/lib/checkers/playerColor';
import { clearSavedGame } from '@/lib/checkers/useCheckersGame';
import { useSettings } from '@/lib/settings/useSettings';

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 'facil', label: 'Fácil' },
  { value: 'medio', label: 'Médio' },
  { value: 'dificil', label: 'Difícil' },
];

const COLOR_OPTIONS: { value: PlayerColor; label: string }[] = [
  { value: 'b', label: 'Pretas' },
  { value: 'w', label: 'Brancas' },
  { value: 'random', label: 'Aleatório' },
];

export default function ConfigurarPage() {
  const router = useRouter();
  const { settings } = useSettings();
  const [difficulty, setDifficulty] = useState<Difficulty>(settings.defaultDifficulty);
  const [color, setColor] = useState<PlayerColor>(settings.defaultColor);

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
      <h1 className="text-2xl font-bold">Jogar contra o computador</h1>

      <fieldset className="flex flex-col items-center gap-2">
        <legend className="mb-1 font-semibold">Dificuldade</legend>
        <div className="flex gap-2">
          {DIFFICULTY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDifficulty(option.value)}
              aria-pressed={difficulty === option.value}
              className={`rounded px-3 py-2 ${difficulty === option.value ? 'bg-stone-700 text-white' : 'bg-stone-200'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col items-center gap-2">
        <legend className="mb-1 font-semibold">Cor</legend>
        <div className="flex gap-2">
          {COLOR_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setColor(option.value)}
              aria-pressed={color === option.value}
              className={`rounded px-3 py-2 ${color === option.value ? 'bg-stone-700 text-white' : 'bg-stone-200'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <button type="button" onClick={handleStart} className="rounded bg-emerald-600 px-6 py-3 font-bold text-white">
        Começar
      </button>

      <Link href="/" className="underline">
        Menu inicial
      </Link>
    </main>
  );
}
