'use client';

import { useMemo, useRef, useState } from 'react';
import { createInitialBoard } from '@/lib/checkers/board';
import { CheckersBoard } from '@/components/CheckersBoard/CheckersBoard';
import { ChipButton } from '@/components/ChipButton/ChipButton';
import { LineTabs } from '@/components/LineTabs/LineTabs';
import { replayLine, type ReplayedMove } from '@/lib/openings/replayLine';
import type { Opening } from '@/lib/openings/types';

const START_BOARD = createInitialBoard();

/** "1. " for black's move, "1..." for white's reply -- checkers' lines
 * always start with black (see lib/checkers/board.ts). */
function moveLabel(stepIndex: number): string {
  const fullmove = Math.ceil(stepIndex / 2);
  return stepIndex % 2 === 1 ? `${fullmove}. ` : `${fullmove}...`;
}

export function OpeningStudy({ opening }: { opening: Opening }) {
  const tabLines = useMemo(() => opening.lines.map((line) => ({ name: line.name.pt })), [opening]);
  const replayedLines = useMemo(() => opening.lines.map((line) => replayLine(line)), [opening]);
  const [lineIndex, setLineIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  const replayed = replayedLines[lineIndex];
  const current: ReplayedMove | null = stepIndex === 0 ? null : replayed[stepIndex - 1];
  const board = current?.board ?? START_BOARD;
  const turn = stepIndex % 2 === 0 ? 'b' : 'w';
  const lastMove = current?.move ?? null;
  const prevButtonRef = useRef<HTMLButtonElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  function selectLine(index: number) {
    setLineIndex(index);
    setStepIndex(0);
  }

  // A focused native <button disabled> loses focus to <body> the instant
  // it becomes disabled -- trying to catch that afterward in an effect
  // loses the race. Instead, move focus to the still-enabled sibling
  // BEFORE React disables the clicked one.
  function goToStep(next: number) {
    if (next === 0) nextButtonRef.current?.focus();
    else if (next === replayed.length) prevButtonRef.current?.focus();
    setStepIndex(next);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <LineTabs lines={tabLines} activeIndex={lineIndex} onSelect={selectLine}>
        <div className="w-[min(98vw,62dvh,560px)] sm:w-[min(92vw,62dvh,560px)] flex flex-col items-center gap-3">
          <CheckersBoard
            board={board}
            turn={turn}
            selectedSquare={null}
            legalTargets={[]}
            mandatoryCaptureSquares={[]}
            lastMove={lastMove}
            interactive={false}
          />

          <div className="flex items-center gap-3">
            <ChipButton
              ref={prevButtonRef}
              color="pink"
              onClick={() => goToStep(Math.max(0, stepIndex - 1))}
              disabled={stepIndex === 0}
            >
              Anterior
            </ChipButton>
            <span className="text-sm text-lilac/80">
              {stepIndex} / {replayed.length}
            </span>
            <ChipButton
              ref={nextButtonRef}
              color="cyan"
              onClick={() => goToStep(Math.min(replayed.length, stepIndex + 1))}
              disabled={stepIndex === replayed.length}
            >
              Seguinte
            </ChipButton>
          </div>

          <div className="w-full rounded-xl border-2 border-purple/40 bg-ink-soft p-4 text-center" aria-live="polite">
            {current ? (
              <>
                <p className="font-semibold text-cyan">
                  {moveLabel(stepIndex)}{current.notation}
                </p>
                <p className="text-lilac/80 mt-1">{current.explanation.pt}</p>
              </>
            ) : (
              <p className="text-lilac/80">Posição inicial.</p>
            )}
          </div>
        </div>
      </LineTabs>
    </div>
  );
}
