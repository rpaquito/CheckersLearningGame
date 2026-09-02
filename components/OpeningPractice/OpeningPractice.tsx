'use client';

import { useEffect, useMemo, useState } from 'react';
import { createInitialBoard } from '@/lib/checkers/board';
import { legalMovesFrom } from '@/lib/checkers/moveGeneration';
import { CheckersBoard } from '@/components/CheckersBoard/CheckersBoard';
import { ChipButton } from '@/components/ChipButton/ChipButton';
import { LineTabs } from '@/components/LineTabs/LineTabs';
import { replayLine } from '@/lib/openings/replayLine';
import type { Square } from '@/lib/checkers/types';
import type { Opening } from '@/lib/openings/types';

const START_BOARD = createInitialBoard();
const OPPONENT_MOVE_DELAY_MS = 500;

export function OpeningPractice({ opening }: { opening: Opening }) {
  const tabLines = useMemo(() => opening.lines.map((line) => ({ name: line.name.pt })), [opening]);
  const replayedLines = useMemo(() => opening.lines.map((line) => replayLine(line)), [opening]);

  const [lineIndex, setLineIndex] = useState(0);
  const [plyIndex, setPlyIndex] = useState(0);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [wrongAttempt, setWrongAttempt] = useState(false);

  const replayed = replayedLines[lineIndex];
  const board = plyIndex === 0 ? START_BOARD : replayed[plyIndex - 1].board;
  const lastMove = plyIndex === 0 ? null : replayed[plyIndex - 1].move;
  const completed = plyIndex === replayed.length;
  const nextMoverColor = plyIndex % 2 === 0 ? 'b' : 'w';
  const isUserTurn = !completed && nextMoverColor === 'b';
  const legalTargets = selectedSquare ? legalMovesFrom(board, 'b', selectedSquare).map((m) => m.to) : [];
  const expected = completed ? null : replayed[plyIndex];

  function selectLine(index: number) {
    setLineIndex(index);
    setPlyIndex(0);
    setSelectedSquare(null);
    setWrongAttempt(false);
  }

  function restartLine() {
    setPlyIndex(0);
    setSelectedSquare(null);
    setWrongAttempt(false);
  }

  // The opponent always plays the line's own move automatically.
  // `lineIndex` is in the deps even though unread in the body: without
  // it, switching lines WHILE this timer is already counting (same
  // plyIndex/isUserTurn/completed before and after, e.g. 0->0 right at
  // the start) wouldn't restart the timer -- the new line's opponent
  // move would fire earlier than the promised OPPONENT_MOVE_DELAY_MS.
  useEffect(() => {
    if (completed || isUserTurn) return;
    const timer = setTimeout(() => {
      setPlyIndex((p) => p + 1);
    }, OPPONENT_MOVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [completed, isUserTurn, plyIndex, lineIndex]);

  function handleSquareClick(square: Square) {
    if (!isUserTurn || !expected) return;

    if (selectedSquare && legalTargets.includes(square)) {
      if (square === expected.move.to && selectedSquare === expected.move.from) {
        setPlyIndex((p) => p + 1);
        setWrongAttempt(false);
      } else {
        setWrongAttempt(true);
      }
      setSelectedSquare(null);
      return;
    }
    // Doesn't clear wrongAttempt here -- only when a move is actually
    // played (right, or a fresh wrong one), never by reselecting a
    // square. Same pattern as app/jogar/page.tsx: picking the suggested
    // piece (the natural first step to play it) can't erase the hint
    // before the destination is clicked.
    setSelectedSquare(square);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <LineTabs lines={tabLines} activeIndex={lineIndex} onSelect={selectLine}>
        <div className="w-[min(98vw,62dvh,560px)] sm:w-[min(92vw,62dvh,560px)] flex flex-col items-center gap-3">
          <CheckersBoard
            board={board}
            turn={nextMoverColor === 'b' ? 'w' : 'b'}
            selectedSquare={selectedSquare}
            legalTargets={legalTargets}
            mandatoryCaptureSquares={[]}
            lastMove={lastMove}
            suggestedMove={wrongAttempt && expected ? expected.move : null}
            interactive={isUserTurn}
            onSquareClick={handleSquareClick}
          />

          {completed ? (
            <div className="w-full rounded-xl border-2 border-gold bg-ink-soft p-4 text-center flex flex-col gap-3" aria-live="polite">
              <p className="font-semibold text-gold">Linha completa!</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <ChipButton color="pink" onClick={restartLine}>
                  Praticar outra vez
                </ChipButton>
                <ChipButton color="purple" href="/aprender/aberturas">
                  Voltar às aberturas
                </ChipButton>
              </div>
            </div>
          ) : (
            <div className="w-full rounded-xl border-2 border-purple/40 bg-ink-soft p-4 text-center" aria-live="polite">
              {isUserTurn ? (
                wrongAttempt ? (
                  <p className="text-lilac/80">Não é esse — o lance da linha é {expected!.notation}. Tenta de novo.</p>
                ) : (
                  <p className="text-lilac/80">A tua vez: encontra o lance da linha.</p>
                )
              ) : (
                <p className="text-lilac/80">A pensar…</p>
              )}
            </div>
          )}
        </div>
      </LineTabs>
    </div>
  );
}
