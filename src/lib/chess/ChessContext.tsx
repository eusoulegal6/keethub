import { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Chess } from "chess.js";
import type { GameState, GameMode, ChessMove, GameStatus, AIConfig, Side, ChessContextType } from "./types";

const PIECE_VALUES: Record<string, number> = { q: 9, r: 5, b: 3.3, n: 3.2, p: 1 };

function getGameStatus(game: Chess): GameStatus {
  if (game.isCheckmate()) return "checkmate";
  if (game.isStalemate()) return "stalemate";
  if (game.isDraw()) return "draw";
  return "playing";
}

function buildGameState(game: Chess, mode: GameMode, lastMove?: { from: string; to: string }): GameState {
  const history = game.history({ verbose: true });
  return {
    fen: game.fen(),
    pgn: game.pgn(),
    moves: history.map((m) => ({ from: m.from, to: m.to, promotion: m.promotion, san: m.san, timestamp: Date.now() })),
    status: getGameStatus(game),
    turn: game.turn() === "w" ? "white" : "black",
    inCheck: game.inCheck(),
    inCheckmate: game.isCheckmate(),
    inStalemate: game.isStalemate(),
    inDraw: game.isDraw(),
    gameMode: mode,
    lastMove,
  };
}

// ── Heuristic AI ──────────────────────────────────────────────────
// Scores a position from the AI's perspective (higher = better for AI)

function evaluatePosition(game: Chess, aiColor: "w" | "b"): number {
  const fen = game.fen();
  let score = 0;

  // Material count
  for (const ch of fen.split(" ")[0]) {
    const upper = ch.toUpperCase();
    if (PIECE_VALUES[upper]) {
      score += (ch === upper ? 1 : -1) * PIECE_VALUES[upper];
    }
  }

  // Mobility (number of legal moves)
  const moves = game.moves({ verbose: true });
  score += moves.length * 0.05;

  // Center control from squares
  for (const m of moves) {
    if (["d4", "d5", "e4", "e5"].includes(m.to)) score += 0.1;
  }

  // Pawn structure bonus for d4/e4 presence
  try {
    if (game.get("d4")?.color === "w" && game.get("d4")?.type === "p") score += 0.3;
    if (game.get("e4")?.color === "w" && game.get("e4")?.type === "p") score += 0.3;
    if (game.get("d5")?.color === "b" && game.get("d5")?.type === "p") score -= 0.3;
    if (game.get("e5")?.color === "b" && game.get("e5")?.type === "p") score -= 0.3;
  } catch {}

  // King safety (basic)
  try {
    const wkFile = "abcdefgh".indexOf(fen.match(/K/) ? "e" : "a");
    if (fen.includes("K") && (wkFile === 2 || wkFile === 3 || wkFile === 4)) score += 0.2;
  } catch {}

  return aiColor === "w" ? score : -score;
}

function scoreMove(
  game: Chess,
  from: string,
  to: string,
  aiColor: "w" | "b",
): number {
  let s = 0;
  const piece = game.get(from);
  const captured = game.get(to);

  // Capture bonus
  if (captured) {
    s += (PIECE_VALUES[captured.type] || 0) * 10;
    // Prefer capturing with lower-value pieces
    if (piece) s += (PIECE_VALUES[piece.type] || 0) * 0.5;
  }

  // Center bonus
  if (["d4", "d5", "e4", "e5"].includes(to)) s += 0.5;
  if (["c3", "c6", "f3", "f6", "d3", "d6", "e3", "e6"].includes(to)) s += 0.3;

  // Check bonus
  game.move(from, to);
  if (game.isCheck()) s += 3;
  if (game.isCheckmate()) s += 100;
  game.undo();

  // Development (move pieces off the back rank early)
  if (piece && ["n", "b"].includes(piece.type) && from[1] === (aiColor === "w" ? "1" : "8")) {
    s += 0.4;
  }

  return s;
}

function pickAIMove(game: Chess, difficulty: AIConfig["difficulty"]): { from: string; to: string; promotion?: string } | null {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;

  const aiColor = game.turn() as "w" | "b";

  if (difficulty === "easy") {
    // Easy: prefer captures and checks, but pick from top 50% randomly
    const scored = moves.map((m) => ({
      move: m,
      score: scoreMove(game, m.from, m.to, aiColor),
    }));
    scored.sort((a, b) => b.score - a.score);
    const topN = Math.max(3, Math.floor(scored.length * 0.5));
    const pick = scored[Math.floor(Math.random() * topN)];
    return { from: pick.move.from, to: pick.move.to, promotion: pick.move.promotion };
  }

  if (difficulty === "medium") {
    // Medium: evaluate each resulting position
    const scored = moves.map((m) => {
      game.move(m.from, m.to);
      const evalScore = evaluatePosition(game, aiColor);
      game.undo();
      return { move: m, score: scoreMove(game, m.from, m.to, aiColor) + evalScore };
    });
    scored.sort((a, b) => b.score - a.score);
    const topN = Math.max(2, Math.floor(scored.length * 0.3));
    const pick = scored[Math.floor(Math.random() * topN)];
    return { from: pick.move.from, to: pick.move.to, promotion: pick.move.promotion };
  }

  // Hard: deeper evaluation with piece-square tables and look-ahead
  const scored = moves.map((m) => {
    game.move(m.from, m.to);
    let bestOpponentScore = -Infinity;
    const oppMoves = game.moves({ verbose: true });

    // One-ply lookahead: evaluate opponent's best response
    for (const om of oppMoves.slice(0, 10)) {
      game.move(om.from, om.to);
      const es = evaluatePosition(game, aiColor);
      if (es > bestOpponentScore) bestOpponentScore = es;
      game.undo();
    }

    const positionalScore = scoreMove(game, m.from, m.to, aiColor);
    game.undo();

    // We want positions where our eval is high minus opponent's best response
    const evalScore = evaluatePosition(game, aiColor);
    return { move: m, score: positionalScore + evalScore - bestOpponentScore * 0.5 };
  });

  scored.sort((a, b) => b.score - a.score);
  // Pick from top 3 for variety
  const topN = Math.min(3, scored.length);
  const pick = scored[Math.floor(Math.random() * topN)];
  return { from: pick.move.from, to: pick.move.to, promotion: pick.move.promotion };
}

