'use client';

import type { ReactNode } from 'react';
import type { Locale } from '@/lib/i18n/types';
import type { Difficulty } from '@/lib/checkers/difficulty';
import type { PlayerColor } from '@/lib/checkers/playerColor';
import type { BackgroundTheme, BoardTheme, PieceStyle } from '@/lib/settings/settings';
import { BACKGROUND_THEMES, BOARD_THEMES } from '@/lib/settings/themes';
import { useSettings } from '@/lib/settings/useSettings';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { DICTIONARIES } from '@/lib/i18n/dictionaries';
import { PieceIcon } from '@/components/CheckersBoard/PieceIcon';
import { ChipButton } from '@/components/ChipButton/ChipButton';
import { PageGlow, PageHeader } from '@/components/PageChrome/PageChrome';
import { ToggleGroup } from '@/components/ToggleGroup/ToggleGroup';
import { useToast } from '@/components/Toast/ToastProvider';

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

export default function OpcoesPage() {
  const { settings, updateSettings } = useSettings();
  const { t } = useTranslation();
  const toast = useToast();

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

  const languageOptions: { value: Locale; label: string }[] = [
    { value: 'pt', label: t.opcoes.portuguese },
    { value: 'en', label: t.opcoes.english },
  ];

  const pieceStyleOptions: { id: PieceStyle; label: string }[] = [
    { id: 'classico', label: t.pieceStyleLabel.classico },
    { id: 'moderno', label: t.pieceStyleLabel.moderno },
    { id: 'anime', label: t.pieceStyleLabel.anime },
  ];

  const boardThemeOptions: { id: BoardTheme; label: string; image: string; image2: string }[] = (
    Object.keys(BOARD_THEMES) as BoardTheme[]
  ).map((id) => ({ id, label: t.boardThemeLabel[id], image: BOARD_THEMES[id].light, image2: BOARD_THEMES[id].dark }));

  const backgroundThemeOptions: { id: BackgroundTheme; label: string; image: string; fallbackGradient: string }[] = (
    Object.keys(BACKGROUND_THEMES) as BackgroundTheme[]
  ).map((id) => ({
    id,
    label: t.backgroundThemeLabel[id],
    image: BACKGROUND_THEMES[id].image,
    fallbackGradient: BACKGROUND_THEMES[id].fallbackGradient,
  }));

  return (
    <main className="relative flex flex-col items-center justify-start p-8 overflow-hidden bg-ink">
      <PageGlow pinkOpacity={0.25} />
      <div className="relative w-full max-w-sm">
        <PageHeader>{t.opcoes.title}</PageHeader>
        <p className="mt-3">
          <ChipButton color="purple" href="/">
            {t.common.mainMenu}
          </ChipButton>
        </p>
      </div>
      <div className="relative flex flex-col gap-6 max-w-sm w-full mt-8">
        <ToggleGroup
          legend={t.opcoes.defaultDifficultyLegend}
          options={difficultyOptions}
          value={settings.defaultDifficulty}
          onChange={(level) => {
            updateSettings({ defaultDifficulty: level });
            toast.show(t.opcoes.toastDifficultyChanged);
          }}
        />

        <ToggleGroup
          legend={t.opcoes.defaultColorLegend}
          options={colorOptions}
          value={settings.defaultColor}
          onChange={(value) => {
            updateSettings({ defaultColor: value });
            toast.show(t.opcoes.toastColorChanged);
          }}
        />

        <ToggleGroup
          legend={t.opcoes.language}
          options={languageOptions}
          value={settings.language}
          onChange={(language) => {
            updateSettings({ language });
            // Reads the message from the NEWLY selected locale's own
            // dictionary, not `t` (which is still the pre-update locale's
            // dictionary -- useSettings()'s store update hasn't re-rendered
            // this component yet within this same synchronous handler, so
            // `t.opcoes.toastLanguageChanged` would show the toast in the
            // language the user just switched AWAY from).
            toast.show(DICTIONARIES[language].opcoes.toastLanguageChanged);
          }}
        />

        <OptionPicker
          legend={t.opcoes.boardTheme}
          options={boardThemeOptions}
          value={settings.boardTheme}
          onChange={(boardTheme) => {
            updateSettings({ boardTheme });
            toast.show(t.opcoes.toastBoardThemeChanged);
          }}
          renderPreview={(opt) => <ThemeSwatch image={opt.image} image2={opt.image2} />}
        />
        <OptionPicker
          legend={t.opcoes.pieceStyle}
          options={pieceStyleOptions}
          value={settings.pieceStyle}
          onChange={(pieceStyle) => {
            updateSettings({ pieceStyle });
            toast.show(t.opcoes.toastPieceStyleChanged);
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
          legend={t.opcoes.backgroundImage}
          options={backgroundThemeOptions}
          value={settings.backgroundTheme}
          onChange={(backgroundTheme) => {
            updateSettings({ backgroundTheme });
            toast.show(t.opcoes.toastBackgroundChanged);
          }}
          renderPreview={(opt) => <ThemeSwatch image={opt.image} fallbackGradient={opt.fallbackGradient} />}
        />
      </div>
    </main>
  );
}
