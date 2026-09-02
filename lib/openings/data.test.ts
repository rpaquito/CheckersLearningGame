import { describe, expect, it } from 'vitest';
import { OPENINGS } from './data';
import { replayLine } from './replayLine';

const LOCALES = ['pt', 'en'] as const;

describe('OPENINGS', () => {
  it('has exactly 8 openings', () => {
    expect(OPENINGS).toHaveLength(8);
  });

  it('has unique kebab-case ids', () => {
    const ids = OPENINGS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });

  it('gives every opening a non-empty name and description in both locales', () => {
    for (const opening of OPENINGS) {
      for (const locale of LOCALES) {
        expect(opening.name[locale].length).toBeGreaterThan(0);
        expect(opening.description[locale].length).toBeGreaterThan(0);
      }
    }
  });

  it('gives every opening exactly one line, with 6 moves and a name in both locales', () => {
    for (const opening of OPENINGS) {
      expect(opening.lines).toHaveLength(1);
      const line = opening.lines[0];
      for (const locale of LOCALES) {
        expect(line.name[locale].length).toBeGreaterThan(0);
      }
      expect(line.moves).toHaveLength(6);
      for (const move of line.moves) {
        expect(move.notation).toMatch(/^\d{1,2}-\d{1,2}$/);
        for (const locale of LOCALES) {
          expect(move.explanation[locale].length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('has a genuinely translated (not duplicated) English explanation for every move', () => {
    for (const opening of OPENINGS) {
      for (const line of opening.lines) {
        for (const move of line.moves) {
          expect(move.explanation.en).not.toBe(move.explanation.pt);
        }
      }
    }
  });

  it('has a genuinely different English description for every opening', () => {
    for (const opening of OPENINGS) {
      expect(opening.description.en).not.toBe(opening.description.pt);
    }
  });

  it('validates every real line as legal against the actual rules engine', () => {
    for (const opening of OPENINGS) {
      for (const line of opening.lines) {
        expect(() => replayLine(line)).not.toThrow();
      }
    }
  });
});
