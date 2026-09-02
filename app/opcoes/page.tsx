'use client';

import type { ReactNode } from 'react';
import type { Difficulty } from '@/lib/checkers/difficulty';
import type { PlayerColor } from '@/lib/checkers/playerColor';
import type { BackgroundTheme, BoardTheme, PieceStyle } from '@/lib/settings/settings';
import { BACKGROUND_THEMES, BOARD_THEMES } from '@/lib/settings/themes';
import { useSettings } from '@/lib/settings/useSettings';
import { PieceIcon } from '@/components/CheckersBoard/PieceIcon';
import { ChipButton } from '@/components/ChipButton/ChipButton';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';
import { ToggleGroup } from '@/components/ToggleGroup/ToggleGroup';
import { useToast } from '@/components/Toast/ToastProvider';

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

const PIECE_STYLE_OPTIONS: { id: PieceStyle; label: string }[] = [
  { id: 'classico', label: 'Clássico' },
  { id: 'moderno', label: 'Moderno' },
  { id: 'anime', label: 'Anime' },
];

// Shared button shell for every option picker on this page (board theme,
// piece style, background) -- only the thumbnail inside changes between
// callers, via `renderPreview`.
function OptionPicker<T extends string, Opt extends { id: T; label: string }>({
  legend,
  options,
  value,
  onChange,
  renderPreview,
}: {
  legend: string;
  options: Opt[];
  value: T;
  onChange: (id: T) => void;
  renderPreview: (opt: Opt) => ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="font-medium mb-1 text-white">{legend}</legend>
      <div className="flex gap-3">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            aria-pressed={value === opt.id}
            className={`flex flex-col items-center gap-1 rounded-xl border-2 p-1 transition-transform hover:scale-[1.03] ${
              value === opt.id ? 'border-cyan ring-2 ring-cyan' : 'border-purple/40'
            }`}
          >
            {renderPreview(opt)}
            <span className="text-xs text-lilac">{opt.label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function ThemeSwatch({ image, image2, fallbackGradient }: { image: string; image2?: string; fallbackGradient?: string }) {
  if (image2) {
    return (
      <span className="grid h-16 w-16 grid-cols-2 grid-rows-2 overflow-hidden rounded">
        <span style={{ backgroundImage: `url(${image})`, backgroundSize: 'cover' }} />
        <span style={{ backgroundImage: `url(${image2})`, backgroundSize: 'cover' }} />
        <span style={{ backgroundImage: `url(${image2})`, backgroundSize: 'cover' }} />
        <span style={{ backgroundImage: `url(${image})`, backgroundSize: 'cover' }} />
      </span>
    );
  }
  const backgroundImage = fallbackGradient ? `url(${image}), ${fallbackGradient}` : `url(${image})`;
  return <span className="h-16 w-16 rounded bg-cover bg-center" style={{ backgroundImage }} />;
}

const BOARD_THEME_OPTIONS: { id: BoardTheme; label: string; image: string; image2: string }[] = (
  Object.keys(BOARD_THEMES) as BoardTheme[]
).map((id) => ({ id, label: BOARD_THEMES[id].label, image: BOARD_THEMES[id].light, image2: BOARD_THEMES[id].dark }));

const BACKGROUND_THEME_OPTIONS: { id: BackgroundTheme; label: string; image: string; fallbackGradient: string }[] = (
  Object.keys(BACKGROUND_THEMES) as BackgroundTheme[]
).map((id) => ({
  id,
  label: BACKGROUND_THEMES[id].label,
  image: BACKGROUND_THEMES[id].image,
  fallbackGradient: BACKGROUND_THEMES[id].fallbackGradient,
}));

export default function OpcoesPage() {
  const { settings, updateSettings } = useSettings();
  const toast = useToast();

  return (
    <main className="relative flex flex-col items-center justify-start p-8 overflow-hidden bg-ink">
      <PageGlow pinkOpacity={0.25} />
      <div className="relative w-full max-w-sm">
        <PageHeader>Opções</PageHeader>
        <p className="mt-3">
          <ChipButton color="purple" href="/">
            Menu inicial
          </ChipButton>
        </p>
      </div>
      <div className="relative flex flex-col gap-6 max-w-sm w-full mt-8">
        <ToggleGroup
          legend="Dificuldade por omissão"
          options={DIFFICULTY_OPTIONS}
          value={settings.defaultDifficulty}
          onChange={(level) => {
            updateSettings({ defaultDifficulty: level });
            toast.show('Dificuldade por omissão atualizada.');
          }}
        />

        <ToggleGroup
          legend="Cor por omissão"
          options={COLOR_OPTIONS}
          value={settings.defaultColor}
          onChange={(value) => {
            updateSettings({ defaultColor: value });
            toast.show('Cor por omissão atualizada.');
          }}
        />

        <OptionPicker
          legend="Tema do tabuleiro"
          options={BOARD_THEME_OPTIONS}
          value={settings.boardTheme}
          onChange={(boardTheme) => {
            updateSettings({ boardTheme });
            toast.show('Tema do tabuleiro atualizado.');
          }}
          renderPreview={(opt) => <ThemeSwatch image={opt.image} image2={opt.image2} />}
        />
        <OptionPicker
          legend="Estilo das peças"
          options={PIECE_STYLE_OPTIONS}
          value={settings.pieceStyle}
          onChange={(pieceStyle) => {
            updateSettings({ pieceStyle });
            toast.show('Estilo das peças atualizado.');
          }}
          renderPreview={(opt) => (
            <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-ink">
              <span className="h-12 w-12 text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.9)]">
                <PieceIcon type="king" style={opt.id} />
              </span>
            </span>
          )}
        />
        <OptionPicker
          legend="Imagem de fundo"
          options={BACKGROUND_THEME_OPTIONS}
          value={settings.backgroundTheme}
          onChange={(backgroundTheme) => {
            updateSettings({ backgroundTheme });
            toast.show('Imagem de fundo atualizada.');
          }}
          renderPreview={(opt) => <ThemeSwatch image={opt.image} fallbackGradient={opt.fallbackGradient} />}
        />
      </div>
    </main>
  );
}
