'use client';

import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { ACTIVE_TOGGLE_STYLE } from '@/lib/ui/activeToggleStyle';

/**
 * Tablist shared by OpeningStudy and OpeningPractice. Owns the
 * `role="tabpanel"` wrapping `children`: the passed content (board +
 * controls + explanation) IS the panel for the selected line, so it lives
 * inside this component instead of each consumer repeating the
 * id/aria-labelledby wiring itself.
 *
 * ARIA APG "tabs" pattern with automatic activation: moving focus with
 * the arrow keys already selects the line (no Enter/Space needed after),
 * roving `tabIndex` (only the active tab is Tab-reachable, arrows jump
 * between the others).
 */
export function LineTabs({
  lines,
  activeIndex,
  onSelect,
  children,
}: {
  lines: { name: string }[];
  activeIndex: number;
  onSelect: (index: number) => void;
  children: ReactNode;
}) {
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function focusAndSelect(index: number) {
    onSelect(index);
    tabRefs.current[index]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (index + 1) % lines.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (index - 1 + lines.length) % lines.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = lines.length - 1;
    }
    if (nextIndex === null) return;
    event.preventDefault();
    focusAndSelect(nextIndex);
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 justify-start" role="tablist" aria-label="Linhas desta abertura">
        {lines.map((line, index) => (
          <button
            key={index}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            id={`${baseId}-tab-${index}`}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            aria-controls={`${baseId}-panel`}
            tabIndex={index === activeIndex ? 0 : -1}
            onClick={() => focusAndSelect(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            style={index === activeIndex ? ACTIVE_TOGGLE_STYLE : undefined}
            className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-transform hover:scale-[1.02] ${
              index === activeIndex ? 'border-transparent shadow-[3px_3px_0_rgba(0,0,0,0.35)]' : 'border-purple/40 text-lilac'
            }`}
          >
            {line.name}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${activeIndex}`}
        tabIndex={-1}
        className="contents"
      >
        {children}
      </div>
    </>
  );
}
