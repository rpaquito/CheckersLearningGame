import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import AprenderPage from './page';
import { saveSettings, DEFAULT_SETTINGS } from '@/lib/settings/settings';

describe('AprenderPage', () => {
  it('links each tile to its correct route', () => {
    render(<AprenderPage />);
    const expected: Record<string, string> = {
      'Peças e movimento': '/aprender/pecas',
      'Regras especiais': '/aprender/regras-especiais',
      'Fim de jogo': '/aprender/fim-de-jogo',
      'Estratégia': '/aprender/estrategia',
      'Avaliação e qualidade das jogadas': '/aprender/centipawns',
      'Aberturas e armadilhas': '/aprender/aberturas',
    };
    for (const [title, href] of Object.entries(expected)) {
      expect(screen.getByRole('link', { name: new RegExp(title) })).toHaveAttribute('href', href);
    }
  });

  it('links each tile to its correct route in English', () => {
    saveSettings({ ...DEFAULT_SETTINGS, language: 'en' });
    render(<AprenderPage />);
    const expected: Record<string, string> = {
      'Pieces and movement': '/aprender/pecas',
      'Special rules': '/aprender/regras-especiais',
      Endgame: '/aprender/fim-de-jogo',
      Strategy: '/aprender/estrategia',
      'Evaluation and move quality': '/aprender/centipawns',
      'Openings and traps': '/aprender/aberturas',
    };
    for (const [title, href] of Object.entries(expected)) {
      expect(screen.getByRole('link', { name: new RegExp(title) })).toHaveAttribute('href', href);
    }
  });
});
