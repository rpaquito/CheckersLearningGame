import { describe, expect, it, beforeEach, vi } from 'vitest';
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
});
