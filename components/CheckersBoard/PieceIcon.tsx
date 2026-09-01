import type { ReactElement } from 'react';
import type { PieceKind } from '@/lib/checkers/types';
import { PieceShape } from './pieceStyles/classico';

export interface PieceIconProps {
  type: PieceKind;
}

// Single-style dispatch for now (classico only). Phase 5 will turn this
// into a `SHAPES: Record<PieceStyle, ...>` lookup keyed by a `style` prop,
// the same pattern Chess Sensei's PieceIcon.tsx uses -- not built yet
// because there's only one style to dispatch to.
export function PieceIcon({ type }: PieceIconProps): ReactElement {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" className="h-[78%] w-[78%]" aria-hidden="true">
      <PieceShape type={type} />
    </svg>
  );
}
