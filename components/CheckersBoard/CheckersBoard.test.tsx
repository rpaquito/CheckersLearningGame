import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { createInitialBoard } from '@/lib/checkers/board';
import { applyMove } from '@/lib/checkers/moveGeneration';
import type { Piece } from '@/lib/checkers/types';
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

  it('applies the suggestion outline class to the suggested move\'s from/to squares', () => {
    const { container } = render(
      <CheckersBoard
        board={createInitialBoard()}
        turn="b"
        selectedSquare={null}
        legalTargets={[]}
        mandatoryCaptureSquares={[]}
        lastMove={null}
        suggestedMove={{ from: 11, to: 15, captures: [], promotes: false }}
        onSquareClick={() => {}}
      />,
    );
    const from = container.querySelector('[aria-label="square 11"]');
    const to = container.querySelector('[aria-label="square 15"]');
    const other = container.querySelector('[aria-label="square 1"]');
    expect(from?.className).toContain('outline-violet-400');
    expect(to?.className).toContain('outline-violet-400');
    expect(other?.className).not.toContain('outline-violet-400');
  });

  it('renders no suggestion outline when suggestedMove is null', () => {
    const { container } = render(
      <CheckersBoard
        board={createInitialBoard()}
        turn="b"
        selectedSquare={null}
        legalTargets={[]}
        mandatoryCaptureSquares={[]}
        lastMove={null}
        suggestedMove={null}
        onSquareClick={() => {}}
      />,
    );
    expect(container.querySelector('.outline-violet-400')).toBeNull();
  });
});

function emptyBoard(): (Piece | null)[] {
  return new Array(32).fill(null);
}

describe('CheckersBoard animation', () => {
  it('moves a piece to its new square when the board prop reflects a simple move', () => {
    const board1 = createInitialBoard();
    const move = { from: 11, to: 15, captures: [], promotes: false };
    const board2 = applyMove(board1, move);
    const { container, rerender } = render(
      <CheckersBoard board={board1} turn="b" selectedSquare={null} legalTargets={[]} mandatoryCaptureSquares={[]} lastMove={null} onSquareClick={() => {}} />,
    );
    rerender(
      <CheckersBoard board={board2} turn="w" selectedSquare={null} legalTargets={[]} mandatoryCaptureSquares={[]} lastMove={move} onSquareClick={() => {}} />,
    );
    expect(container.querySelector('[data-square="15"]')).not.toBeNull();
    expect(container.querySelector('[data-square="11"]')).toBeNull();
  });

  it('fades a captured piece out and removes it after the fade duration', () => {
    vi.useFakeTimers();
    try {
      const board1 = emptyBoard();
      board1[10] = { color: 'b', kind: 'man' }; // 11
      board1[14] = { color: 'w', kind: 'man' }; // 15
      const move = { from: 11, to: 18, captures: [15], promotes: false };
      const board2 = applyMove(board1, move);
      const { container, rerender } = render(
        <CheckersBoard board={board1} turn="b" selectedSquare={null} legalTargets={[]} mandatoryCaptureSquares={[]} lastMove={null} onSquareClick={() => {}} />,
      );
      rerender(
        <CheckersBoard board={board2} turn="w" selectedSquare={null} legalTargets={[]} mandatoryCaptureSquares={[]} lastMove={move} onSquareClick={() => {}} />,
      );
      expect(container.querySelector('[data-square="15"]')).not.toBeNull(); // still present, fading
      expect(container.querySelector('[data-square="18"]')).not.toBeNull(); // the moved piece has arrived
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(container.querySelector('[data-square="15"]')).toBeNull(); // removed after the fade
    } finally {
      vi.useRealTimers();
    }
  });

  it('snaps to a fresh position (no animation) when no legal move connects the two boards', () => {
    const board1 = createInitialBoard();
    const board2 = emptyBoard(); // unrelated position, e.g. after a reset
    const { container, rerender } = render(
      <CheckersBoard board={board1} turn="b" selectedSquare={null} legalTargets={[]} mandatoryCaptureSquares={[]} lastMove={null} onSquareClick={() => {}} />,
    );
    rerender(
      <CheckersBoard board={board2} turn="b" selectedSquare={null} legalTargets={[]} mandatoryCaptureSquares={[]} lastMove={null} onSquareClick={() => {}} />,
    );
    expect(container.querySelectorAll('[data-square]')).toHaveLength(0);
  });
});