// ── Context ───────────────────────────────────────────────────────

const ChessContext = createContext<ChessContextType | undefined>(undefined);

export function ChessProvider({ children }: { children: React.ReactNode }) {
  const [game, setGame] = useState(() => new Chess());
  const [gameState, setGameState] = useState<GameState>(() => buildGameState(new Chess(), "local"));
  const [aiConfig, setAIConfig] = useState<AIConfig>({
    enabled: false,
    color: "black",
    difficulty: "medium",
    depth: 3,
  });
  const [isAIThinking, setIsAIThinking] = useState(false);
  const mountedRef = useRef(true);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => { mountedRef.current = false; if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
  }, []);

  const updateState = useCallback(
    (g: Chess, mode: GameMode, lastMove?: { from: string; to: string }) => {
      setGameState(buildGameState(g, mode, lastMove));
      setGame(g);
    },
    [],
  );

  const makeMove = useCallback(
    (from: string, to: string, promotion?: string): boolean => {
      try {
        const move = game.move({ from, to, promotion: promotion as "q" | "r" | "b" | "n" | undefined });
        if (!move) return false;
        updateState(game, aiConfig.enabled ? "ai" : "local", { from, to });
        return true;
      } catch {
        return false;
      }
    },
    [game, aiConfig.enabled, updateState],
  );

  const resetGame = useCallback(() => {
    const g = new Chess();
    setGame(g);
    setGameState(buildGameState(g, aiConfig.enabled ? "ai" : "local"));
  }, [aiConfig.enabled]);

  const loadFromFen = useCallback(
    (fen: string) => {
      try {
        const g = new Chess(fen);
        setGame(g);
        setGameState(buildGameState(g, aiConfig.enabled ? "ai" : "local"));
      } catch {}
    },
    [aiConfig.enabled],
  );

  const undoMove = useCallback((): boolean => {
    try {
      if (game.history().length === 0) return false;
      game.undo();
      updateState(game, aiConfig.enabled ? "ai" : "local");
      return true;
    } catch {
      return false;
    }
  }, [game, aiConfig.enabled, updateState]);

  const getLegalMoves = useCallback(
    (square?: string): string[] => {
      try {
        return game.moves({ square, verbose: true }).map((m) => m.to);
      } catch {
        return [];
      }
    },
    [game],
  );

  const isGameOver = useCallback((): boolean => game.isGameOver(), [game]);
  const setGameMode = useCallback((mode: GameMode) => {}, []);

  const isAITurn = useCallback((): boolean => {
    if (!aiConfig.enabled || isGameOver()) return false;
    return gameState.turn === aiConfig.color;
  }, [aiConfig, gameState.turn, isGameOver]);

  const makeAIMove = useCallback(() => {
    if (isAIThinking || game.isGameOver() || !aiConfig.enabled) return;
    if (game.turn() !== (aiConfig.color === "white" ? "w" : "b")) return;

    setIsAIThinking(true);
    aiTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      const move = pickAIMove(game, aiConfig.difficulty);
      if (move) {
        try {
          game.move({ from: move.from, to: move.to, promotion: move.promotion as "q" | "r" | "b" | "n" | undefined });
          updateState(game, "ai", { from: move.from, to: move.to });
        } catch {}
      }
      if (mountedRef.current) setIsAIThinking(false);
    }, 200 + Math.random() * 400);
  }, [game, aiConfig, isAIThinking, updateState, isGameOver]);

  const value = useMemo<ChessContextType>(
    () => ({
      game: gameState,
      makeMove,
      resetGame,
      loadFromFen,
      undoMove,
      getLegalMoves,
      isGameOver,
      setGameMode,
      aiConfig,
      setAIConfig: (c) => setAIConfig(c),
      isAITurn,
      isAIThinking,
      makeAIMove,
    }),
    [gameState, makeMove, resetGame, loadFromFen, undoMove, getLegalMoves, isGameOver, aiConfig, isAITurn, isAIThinking, makeAIMove],
  );

  return <ChessContext.Provider value={value}>{children}</ChessContext.Provider>;
}

export function useChess() {
  const ctx = useContext(ChessContext);
  if (!ctx) throw new Error("useChess must be used within a ChessProvider");
  return ctx;
}
