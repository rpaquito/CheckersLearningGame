/**
 * Defined locally rather than imported from lib/checkers/moveExplanation.ts
 * or lib/settings/settings.ts (both already declare an identical Locale) --
 * see CLAUDE.md: none of these modules should depend on each other just
 * for this type. All three fold into a shared lib/i18n/types.ts in Phase 8.
 */
export type Locale = 'pt' | 'en';

/**
 * A single move of an opening line: checkers' own numeric notation
 * ("11-15", squares 1-32 per lib/checkers/board.ts) plus a hand-written
 * explanation in both locales. No SAN, no capture ("x") notation -- a
 * plain from-to hyphenated pair is enough to identify the intended move
 * among a position's legal moves (see replayLine.ts).
 */
export interface OpeningMove {
  notation: string;
  explanation: Record<Locale, string>;
}

/**
 * A complete, independent line from move 1 -- the main line of an
 * opening (this plan builds exactly one line per opening; no named
 * variations, see CLAUDE.md/this plan's Global Constraints for why).
 */
export interface OpeningLine {
  name: Record<Locale, string>;
  moves: OpeningMove[];
}

export interface Opening {
  /** kebab-case slug, stable -- used as a route segment. */
  id: string;
  name: Record<Locale, string>;
  /** 1-2 sentences, for the /aprender/aberturas list. */
  description: Record<Locale, string>;
  lines: OpeningLine[];
}
