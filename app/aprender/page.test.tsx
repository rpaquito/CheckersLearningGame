import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import AprenderPage from './page';

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
});
