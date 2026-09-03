import type { BackgroundTheme, BoardTheme } from './settings';

export interface BoardThemeInfo {
  light: string;
  dark: string;
}

export interface BackgroundThemeInfo {
  image: string;
  /**
   * CSS fallback layered behind `image` via a comma-separated
   * background-image list (see app/page.tsx and app/opcoes/page.tsx) --
   * `image` isn't a real file yet (see this plan's header: Chess Sensei's
   * background-*.webp files were verified to contain chess board/piece
   * imagery, so they weren't copied, and new art is Phase 10 work), so it
   * 404s harmlessly and this gradient is what actually renders today. Once
   * Phase 10 drops a real file at `image`'s path, it paints over this with
   * no code change needed.
   */
  fallbackGradient: string;
}

/**
 * Single registry of each theme's assets -- the rest of the app never
 * writes a theme image path directly, only reads from here
 * (CheckersBoard.tsx, app/page.tsx, app/opcoes/page.tsx). Display LABELS
 * live in the i18n dictionary (Dictionary.boardThemeLabel/
 * backgroundThemeLabel), not here -- this registry is asset paths only, so
 * it never needs a locale.
 */
export const BOARD_THEMES: Record<BoardTheme, BoardThemeInfo> = {
  sakura: {
    light: '/board/sakura-light-square.webp',
    dark: '/board/sakura-dark-square.webp',
  },
  nebulosa: {
    light: '/board/nebulosa-light-square.webp',
    dark: '/board/nebulosa-dark-square.webp',
  },
  neon: {
    light: '/board/neon-light-square.webp',
    dark: '/board/neon-dark-square.webp',
  },
};

export const BACKGROUND_THEMES: Record<BackgroundTheme, BackgroundThemeInfo> = {
  templo: {
    image: '/menu/background-templo.webp',
    fallbackGradient: 'linear-gradient(160deg, #241246 0%, #1A0B33 55%, #3A1550 100%)',
  },
  dojo: {
    image: '/menu/background-dojo.webp',
    fallbackGradient: 'linear-gradient(160deg, #0B2E30 0%, #1A0B33 55%, #14324a 100%)',
  },
  cosmico: {
    image: '/menu/background-cosmico.webp',
    fallbackGradient: 'radial-gradient(circle at 50% 20%, #3A1550 0%, #1A0B33 60%, #0d0620 100%)',
  },
};
