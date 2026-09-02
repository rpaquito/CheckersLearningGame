import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTranslation } from './useTranslation';
import { __resetSettingsCacheForTests } from '@/lib/settings/useSettings';
import { saveSettings, DEFAULT_SETTINGS } from '@/lib/settings/settings';

describe('useTranslation', () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetSettingsCacheForTests();
  });

  it('returns the PT dictionary and locale when settings.language is "pt"', () => {
    saveSettings({ ...DEFAULT_SETTINGS, language: 'pt' });
    const { result } = renderHook(() => useTranslation());
    expect(result.current.locale).toBe('pt');
    expect(result.current.t.common.mainMenu).toBe('Menu inicial');
  });

  it('returns the EN dictionary and locale when settings.language is "en"', () => {
    saveSettings({ ...DEFAULT_SETTINGS, language: 'en' });
    const { result } = renderHook(() => useTranslation());
    expect(result.current.locale).toBe('en');
    expect(result.current.t.common.mainMenu).toBe('Main menu');
  });
});
