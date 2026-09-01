import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LearningPanel } from './LearningPanel';

const baseProps = {
  enabled: true,
  onToggle: () => {},
  canRequestSuggestion: true,
  onRequestSuggestion: () => {},
  suggestionLoading: false,
  hasSuggestion: false,
  suggestionExplanation: null,
};

describe('LearningPanel', () => {
  it('shows the toggle button labeled by its current state', () => {
    render(<LearningPanel {...baseProps} enabled={false} />);
    expect(screen.getByText('Ativar modo de aprendizagem')).not.toBeNull();
  });

  it('shows the "on" label and the suggestion button when enabled', () => {
    render(<LearningPanel {...baseProps} enabled={true} />);
    expect(screen.getByText('Desativar modo de aprendizagem')).not.toBeNull();
    expect(screen.getByText('Sugerir jogada')).not.toBeNull();
  });

  it('does not show the suggestion button when disabled', () => {
    render(<LearningPanel {...baseProps} enabled={false} />);
    expect(screen.queryByText('Sugerir jogada')).toBeNull();
  });

  it('calls onToggle when the toggle button is clicked', () => {
    const onToggle = vi.fn();
    render(<LearningPanel {...baseProps} onToggle={onToggle} />);
    fireEvent.click(screen.getByText('Desativar modo de aprendizagem'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onRequestSuggestion when the suggestion button is clicked', () => {
    const onRequestSuggestion = vi.fn();
    render(<LearningPanel {...baseProps} onRequestSuggestion={onRequestSuggestion} />);
    fireEvent.click(screen.getByText('Sugerir jogada'));
    expect(onRequestSuggestion).toHaveBeenCalledTimes(1);
  });

  it('disables the suggestion button when canRequestSuggestion is false', () => {
    render(<LearningPanel {...baseProps} canRequestSuggestion={false} />);
    expect(screen.getByText('Sugerir jogada')).toBeDisabled();
  });

  it('disables the suggestion button and shows a loading label while loading', () => {
    render(<LearningPanel {...baseProps} suggestionLoading={true} />);
    expect(screen.getByText('A calcular...')).toBeDisabled();
  });

  it('shows the suggestion explanation once one exists', () => {
    render(<LearningPanel {...baseProps} hasSuggestion={true} suggestionExplanation="Captura uma peça." />);
    expect(screen.getByText('Captura uma peça.')).not.toBeNull();
  });
});
