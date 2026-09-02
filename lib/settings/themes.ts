import type { BackgroundTheme, BoardTheme } from './settings';

export interface BoardThemeInfo {
  label: string;
  light: string;
  dark: string;
}

export interface BackgroundThemeInfo {
  label: string;
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
 * (CheckersBoard.tsx, app/page.tsx, app/opcoes/page.tsx).
 */
export const BOARD_THEMES: Record<BoardTheme, BoardThemeInfo> = {
  sakura: {
    label: 'Sakura',
    light: '/board/sakura-light-square.webp',
    dark: '/board/sakura-dark-square.webp',
  },
  nebulosa: {
    label: 'Nebulosa',
    light: '/board/nebulosa-light-square.webp',
    dark: '/board/nebulosa-dark-square.webp',
  },
  neon: {
    label: 'Néon',
    light: '/board/neon-light-square.webp',
    dark: '/board/neon-dark-square.webp',
  },
};

export const BACKGROUND_THEMES: Record<BackgroundTheme, BackgroundThemeInfo> = {
  templo: {
    label: 'Templo',
    image: '/menu/background-templo.webp',
    fallbackGradient: 'linear-gradient(160deg, #241246 0%, #1A0B33 55%, #3A1550 100%)',
  },
  dojo: {
    label: 'Dojo',
    image: '/menu/background-dojo.webp',
    fallbackGradient: 'linear-gradient(160deg, #0B2E30 0%, #1A0B33 55%, #14324a 100%)',
  },
  cosmico: {
    label: 'Cósmico',
    image: '/menu/background-cosmico.webp',
    fallbackGradient: 'radial-gradient(circle at 50% 20%, #3A1550 0%, #1A0B33 60%, #0d0620 100%)',
  },
};
