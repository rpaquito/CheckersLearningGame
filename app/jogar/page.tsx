'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCheckersGame } from '@/lib/checkers/useCheckersGame';
import { CheckersBoard } from '@/components/CheckersBoard/CheckersBoard';
import type { Square } from '@/lib/checkers/types';

const STATUS_LABEL: Record<string, string> = {
  playing: '',
  'no-moves': 'Fim de jogo — sem jogadas possíveis',
  'draw-repetition': 'Empate por repetição de posição',
  'draw-no-capture': 'Empate — 40 lances sem captura',
};

export default function JogarPage() {
  const { state, legalMovesFrom, makeMove, reset } = useCheckersGame(true);
  const [selected, setSelected] = useState<Square | null>(null);

  const legalTargets = selected !== null ? legalMovesFrom(selected) : [];

  function handleSquareClick(square: Square) {
    if (state.isGameOver) return;

    if (selected !== null && legalTargets.includes(square)) {
      makeMove(selected, square);
      setSelected(null);
      return;
    }

    const piece = state.board[square - 1];
    if (piece && piece.color === state.turn) {
      setSelected((prev) => (prev === square ? null : square));
    } else {
      setSelected(null);
    }
  }

  function handleReset() {
    reset();
    setSelected(null);
  }

  const turnLabel = state.turn === 'b' ? 'Vez das pretas' : 'Vez das brancas';

  return (
    <main className="flex min-h-dvh flex-col items-center gap-4 p-4">
      <p aria-live="polite">{state.isGameOver ? STATUS_LABEL[state.status] : turnLabel}</p>
      <CheckersBoard
        board={state.board}
        turn={state.turn}
        selectedSquare={selected}
        legalTargets={legalTargets}
        mandatoryCaptureSquares={state.mandatoryCaptureSquares}
        lastMove={state.lastMove}
        interactive={!state.isGameOver}
        onSquareClick={handleSquareClick}
      />
      <div className="flex gap-4">
        <Link href="/" className="underline">
          Menu inicial
        </Link>
        <button type="button" onClick={handleReset} className="underline">
          Reiniciar partida
        </button>
      </div>
    </main>
  );
}
