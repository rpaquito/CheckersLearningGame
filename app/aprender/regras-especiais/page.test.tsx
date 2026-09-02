import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { squareAt } from '@/lib/checkers/demoBoards';
import RegrasEspeciaisPage from './page';

function demoSection(headingText: string): HTMLElement {
  return screen.getByRole('heading', { name: headingText }).closest('section') as HTMLElement;
}

function legalTargetButtons(section: HTMLElement): HTMLButtonElement[] {
  return Array.from(section.querySelectorAll('button')).filter((btn) => btn.querySelector('span')) as HTMLButtonElement[];
}

describe('RegrasEspeciaisPage', () => {
  it('the mandatory-capture demo only offers the jump as a legal target', () => {
    render(<RegrasEspeciaisPage />);
    const section = demoSection('Captura obrigatória');
    expect(legalTargetButtons(section)).toHaveLength(1);
  });

  it('captures the jumped piece when the mandatory-capture demo target is clicked', () => {
    vi.useFakeTimers();
    try {
      render(<RegrasEspeciaisPage />);
      const section = demoSection('Captura obrigatória');
      const landing = squareAt(4, 3);
      const jumpedSquare = squareAt(3, 2);
      fireEvent.click(section.querySelector(`[aria-label="square ${landing}"]`) as HTMLButtonElement);
      expect(section.querySelector(`[data-square="${landing}"]`)).not.toBeNull();
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(section.querySelector(`[data-square="${jumpedSquare}"]`)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('captures both pieces in the multi-jump demo with a single click', () => {
    vi.useFakeTimers();
    try {
      render(<RegrasEspeciaisPage />);
      const section = demoSection('Sequência de capturas (lance múltiplo)');
      const finalLanding = squareAt(4, 5);
      const firstJumped = squareAt(1, 2);
      const secondJumped = squareAt(3, 4);
      fireEvent.click(section.querySelector(`[aria-label="square ${finalLanding}"]`) as HTMLButtonElement);
      expect(section.querySelector(`[data-square="${finalLanding}"]`)).not.toBeNull();
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(section.querySelector(`[data-square="${firstJumped}"]`)).toBeNull();
      expect(section.querySelector(`[data-square="${secondJumped}"]`)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
