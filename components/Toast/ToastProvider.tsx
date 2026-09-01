'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Toast, type ToastState, type ToastTone } from './Toast';

interface ToastContextValue {
  toast: ToastState | null;
  show: (message: string, tone?: ToastTone) => void;
  dismiss: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Monotonic counter instead of Date.now(): two show() calls in the same
// millisecond would otherwise generate the same id, colliding with
// Toast.tsx's key={toast.id} and silently failing to force a remount when
// the repeated message also happened to match.
let nextToastId = 0;

// Every tone auto-dismisses after this long if nobody closes it first --
// unlike Chess Sensei, there's no 'check' tone that needs to stay open
// until manually acknowledged (see Toast.tsx's comment).
const AUTO_DISMISS_MS = 4000;

// The app's one Toast context -- mounted once in app/layout.tsx (Task 7) so
// useToast() is available on any client page without prop-drilling.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoDismissTimer = useCallback(() => {
    if (autoDismissTimer.current !== null) {
      clearTimeout(autoDismissTimer.current);
      autoDismissTimer.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearAutoDismissTimer();
    setToast(null);
  }, [clearAutoDismissTimer]);

  const show = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      // Instantly replaces any previous toast/timer -- never a queue, and a
      // new show() always cancels the auto-dismiss of whatever toast was
      // showing before it.
      clearAutoDismissTimer();
      setToast({ id: nextToastId++, message, tone });
      autoDismissTimer.current = setTimeout(() => {
        autoDismissTimer.current = null;
        setToast(null);
      }, AUTO_DISMISS_MS);
    },
    [clearAutoDismissTimer]
  );

  const value = useMemo(() => ({ toast, show, dismiss }), [toast, show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast toast={toast} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast() só pode ser usado dentro de <ToastProvider>.');
  }
  return ctx;
}
