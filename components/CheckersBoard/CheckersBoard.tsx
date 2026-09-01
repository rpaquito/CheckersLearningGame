'use client';

import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { Board, CheckersMove, Color, PieceKind, Square } from '@/lib/checkers/types';
import { rowColToSquare, squareToRowCol } from '@/lib/checkers/board';
import { inferMove } from '@/lib/checkers/inferMove';
import { PieceIcon } from './PieceIcon';

export interface CheckersBoardProps {
  board: Board;
  turn: Color;
  selectedSquare: Square | null;
  legalTargets: Square[];
  mandatoryCaptureSquares: Square[];
  lastMove: CheckersMove | null;
  interactive?: boolean;
  onSquareClick?: (square: Square) => void;
}

interface DisplayPiece {
  id: string;
  color: Color;
  kind: PieceKind;
  square: Square;
  removing: boolean;
}

const CAPTURE_FADE_MS = 300;

function initialDisplayPieces(board: Board): DisplayPiece[] {
  const pieces: DisplayPiece[] = [];
  for (let s = 1; s <= 32; s++) {
    const piece = board[s - 1];
    if (piece) pieces.push({ id: `p${s}-${piece.color}`, color: piece.color, kind: piece.kind, square: s, removing: false });
  }
  return pieces;
}

export function CheckersBoard({
  board,
  turn,
  selectedSquare,
  legalTargets,
  mandatoryCaptureSquares,
  lastMove,
  interactive = true,
  onSquareClick,
}: CheckersBoardProps): ReactElement {
  const [displayPieces, setDisplayPieces] = useState<DisplayPiece[]>(() => initialDisplayPieces(board));
  const prevBoardRef = useRef<Board>(board);

  useEffect(() => {
    const prevBoard = prevBoardRef.current;
    prevBoardRef.current = board;
    if (prevBoard === board) return;

    // The mover was whichever color is NOT the side to move now (turn
    // already flipped by the time this board is passed in).
    const moverColor: Color = turn === 'b' ? 'w' : 'b';
    const move = inferMove(prevBoard, moverColor, board);

    if (!move) {
      // No single legal move connects the two positions (reset, loaded
      // save, etc.) -- snap to the new position, nothing to animate.
      setDisplayPieces(initialDisplayPieces(board));
      return;
    }

    setDisplayPieces((prev) => {
      const withCaptures = prev.map((piece) =>
        move.captures.includes(piece.square) ? { ...piece, removing: true } : piece,
      );
      return withCaptures.map((piece) =>
        !piece.removing && piece.square === move.from && piece.color === moverColor
          ? { ...piece, square: move.to, kind: move.promotes ? ('king' as const) : piece.kind }
          : piece,
      );
    });

    const timer = setTimeout(() => {
      setDisplayPieces((prev) => prev.filter((piece) => !piece.removing));
    }, CAPTURE_FADE_MS);
    return () => clearTimeout(timer);
  }, [board, turn]);

  const squares: ReactElement[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = rowColToSquare(row, col);
      if (square === null) {
        squares.push(<div key={`light-${row}-${col}`} className="bg-stone-200" aria-hidden="true" />);
        continue;
      }
      const isSelected = square === selectedSquare;
      const isLegalTarget = legalTargets.includes(square);
      const isMandatory = mandatoryCaptureSquares.includes(square);
      const isLastMove = lastMove !== null && (square === lastMove.from || square === lastMove.to);
      squares.push(
        <button
          key={square}
          type="button"
          disabled={!interactive}
          onClick={() => onSquareClick?.(square)}
          aria-label={`square ${square}`}
          className={[
            'relative aspect-square min-h-0 min-w-0 overflow-hidden bg-stone-700',
            isLastMove ? 'ring-4 ring-yellow-400' : '',
            isSelected ? 'outline outline-4 outline-sky-500' : '',
            isMandatory ? 'outline outline-4 outline-amber-400' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {isLegalTarget && <span className="absolute inset-0 m-auto h-1/4 w-1/4 rounded-full bg-emerald-400/70" />}
        </button>,
      );
    }
  }

  return (
    <div className="relative w-[min(98vw,62dvh,560px)] sm:w-[min(92vw,62dvh,560px)]">
      <div role="grid" className="grid aspect-square grid-cols-8 grid-rows-8">
        {squares}
      </div>
      <div className="pointer-events-none absolute inset-0">
        {displayPieces.map((piece) => {
          const { row, col } = squareToRowCol(piece.square);
          return (
            <div
              key={piece.id}
              data-square={piece.square}
              className={[
                'absolute flex items-center justify-center transition-all duration-400 motion-reduce:transition-none',
                piece.color === 'b' ? 'text-stone-900' : 'text-stone-50',
                piece.removing ? 'opacity-0 scale-75 duration-300' : 'opacity-100',
              ].join(' ')}
              style={{ left: `${col * 12.5}%`, top: `${row * 12.5}%`, width: '12.5%', height: '12.5%' }}
            >
              <PieceIcon type={piece.kind} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
