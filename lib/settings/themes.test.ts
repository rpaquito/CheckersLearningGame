import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { BOARD_THEMES, BACKGROUND_THEMES } from './themes';
import type { BoardTheme, BackgroundTheme } from './settings';

const ALL_BOARD_THEMES: BoardTheme[] = ['sakura', 'nebulosa', 'neon'];
const ALL_BACKGROUND_THEMES: BackgroundTheme[] = ['templo', 'dojo', 'cosmico'];

describe('BOARD_THEMES', () => {
  it('has a registry entry for every BoardTheme value', () => {
    for (const theme of ALL_BOARD_THEMES) {
      expect(BOARD_THEMES[theme]).toBeDefined();
      expect(BOARD_THEMES[theme].light).toMatch(/^\/board\//);
      expect(BOARD_THEMES[theme].dark).toMatch(/^\/board\//);
    }
  });

  it('board theme asset paths resolve to real files on disk', () => {
    for (const theme of ALL_BOARD_THEMES) {
      const themeInfo = BOARD_THEMES[theme];
      const lightPath = join(process.cwd(), 'public', themeInfo.light);
      const darkPath = join(process.cwd(), 'public', themeInfo.dark);
      expect(existsSync(lightPath)).toBe(true);
      expect(existsSync(darkPath)).toBe(true);
    }
  });
});

describe('BACKGROUND_THEMES', () => {
  it('has a registry entry for every BackgroundTheme value', () => {
    for (const theme of ALL_BACKGROUND_THEMES) {
      expect(BACKGROUND_THEMES[theme]).toBeDefined();
      expect(BACKGROUND_THEMES[theme].image).toMatch(/^\/menu\//);
      expect(BACKGROUND_THEMES[theme].fallbackGradient.length).toBeGreaterThan(0);
    }
  });

  it('gives each background theme a visibly distinct fallback gradient', () => {
    const gradients = ALL_BACKGROUND_THEMES.map((theme) => BACKGROUND_THEMES[theme].fallbackGradient);
    expect(new Set(gradients).size).toBe(ALL_BACKGROUND_THEMES.length);
  });
});
