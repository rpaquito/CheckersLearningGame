import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { saveSettings, DEFAULT_SETTINGS } from '@/lib/settings/settings';
import HomePage from './page';

describe('HomePage', () => {
  it('renders the four menu tiles in Portuguese by default', () => {
    render(<HomePage />);
    expect(screen.getByRole('link', { name: /Jogar contra o computador/ })).toHaveAttribute('href', '/configurar');
    expect(screen.getByRole('link', { name: /Dois jogadores/ })).toHaveAttribute('href', '/jogar?mode=local');
    expect(screen.getByRole('link', { name: /Aprender a jogar/ })).toHaveAttribute('href', '/aprender');
    expect(screen.getByRole('link', { name: /Opções/ })).toHaveAttribute('href', '/opcoes');
  });

  it('renders English tile labels when settings.language is "en"', () => {
    saveSettings({ ...DEFAULT_SETTINGS, language: 'en' });
    render(<HomePage />);
    expect(screen.getByRole('link', { name: /Play vs computer/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Two players/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Learn to play/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Options/ })).toBeInTheDocument();
  });
});
