import type { Board, CheckersMove, Color } from './types';
import { isBackRowFor, squareToRowCol } from './board';
import { allLegalMoves } from './moveGeneration';
import type { MoveQuality } from './moveClassification';

// Deliberate exception to this repo's usual "PT-only, i18n deferred to
// Phase 8" convention (see gameEndMessage.ts, RulesModal.tsx) -- spec §5
// calls for this specific module to be bilingual from day one, unlike
// Chess Sensei's retrofitted lib/chess/moveExplanation.ts. Every call site
// in this phase (app/jogar/page.tsx) still hardcodes 'pt': there is no UI
// locale toggle yet.
export type Locale = 'pt' | 'en';

// Mirrors evaluate.ts's private CENTER_COLUMNS -- not imported from there
// because evaluate.ts doesn't export it and this module has no other
// reason to depend on evaluate.ts.
const CENTER_COLUMNS = new Set([3, 4]);

const MAN_VALUE = 100;
const KING_VALUE = 275;

export interface ExplainMoveParams {
  move: CheckersMove;
  boardBeforeMove: Board;
  boardAfterMove: Board;
  moverColor: Color;
  locale: Locale;
}

// Checks whether the piece that just moved (now sitting on move.to) is
// capturable by the opponent on the resulting board -- i.e. this move
// "hangs" that piece. Deliberately does not distinguish "this was already
// unavoidable" from "this move caused it": spec §5 only asks to detect
// "moving into a forced capture", not to prove the alternative was safe.
function hangsThePiece(boardAfterMove: Board, move: CheckersMove, opponentColor: Color): boolean {
  return allLegalMoves(boardAfterMove, opponentColor).some((m) => m.captures.includes(move.to));
}

// A man's "own back row" in the checkers-strategy sense is the OPPONENT's
// crowning row (see evaluate.ts's doc comment) -- the row it started the
// game defending, not the row it promotes on.
function isOwnBackRow(square: number, moverColor: Color): boolean {
  const opponent: Color = moverColor === 'b' ? 'w' : 'b';
  return isBackRowFor(square, opponent);
}

function isCenterColumn(square: number): boolean {
  return CENTER_COLUMNS.has(squareToRowCol(square).col);
}

export function explainMove({ move, boardBeforeMove, boardAfterMove, moverColor, locale }: ExplainMoveParams): string {
  const opponentColor: Color = moverColor === 'b' ? 'w' : 'b';

  if (move.captures.length > 1) {
    return locale === 'pt' ? `Captura ${move.captures.length} peças.` : `Captures ${move.captures.length} pieces.`;
  }
  if (move.captures.length === 1) {
    return locale === 'pt' ? 'Captura uma peça.' : 'Captures a piece.';
  }
  if (move.promotes) {
    return locale === 'pt' ? 'Torna-se dama.' : 'Becomes a king.';
  }
  if (hangsThePiece(boardAfterMove, move, opponentColor)) {
    return locale === 'pt'
      ? 'Entrega uma peça -- o adversário pode capturar de volta.'
      : 'Hangs a piece -- the opponent can capture it back.';
  }
  if (isOwnBackRow(move.from, moverColor) && !isOwnBackRow(move.to, moverColor)) {
    return locale === 'pt' ? 'Abandona a defesa da última linha.' : 'Abandons back-row defense.';
  }
  if (isCenterColumn(move.to) && !isCenterColumn(move.from)) {
    return locale === 'pt' ? 'Ocupa o centro do tabuleiro.' : 'Occupies the center of the board.';
  }
  return locale === 'pt' ? 'Avança em direção à promoção.' : 'Advances toward promotion.';
}

const QUALITY_LABELS: Record<Locale, Record<MoveQuality, string>> = {
  pt: { boa: 'Boa jogada!', imprecisao: 'Imprecisão.', erro: 'Erro.' },
  en: { boa: 'Good move!', imprecisao: 'Inaccuracy.', erro: 'Mistake.' },
};

export function describeMoveQuality(quality: MoveQuality, locale: Locale): string {
  return QUALITY_LABELS[locale][quality];
}

// Checkers' equivalent of chess's "centipawnFeel" -- translates a raw
// evalLoss() number into an intuitive man/king-scale phrase (per spec §5),
// using evaluate.ts's own material constants (man=100/king=275). Returns
// null for a loss too small to read as "about a piece", so callers can
// skip the sentence entirely rather than print a hollow one.
export function materialFeel(loss: number, locale: Locale): string | null {
  if (loss >= KING_VALUE * 0.8) {
    return locale === 'pt' ? 'quase perdeu uma dama' : 'nearly lost a king';
  }
  if (loss >= MAN_VALUE * 0.8) {
    return locale === 'pt' ? 'quase perdeu uma peça' : 'nearly lost a piece';
  }
  return null;
}

function capitalize(sentence: string): string {
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

export interface DescribeMoveForToastParams extends ExplainMoveParams {
  quality: MoveQuality;
  loss: number;
}

// Composes the full move-quality toast message: quality label + what the
// move did + (only for a large loss) a material-feel note. Also reused for
// the suggestion explanation by callers that only want explainMove()'s half
// (Task 7 calls explainMove() directly for suggestions, since a suggestion
// has no MoveQuality/loss of its own to report).
export function describeMoveForToast(params: DescribeMoveForToastParams): string {
  const { quality, loss, locale } = params;
  const parts = [describeMoveQuality(quality, locale), explainMove(params)];
  const feel = materialFeel(loss, locale);
  if (feel) parts.push(capitalize(feel) + '.');
  return parts.join(' ');
}
