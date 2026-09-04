import { describe, it, expect } from 'vitest';
import { gradeMove, GRADE_DEPTH, type Grader } from './gradeMove';
import { createInitialBoard } from './board';
import { allLegalMoves, applyMove } from './moveGeneration';
import { findBestMove } from './search';
import type { Board, CheckersMove, Color } from './types';

const board = createInitialBoard();
const move: CheckersMove = { from: 11, to: 15, captures: [], promotes: false, path: [15] };

describe('gradeMove', () => {
  it('grades a move with zero loss as boa', async () => {
    const fakeGrader: Grader = {
      gradeMove: async () => ({ bestScore: 20, playedScore: 20 }),
    };
    const result = await gradeMove(fakeGrader, board, 'b', move);
    expect(result).toEqual({ quality: 'boa', loss: 0 });
  });

  it('grades a small drop in evaluation as imprecisao', async () => {
    const fakeGrader: Grader = {
      gradeMove: async () => ({ bestScore: 50, playedScore: 20 }),
    };
    const result = await gradeMove(fakeGrader, board, 'b', move);
    expect(result).toEqual({ quality: 'imprecisao', loss: 30 });
  });

  it('grades a large drop in evaluation as erro', async () => {
    const fakeGrader: Grader = {
      gradeMove: async () => ({ bestScore: 50, playedScore: -60 }),
    };
    const result = await gradeMove(fakeGrader, board, 'b', move);
    expect(result).toEqual({ quality: 'erro', loss: 110 });
  });

  it('never reports negative loss when the played move scores above bestScore', async () => {
    const fakeGrader: Grader = {
      gradeMove: async () => ({ bestScore: 10, playedScore: 25 }),
    };
    const result = await gradeMove(fakeGrader, board, 'b', move);
    expect(result).toEqual({ quality: 'boa', loss: 0 });
  });

  it('passes the board, mover color, move, and GRADE_DEPTH through to the engine', async () => {
    let capturedArgs: unknown[] = [];
    const fakeGrader: Grader = {
      gradeMove: async (...args) => {
        capturedArgs = args;
        return { bestScore: 0, playedScore: 0 };
      },
    };
    await gradeMove(fakeGrader, board, 'b', move);
    expect(capturedArgs).toEqual([board, 'b', move, GRADE_DEPTH]);
  });

  // Integration test against the REAL search engine, not a mock. The old
  // two-evaluate()-call design could never have caught the bug it had (see
  // CLAUDE.md) because its unit tests mocked out the very thing that was
  // broken. This exercises findBestMove() end-to-end on a real, verified
  // position with a real, verified blunder available.
  it('grades a real blunder as erro using the real search engine', async () => {
    // Reach a real position via real legal moves, verified with
    // allLegalMoves at each step rather than a hand-assembled board (this
    // repo has a documented history of hand-indexed-square-fixture bugs).
    function play(startBoard: Board, startTurn: Color, seq: [number, number][]): { board: Board; turn: Color } {
      let board = startBoard;
      let turn = startTurn;
      for (const [from, to] of seq) {
        const legal = allLegalMoves(board, turn);
        const found = legal.find((m) => m.from === from && m.to === to);
        if (!found) {
          throw new Error(`fixture setup: ${from}-${to} is not legal for ${turn} here`);
        }
        board = applyMove(board, found);
        turn = turn === 'b' ? 'w' : 'b';
      }
      return { board, turn };
    }

    const { board: position, turn } = play(createInitialBoard(), 'b', [
      [9, 13],
      [22, 18],
    ]);
    expect(turn).toBe('b');

    // Confirmed (via a real depth-8 findBestMove search on this exact
    // position, in exploratory scratch work) that 5-9 is a genuine
    // blunder -- scoring ~104 points worse than the best move (6-9) at
    // GRADE_DEPTH -- while 6-9 is the engine's own top choice. Verify both
    // are still actually legal here before trusting that.
    const blunderMove: CheckersMove = { from: 5, to: 9, captures: [], promotes: false, path: [9] };
    const betterMove: CheckersMove = { from: 6, to: 9, captures: [], promotes: false, path: [9] };
    const legalMoves = allLegalMoves(position, turn);
    expect(legalMoves).toContainEqual(blunderMove);
    expect(legalMoves).toContainEqual(betterMove);

    const realGrader: Grader = {
      gradeMove: async (gradeBoard, gradeTurn, gradeMoveArg, depth) => {
        const result = findBestMove(gradeBoard, gradeTurn, { maxDepth: depth, timeBudgetMs: 5000, randomness: 0 });
        const played = result.candidates.find(
          (c) =>
            c.move.from === gradeMoveArg.from &&
            c.move.to === gradeMoveArg.to &&
            c.move.promotes === gradeMoveArg.promotes &&
            c.move.captures.length === gradeMoveArg.captures.length &&
            c.move.captures.every((s, i) => s === gradeMoveArg.captures[i])
        );
        if (!played) throw new Error('move not found among candidates');
        return { bestScore: result.bestScore, playedScore: played.score };
      },
    };

    const grade = await gradeMove(realGrader, position, turn, blunderMove);
    expect(grade.quality).toBe('erro');
  }, 20000);
});
