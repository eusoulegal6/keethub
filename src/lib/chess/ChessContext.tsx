import { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Chess } from "chess.js";
import type { GameState, GameMode, ChessMove, GameStatus, AIConfig, Side, ChessContextType } from "./types";
import { stockfishEngine } from "./StockfishEngine";

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

// ── Depth-to-elo mapping for Stockfish strength limiting ──────────
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
  const setGameMode = useCallback((_mode: GameMode) => {}, []);

  const isAITurn = useCallback((): boolean => {
    if (!aiConfig.enabled || isGameOver()) return false;
    return gameState.turn === aiConfig.color;
  }, [aiConfig, gameState.turn, isGameOver]);

  const makeAIMove = useCallback(async () => {
    if (isAIThinking || game.isGameOver() || !aiConfig.enabled) return;
    if (game.turn() !== (aiConfig.color === "white" ? "w" : "b")) return;

    console.log("[AI] makeAIMove called — requesting best move from Stockfish...");
    setIsAIThinking(true);

    try {
      const depth = DIFFICULTY_DEPTH[aiConfig.difficulty] ?? 10;
      const elo = DIFFICULTY_ELO[aiConfig.difficulty];
      const fen = game.fen();
      const uci = await stockfishEngine.getBestMove(fen, depth, elo);

      if (!mountedRef.current) return;

      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci[4] : undefined;

      // Validate move is legal
      const legal = game.moves({ verbose: true });
      const isValid = legal.some((m) => m.from === from && m.to === to);
      if (isValid) {
        console.log("[AI] Stockfish move accepted:", from, to, promotion || "");
        game.move({ from, to, promotion: promotion as "q" | "r" | "b" | "n" | undefined });
        updateState(game, "ai", { from, to });
      } else if (legal.length > 0) {
        console.warn("[AI] Stockfish returned invalid move, using fallback");
        // Fallback: first legal move
        const fb = legal[0];
        game.move({ from: fb.from, to: fb.to, promotion: fb.promotion });
        updateState(game, "ai", { from: fb.from, to: fb.to });
      }
    } catch (e) {
      console.error("[AI] Stockfish engine error:", e);
      // Engine error — fallback to random legal move
      if (!mountedRef.current) return;
      const legal = game.moves({ verbose: true });
      if (legal.length > 0) {
        const fb = legal[Math.floor(Math.random() * legal.length)];
        game.move({ from: fb.from, to: fb.to, promotion: fb.promotion });
        updateState(game, "ai", { from: fb.from, to: fb.to });
      }
    } finally {
      if (mountedRef.current) setIsAIThinking(false);
    }
  }, [game, aiConfig, updateState, isGameOver, isAIThinking]);

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
