import type { ReactElement } from 'react';
import type { PieceKind } from '@/lib/checkers/types';

// A simple checkers-disc silhouette: a filled outer circle plus an inset
// ring to suggest a real checker piece's rim, with a small crown polygon
// added on top for kings. This is the only piece style built in this
// plan ("classico") -- see PieceIcon.tsx for the seam Phase 5 will use
// to add "moderno"/"anime" styles alongside Chess Sensei's equivalents.
const CROWN_POINTS = '30,42 38,28 50,40 62,28 70,42 66,50 34,50';

export function PieceShape({ type }: { type: PieceKind }): ReactElement {
  return (
    <>
      <circle cx="50" cy="50" r="38" />
      <circle cx="50" cy="50" r="27" fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="4" />
      {type === 'king' && <polygon points={CROWN_POINTS} fill="currentColor" opacity="0.9" />}
    </>
  );
}
