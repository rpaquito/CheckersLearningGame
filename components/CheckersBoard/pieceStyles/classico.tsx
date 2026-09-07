import type { ReactElement } from 'react';
import type { PieceKind } from '@/lib/checkers/types';

// A simple checkers-disc silhouette: a filled outer circle plus an inset
// ring to suggest a real checker piece's rim, with a small crown polygon
// added on top for kings. This is the only piece style built in this
// plan ("classico") -- see PieceIcon.tsx for the seam Phase 5 will use
// to add "moderno"/"anime" styles alongside Chess Sensei's equivalents.
const CROWN_POINTS = '30,42 38,28 50,40 62,28 70,42 66,50 34,50';

// The disc itself is drawn in `currentColor` (the caller sets that via a
// text-* class per player color -- see CheckersBoard.tsx), so the king
// mark can't use `currentColor` too: a same-color polygon on a same-color
// disc is invisible regardless of opacity. KING_MARK_COLOR is the app's
// own gold accent token (--color-gold in app/globals.css), fixed
// regardless of player color, with a dark stroke so it stays crisp against
// a near-white piece too. See CLAUDE.md's king-mark-visibility entry.
const KING_MARK_COLOR = '#FFD600';
const KING_MARK_STROKE = '#1A0B33';

export function PieceShape({ type }: { type: PieceKind }): ReactElement {
  return (
    <>
      <circle cx="50" cy="50" r="38" />
      <circle cx="50" cy="50" r="27" fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="4" />
      {type === 'king' && (
        <polygon points={CROWN_POINTS} fill={KING_MARK_COLOR} stroke={KING_MARK_STROKE} strokeWidth="1.5" />
      )}
    </>
  );
}
