'use client';

import { Capacitor } from '@capacitor/core';
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
 * Skips registration entirely inside the native Capacitor shell (see the
 * native-platform guard below) -- ported from Chess Sensei's own
 * ServiceWorkerRegistration.tsx once this repo gained the same
 * `@capacitor/core` dependency (native iOS phase, design spec §11/§13).
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Inside the native Capacitor shell, the bundle already ships on disk
    // (webDir: 'out', see capacitor.config.ts) -- there's nothing for the
    // service worker to cache, and no reason to risk one behaving oddly
    // inside a WKWebView.
    if (Capacitor.isNativePlatform()) return;
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
