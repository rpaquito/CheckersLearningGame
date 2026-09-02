import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { squareAt } from '@/lib/checkers/demoBoards';
import FimDeJogoPage from './page';

describe('FimDeJogoPage', () => {
  it('the no-legal-moves demo piece has no clickable legal target', () => {
    render(<FimDeJogoPage />);
    const section = screen.getByRole('heading', { name: 'Sem jogadas legais' }).closest('section') as HTMLElement;
    const targets = Array.from(section.querySelectorAll('button')).filter((btn) => btn.querySelector('span'));
    expect(targets).toHaveLength(0);
  });

  it('clicking elsewhere does not move the stuck piece', () => {
    render(<FimDeJogoPage />);
    const section = screen.getByRole('heading', { name: 'Sem jogadas legais' }).closest('section') as HTMLElement;
    const start = squareAt(6, 7);
    const somewhereElse = squareAt(0, 1);
    fireEvent.click(section.querySelector(`[aria-label="square ${somewhereElse}"]`) as HTMLButtonElement);
    expect(section.querySelector(`[data-square="${start}"]`)).not.toBeNull();
  });

  it('explains the two draw conditions', () => {
    render(<FimDeJogoPage />);
    expect(screen.getByRole('heading', { name: 'Empate' })).toBeInTheDocument();
  });
});
