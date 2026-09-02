import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { __resetSettingsCacheForTests } from '@/lib/settings/useSettings';

// @testing-library/react only auto-registers its afterEach(cleanup) hook in
// a Jest environment; under Vitest it must be wired up explicitly, or DOM
// from one test in a file leaks into the next.
afterEach(cleanup);

// Node 22+ ships an experimental global `localStorage`/`sessionStorage` that,
// without --localstorage-file, resolves to `undefined`. Vitest's jsdom
// environment only overrides globals that are not already own/inherited
// properties of `globalThis`, so this native stub shadows jsdom's real
// Storage implementation and `window.localStorage` ends up `undefined`.
// Restore the real jsdom-backed storage explicitly so tests can use it.
const jsdomGlobal = (globalThis as unknown as { jsdom?: { window: Window } }).jsdom;
if (typeof window !== 'undefined' && jsdomGlobal) {
  Object.defineProperty(window, 'localStorage', {
    value: jsdomGlobal.window.localStorage,
    configurable: true,
  });
  Object.defineProperty(window, 'sessionStorage', {
    value: jsdomGlobal.window.sessionStorage,
    configurable: true,
  });
}

// Clear persisted settings/localStorage before every test so one test's
// saved settings never leak into the next -- the settings cache is a
// module singleton (see useSettings.ts), so it survives across `it`s in
// the same file without this. No locale seeding here (unlike Chess
// Sensei's setup file) -- no i18n dictionaries exist yet to select
// between.
beforeEach(() => {
  window.localStorage.clear();
  __resetSettingsCacheForTests();
});
