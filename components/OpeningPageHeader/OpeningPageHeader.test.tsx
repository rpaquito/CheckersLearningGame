import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { saveSettings, DEFAULT_SETTINGS } from '@/lib/settings/settings';
import { OpeningPageHeader } from './OpeningPageHeader';
import { OPENINGS } from '@/lib/openings/data';

const oldFourteenth = OPENINGS.find((o) => o.id === 'old-fourteenth')!;

describe('OpeningPageHeader', () => {
  it('renders the opening name and study-mode links in Portuguese by default', () => {
    render(<OpeningPageHeader opening={oldFourteenth} variant="study" />);
    expect(screen.getByRole('heading', { name: 'Old Fourteenth' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar às aberturas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Praticar esta abertura' })).toBeInTheDocument();
  });

  it('prefixes the title with "Praticar: " in practice mode', () => {
    render(<OpeningPageHeader opening={oldFourteenth} variant="practice" />);
    expect(screen.getByRole('heading', { name: 'Praticar: Old Fourteenth' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar ao estudo' })).toBeInTheDocument();
  });

  it('renders English text when settings.language is "en"', () => {
    saveSettings({ ...DEFAULT_SETTINGS, language: 'en' });
    render(<OpeningPageHeader opening={oldFourteenth} variant="practice" />);
    // "Old Fourteenth" is an established loanword (name.pt === name.en, see
    // lib/openings/data.ts) -- the prefix and the other links are what
    // actually prove the English dictionary is being read.
    expect(screen.getByRole('heading', { name: 'Practice: Old Fourteenth' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to study' })).toBeInTheDocument();
  });
});
