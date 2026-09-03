import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { OpeningPractice } from './OpeningPractice';
import { OPENINGS } from '@/lib/openings/data';
import type { Opening } from '@/lib/openings/types';
import { saveSettings, DEFAULT_SETTINGS } from '@/lib/settings/settings';

afterEach(() => {
  vi.useRealTimers();
});

const oldFourteenth = OPENINGS.find((o) => o.id === 'old-fourteenth')!;

// Short, synthetic line just for the completion test -- avoids writing
// out a real opening's full 6 moves by hand just to reach its end.
const shortOpening: Opening = {
  id: 'abertura-teste',
  name: { pt: 'Abertura de Teste', en: 'Test Opening' },
  description: { pt: 'Linha curta só para testes.', en: 'Short line for tests only.' },
  lines: [
    {
      name: { pt: 'Linha única', en: 'Single line' },
      moves: [{ notation: '11-15', explanation: { pt: 'Ocupa o centro.', en: 'Occupies the center.' } }],
    },
  ],
};

function clickSquare(container: HTMLElement, square: number) {
  fireEvent.click(container.querySelector(`[aria-label="square ${square}"]`) as HTMLButtonElement);
}

describe('OpeningPractice', () => {
  it('marks the turn/feedback panel as a live region', () => {
    render(<OpeningPractice opening={oldFourteenth} />);
    expect(screen.getByText('A tua vez: encontra o lance da linha.').closest('[aria-live]')).toHaveAttribute(
      'aria-live',
      'polite'
    );
  });

  it('is interactive on the first move and accepts the correct move', () => {
    const { container } = render(<OpeningPractice opening={oldFourteenth} />);
    expect(screen.getByText('A tua vez: encontra o lance da linha.')).toBeInTheDocument();

    clickSquare(container, 11);
    clickSquare(container, 15);

    expect(screen.queryByText('A tua vez: encontra o lance da linha.')).not.toBeInTheDocument();
    expect(screen.getByText('A pensar…')).toBeInTheDocument();
  });

  it('rejects a legal-but-wrong move and reveals the expected one', () => {
    const { container } = render(<OpeningPractice opening={oldFourteenth} />);

    clickSquare(container, 11);
    clickSquare(container, 16);

    expect(screen.getByText('Não é esse — o lance da linha é 11-15. Tenta de novo.')).toBeInTheDocument();
  });

  it('keeps the revealed hint visible while reselecting a piece, only clearing it once a move is played', () => {
    const { container } = render(<OpeningPractice opening={oldFourteenth} />);

    clickSquare(container, 11);
    clickSquare(container, 16);
    expect(screen.getByText('Não é esse — o lance da linha é 11-15. Tenta de novo.')).toBeInTheDocument();

    clickSquare(container, 11);
    expect(screen.getByText('Não é esse — o lance da linha é 11-15. Tenta de novo.')).toBeInTheDocument();

    clickSquare(container, 15);
    expect(screen.queryByText('Não é esse — o lance da linha é 11-15. Tenta de novo.')).not.toBeInTheDocument();
  });

  it("auto-plays the opponent's move after a delay once the user plays correctly", () => {
    vi.useFakeTimers();
    const { container } = render(<OpeningPractice opening={oldFourteenth} />);

    clickSquare(container, 11);
    clickSquare(container, 15);
    expect(screen.getByText('A pensar…')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.queryByText('A pensar…')).not.toBeInTheDocument();
    expect(screen.getByText('A tua vez: encontra o lance da linha.')).toBeInTheDocument();
  });

  it('shows the completion card once the line is finished', () => {
    vi.useFakeTimers();
    const { container } = render(<OpeningPractice opening={shortOpening} />);

    clickSquare(container, 11);
    clickSquare(container, 15);

    expect(screen.getByText('Linha completa!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Praticar outra vez' })).toBeInTheDocument();
  });

  it('switching lines resets progress', () => {
    const { container } = render(<OpeningPractice opening={oldFourteenth} />);

    clickSquare(container, 11);
    clickSquare(container, 15);
    expect(screen.getByText('A pensar…')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Linha principal' }));
    expect(screen.getByText('A tua vez: encontra o lance da linha.')).toBeInTheDocument();
  });

  it('renders English text when settings.language is "en"', () => {
    saveSettings({ ...DEFAULT_SETTINGS, language: 'en' });
    render(<OpeningPractice opening={oldFourteenth} />);
    expect(screen.getByText("Your turn: find the line's move.")).toBeInTheDocument();
  });
});
