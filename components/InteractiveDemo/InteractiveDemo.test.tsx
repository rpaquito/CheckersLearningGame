import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { buildBoard, squareAt } from '@/lib/checkers/demoBoards';
import { InteractiveDemo } from './InteractiveDemo';
import { saveSettings, DEFAULT_SETTINGS } from '@/lib/settings/settings';

const DEMO_BOARD = buildBoard([{ row: 3, col: 2, color: 'b', kind: 'man' }]);
const START = squareAt(3, 2);
const TARGET = squareAt(4, 3);
const NEXT_TARGET = squareAt(5, 4);
const ILLEGAL = squareAt(5, 2);

function renderDemo() {
  return render(<InteractiveDemo title="Título" description="Descrição" board={DEMO_BOARD} square={START} />);
}

describe('InteractiveDemo', () => {
  it('moves the demo piece when a legal target square is clicked', () => {
    const { container } = renderDemo();
    fireEvent.click(container.querySelector(`[aria-label="square ${TARGET}"]`) as HTMLButtonElement);
    expect(container.querySelector(`[data-square="${TARGET}"]`)).not.toBeNull();
    expect(container.querySelector(`[data-square="${START}"]`)).toBeNull();
  });

  it('does nothing when an illegal square is clicked', () => {
    const { container } = renderDemo();
    fireEvent.click(container.querySelector(`[aria-label="square ${ILLEGAL}"]`) as HTMLButtonElement);
    expect(container.querySelector(`[data-square="${START}"]`)).not.toBeNull();
  });

  it("recomputes legal targets from the piece's new square after it moves", () => {
    const { container } = renderDemo();
    fireEvent.click(container.querySelector(`[aria-label="square ${TARGET}"]`) as HTMLButtonElement);
    fireEvent.click(container.querySelector(`[aria-label="square ${NEXT_TARGET}"]`) as HTMLButtonElement);
    expect(container.querySelector(`[data-square="${NEXT_TARGET}"]`)).not.toBeNull();
  });

  it('resets a demo back to its starting position', () => {
    const { container } = renderDemo();
    fireEvent.click(container.querySelector(`[aria-label="square ${TARGET}"]`) as HTMLButtonElement);
    fireEvent.click(screen.getByRole('button', { name: 'Reiniciar' }));
    expect(container.querySelector(`[data-square="${START}"]`)).not.toBeNull();
  });

  it('keeps the captured piece visible until the fade animation completes, proving the mover color is inferred correctly', () => {
    vi.useFakeTimers();
    try {
      const start = squareAt(2, 1);
      const jumped = squareAt(3, 2);
      const landing = squareAt(4, 3);
      const board = buildBoard([
        { row: 2, col: 1, color: 'b', kind: 'man' },
        { row: 3, col: 2, color: 'w', kind: 'man' },
      ]);
      const { container } = render(
        <InteractiveDemo title="Título" description="Descrição" board={board} square={start} />
      );
      fireEvent.click(container.querySelector(`[aria-label="square ${landing}"]`) as HTMLButtonElement);
      // Before the fade timer fires, the captured piece must still be in the
      // DOM (fading out) -- if InteractiveDemo passed CheckersBoard the wrong
      // `turn`, CheckersBoard's animation inference would fail to find the
      // move and hard-snap to the new position instead, removing the
      // captured piece immediately and making this assertion fail.
      const jumpedPiece = container.querySelector(`[data-square="${jumped}"]`);
      expect(jumpedPiece).not.toBeNull();
      expect(jumpedPiece?.className).toContain('opacity-0');
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(container.querySelector(`[data-square="${jumped}"]`)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows the English reset label when settings.language is "en"', () => {
    saveSettings({ ...DEFAULT_SETTINGS, language: 'en' });
    renderDemo();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });
});
