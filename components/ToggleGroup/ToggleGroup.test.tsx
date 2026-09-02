import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ToggleGroup } from './ToggleGroup';

const OPTIONS = [
  { value: 'facil', label: 'facil' },
  { value: 'medio', label: 'medio' },
  { value: 'dificil', label: 'dificil' },
];

describe('ToggleGroup', () => {
  it('renders the legend and one button per option', () => {
    render(<ToggleGroup legend="Dificuldade" options={OPTIONS} value="facil" onChange={() => {}} />);
    expect(screen.getByText('Dificuldade')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'facil' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'medio' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'dificil' })).toBeInTheDocument();
  });

  it('marks only the current value as pressed', () => {
    render(<ToggleGroup legend="Dificuldade" options={OPTIONS} value="medio" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'facil' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'medio' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'dificil' })).toHaveAttribute('aria-pressed', 'false');
  });

  it("calls onChange with the clicked option's value", () => {
    const onChange = vi.fn();
    render(<ToggleGroup legend="Dificuldade" options={OPTIONS} value="facil" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'dificil' }));
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('dificil');
  });

  it('still calls onChange when the already-active option is clicked again', () => {
    const onChange = vi.fn();
    render(<ToggleGroup legend="Dificuldade" options={OPTIONS} value="facil" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'facil' }));
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('facil');
  });
});
