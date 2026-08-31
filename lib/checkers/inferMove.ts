import type { Board, CheckersMove, Color } from './types';
import { allLegalMoves, applyMove } from './moveGeneration';

function boardsEqual(a: Board, b: Board): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const pa = a[i];
    const pb = b[i];
    if (pa === null && pb === null) continue;
    if (!pa || !pb) return false;
    if (pa.color !== pb.color || pa.kind !== pb.kind) return false;
  }
  return true;
}

// Discovers which legal move connects two consecutive positions, by testing
// every legal move from prevBoard until one produces nextBoard. Used only
// for the sliding-piece animation in a later UI phase — never for
// validating/vetoing anything (same role as Chess Sensei's inferMove.ts).
export function inferMove(prevBoard: Board, turn: Color, nextBoard: Board): CheckersMove | null {
  for (const move of allLegalMoves(prevBoard, turn)) {
    if (boardsEqual(applyMove(prevBoard, move), nextBoard)) return move;
  }
  return null;
}
