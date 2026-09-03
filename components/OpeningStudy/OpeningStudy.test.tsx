import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { OpeningStudy } from './OpeningStudy';
import { OPENINGS } from '@/lib/openings/data';
import { saveSettings, DEFAULT_SETTINGS } from '@/lib/settings/settings';

const oldFourteenth = OPENINGS.find((o) => o.id === 'old-fourteenth')!;

describe('OpeningStudy', () => {
  it('has an aria-label on the line tablist and marks the explanation card as a live region', () => {
    render(<OpeningStudy opening={oldFourteenth} />);
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-label', 'Linhas desta abertura');
    expect(screen.getByText(/Posição inicial/).closest('[aria-live]')).toHaveAttribute('aria-live', 'polite');
  });

  it('starts at the initial position with "Anterior" disabled', () => {
    render(<OpeningStudy opening={oldFourteenth} />);
    expect(screen.getByText(/Posição inicial/)).toBeInTheDocument();
    expect(screen.getByText('0 / 6')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
  });

  it('advances one move per "Seguinte" click, with correct move labels', () => {
    render(<OpeningStudy opening={oldFourteenth} />);
    const next = screen.getByRole('button', { name: 'Seguinte' });

    fireEvent.click(next);
    expect(screen.getByText('1. 11-15')).toBeInTheDocument();

    fireEvent.click(next);
    expect(screen.getByText('1...23-19')).toBeInTheDocument();
  });

  it('disables "Seguinte" at the last move and does not overshoot on extra clicks', () => {
    render(<OpeningStudy opening={oldFourteenth} />);
    const next = screen.getByRole('button', { name: 'Seguinte' });

    for (let i = 0; i < 6; i++) fireEvent.click(next);
    expect(screen.getByText('6 / 6')).toBeInTheDocument();
    expect(next).toBeDisabled();

    fireEvent.click(next);
    expect(screen.getByText('6 / 6')).toBeInTheDocument();
  });

  it('steps back with "Anterior"', () => {
    render(<OpeningStudy opening={oldFourteenth} />);
    const next = screen.getByRole('button', { name: 'Seguinte' });
    const prev = screen.getByRole('button', { name: 'Anterior' });

    for (let i = 0; i < 6; i++) fireEvent.click(next);
    fireEvent.click(prev);
    expect(screen.getByText('5 / 6')).toBeInTheDocument();
  });

  it('switching lines resets to the initial position', () => {
    render(<OpeningStudy opening={oldFourteenth} />);
    const next = screen.getByRole('button', { name: 'Seguinte' });
    fireEvent.click(next);
    fireEvent.click(next);
    expect(screen.getByText('2 / 6')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Linha principal' }));
    expect(screen.getByText('0 / 6')).toBeInTheDocument();
  });

  it('renders English text when settings.language is "en"', () => {
    saveSettings({ ...DEFAULT_SETTINGS, language: 'en' });
    render(<OpeningStudy opening={oldFourteenth} />);
    expect(screen.getByText(/Starting position/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  });
});
