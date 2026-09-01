'use client';

import { useCallback, useEffect, useState } from 'react';

export const LEARNING_MODE_STORAGE_KEY = 'checkers-learning-game-learning-mode';

// Same SSR-hydration-safe shape as useCheckersGame: always starts `false`
// (correct for both server and the initial client render, since window is
// unavailable during SSR) and only reads localStorage inside a useEffect,
// after that first render -- see CLAUDE.md's "useCheckersGame persistence
// follows the SSR-hydration-safe pattern from day one" entry for why a
// lazy useState initializer would NOT be safe here.
export function useLearningModePreference(): [boolean, () => void] {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(LEARNING_MODE_STORAGE_KEY) === 'true') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEnabled(true);
    }
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      window.localStorage.setItem(LEARNING_MODE_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return [enabled, toggle];
}
