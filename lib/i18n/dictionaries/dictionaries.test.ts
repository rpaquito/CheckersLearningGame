import { describe, expect, it } from 'vitest';
import { DICTIONARIES } from './index';
import { VALID_LOCALES } from '../types';

// Recursively collects every leaf VALUE (skipping function-typed leaves,
// e.g. openings.wrongMove, which are parameterized message builders, not
// plain strings) as a flat "a.b.c" -> value map, so both structural
// parity and the different-string checks can walk the whole tree without
// hand-listing every key.
function flattenLeaves(obj: unknown, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      Object.assign(result, flattenLeaves(item, `${prefix}[${index}]`));
    });
    return result;
  }
  if (obj !== null && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      Object.assign(result, flattenLeaves(value, prefix ? `${prefix}.${key}` : key));
    }
    return result;
  }
  result[prefix] = obj;
  return result;
}

describe('DICTIONARIES', () => {
  it('has an entry for every valid locale', () => {
    for (const locale of VALID_LOCALES) {
      expect(DICTIONARIES[locale]).toBeDefined();
    }
  });

  it('has identical leaf key paths in both locales', () => {
    const ptKeys = Object.keys(flattenLeaves(DICTIONARIES.pt)).sort();
    const enKeys = Object.keys(flattenLeaves(DICTIONARIES.en)).sort();
    expect(enKeys).toEqual(ptKeys);
  });

  it('has no empty-string leaves in either locale', () => {
    for (const locale of VALID_LOCALES) {
      const leaves = flattenLeaves(DICTIONARIES[locale]);
      for (const [key, value] of Object.entries(leaves)) {
        if (typeof value === 'function') continue;
        expect(value, `${locale}.${key} is empty`).not.toBe('');
      }
    }
  });

  it('has genuinely different PT/EN text for every leaf, except documented exceptions (language names, app name, and established loanwords)', () => {
    const SAME_BY_DESIGN = new Set([
      'opcoes.portuguese',
      'opcoes.english',
      'menu.title',
      'pieceStyleLabel.anime',
      'boardThemeLabel.sakura',
      'backgroundThemeLabel.dojo',
    ]);
    const ptLeaves = flattenLeaves(DICTIONARIES.pt);
    const enLeaves = flattenLeaves(DICTIONARIES.en);
    for (const key of Object.keys(ptLeaves)) {
      if (typeof ptLeaves[key] === 'function') continue;
      if (SAME_BY_DESIGN.has(key)) continue;
      expect(enLeaves[key], `${key} is identical in pt and en`).not.toBe(ptLeaves[key]);
    }
  });

  it('has board and background theme labels for every theme id', () => {
    for (const locale of VALID_LOCALES) {
      const d = DICTIONARIES[locale];
      expect(d.boardThemeLabel.sakura).toBeTruthy();
      expect(d.boardThemeLabel.nebulosa).toBeTruthy();
      expect(d.boardThemeLabel.neon).toBeTruthy();
      expect(d.backgroundThemeLabel.templo).toBeTruthy();
      expect(d.backgroundThemeLabel.dojo).toBeTruthy();
      expect(d.backgroundThemeLabel.cosmico).toBeTruthy();
    }
  });

  it('formats openings.wrongMove identically in shape between locales (both are functions)', () => {
    expect(typeof DICTIONARIES.pt.openings.wrongMove).toBe('function');
    expect(typeof DICTIONARIES.en.openings.wrongMove).toBe('function');
    expect(DICTIONARIES.pt.openings.wrongMove('11-15')).toContain('11-15');
    expect(DICTIONARIES.en.openings.wrongMove('11-15')).toContain('11-15');
  });

  it('formats openings.practiceTitle identically in shape between locales (both are functions)', () => {
    expect(typeof DICTIONARIES.pt.openings.practiceTitle).toBe('function');
    expect(typeof DICTIONARIES.en.openings.practiceTitle).toBe('function');
    expect(DICTIONARIES.pt.openings.practiceTitle('Old Fourteenth')).toContain('Old Fourteenth');
    expect(DICTIONARIES.en.openings.practiceTitle('Old Fourteenth')).toContain('Old Fourteenth');
  });

  // The main "different text" check above skips function leaves entirely
  // (it can't call an arbitrary function with the right args generically),
  // so a straight pt->en copy-paste of a message-builder function would
  // otherwise pass every other check in this file undetected. Every
  // single-arg function leaf gets its own explicit inequality check here.
  it('produces genuinely different PT/EN text from every function leaf, given the same argument', () => {
    expect(DICTIONARIES.en.openings.wrongMove('11-15')).not.toBe(DICTIONARIES.pt.openings.wrongMove('11-15'));
    expect(DICTIONARIES.en.openings.practiceTitle('Old Fourteenth')).not.toBe(
      DICTIONARIES.pt.openings.practiceTitle('Old Fourteenth')
    );
  });
});
