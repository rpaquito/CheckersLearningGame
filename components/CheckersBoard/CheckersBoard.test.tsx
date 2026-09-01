import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { createInitialBoard } from '@/lib/checkers/board';
import { CheckersBoard } from './CheckersBoard';

describe('CheckersBoard', () => {
  it('renders 32 clickable dark squares and 24 pieces at the initial position', () => {
    const { container } = render(
      <CheckersBoard
        board={createInitialBoard()}
        turn="b"
        selectedSquare={null}
        legalTargets={[]}
        mandatoryCaptureSquares={[]}
        lastMove={null}
      />,
    );
    expect(container.querySelectorAll('button')).toHaveLength(32);
    expect(container.querySelectorAll('svg')).toHaveLength(24);
  });

  it('has role="grid" on the square grid', () => {
    const { container } = render(
      <CheckersBoard
        board={createInitialBoard()}
        turn="b"
        selectedSquare={null}
        legalTargets={[]}
        mandatoryCaptureSquares={[]}
        lastMove={null}
      />,
    );
    expect(container.querySelector('[role="grid"]')).not.toBeNull();
  });
});

describe('CheckersBoard interaction', () => {
  it('calls onSquareClick with the clicked square number', () => {
    const handleClick = vi.fn();
    const { container } = render(
      <CheckersBoard
        board={createInitialBoard()}
        turn="b"
        selectedSquare={null}
        legalTargets={[]}
        mandatoryCaptureSquares={[]}
        lastMove={null}
        onSquareClick={handleClick}
      />,
    );
    const buttons = container.querySelectorAll('button');
    fireEvent.click(buttons[0]); // first dark square scanning row-major is square 1
    expect(handleClick).toHaveBeenCalledWith(1);
  });

  it('does not call onSquareClick when interactive is false', () => {
    const handleClick = vi.fn();
    const { container } = render(
      <CheckersBoard
        board={createInitialBoard()}
        turn="b"
        selectedSquare={null}
        legalTargets={[]}
        mandatoryCaptureSquares={[]}
        lastMove={null}
        interactive={false}
        onSquareClick={handleClick}
      />,
    );
    fireEvent.click(container.querySelectorAll('button')[0]);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('shows a legal-target indicator only on squares listed in legalTargets', () => {
    const { container } = render(
      <CheckersBoard
        board={createInitialBoard()}
        turn="b"
        selectedSquare={11}
        legalTargets={[15, 16]}
        mandatoryCaptureSquares={[]}
        lastMove={null}
        onSquareClick={() => {}}
      />,
    );
    const targetButtons = Array.from(container.querySelectorAll('button')).filter(
      (btn) => btn.getAttribute('aria-label') === 'square 15' || btn.getAttribute('aria-label') === 'square 16',
    );
    expect(targetButtons).toHaveLength(2);
    for (const btn of targetButtons) {
      expect(btn.querySelector('span')).not.toBeNull();
    }
    const nonTarget = container.querySelector('[aria-label="square 1"]');
    expect(nonTarget?.querySelector('span')).toBeNull();
  });

  it('applies the mandatory-capture outline class to the given squares', () => {
    const { container } = render(
      <CheckersBoard
        board={createInitialBoard()}
        turn="b"
        selectedSquare={null}
        legalTargets={[]}
        mandatoryCaptureSquares={[11]}
        lastMove={null}
        onSquareClick={() => {}}
      />,
    );
    const square11 = container.querySelector('[aria-label="square 11"]');
    expect(square11?.className).toContain('outline-amber-400');
  });
});
