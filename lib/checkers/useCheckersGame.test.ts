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

  it('state.mandatoryCaptureSquares contains exactly the one black piece that must capture', () => {
    // Sequence verified directly against the engine (moveGeneration.ts) via
    // a scripted run before writing this assertion: 11-15, 22-18 leaves
    // black to move with 12 pieces on the board (1-10, 12, 15), and only
    // square 15 has a legal (forced) capture -- 15x22 landing on 18's
    // square after capturing white's man there. Every other black piece
    // (including 9, 10, 12) has no capture available, so they must sit out.
    // Note: only the first makeMove's return value is asserted here, matching
    // the existing "legalMovesFrom reflects the mandatory-capture rule" test
    // above -- makeMove's boolean return is not reliable for a second call
    // made in its own act() block right after a prior one (React's setGame
    // updater for that call can run after this synchronous function already
    // returned), so subsequent moves in a sequence are verified via
    // resulting state instead, same as that existing test already does.
    const { result } = renderHook(() => useCheckersGame(false));
    act(() => {
      expect(result.current.makeMove(11, 15)).toBe(true);
    });
    act(() => {
      result.current.makeMove(22, 18);
    });
    expect(result.current.state.turn).toBe('b');
    expect(result.current.state.mandatoryCaptureSquares).toEqual([15]);
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
    // Confirms the hook actually persists under the real, documented
    // storage key (not just "some key") -- STORAGE_KEY is otherwise only
    // ever imported, never asserted against.
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    const second = renderHook(() => useCheckersGame(true));
    expect(second.result.current.state.turn).toBe('w');
    expect(second.result.current.state.board[14]).toEqual({ color: 'b', kind: 'man' });
  });

  it('falls back to a fresh initial game when localStorage holds structurally-invalid JSON', () => {
    // Syntactically valid JSON (JSON.parse succeeds) but the wrong shape: a
    // 3-element board instead of 32. Without the shape check this reaches
    // setGame and then crashes later during render (computeStatus ->
    // allLegalMoves -> board[s-1] access assumes a 32-length board).
    window.localStorage.setItem(STORAGE_KEY, '{"board": [1,2,3], "turn": "b"}');
    const { result } = renderHook(() => useCheckersGame(true));
    expect(result.current.state.turn).toBe('b');
    expect(result.current.state.status).toBe('playing');
    expect(result.current.state.board[10]).toEqual({ color: 'b', kind: 'man' }); // square 11
    expect(result.current.state.board.length).toBe(32);
  });

  it('makeMove returns the correct result for every call, not just the first', () => {
    const { result } = renderHook(() => useCheckersGame(false));
    act(() => {
      expect(result.current.makeMove(11, 15)).toBe(true);
    });
    act(() => {
      expect(result.current.makeMove(24, 20)).toBe(true); // white's known-quiet reply, see Task 8's plan comment
    });
    act(() => {
      expect(result.current.makeMove(11, 99)).toBe(false); // 99 is never a real square target -- illegal
    });
    act(() => {
      expect(result.current.makeMove(9, 13)).toBe(true); // fourth call -- still correct
    });
  });
});
