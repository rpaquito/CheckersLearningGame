import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
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
    // Stub navigator to Portuguese so language auto-detection (added in
    // Plan 8a) doesn't flip these PT-asserting tests to English -- this
    // file's own localStorage.clear() above wipes vitest.setup.ts's global
    // 'pt' seed right back out, same as lib/settings/settings.test.ts and
    // lib/settings/useSettings.test.ts (see CLAUDE.md).
    vi.stubGlobal('navigator', { language: 'pt-PT' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it('updates and persists the language, switching the rendered text to English', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(loadSettings().language).toBe('en');
    expect(screen.getByRole('heading', { name: 'Options' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Language updated.');
  });
});
