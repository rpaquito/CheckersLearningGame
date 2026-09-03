import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { saveSettings, DEFAULT_SETTINGS } from '@/lib/settings/settings';
import CentipawnsPage from './page';

describe('CentipawnsPage', () => {
  it('renders the three quality badges in Portuguese by default', () => {
    render(<CentipawnsPage />);
    expect(screen.getByText('Boa jogada!')).toBeInTheDocument();
    expect(screen.getByText('Imprecisão.')).toBeInTheDocument();
    expect(screen.getByText('Erro.')).toBeInTheDocument();
  });

  it('renders English quality badges when settings.language is "en"', () => {
    saveSettings({ ...DEFAULT_SETTINGS, language: 'en' });
    render(<CentipawnsPage />);
    expect(screen.getByText('Good move!')).toBeInTheDocument();
    expect(screen.getByText('Inaccuracy.')).toBeInTheDocument();
    expect(screen.getByText('Mistake.')).toBeInTheDocument();
  });
});
