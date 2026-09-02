import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider } from '@/components/Toast/ToastProvider';
import { loadSettings } from '@/lib/settings/settings';
import OpcoesPage from './page';

function renderPage() {
  return render(
    <ToastProvider>
      <OpcoesPage />
    </ToastProvider>
  );
}

describe('OpcoesPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the title and a link back to the main menu', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Opções' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Menu inicial' })).toHaveAttribute('href', '/');
  });

  it('updates and persists the default difficulty', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Difícil' }));
    expect(loadSettings().defaultDifficulty).toBe('dificil');
    expect(screen.getByRole('status')).toHaveTextContent('Dificuldade');
  });

  it('updates and persists the default color', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Pretas' }));
    expect(loadSettings().defaultColor).toBe('b');
  });

  it('updates and persists the piece style', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Moderno' }));
    expect(loadSettings().pieceStyle).toBe('moderno');
  });

  it('updates and persists the board theme', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Néon' }));
    expect(loadSettings().boardTheme).toBe('neon');
  });

  it('updates and persists the background theme', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Dojo' }));
    expect(loadSettings().backgroundTheme).toBe('dojo');
  });
});
