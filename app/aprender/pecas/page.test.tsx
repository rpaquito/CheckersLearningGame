import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { squareAt } from '@/lib/checkers/demoBoards';
import PecasPage from './page';

function demoSection(headingText: string): HTMLElement {
  return screen.getByRole('heading', { name: headingText }).closest('section') as HTMLElement;
}

describe('PecasPage', () => {
  it('moves the man-movement demo piece to a legal target', () => {
    render(<PecasPage />);
    const section = demoSection('Movimento da peça (homem)');
    const target = squareAt(4, 3);
    fireEvent.click(section.querySelector(`[aria-label="square ${target}"]`) as HTMLButtonElement);
    expect(section.querySelector(`[data-square="${target}"]`)).not.toBeNull();
  });

  it('promotes the promotion-demo piece to a king when it reaches the back row', () => {
    render(<PecasPage />);
    const section = demoSection('Promoção a dama');
    const target = squareAt(7, 2);
    fireEvent.click(section.querySelector(`[aria-label="square ${target}"]`) as HTMLButtonElement);
    const pieceAtTarget = section.querySelector(`[data-square="${target}"]`);
    expect(pieceAtTarget?.querySelector('polygon')).not.toBeNull(); // crown = king
  });

  it('renders an independent reset button for each of the three demos', () => {
    render(<PecasPage />);
    expect(screen.getAllByRole('button', { name: 'Reiniciar' })).toHaveLength(3);
  });
});
