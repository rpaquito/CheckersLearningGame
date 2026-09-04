'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { Board, Color, Square, CheckersMove, GameStatus, Piece } from './types';
import { createInitialBoard } from './board';
import { legalMovesFrom as legalMovesFromEngine, applyMove, hasAnyCapture } from './moveGeneration';
import { computeStatus, boardKey } from './gameStatus';

export const STORAGE_KEY = 'checkers-learning-game-board';

export interface CheckersGameState {
  board: Board;
  turn: Color;
  status: GameStatus;
  isGameOver: boolean;
  lastMove: CheckersMove | null;
  mandatoryCaptureSquares: Square[];
}

export interface UseCheckersGameResult {
  state: CheckersGameState;
  legalMovesFrom: (square: Square) => Square[];
  makeMove: (move: CheckersMove) => boolean;
  reset: () => void;
}

interface PersistedGame {
  board: (Piece | null)[];
  turn: Color;
  lastMove: CheckersMove | null;
  plySinceLastCapture: number;
  positionCounts: [string, number][];
}

function initialGame(): PersistedGame {
  return {
    board: createInitialBoard() as (Piece | null)[],
    turn: 'b',
    lastMove: null,
    plySinceLastCapture: 0,
    positionCounts: [],
  };
}

// Guards against syntactically-valid-but-wrong-shape JSON (e.g. `{}`, a
// truncated save, or a future/incompatible schema version) reaching
// setGame and then crashing later during render (computeStatus ->
// allLegalMoves -> board[s-1] access assumes a 32-length board). This is
// deliberately a shallow shape check, not full runtime validation of every
// piece/move field — it only needs to rule out the crash-causing shapes.
function isValidPersistedGame(parsed: unknown): parsed is PersistedGame {
  if (!parsed || typeof parsed !== 'object') return false;
  const candidate = parsed as Record<string, unknown>;
  if (!Array.isArray(candidate.board) || candidate.board.length !== 32) return false;
  if (candidate.turn !== 'b' && candidate.turn !== 'w') return false;
  if (!Array.isArray(candidate.positionCounts)) return false;
  return true;
}

function mandatoryCaptureSquaresFor(board: Board, turn: Color): Square[] {
  if (!hasAnyCapture(board, turn)) return [];
  const squares: Square[] = [];
  for (let s = 1; s <= 32; s++) {
    const piece = board[s - 1];
    if (piece && piece.color === turn && legalMovesFromEngine(board, turn, s).length > 0) {
      squares.push(s);
    }
  }
  return squares;
}

export function clearSavedGame(): void {
  if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY);
}

export function useCheckersGame(persist: boolean = true): UseCheckersGameResult {
  const [game, setGame] = useState<PersistedGame>(initialGame);
  // Mirrors `game` for synchronous reads inside callbacks. React's useState
  // functional-updater is only invoked "eagerly" (before the setter call
  // returns) for the FIRST queued update on a fiber -- every later call in
  // the same render cycle/lifetime defers the updater to the render pass.
  // A side-effect flag set inside the updater (the previous approach) is
  // therefore unreliable after the first call. Reading/writing this ref
  // directly sidesteps that timing hazard entirely.
  const gameRef = useRef(game);
  // eslint-disable-next-line react-hooks/refs
  gameRef.current = game;

  // Gates the persistence effect below until hydration has actually landed
  // in a render. Must be React STATE, not a ref: both effects fire in the
  // same initial flush, closing over that render's values -- a ref flipped
  // inside the hydration effect would already read `true` by the time the
  // persistence effect's body ran moments later in that same flush, so it
  // wouldn't stop the persistence effect from still writing that render's
  // stale (pre-hydration) `game` closure. State is captured per-render: the
  // hydration effect's `setGame`/`setHydrated` calls batch into one new
  // render where `game` and `hydrated` update together, so the persistence
  // effect's first-ever real execution already sees the hydrated `game` --
  // it never gets a chance to write the fresh/blank one over a real save.
  // See CLAUDE.md's "useCheckersGame persistence follows the SSR-hydration-
  // safe pattern from day one" for the race this closes.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!persist) return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (isValidPersistedGame(parsed)) {
          gameRef.current = parsed;
          // One-time hydration from localStorage on mount. SSR-safe: window is
          // unavailable during the initial render, so this can't be a lazy
          // useState initializer instead.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setGame(parsed);
        }
      } catch {
        // Corrupted save -- ignore, keep the fresh initial game.
      }
    }
    setHydrated(true);
  }, [persist]);

  useEffect(() => {
    if (!persist || !hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  }, [game, persist, hydrated]);

  const makeMove = useCallback((move: CheckersMove): boolean => {
    const current = gameRef.current;
    // Re-derives legal moves from the CURRENT state (never trusts the
    // caller blindly -- guards against a stale closure the same way the
    // old (from, to) version did) and matches on the full move shape,
    // `path` included. `path` makes every route provably unique (see
    // types.ts), so unlike the old `.find(m => m.to === to)` version,
    // this can never silently substitute a different legal route that
    // happens to share the same `to` -- see CLAUDE.md's "Known design
    // constraint for the future board UI" entry, closed by this change.
    const candidates = legalMovesFromEngine(current.board, current.turn, move.from);
    const matched = candidates.find(
      (m) =>
        m.to === move.to &&
        m.promotes === move.promotes &&
        m.captures.length === move.captures.length &&
        m.captures.every((c, i) => c === move.captures[i]) &&
        m.path.length === move.path.length &&
        m.path.every((p, i) => p === move.path[i]),
    );
    if (!matched) return false;
    const nextBoard = applyMove(current.board, matched) as (Piece | null)[];
    const nextTurn: Color = current.turn === 'b' ? 'w' : 'b';
    const nextPlySinceLastCapture = matched.captures.length > 0 ? 0 : current.plySinceLastCapture + 1;
    const key = boardKey(nextBoard, nextTurn);
    const counts = new Map(current.positionCounts);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    const next: PersistedGame = {
      board: nextBoard,
      turn: nextTurn,
      lastMove: matched,
      plySinceLastCapture: nextPlySinceLastCapture,
      positionCounts: Array.from(counts.entries()),
    };
    gameRef.current = next; // stays fresh even if called again before a re-render
    setGame(next);
    return true;
  }, []);

  const reset = useCallback(() => {
    const fresh = initialGame();
    gameRef.current = fresh;
    setGame(fresh);
    if (persist) clearSavedGame();
  }, [persist]);

  const status = computeStatus(
    game.board,
    game.turn,
    game.plySinceLastCapture,
    new Map(game.positionCounts),
    boardKey(game.board, game.turn),
  );

  const state: CheckersGameState = useMemo(
    () => ({
      board: game.board,
      turn: game.turn,
      status,
      isGameOver: status !== 'playing',
      lastMove: game.lastMove,
      mandatoryCaptureSquares: mandatoryCaptureSquaresFor(game.board, game.turn),
    }),
    [game, status],
  );

  return {
    state,
    legalMovesFrom: (square: Square) => legalMovesFromEngine(game.board, game.turn, square).map((m) => m.to),
    makeMove,
    reset,
  };
}
