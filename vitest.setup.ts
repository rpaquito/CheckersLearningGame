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

// Seeds a saved 'pt' language for every test, so any component using
// useTranslation() (once Plan 8b wires it up) renders the PT dictionary
// by default -- matching the hardcoded PT text nearly every existing test
// in this repo already asserts. Without this, jsdom's own default
// navigator.language ('en-US') would make the new auto-detection in
// settings.ts resolve every test's language to 'en' instead.
beforeEach(() => {
  window.localStorage.clear();
  __resetSettingsCacheForTests();
  window.localStorage.setItem('checkers-settings', JSON.stringify({ language: 'pt' }));
});
