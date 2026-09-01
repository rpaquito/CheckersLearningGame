import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
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
