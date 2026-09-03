import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { saveSettings, DEFAULT_SETTINGS } from '@/lib/settings/settings';
import AberturasPage from './page';

describe('AberturasPage', () => {
  it('renders the hub title and every opening tile in Portuguese by default', () => {
    render(<AberturasPage />);
    expect(screen.getByRole('heading', { name: 'Aberturas e armadilhas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Old Fourteenth/ })).toHaveAttribute(
      'href',
      '/aprender/aberturas/old-fourteenth'
    );
  });

  it('renders the disclaimer and hub link back to the tutorial in English when settings.language is "en"', () => {
    saveSettings({ ...DEFAULT_SETTINGS, language: 'en' });
    render(<AberturasPage />);
    expect(screen.getByText(/informational, not verified by a checkers federation/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to tutorial' })).toHaveAttribute('href', '/aprender');
  });
});
