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

  it('defaults to the classico style', () => {
    const { container: withDefault } = render(<PieceIcon type="king" />);
    const { container: withExplicit } = render(<PieceIcon type="king" style="classico" />);
    expect(withDefault.querySelector('svg')?.innerHTML).toBe(withExplicit.querySelector('svg')?.innerHTML);
  });

  it('renders a visibly different shape per style, for both man and king', () => {
    for (const type of ['man', 'king'] as const) {
      const results = (['classico', 'moderno', 'anime'] as const).map((style) => {
        const { container, unmount } = render(<PieceIcon type={type} style={style} />);
        const html = container.querySelector('svg')?.innerHTML;
        unmount();
        return html;
      });
      expect(new Set(results).size).toBe(3);
    }
  });

  it('renders at least one drawable shape for every type/style combination', () => {
    for (const type of ['man', 'king'] as const) {
      for (const style of ['classico', 'moderno', 'anime'] as const) {
        const { container, unmount } = render(<PieceIcon type={type} style={style} />);
        expect(container.querySelectorAll('circle, polygon').length).toBeGreaterThan(0);
        unmount();
      }
    }
  });
});
