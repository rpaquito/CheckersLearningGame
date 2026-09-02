import type { Difficulty } from '@/lib/checkers/difficulty';
import type { PlayerColor } from '@/lib/checkers/playerColor';

// Defined locally rather than imported from lib/checkers/moveExplanation.ts
// (which already declares an identical Locale) -- lib/settings/ has no
// reason to depend on lib/checkers/ for a two-value string union, and
// neither module should depend on the other just for this type. Both fold
// into a shared lib/i18n/types.ts in Phase 8.
export type Locale = 'pt' | 'en';

export type BoardTheme = 'sakura' | 'nebulosa' | 'neon';
export type BackgroundTheme = 'templo' | 'dojo' | 'cosmico';
export type PieceStyle = 'classico' | 'moderno' | 'anime';

export interface Settings {
  defaultDifficulty: Difficulty;
  defaultColor: PlayerColor;
  boardTheme: BoardTheme;
  backgroundTheme: BackgroundTheme;
  pieceStyle: PieceStyle;
  language: Locale;
}

export const DEFAULT_SETTINGS: Settings = {
  defaultDifficulty: 'facil',
  defaultColor: 'w',
  boardTheme: 'nebulosa',
  backgroundTheme: 'templo',
  pieceStyle: 'anime',
  language: 'pt',
};

// English, project-native from day one -- unlike chess's 'xadrez-settings'
// (which reflects that project's own pre-rebrand history), there's no
// reason to import that naming inconsistency here.
const STORAGE_KEY = 'checkers-settings';

const VALID_DIFFICULTIES: readonly Difficulty[] = ['facil', 'medio', 'dificil'];
const VALID_COLORS: readonly PlayerColor[] = ['b', 'w', 'random'];
const VALID_BOARD_THEMES: readonly BoardTheme[] = ['sakura', 'nebulosa', 'neon'];
const VALID_BACKGROUND_THEMES: readonly BackgroundTheme[] = ['templo', 'dojo', 'cosmico'];
const VALID_PIECE_STYLES: readonly PieceStyle[] = ['classico', 'moderno', 'anime'];
const VALID_LOCALES: readonly Locale[] = ['pt', 'en'];

/** Validates a stored value against a field's list of valid values,
 * returning it (type-narrowed) only if it matches one of them. */
function pickValid<T extends string>(value: unknown, valid: readonly T[], fallback: T): T {
  return typeof value === 'string' && (valid as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/**
 * Reads settings saved in localStorage. Missing, corrupted, or
 * old-shaped data falls back to defaults field-by-field -- one invalid
 * setting must not blow up the whole app or wipe out the other,
 * still-valid settings.
 */
export function loadSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    const candidate: Record<string, unknown> =
      typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};

    return {
      defaultDifficulty: pickValid(
        candidate.defaultDifficulty,
        VALID_DIFFICULTIES,
        DEFAULT_SETTINGS.defaultDifficulty
      ),
      defaultColor: pickValid(candidate.defaultColor, VALID_COLORS, DEFAULT_SETTINGS.defaultColor),
      boardTheme: pickValid(candidate.boardTheme, VALID_BOARD_THEMES, DEFAULT_SETTINGS.boardTheme),
      backgroundTheme: pickValid(
        candidate.backgroundTheme,
        VALID_BACKGROUND_THEMES,
        DEFAULT_SETTINGS.backgroundTheme
      ),
      pieceStyle: pickValid(candidate.pieceStyle, VALID_PIECE_STYLES, DEFAULT_SETTINGS.pieceStyle),
      language: pickValid(candidate.language, VALID_LOCALES, DEFAULT_SETTINGS.language),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage unavailable (private mode, full quota) -- choices just
    // don't persist across visits, nothing else in the app breaks.
  }
}
