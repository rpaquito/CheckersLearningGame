'use client';

import { useState } from 'react';
import type { Board, CheckersMove, Color, Square } from '@/lib/checkers/types';
import { legalMovesFrom, applyMove } from '@/lib/checkers/moveGeneration';
import { CheckersBoard } from '@/components/CheckersBoard/CheckersBoard';
import { ChipButton } from '@/components/ChipButton/ChipButton';

export interface PieceDemo {
  title: string;
  description: string;
  board: Board;
  square: Square;
}

/**
 * Playable single-piece demo shared by every /aprender subpage with a
 * board (pecas, regras-especiais, fim-de-jogo) -- keeps its own state
 * (board + highlighted square) and calls straight into the rules engine
 * (legalMovesFrom/applyMove) to validate/apply the clicked move. Not a
 * real game: only the highlighted piece ever moves, there's no opponent
 * turn -- but it reuses CheckersBoard's click interaction and slide/
 * capture-fade animation for free, same idea as Chess Sensei's
 * InteractiveDemo.
 *
 * `turn` is passed to CheckersBoard as the color OPPOSITE the
 * protagonist's, held constant for the whole demo -- CheckersBoard infers
 * "whoever just moved" as NOT-turn (see its own doc comment on the
 * animation effect), and since only the protagonist ever moves here, that
 * inference must always resolve back to the protagonist's own color for
 * the slide/capture-fade animation to fire instead of a hard snap.
 */
export function InteractiveDemo({ title, description, board: initialBoard, square: initialSquare }: PieceDemo) {
  const protagonistColor: Color = initialBoard[initialSquare - 1]?.color ?? 'b';
  const opponentColor: Color = protagonistColor === 'b' ? 'w' : 'b';
  const [board, setBoard] = useState<Board>(initialBoard);
  const [square, setSquare] = useState<Square>(initialSquare);
  const [lastMove, setLastMove] = useState<CheckersMove | null>(null);
  const legalMoves = legalMovesFrom(board, protagonistColor, square);
  const legalTargets = legalMoves.map((m) => m.to);

  function handleSquareClick(target: Square) {
    const move = legalMoves.find((m) => m.to === target);
    if (!move) return;
    setBoard(applyMove(board, move));
    setLastMove(move);
    setSquare(move.to);
  }

  function handleReset() {
    setBoard(initialBoard);
    setSquare(initialSquare);
    setLastMove(null);
  }

  return (
    <section className="flex flex-col sm:flex-row gap-4 items-center">
      <div className="w-full sm:w-64 shrink-0 flex flex-col items-center gap-3">
        <CheckersBoard
          board={board}
          turn={opponentColor}
          selectedSquare={square}
          legalTargets={legalTargets}
          mandatoryCaptureSquares={[]}
          lastMove={lastMove}
          interactive
          onSquareClick={handleSquareClick}
        />
        <ChipButton color="pink" onClick={handleReset}>
          Reiniciar
        </ChipButton>
      </div>
      <div>
        <h2 className="text-xl font-semibold text-cyan">{title}</h2>
        <p className="text-lilac/80 mt-1">{description}</p>
      </div>
    </section>
  );
}
