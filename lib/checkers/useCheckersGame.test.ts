// lib/checkers/useCheckersGame.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCheckersGame, clearSavedGame, STORAGE_KEY } from './useCheckersGame';

describe('useCheckersGame', () => {
  beforeEach(() => {
    clearSavedGame();
  });

  it('starts with the standard initial position and black to move', () => {
    const { result } = renderHook(() => useCheckersGame(false));
    expect(result.current.state.turn).toBe('b');
    expect(result.current.state.status).toBe('playing');
    expect(result.current.state.board[10]).toEqual({ color: 'b', kind: 'man' }); // square 11
  });

  it('makeMove applies a legal move and flips the turn', () => {
    const { result } = renderHook(() => useCheckersGame(false));
    act(() => {
      expect(result.current.makeMove(11, 15)).toBe(true);
    });
    expect(result.current.state.turn).toBe('w');
    expect(result.current.state.board[10]).toBeNull();
    expect(result.current.state.board[14]).toEqual({ color: 'b', kind: 'man' });
    expect(result.current.state.lastMove).toEqual({ from: 11, to: 15, captures: [], promotes: false });
  });

  it('makeMove rejects an illegal move and returns false', () => {
    const { result } = renderHook(() => useCheckersGame(false));
    act(() => {
      expect(result.current.makeMove(11, 20)).toBe(false);
    });
    expect(result.current.state.turn).toBe('b');
  });

  it('legalMovesFrom reflects the mandatory-capture rule', () => {
    const { result } = renderHook(() => useCheckersGame(false));
    act(() => {
      result.current.makeMove(11, 15);
    });
    act(() => {
      // NOT 23-19 -- that's the real checkers "exchange" line: 15 and 19 end
      // up diagonally adjacent with an open landing square, which would
      // hand black a mandatory capture and defeat the point of this test.
      // 24-20 is a genuinely quiet reply, nowhere near black's man at 15.
      result.current.makeMove(24, 20);
    });
    // Black to move again with no forced capture -- square 9 has its normal simple moves.
    expect(result.current.legalMovesFrom(9).sort((a, b) => a - b)).toEqual([13, 14]);
  });

  it('reset returns to the initial position', () => {
    const { result } = renderHook(() => useCheckersGame(false));
    act(() => {
      result.current.makeMove(11, 15);
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.state.turn).toBe('b');
    expect(result.current.state.board[10]).toEqual({ color: 'b', kind: 'man' });
  });

  it('persists to localStorage when persist=true and reloads on next mount', () => {
    const first = renderHook(() => useCheckersGame(true));
    act(() => {
      first.result.current.makeMove(11, 15);
    });
    first.unmount();
    const second = renderHook(() => useCheckersGame(true));
    expect(second.result.current.state.turn).toBe('w');
    expect(second.result.current.state.board[14]).toEqual({ color: 'b', kind: 'man' });
  });
});
