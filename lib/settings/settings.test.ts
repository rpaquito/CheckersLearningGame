import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from './settings';

const STORAGE_KEY = 'checkers-settings';

// File-wide, not per-describe: without this, a `vi.stubGlobal('navigator', ...)`
// from one describe block's beforeEach silently leaks into whichever block
// runs next (Vitest does not auto-restore stubbed globals between tests).
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadSettings', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // Stub navigator to Portuguese so detection returns 'pt' when localStorage is empty
    // (matching the behavior these tests expected before auto-detection was added)
    vi.stubGlobal('navigator', { language: 'pt-PT' });
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

describe('loadSettings — language auto-detection', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('detects and saves the language when nothing is saved yet', () => {
    vi.stubGlobal('navigator', { language: 'en-US' });
    const settings = loadSettings();
    expect(settings.language).toBe('en');
    const saved = JSON.parse(window.localStorage.getItem('checkers-settings')!);
    expect(saved.language).toBe('en');
  });

  it('a brand-new installation persists only the detected language, not every other default', () => {
    vi.stubGlobal('navigator', { language: 'en-US' });
    loadSettings();
    const saved = JSON.parse(window.localStorage.getItem('checkers-settings')!);
    // Only `language` should be written -- freezing the other fields'
    // current defaults into storage would silently outlive a future
    // DEFAULT_SETTINGS change for this installation.
    expect(Object.keys(saved)).toEqual(['language']);
  });

  it('detects Portuguese when the browser asks for Portuguese', () => {
    vi.stubGlobal('navigator', { language: 'pt-PT' });
    expect(loadSettings().language).toBe('pt');
  });

  it('uses the saved language without detecting again', () => {
    window.localStorage.setItem('checkers-settings', JSON.stringify({ language: 'en' }));
    vi.stubGlobal('navigator', { language: 'pt-PT' }); // detection would say 'pt' -- must not be used
    expect(loadSettings().language).toBe('en');
  });

  it('treats an invalid saved language as missing', () => {
    window.localStorage.setItem('checkers-settings', JSON.stringify({ language: 'fr' }));
    vi.stubGlobal('navigator', { language: 'pt-PT' });
    expect(loadSettings().language).toBe('pt');
  });

  it('detects on an installation from before this feature, preserving other already-saved fields', () => {
    window.localStorage.setItem(
      'checkers-settings',
      JSON.stringify({ defaultDifficulty: 'dificil', pieceStyle: 'anime' })
    );
    vi.stubGlobal('navigator', { language: 'pt-PT' });

    const settings = loadSettings();
    expect(settings.language).toBe('pt');
    expect(settings.defaultDifficulty).toBe('dificil');
    expect(settings.pieceStyle).toBe('anime');

    const saved = JSON.parse(window.localStorage.getItem('checkers-settings')!);
    expect(saved.defaultDifficulty).toBe('dificil');
    expect(saved.pieceStyle).toBe('anime');
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
