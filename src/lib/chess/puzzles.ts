import type { Puzzle } from "./types";

// Curated chess puzzles organized by theme. Each puzzle has:
// fen - the position, solutionPv - UCI moves from the solver's perspective
// sideToMove - which side the solver plays

export const PUZZLES: Puzzle[] = [
  // ═══ Mate in 1 ═══
  {
    id: "m1-01",
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1",
    solutionPv: ["h5f7"],
    theme: "Mate in 1",
    difficulty: "beginner",
    sideToMove: "white",
    description: "Scholar's Mate — the queen delivers the final blow",
  },
  {
    id: "m1-02",
    fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1",
    solutionPv: ["h5f7"],
    theme: "Mate in 1",
    difficulty: "beginner",
    sideToMove: "white",
    description: "Scholar's Mate defended — still works if the knight stayed",
  },
  {
    id: "m1-03",
    fen: "k1r1b3/p1r1p3/1p2Q3/2p5/3P4/8/PPP3PP/4R1K1 w - - 0 1",
    solutionPv: ["e6e8"],
    theme: "Mate in 1",
    difficulty: "beginner",
    sideToMove: "white",
    description: "Back rank weakness — rook is pinned",
  },
  {
    id: "m1-04",
    fen: "K7/1R6/k7/8/8/8/8/8 w - - 0 1",
    solutionPv: ["h7a7"],
    theme: "Mate in 1",
    difficulty: "beginner",
    sideToMove: "white",
    description: "King and rook coordination — cut off the escape",
  },
  {
    id: "m1-05",
    fen: "8/8/8/8/3k4/8/2R5/K2R4 w - - 0 1",
    solutionPv: ["d2d4"],
    theme: "Mate in 1",
    difficulty: "beginner",
    sideToMove: "white",
    description: "Two rooks — ladder mate pattern",
  },

  // ═══ Fork ═══
  {
    id: "fk-01",
    fen: "r1bqkb1r/ppp2ppp/2np1n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 1",
    solutionPv: ["c4f7", "e8f7", "f3g5"],
    theme: "Fork",
    difficulty: "beginner",
    sideToMove: "white",
    description: "Knight fork on f7 — sacrifice the bishop first to lure the king",
  },
  {
    id: "fk-02",
    fen: "r2qkb1r/ppp2ppp/2np1n2/4p1N1/2B1P3/3P4/PPP2PPP/RNBQK2R w KQkq - 0 1",
    solutionPv: ["g5f7"],
    theme: "Fork",
    difficulty: "beginner",
    sideToMove: "white",
    description: "Classic knight fork on f7 — queen and rook forked",
  },
  {
    id: "fk-03",
    fen: "r2q1rk1/ppp2ppp/2npbn2/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQ - 0 1",
    solutionPv: ["c1g5", "f6g5", "f3e5"],
    theme: "Fork",
    difficulty: "intermediate",
    sideToMove: "white",
    description: "Remove the defender, then fork — bishop sacrifice sets up knight fork",
  },
  {
    id: "fk-04",
    fen: "8/8/1k6/3q4/8/4N3/5K2/8 w - - 0 1",
    solutionPv: ["e3c4"],
    theme: "Fork",
    difficulty: "beginner",
    sideToMove: "white",
    description: "Simple knight fork — king and queen alignment",
  },
  {
    id: "fk-05",
    fen: "8/8/2k5/3n4/2K5/8/8/8 b - - 0 1",
    solutionPv: ["d5b6"],
    theme: "Fork",
    difficulty: "beginner",
    sideToMove: "black",
    description: "Knight fork from the defender's side",
  },

  // ═══ Pin ═══
  {
    id: "pn-01",
    fen: "r1bq1rk1/ppp2ppp/2np1n2/4p1B1/2B1P3/2NP1N2/PPP2PPP/R2QK2R w KQ - 0 1",
    solutionPv: ["f3e5"],
    theme: "Pin",
    difficulty: "beginner",
    sideToMove: "white",
    description: "Exploit the pin — the knight on f6 is pinned to the queen",
  },
  {
    id: "pn-02",
    fen: "r1bqk2r/pppp1ppp/2n2n2/4p3/1bB1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 1",
    solutionPv: ["c1g5"],
    theme: "Pin",
    difficulty: "beginner",
    sideToMove: "white",
    description: "Pin the knight — bishop pins the f6 knight to the queen",
  },
  {
    id: "pn-03",
    fen: "4k3/8/4q3/8/8/8/4R3/4K2R w - - 0 1",
    solutionPv: ["h1e1"],
    theme: "Pin",
    difficulty: "beginner",
    sideToMove: "white",
    description: "Absolute pin — rook pins the queen to the king",
  },

  // ═══ Skewer ═══
  {
    id: "sk-01",
    fen: "4k3/4r3/8/8/8/8/4Q3/4K3 w - - 0 1",
    solutionPv: ["e2e7"],
    theme: "Skewer",
    difficulty: "beginner",
    sideToMove: "white",
    description: "Queen skewers rook through the king",
  },
  {
    id: "sk-02",
    fen: "8/8/4k3/4r3/8/8/4R3/4K3 w - - 0 1",
    solutionPv: ["e2e5"],
    theme: "Skewer",
    difficulty: "beginner",
    sideToMove: "white",
    description: "Rook skewer — win the exchange through the king",
  },
  {
    id: "sk-03",
    fen: "1k6/4b3/2q5/8/8/8/4Q3/1K6 w - - 0 1",
    solutionPv: ["e2e7"],
    theme: "Skewer",
    difficulty: "beginner",
    sideToMove: "white",
    description: "Bishop and queen lined up — skewer wins a piece",
  },

  // ═══ Mate in 2 ═══
  {
    id: "m2-01",
    fen: "r1b2rk1/ppppn1pp/5n2/4p3/1bB1P2q/2NP1N2/PPPBQ1PP/R4RK1 w - - 0 1",
    solutionPv: ["f3e5", "h4f2", "e5g4"],
    theme: "Mate in 2",
    difficulty: "intermediate",
    sideToMove: "white",
    description: "Three-move combination — knight check then bishop delivers mate",
  },
  {
    id: "m2-02",
    fen: "r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 1",
    solutionPv: ["d1d6", "f8e8", "c1g5"],
    theme: "Mate in 2",
    difficulty: "intermediate",
    sideToMove: "white",
    description: "Two-move combination — queen infiltrates then bishop mates",
  },

  // ═══ Discovered Attack ═══
  {
    id: "da-01",
    fen: "r2q1rk1/ppp2ppp/2npbn2/4p3/2B1P3/2NPBN2/PPP2PPP/R2QK2R w KQ - 0 1",
    solutionPv: ["f3e5"],
    theme: "Discovered Attack",
    difficulty: "intermediate",
    sideToMove: "white",
    description: "Discovered attack — knight moves, bishop discovers attack on f6 knight",
  },
  {
    id: "da-02",
    fen: "r1bqk2r/pppp1ppp/2n2n2/4p3/1bB1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w kq - 0 1",
    solutionPv: ["d3e5"],
    theme: "Discovered Attack",
    difficulty: "intermediate",
    sideToMove: "white",
    description: "Double attack — knight moves, bishop discovers, knight also threatens",
  },

  // ═══ Back Rank ═══
  {
    id: "br-01",
    fen: "6k1/5ppp/8/8/8/8/1R6/4R1K1 w - - 0 1",
    solutionPv: ["e1e8"],
    theme: "Back Rank",
    difficulty: "beginner",
    sideToMove: "white",
    description: "Classic back rank mate — king has no escape squares",
  },
  {
    id: "br-02",
    fen: "5rk1/5ppp/8/8/8/8/8/2R1R1K1 w - - 0 1",
    solutionPv: ["c1c8"],
    theme: "Back Rank",
    difficulty: "beginner",
    sideToMove: "white",
    description: "Back rank with two rooks — any rook delivers",
  },

  // ═══ Endgame ═══
  {
    id: "eg-01",
    fen: "8/8/8/8/4k3/8/3KP3/8 w - - 0 1",
    solutionPv: ["e2e4"],
    theme: "Endgame",
    difficulty: "intermediate",
    sideToMove: "white",
    description: "King opposition — push the pawn with king support for promotion",
  },
  {
    id: "eg-02",
    fen: "8/5k2/8/5P2/5K2/8/8/8 w - - 0 1",
    solutionPv: ["f4g5", "f7g7", "f5f6", "g7f7", "g5f5"],
    theme: "Endgame",
    difficulty: "advanced",
    sideToMove: "white",
    description: "Lucena position — king escorts the pawn to promotion",
  },
  {
    id: "eg-03",
    fen: "4k3/4p3/8/8/4K3/8/8/8 b - - 0 1",
    solutionPv: ["e8d7", "e4d5", "d7e8", "d5e6"],
    theme: "Endgame",
    difficulty: "intermediate",
    sideToMove: "black",
    description: "King and pawn endgame — know when to oppose",
  },
];

export function getPuzzlesByDifficulty(difficulty: Puzzle["difficulty"]): Puzzle[] {
  return PUZZLES.filter((p) => p.difficulty === difficulty);
}

export function getPuzzlesByTheme(theme: string): Puzzle[] {
  return PUZZLES.filter((p) => p.theme.toLowerCase().includes(theme.toLowerCase()));
}

export function getRandomPuzzle(difficulty?: Puzzle["difficulty"]): Puzzle {
  const pool = difficulty ? getPuzzlesByDifficulty(difficulty) : PUZZLES;
  return pool[Math.floor(Math.random() * pool.length)];
}
