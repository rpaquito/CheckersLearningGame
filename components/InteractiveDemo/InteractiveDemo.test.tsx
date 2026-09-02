import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { buildBoard, squareAt } from '@/lib/checkers/demoBoards';
import { InteractiveDemo } from './InteractiveDemo';

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
});
