'use client';

import { useEffect } from 'react';

/**
 * Registers the offline-caching service worker (public/sw.js) once the app
 * has mounted in the browser, and makes sure a newly-deployed version
 * actually reaches an already-open tab or installed PWA:
 *
 * - `controllerchange` fires the moment a new service worker takes over the
 *   page (it calls `self.skipWaiting()` + `self.clients.claim()` on
 *   install/activate -- see sw.js). Reloading right then re-fetches the app
 *   network-first under the new worker, so the update shows up immediately
 *   instead of only on some future manual reopen. The game position itself
 *   survives this: it's persisted to localStorage on every move (see
 *   useCheckersGame's STORAGE_KEY) and restored on mount.
 * - The browser only checks for a new service worker on navigation, which
 *   an installed PWA left open for days may never do on its own. Re-running
 *   `registration.update()` whenever the app returns to the foreground
 *   (`visibilitychange` -> visible) closes that gap.
 *
 * Deliberately has NO native-platform guard (unlike Chess Sensei's own
 * ServiceWorkerRegistration.tsx, which skips registration inside its
 * Capacitor shell via `Capacitor.isNativePlatform()`): this repo has no
 * `@capacitor/core` dependency yet -- native iOS is Phase 10 (design spec
 * §11/§13). **Phase 10 must add that guard back** when it wires up
 * Capacitor, exactly as chess's own version does -- inside a native
 * WKWebView the bundle already ships on disk (`webDir: 'out'`), so there's
 * nothing for a service worker to cache and no reason to risk one behaving
 * oddly inside it.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!navigator.serviceWorker) return;

    let registration: ServiceWorkerRegistration | null = null;
    let reloading = false;

    function handleControllerChange() {
      // Guards against a (theoretical) repeated-firing loop: this event
      // should only ever fire once per genuine version change.
      if (reloading) return;
      reloading = true;
      window.location.reload();
    }
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') registration?.update().catch(() => {});
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        registration = reg;
      })
      .catch(() => {
        // Registration can fail (unsupported browser, private mode
        // restrictions, etc.) -- the app works fine online without it, so we
        // simply skip offline support rather than surface an error.
      });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return null;
}
