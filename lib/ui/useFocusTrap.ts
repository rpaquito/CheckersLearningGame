import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Traps focus inside a modal panel while it's open. Used by ConfirmModal,
// GameEndModal, and RulesModal.
//
// On open: moves focus to the panel itself (not the first button inside it
// -- avoids landing on an action like "Fechar" where a stray Enter would
// immediately close the modal). Tab/Shift+Tab then cycle only through the
// panel's own focusable elements. On close: returns focus to whatever was
// focused before the modal opened.
//
// Does not set `inert`/`aria-hidden` on the rest of the page -- none of the
// consuming modals render via a portal, so "the rest of the page" has no
// single simple root to mark from here; out of scope for this plan.
export function useFocusTrap(open: boolean) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open]);

  return panelRef;
}
