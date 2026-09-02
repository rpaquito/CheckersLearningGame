import { describe, expect, it } from 'vitest';
import { detectLocale } from './detectLocale';

describe('detectLocale', () => {
  it('detects Portuguese from any pt-* browser language', () => {
    expect(detectLocale('pt-PT')).toBe('pt');
    expect(detectLocale('pt-BR')).toBe('pt');
    expect(detectLocale('pt')).toBe('pt');
  });

  it('is case-insensitive', () => {
    expect(detectLocale('PT-pt')).toBe('pt');
  });

  it('falls back to English for any non-Portuguese language', () => {
    expect(detectLocale('en-US')).toBe('en');
    expect(detectLocale('fr-FR')).toBe('en');
    expect(detectLocale('es-ES')).toBe('en');
  });

  it('falls back to English when no language is given', () => {
    expect(detectLocale(undefined)).toBe('en');
  });
});
