'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCheckersGame } from '@/lib/checkers/useCheckersGame';
import { CheckersBoard } from '@/components/CheckersBoard/CheckersBoard';
import { GameEndModal } from '@/components/GameEndModal/GameEndModal';
import { ConfirmModal } from '@/components/ConfirmModal/ConfirmModal';
import { createCheckersEngineClient, type CheckersEngineClient } from '@/lib/checkers/checkersEngineClient';
import { difficultyToEngineOptions, SUGGESTION_ENGINE_OPTIONS, type Difficulty } from '@/lib/checkers/difficulty';
import { resolvePlayerColor, type PlayerColor } from '@/lib/checkers/playerColor';
import { applyMove } from '@/lib/checkers/moveGeneration';
import { useLearningModePreference } from '@/lib/checkers/useLearningModePreference';
import { gradeMove } from '@/lib/checkers/gradeMove';
import { explainMove, describeMoveForToast } from '@/lib/checkers/moveExplanation';
import { LearningPanel } from '@/components/LearningPanel/LearningPanel';
import { useToast } from '@/components/Toast/ToastProvider';
import type { Board, CheckersMove, Color, Square } from '@/lib/checkers/types';

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

  const { show } = useToast();
  const [learningModeEnabled, toggleLearningMode] = useLearningModePreference();
  const [suggestedMove, setSuggestedMove] = useState<CheckersMove | null>(null);
  const [suggestionExplanation, setSuggestionExplanation] = useState<string | null>(null);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const learningEngineRef = useRef<CheckersEngineClient | null>(null);
  const pendingGradeRef = useRef<{ boardBeforeMove: Board; moverColor: Color } | null>(null);
  // Flipped false only on true unmount, never on a mere state.lastMove
  // change -- see the grading effect below for why this must NOT be tied
  // to that effect's own re-run cleanup. Must also be set back to `true` in
  // the effect body (not just declared via useRef(true)): React 18 Strict
  // Mode double-invokes every effect once in development (mount -> cleanup
  // -> mount again) to surface exactly this kind of bug -- without
  // re-arming it here, that dev-only simulated unmount would leave
  // mountedRef.current stuck `false` for the rest of the component's real
  // lifetime, permanently suppressing every grading toast in `next dev`
  // while working fine in a production build.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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

  // Vs-computer mode reuses `engineRef` (see getLearningEngine below) --
  // this effect only ever creates a SEPARATE engine for local two-player
  // games, and only while Learning Mode is on. Deliberately independent of
  // isAiMode/engineRef's lifecycle: toggling Learning Mode on/off in a
  // vs-computer game must never recreate/terminate the opponent's engine
  // mid-think.
  useEffect(() => {
    if (isAiMode || !learningModeEnabled) return;
    const client = createCheckersEngineClient();
    learningEngineRef.current = client;
    return () => {
      client.terminate();
      learningEngineRef.current = null;
    };
  }, [isAiMode, learningModeEnabled]);

  function getLearningEngine(): CheckersEngineClient | null {
    return isAiMode ? engineRef.current : learningEngineRef.current;
  }

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

  // A suggestion refers to a specific board position -- once any move is
  // made (by either side), that suggestion no longer applies to the
  // current position and must not linger on the board or in the panel.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSuggestedMove(null);
    setSuggestionExplanation(null);
  }, [state.lastMove]);

  // Runs once per move (state.lastMove changes to a new object every move).
  // Only fires for moves handleSquareClick captured a pending grade for --
  // the AI's own moves (made by the isAiTurn effect above, never through
  // handleSquareClick) never populate pendingGradeRef, so they're never
  // graded, satisfying "grade every human-made move, never the engine's".
  //
  // Deliberately has NO cleanup function tied to [state.lastMove]. An
  // earlier version cancelled itself (via a per-run `cancelled` local) every
  // time state.lastMove changed again -- which in vs-computer mode is
  // *guaranteed* to happen before this resolves: grading's two evaluate()
  // calls share engineRef's FIFO queue with the AI's own getBestMove()
  // request (queued first, since the isAiTurn effect is declared earlier),
  // and the AI's reply lands via a same-tick microtask the instant its
  // request settles -- always faster than grading's own queued worker
  // round-trip. That made the per-run `cancelled` flag flip true before
  // gradeMove() could ever resolve, silently swallowing every vs-computer
  // toast. A toast landing a beat after the AI's own reply is acceptable UX;
  // a toast that never arrives is not. mountedRef (declared above, flipped
  // only by a real unmount effect) still guards the one risk that matters:
  // this promise resolving after the player has navigated away from /jogar
  // entirely, where show() would otherwise pop a stale toast on whatever
  // page they're on now (ToastProvider is mounted above this page and
  // outlives it).
  useEffect(() => {
    const pending = pendingGradeRef.current;
    pendingGradeRef.current = null;
    if (!pending) return;
    // Learning Mode may have been toggled off between the click and this
    // effect running -- don't surface a toast for a grading the player no
    // longer asked for.
    if (!learningModeEnabled) return;
    const engine = getLearningEngine();
    if (!engine) return;
    const move = state.lastMove;
    if (!move) return;
    const boardAfterMove = state.board;
    const opponentColor: Color = pending.moverColor === 'b' ? 'w' : 'b';

    gradeMove(engine, pending.boardBeforeMove, pending.moverColor, boardAfterMove, opponentColor)
      .then(({ quality, loss }) => {
        if (!mountedRef.current) return;
        const message = describeMoveForToast({
          quality,
          loss,
          move,
          boardBeforeMove: pending.boardBeforeMove,
          boardAfterMove,
          moverColor: pending.moverColor,
          locale: 'pt',
        });
        show(message, quality);
      })
      .catch((error: unknown) => {
        if (!mountedRef.current) return;
        // Quiet failure by design: grading is a nice-to-have overlay, not
        // core gameplay -- unlike the AI-move-request failure above, this
        // must never surface as a blocking error or disrupt play.
        console.error('[jogar] move grading failed:', error);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastMove]);

  const legalTargets = selected !== null ? legalMovesFrom(selected) : [];

  function handleSquareClick(square: Square) {
    if (state.isGameOver) return;
    if (isAiMode && state.turn === aiColor) return;

    if (selected !== null && legalTargets.includes(square)) {
      if (learningModeEnabled) {
        pendingGradeRef.current = { boardBeforeMove: state.board, moverColor: state.turn };
      }
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

  function handleRequestSuggestion() {
    const engine = getLearningEngine();
    if (!engine) return;
    setSuggestionLoading(true);
    engine
      .getBestMove(state.board, state.turn, SUGGESTION_ENGINE_OPTIONS)
      .then((move) => {
        setSuggestedMove(move);
        setSuggestionExplanation(
          explainMove({
            move,
            boardBeforeMove: state.board,
            boardAfterMove: applyMove(state.board, move),
            moverColor: state.turn,
            locale: 'pt',
          }),
        );
      })
      .catch((error: unknown) => {
        // Same quiet-failure reasoning as grading: a failed suggestion
        // request must not block or disrupt play.
        console.error('[jogar] suggestion request failed:', error);
      })
      .finally(() => {
        setSuggestionLoading(false);
      });
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
        suggestedMove={suggestedMove}
        interactive={boardInteractive}
        onSquareClick={handleSquareClick}
      />
      <LearningPanel
        enabled={learningModeEnabled}
        onToggle={toggleLearningMode}
        canRequestSuggestion={boardInteractive && !suggestionLoading}
        onRequestSuggestion={handleRequestSuggestion}
        suggestionLoading={suggestionLoading}
        hasSuggestion={suggestedMove !== null}
        suggestionExplanation={suggestionExplanation}
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
        open={confirmAction !== null && hasProgressToLose}
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
