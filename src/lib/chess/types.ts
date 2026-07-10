export type Side = "white" | "black";
export type GameMode = "local" | "ai";

export interface ChessMove {
  from: string;
  to: string;
  promotion?: string;
  san: string;
  timestamp: number;
}

export type GameStatus =
  | "playing"
  | "checkmate"
  | "stalemate"
  | "draw";

export interface GameState {
  fen: string;
  pgn: string;
  moves: ChessMove[];
  status: GameStatus;
  turn: Side;
  inCheck: boolean;
  inCheckmate: boolean;
  inStalemate: boolean;
  inDraw: boolean;
  gameMode: GameMode;
  lastMove?: { from: string; to: string };
}

export interface AIConfig {
  enabled: boolean;
  color: Side;
  difficulty: "easy" | "medium" | "hard";
  depth: number;
}

export interface Puzzle {
  id: string;
  fen: string;
  solutionPv: string[];
  theme: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  sideToMove: Side;
  description: string;
}

export interface ChessContextType {
  game: GameState;
  makeMove: (from: string, to: string, promotion?: string) => boolean;
  resetGame: () => void;
  loadFromFen: (fen: string) => void;
  undoMove: () => boolean;
  getLegalMoves: (square?: string) => string[];
  isGameOver: () => boolean;
  setGameMode: (mode: GameMode) => void;
  aiConfig: AIConfig;
  setAIConfig: (config: AIConfig) => void;
  isAITurn: () => boolean;
  isAIThinking: boolean;
  makeAIMove: () => void;
}
