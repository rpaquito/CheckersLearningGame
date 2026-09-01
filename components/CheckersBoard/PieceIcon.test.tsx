import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PieceIcon } from './PieceIcon';

describe('PieceIcon', () => {
  it('renders an svg for a man, with no crown', () => {
    const { container } = render(<PieceIcon type="man" />);
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('polygon')).toBeNull();
  });

  it('renders a crown polygon for a king', () => {
    const { container } = render(<PieceIcon type="king" />);
    expect(container.querySelector('polygon')).not.toBeNull();
  });
});
