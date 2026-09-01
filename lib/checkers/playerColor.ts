import type { Color } from './types';

export type PlayerColor = Color | 'random';

// Resolves the human's chosen color for a new AI game into an actual 'b'/'w'
// -- called once per game (see app/jogar/page.tsx's AI wiring), not on every
// render, so a 'random' choice doesn't reshuffle mid-game.
export function resolvePlayerColor(choice: PlayerColor, random: () => number = Math.random): Color {
  if (choice !== 'random') return choice;
  return random() < 0.5 ? 'b' : 'w';
}
