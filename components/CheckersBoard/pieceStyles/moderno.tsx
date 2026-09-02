import type { ReactElement } from 'react';
import type { PieceKind } from '@/lib/checkers/types';

// Second piece style -- same convention as classico.tsx (fill="currentColor",
// 100x100 viewBox, man vs. king differ only by a crown), but angular: an
// octagon instead of a circle, a polygon rim instead of a stroked ring, and
// a spikier crown -- reads as a distinct family from classico at a glance,
// the same idea Chess Sensei's moderno.tsx uses (polygons instead of
// circles/curves) applied to a disc instead of chess-piece silhouettes.
const DISC_POINTS = '50,10 75,20 88,45 88,55 75,80 50,90 25,80 12,55 12,45 25,20';
const RIM_POINTS = '50,23 68,30 77,48 77,52 68,70 50,77 32,70 23,52 23,48 32,30';
const CROWN_POINTS = '28,44 38,24 50,36 62,24 72,44 65,54 35,54';

export function PieceShape({ type }: { type: PieceKind }): ReactElement {
  return (
    <>
      <polygon points={DISC_POINTS} />
      <polygon points={RIM_POINTS} fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="4" />
      {type === 'king' && <polygon points={CROWN_POINTS} fill="currentColor" opacity="0.9" />}
    </>
  );
}
