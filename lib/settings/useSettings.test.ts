import { describe, expect, it, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSettings, __resetSettingsCacheForTests } from './useSettings';
import { DEFAULT_SETTINGS, loadSettings } from './settings';

describe('useSettings', () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetSettingsCacheForTests();
  });

  it('starts from the defaults when nothing is saved', () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('starts from whatever was already saved', () => {
    window.localStorage.setItem(
      'checkers-settings',
      JSON.stringify({ ...DEFAULT_SETTINGS, defaultDifficulty: 'dificil', defaultColor: 'b' })
    );
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings).toEqual({
      ...DEFAULT_SETTINGS,
      defaultDifficulty: 'dificil',
      defaultColor: 'b',
    });
  });

  it('updateSettings merges a partial change and persists it', () => {
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.updateSettings({ defaultColor: 'b' });
    });
    expect(result.current.settings).toEqual({ ...DEFAULT_SETTINGS, defaultColor: 'b' });
    // Persisted for real, not just local React state -- a fresh load from
    // storage sees the same value.
    expect(loadSettings()).toEqual({ ...DEFAULT_SETTINGS, defaultColor: 'b' });
  });

  it('two separate updateSettings calls both persist (no lost update)', () => {
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.updateSettings({ defaultDifficulty: 'medio' });
    });
    act(() => {
      result.current.updateSettings({ defaultColor: 'random' });
    });
    expect(result.current.settings).toEqual({
      ...DEFAULT_SETTINGS,
      defaultDifficulty: 'medio',
      defaultColor: 'random',
    });
  });

  it('does not lose an update when two updateSettings calls happen before a re-render settles', () => {
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.updateSettings({ defaultDifficulty: 'medio' });
      result.current.updateSettings({ defaultColor: 'random' });
    });
    expect(result.current.settings).toEqual({
      ...DEFAULT_SETTINGS,
      defaultDifficulty: 'medio',
      defaultColor: 'random',
    });
  });
});
