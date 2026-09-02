import type { ReactElement } from 'react';
import type { PieceKind } from '@/lib/checkers/types';
import type { PieceStyle } from '@/lib/settings/settings';
import { PieceShape as ClassicoShape } from './pieceStyles/classico';
import { PieceShape as ModernoShape } from './pieceStyles/moderno';
import { PieceShape as AnimeShape } from './pieceStyles/anime';

export interface PieceIconProps {
  type: PieceKind;
  style?: PieceStyle;
}

const SHAPES: Record<PieceStyle, (props: { type: PieceKind }) => ReactElement> = {
  classico: ClassicoShape,
  moderno: ModernoShape,
  anime: AnimeShape,
};

export function PieceIcon({ type, style = 'classico' }: PieceIconProps): ReactElement {
  const Shape = SHAPES[style];
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" className="h-[78%] w-[78%]" aria-hidden="true">
      <Shape type={type} />
    </svg>
  );
}
