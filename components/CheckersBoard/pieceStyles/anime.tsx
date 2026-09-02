import type { ReactElement } from 'react';
import type { PieceKind } from '@/lib/checkers/types';

// Third piece style, part of the "anime" visual identity (spec §8) -- a
// jagged, crystal-like disc instead of classico's smooth circle or
// moderno's flat octagon, plus a sparkle accent on kings instead of a plain
// crown, matching the pointed-edge language used elsewhere in the redesign
// (ChipButton's diagonal clip, the app's zigzag crown motif).
const JAGGED_DISC_POINTS =
  '50,8 58,20 72,14 74,28 88,30 82,44 92,54 80,60 84,74 70,72 64,86 52,78 42,90 36,76 22,80 22,66 8,60 18,50 8,38 22,34 20,20 34,24';
const CROWN_POINTS = '30,44 38,26 50,38 62,26 70,44 64,54 36,54';
const SPARKLE_POINTS = '50,20 53,28 61,30 53,32 50,40 47,32 39,30 47,28';

export function PieceShape({ type }: { type: PieceKind }): ReactElement {
  return (
    <>
      <polygon points={JAGGED_DISC_POINTS} />
      {type === 'king' ? (
        <>
          <polygon points={CROWN_POINTS} fill="currentColor" opacity="0.9" />
          <polygon points={SPARKLE_POINTS} fill="currentColor" />
        </>
      ) : (
        <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="3" />
      )}
    </>
  );
}
