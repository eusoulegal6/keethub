import { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Chess } from "chess.js";
import type { GameState, GameMode, ChessMove, GameStatus, AIConfig, Side, ChessContextType } from "./types";
import { stockfishEngine, type EngineCallback } from "./StockfishEngine";

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

const DIFFICULTY_DEPTH: Record<string, number> = { easy: 5, medium: 10, hard: 15 };
const DIFFICULTY_ELO: Record<string, number> = { easy: 1350, medium: 1850, hard: 2850 };

// ── Context ───────────────────────────────────────────────────────

const ChessContext = createContext<ChessContextType | undefined>(undefined);

export function ChessProvider({ children }: { children: React.ReactNode }) {
  const [game, setGame] = useState(() => new Chess());
  const [gameState, setGameState] = useState<GameState>(() => buildGameState(new Chess(), "local"));
  const [aiConfig, setAIConfig] = useState<AIConfig>({
    enabled: false,
    color: "black",
    difficulty: "medium",
    depth: 10,
  });
  const [isAIThinking, setIsAIThinking] = useState(false);
  const mountedRef = useRef(true);
  const gameRef = useRef(game);
  gameRef.current = game;
  const aiConfigRef = useRef(aiConfig);
  aiConfigRef.current = aiConfig;

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // Stable callback ref for the engine — always applies move to current game
  const onEngineMoveRef = useRef<EngineCallback>((_) => {});
  onEngineMoveRef.current = (uci: string) => {
    if (!mountedRef.current) return;
    console.log("[AI] Engine callback with UCI:", uci);

    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;

    const g = gameRef.current;
    const legal = g.moves({ verbose: true });
    console.log("[AI] Legal moves:", legal.length, "checking", from, to);
    const isValid = legal.some((m) => m.from === from && m.to === to);
    console.log("[AI] Valid?", isValid);

    if (isValid) {
      console.log("[AI] Applying:", from, to);
      g.move({ from, to, promotion: promotion as "q" | "r" | "b" | "n" | undefined });
      const clone = new Chess(g.fen());
      const cfg = aiConfigRef.current;
      setGameState(buildGameState(clone, cfg.enabled ? "ai" : "local", { from, to }));
      setGame(clone);
      console.log("[AI] Done — new FEN:", clone.fen());
    } else if (legal.length > 0) {
      console.warn("[AI] Fallback:", legal[0].from, legal[0].to);
      const fb = legal[0];
      g.move({ from: fb.from, to: fb.to, promotion: fb.promotion });
      const clone = new Chess(g.fen());
      const cfg = aiConfigRef.current;
      setGameState(buildGameState(clone, cfg.enabled ? "ai" : "local", { from: fb.from, to: fb.to }));
      setGame(clone);
    }
    setIsAIThinking(false);
    console.log("[AI] isAIThinking = false");
  };

  const updateState = useCallback(
    (g: Chess, mode: GameMode, lastMove?: { from: string; to: string }) => {
      const clone = new Chess(g.fen());
      setGameState(buildGameState(clone, mode, lastMove));
      setGame(clone);
    },
    [],
  );

  const makeMove = useCallback(
    (from: string, to: string, promotion?: string): boolean => {
      try {
        const g = gameRef.current;
        const move = g.move({ from, to, promotion: promotion as "q" | "r" | "b" | "n" | undefined });
        if (!move) return false;
        updateState(g, aiConfigRef.current.enabled ? "ai" : "local", { from, to });
        return true;
      } catch {
        return false;
      }
    },
    [updateState],
  );

  const resetGame = useCallback(() => {
    const g = new Chess();
    setGame(g);
    setGameState(buildGameState(g, aiConfigRef.current.enabled ? "ai" : "local"));
  }, []);

  const loadFromFen = useCallback((fen: string) => {
    try {
      const g = new Chess(fen);
      setGame(g);
      setGameState(buildGameState(g, aiConfigRef.current.enabled ? "ai" : "local"));
    } catch {}
  }, []);

  const undoMove = useCallback((): boolean => {
    try {
      const g = gameRef.current;
      if (g.history().length === 0) return false;
      g.undo();
      updateState(g, aiConfigRef.current.enabled ? "ai" : "local");
      return true;
    } catch {
      return false;
    }
  }, [updateState]);

  const getLegalMoves = useCallback(
    (square?: string): string[] => {
      try { return gameRef.current.moves({ square, verbose: true }).map((m) => m.to); } catch { return []; }
    },
    [],
  );

  const isGameOver = useCallback((): boolean => gameRef.current.isGameOver(), []);
  const setGameMode = useCallback((_mode: GameMode) => {}, []);

  const isAITurn = useCallback((): boolean => {
    if (!aiConfig.enabled || isGameOver()) return false;
    return gameState.turn === aiConfig.color;
  }, [aiConfig, gameState.turn, isGameOver]);

  const makeAIMove = useCallback(() => {
    const g = gameRef.current;
    const cfg = aiConfigRef.current;
    console.log("[AI] makeAIMove — turn:", g.turn(), "color:", cfg.color);
    if (isAIThinking || g.isGameOver() || !cfg.enabled) return;
    if (g.turn() !== (cfg.color === "white" ? "w" : "b")) return;

    console.log("[AI] Requesting move...");
    setIsAIThinking(true);

    const depth = DIFFICULTY_DEPTH[cfg.difficulty] ?? 10;
    const elo = DIFFICULTY_ELO[cfg.difficulty];
    const fen = g.fen();
    console.log("[AI] FEN:", fen);

    stockfishEngine.requestMove(fen, depth, elo, onEngineMoveRef.current);
  }, [isAIThinking]);

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
