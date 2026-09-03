import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { saveSettings, DEFAULT_SETTINGS } from '@/lib/settings/settings';
import ConfigurarPage from './page';

// Mock next/navigation's useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('ConfigurarPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // Stub navigator to Portuguese so language auto-detection (added in
    // Plan 8a) doesn't flip these PT-asserting tests to English -- this
    // file's own localStorage.clear() above wipes vitest.setup.ts's global
    // 'pt' seed right back out (see CLAUDE.md).
    vi.stubGlobal('navigator', { language: 'pt-PT' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults to the facil/brancas fallback when no settings are saved', () => {
    render(<ConfigurarPage />);
    expect(screen.getByRole('button', { name: 'Fácil' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Brancas' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('starts from the saved default difficulty and color when settings are already warm', () => {
    saveSettings({ ...DEFAULT_SETTINGS, defaultDifficulty: 'dificil', defaultColor: 'b' });
    render(<ConfigurarPage />);
    expect(screen.getByRole('button', { name: 'Difícil' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Pretas' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders English labels when settings.language is "en"', () => {
    saveSettings({ ...DEFAULT_SETTINGS, language: 'en' });
    render(<ConfigurarPage />);
    expect(screen.getByRole('heading', { name: 'Play vs computer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Easy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'White' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
  });
});
