import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RulesModal } from './RulesModal';

describe('RulesModal', () => {
  it('renders nothing when closed', () => {
    render(<RulesModal open={false} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders section headings for movement, mandatory capture, and draw conditions', () => {
    render(<RulesModal open={true} onClose={() => {}} />);
    expect(screen.getByText(/Movimento/)).not.toBeNull();
    expect(screen.getByText(/Captura obrigatória/)).not.toBeNull();
    expect(screen.getByText(/Empate/)).not.toBeNull();
  });

  it('mentions multi-jump chains and promotion', () => {
    render(<RulesModal open={true} onClose={() => {}} />);
    expect(screen.getByText(/encadeada|múltipla/)).not.toBeNull();
    // getByText(/dama/i) would be ambiguous here -- both the "Promoção a
    // dama" heading and an item's body text ("torna-se dama...") match.
    // Target the heading specifically.
    expect(screen.getByRole('heading', { name: /dama/i, level: 3 })).not.toBeNull();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<RulesModal open={true} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Fechar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<RulesModal open={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<RulesModal open={true} onClose={onClose} />);
    fireEvent.click(container.querySelector('[data-testid="rules-modal-backdrop"]')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
