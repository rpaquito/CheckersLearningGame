import { describe, expect, it } from 'vitest';
import { OPENINGS } from './data';
import { replayLine } from './replayLine';
import { allLegalMoves, applyMove } from '@/lib/checkers/moveGeneration';

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

  it('has a unique move-1 across all openings, except the documented old-fourteenth/single-corner pair', () => {
    const firstMoves = OPENINGS.map((o) => o.lines[0].moves[0].notation);
    const counts = new Map<string, number>();
    for (const move of firstMoves) counts.set(move, (counts.get(move) ?? 0) + 1);
    const duplicated = [...counts.entries()].filter(([, count]) => count > 1);
    expect(duplicated).toEqual([['11-15', 2]]);
  });

  it('never has name.pt differ from name.en (opening names are loanwords, not translated)', () => {
    for (const opening of OPENINGS) {
      expect(opening.name.pt).toBe(opening.name.en);
    }
  });

  it("does not end any line with the taught side facing a forced, material-losing capture", () => {
    for (const opening of OPENINGS) {
      for (const line of opening.lines) {
        const replayed = replayLine(line);
        const finalBoard = replayed[replayed.length - 1].board;
        const taughtColor = replayed[0].move.from <= 12 ? 'b' : 'w'; // whichever color made move 1
        const opponentColor = taughtColor === 'b' ? 'w' : 'b';
        // If the opponent (to move next after the line ends) has a capture
        // available against the taught side, and every one of the taught
        // side's own possible replies loses more material than it gains,
        // that's a line ending in a real blunder -- not just "a capture
        // exists" (trades are fine), but a NET material loss with no
        // recapture.
        const opponentCaptures = allLegalMoves(finalBoard, opponentColor).filter((m) => m.captures.length > 0);
        for (const capture of opponentCaptures) {
          const afterCapture = applyMove(finalBoard, capture);
          const taughtSideReplies = allLegalMoves(afterCapture, taughtColor);
          const bestRecapture = Math.max(0, ...taughtSideReplies.map((m) => m.captures.length));
          expect(bestRecapture).toBeGreaterThanOrEqual(capture.captures.length);
        }
      }
    }
  });
});
