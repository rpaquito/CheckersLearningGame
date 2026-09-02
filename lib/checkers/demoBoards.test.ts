import { describe, expect, it } from 'vitest';
import {
  buildBoard,
  squareAt,
  MAN_MOVEMENT_DEMO,
  KING_MOVEMENT_DEMO,
  PROMOTION_DEMO,
  MANDATORY_CAPTURE_DEMO,
  MULTI_JUMP_DEMO,
  NO_LEGAL_MOVES_DEMO,
} from './demoBoards';
import { legalMovesFrom } from './moveGeneration';

describe('squareAt / buildBoard', () => {
  it('throws for a light (non-playable) square', () => {
    expect(() => squareAt(0, 0)).toThrow();
  });

  it('places a piece at the resolved square', () => {
    const board = buildBoard([{ row: 0, col: 1, color: 'b', kind: 'man' }]);
    expect(board[squareAt(0, 1) - 1]).toEqual({ color: 'b', kind: 'man' });
  });
});

describe('MAN_MOVEMENT_DEMO', () => {
  it('has exactly two legal simple moves, both forward diagonals', () => {
    const moves = legalMovesFrom(MAN_MOVEMENT_DEMO.board, 'b', MAN_MOVEMENT_DEMO.square);
    const targets = moves.map((m) => m.to).sort((a, b) => a - b);
    const expected = [squareAt(4, 1), squareAt(4, 3)].sort((a, b) => a - b);
    expect(targets).toEqual(expected);
  });
});

describe('KING_MOVEMENT_DEMO', () => {
  it('has exactly four legal moves, one per diagonal direction', () => {
    const moves = legalMovesFrom(KING_MOVEMENT_DEMO.board, 'b', KING_MOVEMENT_DEMO.square);
    expect(moves).toHaveLength(4);
  });
});

describe('PROMOTION_DEMO', () => {
  it('promotes on both of its legal landing squares', () => {
    const moves = legalMovesFrom(PROMOTION_DEMO.board, 'b', PROMOTION_DEMO.square);
    expect(moves).toHaveLength(2);
    expect(moves.every((m) => m.promotes)).toBe(true);
  });
});

describe('MANDATORY_CAPTURE_DEMO', () => {
  it('has exactly one legal move: the jump', () => {
    const moves = legalMovesFrom(MANDATORY_CAPTURE_DEMO.board, 'b', MANDATORY_CAPTURE_DEMO.square);
    expect(moves).toHaveLength(1);
    expect(moves[0].to).toBe(squareAt(4, 3));
    expect(moves[0].captures).toEqual([squareAt(3, 2)]);
  });
});

describe('MULTI_JUMP_DEMO', () => {
  it('has exactly one legal move that captures both white men', () => {
    const moves = legalMovesFrom(MULTI_JUMP_DEMO.board, 'b', MULTI_JUMP_DEMO.square);
    expect(moves).toHaveLength(1);
    expect(moves[0].to).toBe(squareAt(4, 5));
    const captures = moves[0].captures.slice().sort((a, b) => a - b);
    const expected = [squareAt(1, 2), squareAt(3, 4)].sort((a, b) => a - b);
    expect(captures).toEqual(expected);
  });
});

describe('NO_LEGAL_MOVES_DEMO', () => {
  it('has zero legal moves', () => {
    const moves = legalMovesFrom(NO_LEGAL_MOVES_DEMO.board, 'b', NO_LEGAL_MOVES_DEMO.square);
    expect(moves).toHaveLength(0);
  });
});
