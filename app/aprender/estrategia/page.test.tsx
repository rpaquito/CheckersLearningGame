import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { saveSettings, DEFAULT_SETTINGS } from '@/lib/settings/settings';
import EstrategiaPage from './page';

describe('EstrategiaPage', () => {
  it('renders all five principles in Portuguese by default', () => {
    render(<EstrategiaPage />);
    expect(screen.getByText('Controla o centro')).toBeInTheDocument();
    expect(screen.getByText('Protege as tuas damas')).toBeInTheDocument();
  });

  it('renders English principles when settings.language is "en"', () => {
    saveSettings({ ...DEFAULT_SETTINGS, language: 'en' });
    render(<EstrategiaPage />);
    expect(screen.getByText('Control the center')).toBeInTheDocument();
    expect(screen.getByText('Protect your kings')).toBeInTheDocument();
  });
});
