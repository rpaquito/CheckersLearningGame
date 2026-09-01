'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCheckersGame } from '@/lib/checkers/useCheckersGame';
import { CheckersBoard } from '@/components/CheckersBoard/CheckersBoard';
import { GameEndModal } from '@/components/GameEndModal/GameEndModal';
import { ConfirmModal } from '@/components/ConfirmModal/ConfirmModal';
import { createCheckersEngineClient, type CheckersEngineClient } from '@/lib/checkers/checkersEngineClient';
import { difficultyToEngineOptions, type Difficulty } from '@/lib/checkers/difficulty';
import { resolvePlayerColor, type PlayerColor } from '@/lib/checkers/playerColor';
import type { Color, Square } from '@/lib/checkers/types';

function isDifficulty(value: string | null): value is Difficulty {
  return value === 'facil' || value === 'medio' || value === 'dificil';
}

function isPlayerColor(value: string | null): value is PlayerColor {
  return value === 'b' || value === 'w' || value === 'random';
}

type ConfirmAction = 'restart' | 'menu' | null;

function JogarPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAiMode = searchParams.get('mode') === 'ai';
  const difficultyParam = searchParams.get('difficulty');
  const difficulty: Difficulty = isDifficulty(difficultyParam) ? difficultyParam : 'medio';
  const colorParam = searchParams.get('color');
  const colorChoice: PlayerColor = isPlayerColor(colorParam) ? colorParam : 'b';

  const { state, legalMovesFrom, makeMove, reset } = useCheckersGame(true);
  const [selected, setSelected] = useState<Square | null>(null);
  const [engineError, setEngineError] = useState(false);
  const [gameEndOpen, setGameEndOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

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
    client
      .getBestMove(state.board, state.turn, options)
      .then((move) => {
        if (cancelled) return;
        if (!makeMove(move.from, move.to)) {
          console.error('[jogar] engine returned a move the game rejected:', move);
          setEngineError(true);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error('[jogar] engine request failed:', error);
        setEngineError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isAiTurn, state.board, state.turn, difficulty, makeMove]);

  // Opens the moment the game ends -- once per game, since state.isGameOver
  // only flips false->true when a fresh reset() happens (which also closes
  // this via doReset below). Genuinely needs local state decoupled from
  // state.isGameOver (not derived inline) so the player can dismiss the
  // modal (X/Escape/backdrop) without state.isGameOver itself changing and
  // reopening it -- same "necessary setState-in-effect" shape as
  // useCheckersGame's localStorage hydration effect.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state.isGameOver) setGameEndOpen(true);
  }, [state.isGameOver]);

  const legalTargets = selected !== null ? legalMovesFrom(selected) : [];

  function handleSquareClick(square: Square) {
    if (state.isGameOver) return;
    if (isAiMode && state.turn === aiColor) return;

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

  function doReset() {
    reset();
    setSelected(null);
    setEngineError(false);
    setGameEndOpen(false);
  }

  // Progress worth confirming before discarding: at least one move has
  // been made, and the game hasn't already ended (GameEndModal's own
  // "Jogar novamente"/"Menu inicial" already handle that transition
  // without a redundant extra prompt).
  const hasProgressToLose = !state.isGameOver && state.lastMove !== null;

  function handleRestartClick() {
    if (hasProgressToLose) {
      setConfirmAction('restart');
    } else {
      doReset();
    }
  }

  function handleMenuClick(event: React.MouseEvent) {
    if (hasProgressToLose) {
      event.preventDefault();
      setConfirmAction('menu');
    }
    // else: let the <Link> navigate normally.
  }

  function handleConfirmAction() {
    if (confirmAction === 'restart') {
      doReset();
    } else if (confirmAction === 'menu') {
      // ConfirmModal's confirmLabel renders as plain button text, not a
      // link (see Task 3) -- confirming a menu exit must navigate
      // explicitly, there's no <Link> to fall back on here.
      router.push('/');
    }
    setConfirmAction(null);
  }

  function handleCancelConfirm() {
    setConfirmAction(null);
  }

  const turnLabel = state.turn === 'b' ? 'Vez das pretas' : 'Vez das brancas';
  const boardInteractive = !state.isGameOver && !(isAiMode && state.turn === aiColor);

  let statusText: string;
  if (state.isGameOver) statusText = 'Fim de jogo';
  else if (engineError) statusText = 'Erro no motor de jogo — reinicie a partida';
  else if (isAiTurn) statusText = 'A pensar...';
  else statusText = turnLabel;

  return (
    <main className="flex min-h-dvh flex-col items-center gap-4 p-4">
      <p aria-live="polite">{statusText}</p>
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
        <Link href="/" className="underline" onClick={handleMenuClick}>
          Menu inicial
        </Link>
        <button type="button" onClick={handleRestartClick} className="underline">
          Reiniciar partida
        </button>
      </div>

      <GameEndModal
        open={gameEndOpen}
        status={state.status}
        mode={isAiMode ? 'ai' : 'local'}
        humanColor={humanColor}
        turn={state.turn}
        onClose={() => setGameEndOpen(false)}
        onPlayAgain={doReset}
      />
      <ConfirmModal
        open={confirmAction !== null}
        title={confirmAction === 'restart' ? 'Reiniciar partida?' : 'Sair para o menu?'}
        message="Vais perder o progresso desta partida."
        confirmLabel={confirmAction === 'restart' ? 'Reiniciar' : 'Sair'}
        cancelLabel="Cancelar"
        onConfirm={handleConfirmAction}
        onCancel={handleCancelConfirm}
      />
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
