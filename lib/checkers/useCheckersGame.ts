'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
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
  makeMove: (from: Square, to: Square) => boolean;
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

  // Same SSR-hydration-safe pattern as Chess Sensei's useSettings: start
  // from a fresh game on every render's initial pass, then load the real
  // saved game post-mount, in an effect.
  useEffect(() => {
    if (!persist) return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isValidPersistedGame(parsed)) return; // wrong shape — keep the fresh initial game
      // One-time hydration from localStorage on mount. SSR-safe: window is
      // unavailable during the initial render, so this can't be a lazy
      // useState initializer instead.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGame(parsed);
    } catch {
      // Corrupted save (malformed JSON) — ignore, keep the fresh initial game.
    }
  }, [persist]);

  useEffect(() => {
    if (!persist) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  }, [game, persist]);

  const makeMove = useCallback((from: Square, to: Square): boolean => {
    let didMove = false;
    setGame((prev) => {
      const move = legalMovesFromEngine(prev.board, prev.turn, from).find((m) => m.to === to);
      if (!move) return prev;
      didMove = true;
      const nextBoard = applyMove(prev.board, move);
      const nextTurn: Color = prev.turn === 'b' ? 'w' : 'b';
      const nextPlySinceLastCapture = move.captures.length > 0 ? 0 : prev.plySinceLastCapture + 1;
      const key = boardKey(nextBoard, nextTurn);
      const counts = new Map(prev.positionCounts);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return {
        board: nextBoard as (Piece | null)[],
        turn: nextTurn,
        lastMove: move,
        plySinceLastCapture: nextPlySinceLastCapture,
        positionCounts: Array.from(counts.entries()),
      };
    });
    return didMove;
  }, []);

  const reset = useCallback(() => {
    setGame(initialGame());
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
