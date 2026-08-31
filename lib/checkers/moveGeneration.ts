import { ALL_DIRECTIONS, FORWARD_DIRECTIONS, isBackRowFor, neighbor, type Direction } from './board';
import type { Board, CheckersMove, Color, Piece, PieceKind, Square } from './types';

function directionsFor(piece: Piece): Direction[] {
  return piece.kind === 'king' ? ALL_DIRECTIONS : FORWARD_DIRECTIONS[piece.color];
}

export function simpleMovesFrom(board: Board, square: Square): CheckersMove[] {
  const piece = board[square - 1];
  if (!piece) return [];
  const moves: CheckersMove[] = [];
  for (const dir of directionsFor(piece)) {
    const to = neighbor(square, dir);
    if (to !== null && board[to - 1] === null) {
      moves.push({
        from: square,
        to,
        captures: [],
        promotes: piece.kind === 'man' && isBackRowFor(to, piece.color),
      });
    }
  }
  return moves;
}

interface ChainResult {
  to: Square;
  captures: Square[];
  promotes: boolean;
}

function captureChainsFrom(
  workingBoard: (Piece | null)[],
  color: Color,
  kind: PieceKind,
  current: Square,
  capturedSoFar: readonly Square[],
): ChainResult[] {
  const directions = kind === 'king' ? ALL_DIRECTIONS : FORWARD_DIRECTIONS[color];
  const results: ChainResult[] = [];

  for (const dir of directions) {
    const mid = neighbor(current, dir);
    if (mid === null) continue;
    const midPiece = workingBoard[mid - 1];
    if (!midPiece || midPiece.color === color) continue;
    if (capturedSoFar.includes(mid)) continue; // can't capture the same piece twice

    const landing = neighbor(mid, dir);
    if (landing === null) continue;
    if (workingBoard[landing - 1] !== null) continue;

    const nowCaptured = [...capturedSoFar, mid];
    const justPromoted = kind === 'man' && isBackRowFor(landing, color);

    if (justPromoted) {
      // A man reaching the king row stops immediately — it does not
      // continue capturing in the same turn as a newly-crowned king. See
      // design spec §2/§12 and CLAUDE.md's "promotion mid-chain" note.
      results.push({ to: landing, captures: nowCaptured, promotes: true });
      continue;
    }

    // Temporarily relocate the piece for the recursive lookahead. Captured
    // pieces stay on the working board (matches official rules: they're
    // only removed once the whole move finishes), but the moving piece
    // itself must vacate `current` so a chain that loops back through its
    // own trail sees the correct occupancy.
    const savedCurrent = workingBoard[current - 1];
    workingBoard[current - 1] = null;
    workingBoard[landing - 1] = savedCurrent;
    const further = captureChainsFrom(workingBoard, color, kind, landing, nowCaptured);
    workingBoard[landing - 1] = null;
    workingBoard[current - 1] = savedCurrent;

    if (further.length === 0) {
      results.push({ to: landing, captures: nowCaptured, promotes: false });
    } else {
      results.push(...further);
    }
  }

  return results;
}

export function captureMovesFrom(board: Board, square: Square): CheckersMove[] {
  const piece = board[square - 1];
  if (!piece) return [];
  const working = board.slice() as (Piece | null)[];
  return captureChainsFrom(working, piece.color, piece.kind, square, []).map((r) => ({
    from: square,
    to: r.to,
    captures: r.captures,
    promotes: r.promotes,
  }));
}
