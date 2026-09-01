import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameEndModal } from './GameEndModal';

describe('GameEndModal', () => {
  it('renders nothing when closed', () => {
    render(
      <GameEndModal
        open={false}
        status="no-moves"
        mode="local"
        humanColor="b"
        turn="w"
        onClose={() => {}}
        onPlayAgain={() => {}}
      />
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders nothing when status is playing, even if open is true', () => {
    render(
      <GameEndModal
        open={true}
        status="playing"
        mode="local"
        humanColor="b"
        turn="w"
        onClose={() => {}}
        onPlayAgain={() => {}}
      />
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the describeGameEnd title when open with a terminal status', () => {
    render(
      <GameEndModal
        open={true}
        status="no-moves"
        mode="local"
        humanColor="b"
        turn="w"
        onClose={() => {}}
        onPlayAgain={() => {}}
      />
    );
    expect(screen.getByText('Pretas vencem — brancas sem jogadas possíveis')).not.toBeNull();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <GameEndModal
        open={true}
        status="draw-repetition"
        mode="local"
        humanColor="b"
        turn="w"
        onClose={onClose}
        onPlayAgain={() => {}}
      />
    );
    fireEvent.click(screen.getByLabelText('Fechar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(
      <GameEndModal
        open={true}
        status="draw-repetition"
        mode="local"
        humanColor="b"
        turn="w"
        onClose={onClose}
        onPlayAgain={() => {}}
      />
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onPlayAgain when "Jogar novamente" is clicked', () => {
    const onPlayAgain = vi.fn();
    render(
      <GameEndModal
        open={true}
        status="draw-repetition"
        mode="local"
        humanColor="b"
        turn="w"
        onClose={() => {}}
        onPlayAgain={onPlayAgain}
      />
    );
    fireEvent.click(screen.getByText('Jogar novamente'));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });

  it('links "Menu inicial" to /', () => {
    render(
      <GameEndModal
        open={true}
        status="draw-repetition"
        mode="local"
        humanColor="b"
        turn="w"
        onClose={() => {}}
        onPlayAgain={() => {}}
      />
    );
    const link = screen.getByText('Menu inicial').closest('a');
    expect(link?.getAttribute('href')).toBe('/');
  });
});
