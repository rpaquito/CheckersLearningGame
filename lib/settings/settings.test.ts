import { describe, expect, it, beforeEach } from 'vitest';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from './settings';

const STORAGE_KEY = 'checkers-settings';

describe('loadSettings', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns the defaults when nothing is saved', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('returns previously saved settings', () => {
    saveSettings({ ...DEFAULT_SETTINGS, defaultDifficulty: 'dificil', defaultColor: 'b' });
    expect(loadSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      defaultDifficulty: 'dificil',
      defaultColor: 'b',
    });
  });

  it('falls back to defaults field-by-field when one field is invalid', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_SETTINGS, defaultDifficulty: 'impossivel', defaultColor: 'b' })
    );
    expect(loadSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      defaultDifficulty: DEFAULT_SETTINGS.defaultDifficulty,
      defaultColor: 'b',
    });
  });

  it('falls back to defaults entirely when the saved data is not valid JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, 'not json{{{');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('falls back to defaults when the saved value is not an object', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify('a string, not an object'));
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('returns previously saved theme choices', () => {
    saveSettings({ ...DEFAULT_SETTINGS, boardTheme: 'neon', backgroundTheme: 'dojo' });
    expect(loadSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      boardTheme: 'neon',
      backgroundTheme: 'dojo',
    });
  });

  it('falls back to default theme choices when saved values are invalid', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_SETTINGS, boardTheme: 'nao-existe', backgroundTheme: 42 })
    );
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('returns a previously saved piece style', () => {
    saveSettings({ ...DEFAULT_SETTINGS, pieceStyle: 'moderno' });
    expect(loadSettings()).toEqual({ ...DEFAULT_SETTINGS, pieceStyle: 'moderno' });
  });

  it('falls back to the default piece style when the saved value is invalid', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_SETTINGS, pieceStyle: 'nao-existe' })
    );
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('DEFAULT_SETTINGS.language is "pt" with no auto-detection involved', () => {
    expect(DEFAULT_SETTINGS.language).toBe('pt');
  });

  it('falls back to the default language when the saved value is invalid', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, language: 'fr' }));
    expect(loadSettings().language).toBe('pt');
  });
});

describe('saveSettings', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persists settings that loadSettings can read back', () => {
    saveSettings({ ...DEFAULT_SETTINGS, defaultDifficulty: 'medio', defaultColor: 'random' });
    expect(loadSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      defaultDifficulty: 'medio',
      defaultColor: 'random',
    });
  });
});
