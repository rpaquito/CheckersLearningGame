// lib/checkers/useCheckersGame.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCheckersGame, clearSavedGame, STORAGE_KEY } from './useCheckersGame';
import type { Piece } from './types';

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
      expect(result.current.makeMove({ from: 11, to: 15, captures: [], promotes: false, path: [15] })).toBe(true);
    });
    expect(result.current.state.turn).toBe('w');
    expect(result.current.state.board[10]).toBeNull();
    expect(result.current.state.board[14]).toEqual({ color: 'b', kind: 'man' });
    expect(result.current.state.lastMove).toEqual({ from: 11, to: 15, captures: [], promotes: false, path: [15] });
  });

  it('makeMove rejects an illegal move and returns false', () => {
    const { result } = renderHook(() => useCheckersGame(false));
    act(() => {
      // 20 is not a real diagonal neighbor of 11 -- no legal move matches this shape.
      expect(result.current.makeMove({ from: 11, to: 20, captures: [], promotes: false, path: [20] })).toBe(false);
    });
    expect(result.current.state.turn).toBe('b');
  });

  it('legalMovesFrom reflects the mandatory-capture rule', () => {
    const { result } = renderHook(() => useCheckersGame(false));
    act(() => {
      result.current.makeMove({ from: 11, to: 15, captures: [], promotes: false, path: [15] });
    });
    act(() => {
      // NOT 23-19 -- that's the real checkers "exchange" line: 15 and 19 end
      // up diagonally adjacent with an open landing square, which would
      // hand black a mandatory capture and defeat the point of this test.
      // 24-20 is a genuinely quiet reply, nowhere near black's man at 15.
      result.current.makeMove({ from: 24, to: 20, captures: [], promotes: false, path: [20] });
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
    const { result } = renderHook(() => useCheckersGame(false));
    act(() => {
      expect(result.current.makeMove({ from: 11, to: 15, captures: [], promotes: false, path: [15] })).toBe(true);
    });
    act(() => {
      result.current.makeMove({ from: 22, to: 18, captures: [], promotes: false, path: [18] });
    });
    expect(result.current.state.turn).toBe('b');
    expect(result.current.state.mandatoryCaptureSquares).toEqual([15]);
  });

  it('reset returns to the initial position', () => {
    const { result } = renderHook(() => useCheckersGame(false));
    act(() => {
      result.current.makeMove({ from: 11, to: 15, captures: [], promotes: false, path: [15] });
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
      first.result.current.makeMove({ from: 11, to: 15, captures: [], promotes: false, path: [15] });
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

  it('never writes the fresh initial game to localStorage while hydrating a real saved game', () => {
    // Regression test for the hydration race documented in CLAUDE.md: the
    // persistence effect must never fire with a pre-hydration closure value.
    // A stale write here (turn: 'b', the fresh starting position) instead of
    // the real hydrated save (turn: 'w', after 11-15) is exactly how a real
    // saved game gets silently clobbered if the tab closes at the wrong
    // moment -- see "useCheckersGame persistence follows the SSR-hydration-
    // safe pattern from day one" in CLAUDE.md.
    const first = renderHook(() => useCheckersGame(true));
    act(() => {
      first.result.current.makeMove({ from: 11, to: 15, captures: [], promotes: false, path: [15] });
    });
    first.unmount();

    // Spying on the `window.localStorage` instance directly doesn't
    // intercept calls under jsdom (its Storage instances don't route method
    // calls through instance-own properties the way vi.spyOn needs) --
    // Storage.prototype is the spy target that actually observes real calls.
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    renderHook(() => useCheckersGame(true));

    const writesToStorageKey = setItemSpy.mock.calls.filter(([key]) => key === STORAGE_KEY);
    expect(writesToStorageKey.length).toBeGreaterThan(0);
    for (const [, value] of writesToStorageKey) {
      const written = JSON.parse(value as string);
      expect(written.turn).toBe('w');
    }
    setItemSpy.mockRestore();
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
      expect(result.current.makeMove({ from: 11, to: 15, captures: [], promotes: false, path: [15] })).toBe(true);
    });
    act(() => {
      // white's known-quiet reply, see Task 8's plan comment
      expect(result.current.makeMove({ from: 24, to: 20, captures: [], promotes: false, path: [20] })).toBe(true);
    });
    act(() => {
      // 99 is never a real square target -- illegal
      expect(result.current.makeMove({ from: 11, to: 99, captures: [], promotes: false, path: [99] })).toBe(false);
    });
    act(() => {
      // fourth call -- still correct
      expect(result.current.makeMove({ from: 9, to: 13, captures: [], promotes: false, path: [13] })).toBe(true);
    });
  });

  it('makeMove disambiguates two capture chains that share a final square but capture different pieces', () => {
    // Same real, engine-verified ambiguous position as
    // lib/checkers/moveDisambiguation.test.ts: black king on 22, white men
    // on 11, 18, 26, 27, 19. Loaded via localStorage hydration (the hook
    // has no other way to start from an arbitrary position) -- same
    // technique the "falls back to a fresh initial game" test above
    // already uses.
    function ambiguousPersistedGame() {
      const board: (Piece | null)[] = new Array(32).fill(null);
      board[21] = { color: 'b', kind: 'king' }; // 22
      for (const s of [11, 18, 26, 27, 19]) board[s - 1] = { color: 'w', kind: 'man' };
      return { board, turn: 'b' as const, lastMove: null, plySinceLastCapture: 0, positionCounts: [] };
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ambiguousPersistedGame()));
    const shortRoute = renderHook(() => useCheckersGame(true));
    act(() => {
      expect(
        shortRoute.result.current.makeMove({ from: 22, to: 8, captures: [18, 11], promotes: false, path: [15, 8] }),
      ).toBe(true);
    });
    // Short route captured 18 and 11 -- 26/27/19 are untouched.
    expect(shortRoute.result.current.state.board[25]).toEqual({ color: 'w', kind: 'man' }); // 26 survives
    expect(shortRoute.result.current.state.board[26]).toEqual({ color: 'w', kind: 'man' }); // 27 survives
    expect(shortRoute.result.current.state.board[18]).toEqual({ color: 'w', kind: 'man' }); // 19 survives
    expect(shortRoute.result.current.state.board[10]).toBeNull(); // 11 captured
    expect(shortRoute.result.current.state.board[17]).toBeNull(); // 18 captured

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ambiguousPersistedGame()));
    const longRoute = renderHook(() => useCheckersGame(true));
    act(() => {
      expect(
        longRoute.result.current.makeMove({
          from: 22,
          to: 8,
          captures: [26, 27, 19, 11],
          promotes: false,
          path: [31, 24, 15, 8],
        }),
      ).toBe(true);
    });
    // Long route captured all four white pieces.
    expect(longRoute.result.current.state.board[25]).toBeNull(); // 26 captured
    expect(longRoute.result.current.state.board[26]).toBeNull(); // 27 captured
    expect(longRoute.result.current.state.board[18]).toBeNull(); // 19 captured
    expect(longRoute.result.current.state.board[10]).toBeNull(); // 11 captured
    expect(longRoute.result.current.state.board[17]).toEqual({ color: 'w', kind: 'man' }); // 18 survives here
  });
});
