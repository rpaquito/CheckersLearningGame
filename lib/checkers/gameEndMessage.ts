import type { Color, GameStatus } from './types';

// Which tone the GameEndModal should read as -- text-only distinction in
// this plan (win/lose/draw wording), no mascot/confetti yet (Phase 10).
export type GameEndKind = 'win' | 'lose' | 'draw';

export interface GameEndDescription {
  title: string;
  kind: GameEndKind;
}

// Title + kind for the GameEndModal -- only covers truly terminal statuses
// ('no-moves', 'draw-repetition', 'draw-no-capture'). Returns null for
// 'playing', which never opens the modal.
//
// Local mode never returns 'lose' -- always 'win' (for whichever color
// isn't the one stuck) or 'draw', never a losing perspective (there's no
// single "you" on a screen shared by two players).
export function describeGameEnd(
  status: GameStatus,
  mode: 'ai' | 'local',
  humanColor: Color,
  turn: Color
): GameEndDescription | null {
  if (status === 'no-moves') {
    // `turn` is always the side with zero legal moves -- they lose.
    if (mode === 'ai') {
      return turn === humanColor
        ? { title: 'Perdeste — sem jogadas possíveis', kind: 'lose' }
        : { title: 'Ganhaste — o adversário ficou sem jogadas possíveis', kind: 'win' };
    }
    return turn === 'b'
      ? { title: 'Brancas vencem — pretas sem jogadas possíveis', kind: 'win' }
      : { title: 'Pretas vencem — brancas sem jogadas possíveis', kind: 'win' };
  }
  if (status === 'draw-repetition') {
    return { title: 'Empate por repetição de posição', kind: 'draw' };
  }
  if (status === 'draw-no-capture') {
    return { title: 'Empate — 40 lances sem captura', kind: 'draw' };
  }
  return null;
}
