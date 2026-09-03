import type { Color, GameStatus } from './types';
import type { Locale } from '@/lib/i18n/types';
import { DICTIONARIES } from '@/lib/i18n/dictionaries';

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
//
// `locale` was added in the i18n UI retrofit plan (Phase 8b) -- this
// function now reads its strings straight out of the shared dictionary
// (DICTIONARIES[locale].gameEndMessage) instead of owning its own PT text,
// since Plan 8a already authored those exact keys for this exact consumer.
export function describeGameEnd(
  status: GameStatus,
  mode: 'ai' | 'local',
  humanColor: Color,
  turn: Color,
  locale: Locale
): GameEndDescription | null {
  const t = DICTIONARIES[locale].gameEndMessage;
  if (status === 'no-moves') {
    // `turn` is always the side with zero legal moves -- they lose.
    if (mode === 'ai') {
      return turn === humanColor ? { title: t.aiLose, kind: 'lose' } : { title: t.aiWin, kind: 'win' };
    }
    return turn === 'b' ? { title: t.localWhiteWins, kind: 'win' } : { title: t.localBlackWins, kind: 'win' };
  }
  if (status === 'draw-repetition') {
    return { title: t.drawRepetition, kind: 'draw' };
  }
  if (status === 'draw-no-capture') {
    return { title: t.drawNoCapture, kind: 'draw' };
  }
  return null;
}
