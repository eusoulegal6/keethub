import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { Chess } from "chess.js";
import type { Square } from "chess.js";
import type { Puzzle } from "./types";
import { PUZZLES, getRandomPuzzle } from "./puzzles";

interface PuzzleState {
  puzzle: Puzzle | null;
  fen: string | null;
  idx: number;
  solved: boolean;
  message: string | null;
  showHint: boolean;
  playerSide: "white" | "black";
  loading: boolean;
  error: string | null;
  mistakes: number;
  hintsUsed: number;
  showSolution: boolean;
  streak: number;
  totalSolved: number;
  pv: string[];
}

interface PuzzleActions {
  loadPuzzle: (difficulty?: Puzzle["difficulty"]) => void;
  onMove: (from: string, to: string, promotion?: string) => boolean;
  resetPuzzle: () => void;
  showHintAction: () => void;
  toggleSolution: () => void;
  nextPuzzle: () => void;
}

const PuzzleContext = createContext<(PuzzleState & PuzzleActions) | undefined>(undefined);

function applyMoveUci(fen: string, uci: string): string | null {
  try {
    const game = new Chess(fen);
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? (uci[4] as "q" | "r" | "b" | "n") : undefined;
    game.move({ from, to, promotion });
    return game.fen();
  } catch {
    return null;
  }
}

export function PuzzleProvider({ children }: { children: React.ReactNode }) {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [fen, setFen] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [solved, setSolved] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [playerSide, setPlayerSide] = useState<"white" | "black">("white");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [streak, setStreak] = useState(0);
  const [totalSolved, setTotalSolved] = useState(0);

  const pv = useMemo(() => puzzle?.solutionPv ?? [], [puzzle]);

  const loadPuzzle = useCallback((difficulty?: Puzzle["difficulty"]) => {
    setLoading(true);
    setError(null);

    // Simulate brief loading for UI feedback
    setTimeout(() => {
      const pz = difficulty ? getRandomPuzzle(difficulty) : getRandomPuzzle();
      if (!pz) {
        setError("No puzzles found");
        setLoading(false);
        return;
      }

      const playerSideToUse = pz.sideToMove;
      const solutionPv = pz.solutionPv;

      let initialFen = pz.fen;
      let initialIdx = 0;

      // Auto-advance if it's not the player's turn first
      try {
        const g = new Chess(pz.fen);
        const fenTurn = g.turn() === "w" ? "white" : "black";
        if (fenTurn !== playerSideToUse && solutionPv.length > 0) {
          const nextFen = applyMoveUci(initialFen, solutionPv[0]);
          if (nextFen) {
            initialFen = nextFen;
            initialIdx = 1;
          }
        }
      } catch {}

      setPuzzle(pz);
      setFen(initialFen);
      setIdx(initialIdx);
      setSolved(false);
      setPlayerSide(playerSideToUse);
      setMessage(null);
      setMistakes(0);
      setHintsUsed(0);
      setShowSolution(false);
      setShowHint(false);
      setLoading(false);
    }, 100);
  }, []);

  const onMove = useCallback(
    (from: string, to: string, _promotion?: string): boolean => {
      if (!puzzle || !fen || solved || showSolution) return false;

      // Check it's the player's turn
      try {
        const g = new Chess(fen);
        const currentTurn = g.turn() === "w" ? "white" : "black";
        if (currentTurn !== playerSide) {
          setMessage("Not your turn");
          return false;
        }
      } catch {
        return false;
      }

      const expected = pv[idx];
      if (!expected) return false;

      const attempt = `${from}${to}`;
      const expectedBase = expected.slice(0, 4);

      if (attempt !== expectedBase) {
        setMessage("Incorrect. Try again.");
        setMistakes((m) => m + 1);
        return false;
      }

      // Apply player's correct move
      const afterPlayer = applyMoveUci(fen, expected);
      if (!afterPlayer) {
        setMessage("Invalid move");
        return false;
      }

      const newIdx = idx + 1;
      let finalFen = afterPlayer;
      let finalIdx = newIdx;

      // Auto-play opponent reply if it exists
      if (pv[newIdx]) {
        const afterOpp = applyMoveUci(finalFen, pv[newIdx]);
        if (afterOpp) {
          finalFen = afterOpp;
          finalIdx = newIdx + 1;
        }
      }

      setFen(finalFen);
      setIdx(finalIdx);
      setMessage(null);
      setShowHint(false);

      // Check if solved
      if (finalIdx >= pv.length) {
        setSolved(true);
        setStreak((s) => s + 1);
        setTotalSolved((t) => t + 1);
      }

      return true;
    },
    [puzzle, fen, pv, idx, solved, showSolution, playerSide],
  );

  const resetPuzzle = useCallback(() => {
    if (!puzzle) return;
    let initialFen = puzzle.fen;
    let initialIdx = 0;
    try {
      const g = new Chess(puzzle.fen);
      const fenTurn = g.turn() === "w" ? "white" : "black";
      if (fenTurn !== puzzle.sideToMove && pv.length > 0) {
        const nextFen = applyMoveUci(initialFen, pv[0]);
        if (nextFen) {
          initialFen = nextFen;
          initialIdx = 1;
        }
      }
    } catch {}
    setFen(initialFen);
    setIdx(initialIdx);
    setSolved(false);
    setMessage(null);
    setMistakes(0);
    setHintsUsed(0);
    setShowSolution(false);
    setShowHint(false);
  }, [puzzle, pv]);

  const showHintAction = useCallback(() => {
    if (!puzzle || solved || showSolution) return;
    setShowHint(true);
    setHintsUsed((h) => h + 1);
  }, [puzzle, solved, showSolution]);

  const toggleSolution = useCallback(() => {
    if (!puzzle) return;
    if (!showSolution) {
      // Play all remaining moves
      let currentFen = fen!;
      for (let i = idx; i < pv.length; i++) {
        const nextFen = applyMoveUci(currentFen, pv[i]);
        if (!nextFen) break;
        currentFen = nextFen;
      }
      setFen(currentFen);
      setIdx(pv.length);
      setSolved(true);
      setMessage(null);
      setShowHint(false);
      setShowSolution(true);
    } else {
      resetPuzzle();
    }
  }, [puzzle, fen, idx, pv, showSolution, resetPuzzle]);

  const nextPuzzle = useCallback(() => {
    loadPuzzle();
  }, [loadPuzzle]);

  const value = useMemo(
    () => ({
      puzzle,
      fen,
      idx,
      solved,
      message,
      showHint,
      playerSide,
      loading,
      error,
      mistakes,
      hintsUsed,
      showSolution,
      streak,
      totalSolved,
      pv,
      loadPuzzle,
      onMove,
      resetPuzzle,
      showHintAction,
      toggleSolution,
      nextPuzzle,
    }),
    [
      puzzle,
      fen,
      idx,
      solved,
      message,
      showHint,
      playerSide,
      loading,
      error,
      mistakes,
      hintsUsed,
      showSolution,
      streak,
      totalSolved,
      pv,
      loadPuzzle,
      onMove,
      resetPuzzle,
      showHintAction,
      toggleSolution,
      nextPuzzle,
    ],
  );

  return <PuzzleContext.Provider value={value}>{children}</PuzzleContext.Provider>;
}

export function usePuzzle() {
  const ctx = useContext(PuzzleContext);
  if (!ctx) throw new Error("usePuzzle must be used within a PuzzleProvider");
  return ctx;
}
