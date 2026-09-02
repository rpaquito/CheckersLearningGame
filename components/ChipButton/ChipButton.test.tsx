import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChipButton } from './ChipButton';

describe('ChipButton', () => {
  it('renders as a link when given an href', () => {
    render(
      <ChipButton color="purple" href="/aprender">
        Ver tutorial
      </ChipButton>
    );
    const link = screen.getByRole('link', { name: 'Ver tutorial' });
    expect(link).toHaveAttribute('href', '/aprender');
  });

  it('renders as a button when given onClick instead of href', () => {
    const onClick = vi.fn();
    render(
      <ChipButton color="cyan" onClick={onClick}>
        Regras do jogo
      </ChipButton>
    );
    const button = screen.getByRole('button', { name: 'Regras do jogo' });
    button.click();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('applies a distinct background per color so chips never look identical', () => {
    const { rerender, container } = render(
      <ChipButton color="purple" onClick={() => {}}>
        A
      </ChipButton>
    );
    const purpleBg = (container.firstChild as HTMLElement).style.background;

    rerender(
      <ChipButton color="cyan" onClick={() => {}}>
        A
      </ChipButton>
    );
    const cyanBg = (container.firstChild as HTMLElement).style.background;

    expect(purpleBg).not.toBe(cyanBg);
  });

  it('supports a disabled state that blocks onClick and shows reduced opacity (button)', () => {
    const onClick = vi.fn();
    render(
      <ChipButton color="pink" onClick={onClick} disabled>
        Seguinte
      </ChipButton>
    );
    const button = screen.getByRole('button', { name: 'Seguinte' });
    expect(button).toBeDisabled();
    expect(button.className).toContain('opacity-40');
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies the disabled styling to a link too, since <a> has no native disabled', () => {
    render(
      <ChipButton color="purple" href="/aprender" disabled>
        Ver tutorial
      </ChipButton>
    );
    const link = screen.getByRole('link', { name: 'Ver tutorial' });
    expect(link.className).toContain('opacity-40');
    expect(link.className).toContain('pointer-events-none');
  });

  it('blocks keyboard activation on a disabled link, not just pointer clicks', () => {
    render(
      <ChipButton color="purple" href="/aprender" disabled>
        Ver tutorial
      </ChipButton>
    );
    const link = screen.getByRole('link', { name: 'Ver tutorial' });
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link).toHaveAttribute('tabIndex', '-1');
  });

  it('does not apply disabled styling when disabled is omitted', () => {
    render(
      <ChipButton color="gold" onClick={() => {}}>
        Reiniciar
      </ChipButton>
    );
    const button = screen.getByRole('button', { name: 'Reiniciar' });
    expect(button).not.toBeDisabled();
    expect(button.className).not.toContain('opacity-40');
  });
});
