import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

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

// NOTE for a later phase: once lib/settings/useSettings.ts exists, add a
// beforeEach here that clears localStorage, calls
// __resetSettingsCacheForTests(), and seeds the PT locale — matching Chess
// Sensei's vitest.setup.ts. Not needed yet — no settings module exists.
