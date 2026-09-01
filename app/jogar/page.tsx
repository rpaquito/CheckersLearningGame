'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCheckersGame } from '@/lib/checkers/useCheckersGame';
import { CheckersBoard } from '@/components/CheckersBoard/CheckersBoard';
import { createCheckersEngineClient, type CheckersEngineClient } from '@/lib/checkers/checkersEngineClient';
import { difficultyToEngineOptions, type Difficulty } from '@/lib/checkers/difficulty';
import { resolvePlayerColor, type PlayerColor } from '@/lib/checkers/playerColor';
import type { Color, Square } from '@/lib/checkers/types';

const STATUS_LABEL: Record<string, string> = {
  playing: '',
  'no-moves': 'Fim de jogo — sem jogadas possíveis',
  'draw-repetition': 'Empate por repetição de posição',
  'draw-no-capture': 'Empate — 40 lances sem captura',
};

function isDifficulty(value: string | null): value is Difficulty {
  return value === 'facil' || value === 'medio' || value === 'dificil';
}

function isPlayerColor(value: string | null): value is PlayerColor {
  return value === 'b' || value === 'w' || value === 'random';
}

function JogarPageInner() {
  const searchParams = useSearchParams();
  const isAiMode = searchParams.get('mode') === 'ai';
  const difficultyParam = searchParams.get('difficulty');
  const difficulty: Difficulty = isDifficulty(difficultyParam) ? difficultyParam : 'medio';
  const colorParam = searchParams.get('color');
  const colorChoice: PlayerColor = isPlayerColor(colorParam) ? colorParam : 'b';

  const { state, legalMovesFrom, makeMove, reset } = useCheckersGame(true);
  const [selected, setSelected] = useState<Square | null>(null);

  // Resolved once per mount (not on every render) so a 'random' choice
  // doesn't reshuffle mid-game -- lazy useState initializer runs exactly once.
  const [humanColor] = useState<Color>(() => resolvePlayerColor(colorChoice));
  const aiColor: Color = humanColor === 'b' ? 'w' : 'b';

  const engineRef = useRef<CheckersEngineClient | null>(null);
  useEffect(() => {
    if (!isAiMode) return;
    const client = createCheckersEngineClient();
    engineRef.current = client;
    return () => {
      client.terminate();
      engineRef.current = null;
    };
  }, [isAiMode]);

  const isAiTurn = isAiMode && state.turn === aiColor && !state.isGameOver;
  useEffect(() => {
    if (!isAiTurn) return;
    const client = engineRef.current;
    if (!client) return;
    let cancelled = false;
    const options = difficultyToEngineOptions(difficulty);
    client.getBestMove(state.board, state.turn, options).then((move) => {
      if (cancelled) return;
      makeMove(move.from, move.to);
    });
    return () => {
      cancelled = true;
    };
  }, [isAiTurn, state.board, state.turn, difficulty, makeMove]);

  const legalTargets = selected !== null ? legalMovesFrom(selected) : [];

  function handleSquareClick(square: Square) {
    if (state.isGameOver) return;
    if (isAiMode && state.turn === aiColor) return; // ignore clicks during the AI's turn

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
  const boardInteractive = !state.isGameOver && !(isAiMode && state.turn === aiColor);

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
        interactive={boardInteractive}
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

export default function JogarPage() {
  return (
    <Suspense fallback={null}>
      <JogarPageInner />
    </Suspense>
  );
}
