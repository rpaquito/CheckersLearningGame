'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from './settings';

export interface UseSettingsResult {
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => void;
}

/**
 * Module-singleton store behind useSettings, via useSyncExternalStore --
 * React's idiomatic mechanism for "sync an external value (localStorage)
 * into React". This solves two things at once:
 *
 * 1. Safe hydration: /opcoes (and any future settings-reading page) is
 *    pre-rendered -- reading the real localStorage value immediately would
 *    produce different server/client HTML whenever settings were already
 *    saved. getServerSnapshot always returns DEFAULT_SETTINGS (same on
 *    server and client); only after hydration does React switch to the
 *    real value via getSnapshot.
 * 2. No lost updates: since `cache` is a module value (not per hook
 *    instance), two updateSettings calls in a row -- even before a
 *    re-render -- always read the latest `cache`, with no separate ref
 *    needed to avoid merging against a stale `settings`. Bonus: multiple
 *    simultaneous useSettings instances (e.g. two components) stay
 *    automatically consistent with each other.
 */
let cache: Settings | null = null;
const listeners = new Set<() => void>();

// Called during React's render phase (useSyncExternalStore's contract),
// which should stay side-effect-free -- but on a first-ever call this
// transitively runs loadSettings()'s one-time localStorage write when
// language auto-detection fires (see settings.ts). Accepted as benign: the
// `cache === null` guard above means it can only happen once per module
// lifetime, the write is deterministic/idempotent, and a discarded
// concurrent render just leaves the same correct value persisted.
function getSnapshot(): Settings {
  if (cache === null) cache = loadSettings();
  return cache;
}

function getServerSnapshot(): Settings {
  return DEFAULT_SETTINGS;
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function setCache(next: Settings): void {
  cache = next;
  listeners.forEach((listener) => listener());
}

/**
 * Test-only: `cache` is a module value, so it survives between `it`s in
 * the same test file (ES modules aren't re-imported per test) -- without
 * this, the first test that mounted the hook would "freeze" the cache
 * forever, and later tests writing directly to localStorage would never
 * see that value reflected.
 */
export function __resetSettingsCacheForTests(): void {
  cache = null;
  listeners.clear();
}

export function useSettings(): UseSettingsResult {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    const next = { ...getSnapshot(), ...partial };
    saveSettings(next);
    setCache(next);
  }, []);

  return { settings, updateSettings };
}
