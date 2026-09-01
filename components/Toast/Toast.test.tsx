import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toast } from './Toast';

describe('Toast', () => {
  it('renders nothing visible when toast is null', () => {
    render(<Toast toast={null} onDismiss={() => {}} />);
    expect(screen.queryByTestId('toast-card')).toBeNull();
  });

  it('renders the message when a toast is given', () => {
    render(<Toast toast={{ id: 1, message: 'Boa jogada!', tone: 'boa' }} onDismiss={() => {}} />);
    expect(screen.getByText('Boa jogada!')).not.toBeNull();
  });

  it('calls onDismiss when the close button is clicked', () => {
    const onDismiss = vi.fn();
    render(<Toast toast={{ id: 1, message: 'Boa jogada!', tone: 'boa' }} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByLabelText('Fechar'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('remounts the card (new key) when the id changes, even with an identical message', () => {
    const { rerender, container } = render(
      <Toast toast={{ id: 1, message: 'Mesma mensagem', tone: 'info' }} onDismiss={() => {}} />
    );
    const firstCard = container.querySelector('[data-testid="toast-card"]');
    rerender(<Toast toast={{ id: 2, message: 'Mesma mensagem', tone: 'info' }} onDismiss={() => {}} />);
    const secondCard = container.querySelector('[data-testid="toast-card"]');
    expect(secondCard).not.toBe(firstCard);
  });
});
