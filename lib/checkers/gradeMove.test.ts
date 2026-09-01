import { describe, it, expect, vi } from 'vitest';
import { gradeMove, GRADE_DEPTH } from './gradeMove';
import { createInitialBoard } from './board';
import { applyMove } from './moveGeneration';

const board = createInitialBoard();
const afterBoard = applyMove(board, { from: 11, to: 15, captures: [], promotes: false });

describe('gradeMove', () => {
  it('grades a move with zero loss as boa', async () => {
    const evaluate = vi.fn().mockResolvedValueOnce(20).mockResolvedValueOnce(-20);
    const result = await gradeMove({ evaluate }, board, 'b', afterBoard, 'w');
    expect(result).toEqual({ quality: 'boa', loss: 0 });
  });

  it('grades a large drop in evaluation as erro', async () => {
    const evaluate = vi.fn().mockResolvedValueOnce(50).mockResolvedValueOnce(60);
    const result = await gradeMove({ evaluate }, board, 'b', afterBoard, 'w');
    // bestEval=50, playedEval=-60 -> loss=110
    expect(result).toEqual({ quality: 'erro', loss: 110 });
  });

  it('calls evaluate on the pre-move board for the mover, then the post-move board for the opponent, both at GRADE_DEPTH', async () => {
    const evaluate = vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    await gradeMove({ evaluate }, board, 'b', afterBoard, 'w');
    expect(evaluate).toHaveBeenNthCalledWith(1, board, 'b', GRADE_DEPTH);
    expect(evaluate).toHaveBeenNthCalledWith(2, afterBoard, 'w', GRADE_DEPTH);
  });
});
