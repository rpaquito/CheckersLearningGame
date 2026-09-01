import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmModal } from './ConfirmModal';

const baseProps = {
  title: 'Reiniciar partida?',
  message: 'Vais perder o progresso desta partida.',
  confirmLabel: 'Reiniciar',
  cancelLabel: 'Cancelar',
};

describe('ConfirmModal', () => {
  it('renders nothing when closed', () => {
    render(<ConfirmModal open={false} {...baseProps} onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders the title, message, and both buttons when open', () => {
    render(<ConfirmModal open={true} {...baseProps} onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('dialog')).not.toBeNull();
    expect(screen.getByText('Reiniciar partida?')).not.toBeNull();
    expect(screen.getByText('Vais perder o progresso desta partida.')).not.toBeNull();
    expect(screen.getByText('Reiniciar')).not.toBeNull();
    expect(screen.getByText('Cancelar')).not.toBeNull();
  });

  it('calls onConfirm when the confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmModal open={true} {...baseProps} onConfirm={onConfirm} onCancel={() => {}} />);
    fireEvent.click(screen.getByText('Reiniciar'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when the cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<ConfirmModal open={true} {...baseProps} onConfirm={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when the backdrop is clicked', () => {
    const onCancel = vi.fn();
    const { container } = render(<ConfirmModal open={true} {...baseProps} onConfirm={() => {}} onCancel={onCancel} />);
    fireEvent.click(container.querySelector('[data-testid="confirm-modal-backdrop"]')!);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Escape is pressed', () => {
    const onCancel = vi.fn();
    render(<ConfirmModal open={true} {...baseProps} onConfirm={() => {}} onCancel={onCancel} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('clicking inside the panel does not call onCancel', () => {
    const onCancel = vi.fn();
    render(<ConfirmModal open={true} {...baseProps} onConfirm={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onCancel).not.toHaveBeenCalled();
  });
});
