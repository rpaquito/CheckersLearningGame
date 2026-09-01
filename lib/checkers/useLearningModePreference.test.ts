import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLearningModePreference, LEARNING_MODE_STORAGE_KEY } from './useLearningModePreference';

describe('useLearningModePreference', () => {
  beforeEach(() => {
    window.localStorage.removeItem(LEARNING_MODE_STORAGE_KEY);
  });

  it('starts disabled when nothing is saved', () => {
    const { result } = renderHook(() => useLearningModePreference());
    expect(result.current[0]).toBe(false);
  });

  it('toggling flips the value and persists it', () => {
    const { result } = renderHook(() => useLearningModePreference());
    act(() => {
      result.current[1]();
    });
    expect(result.current[0]).toBe(true);
    expect(window.localStorage.getItem(LEARNING_MODE_STORAGE_KEY)).toBe('true');
  });

  it('starts enabled when a previous session saved it as enabled', () => {
    window.localStorage.setItem(LEARNING_MODE_STORAGE_KEY, 'true');
    const { result } = renderHook(() => useLearningModePreference());
    expect(result.current[0]).toBe(true);
  });

  it('toggling twice returns to disabled and persists that', () => {
    const { result } = renderHook(() => useLearningModePreference());
    act(() => {
      result.current[1]();
      result.current[1]();
    });
    expect(result.current[0]).toBe(false);
    expect(window.localStorage.getItem(LEARNING_MODE_STORAGE_KEY)).toBe('false');
  });
});
