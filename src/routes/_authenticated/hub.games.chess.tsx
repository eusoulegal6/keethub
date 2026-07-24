import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Trophy,
  Users,
  Bot,
  Puzzle,
  Lightbulb,
  Eye,
  SkipForward,
  RotateCcw,
  Crown,
  Play,
  Swords,
  Gamepad2,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { getGameBySlug, type Game } from "@/lib/games.functions";
import { getGameLeaderboard, submitScore } from "@/lib/scores.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChessProvider, useChess } from "@/lib/chess/ChessContext";
import { ChessBoard } from "@/lib/chess/ChessBoard";
import { GameInfo } from "@/lib/chess/GameInfo";
import { PuzzleProvider, usePuzzle } from "@/lib/chess/PuzzleContext";
import type { Puzzle as ChessPuzzle } from "@/lib/chess/types";
import { PUZZLES } from "@/lib/chess/puzzles";
import { OPPONENTS, CATEGORY_LABELS, getOpponentById, type Opponent } from "@/lib/chess/opponents";
import { LOCAL_GAMES } from "@/lib/local-games";
import { useChessMultiplayer } from "@/games/chess/hooks/useChessMultiplayer";
import MultiplayerLobby from "@/games/chess/components/MultiplayerLobby";
import MultiplayerGame from "@/games/chess/components/MultiplayerGame";

// ── Route ─────────────────────────────────────────────────────────

const CHESS_LOCAL: Game = LOCAL_GAMES.find((g) => g.slug === "chess")!.data;

const gameQuery = queryOptions({
  queryKey: ["game", "chess"],
  queryFn: () => getGameBySlug({ data: { slug: "chess" } }),
  staleTime: 60_000,
});

export const Route = createFileRoute("/_authenticated/hub/games/chess")({
  loader: async ({ context }) => {
    const game = await context.queryClient.ensureQueryData(gameQuery);
    // Fall back to local definition if Supabase doesn't have the row yet
    return { game: game ?? CHESS_LOCAL };
  },
  component: ChessPage,
  notFoundComponent: () => (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Game not found</h2>
        <Link to="/hub" className="mt-4 inline-block text-primary underline">
          Back to library
        </Link>
      </div>
    </div>
  ),
});

// ── Page shell ────────────────────────────────────────────────────

function ChessPage() {
  const { game } = Route.useLoaderData();
  const [tab, setTab] = useState("play");

  return (
    <div className="chess-room px-3 pb-10 pt-0 md:px-5">
      <Link to="/hub" className="chess-room-back">
        <ArrowLeft className="h-4 w-4" /> Back to library
      </Link>
      <section className="chess-room-hero">
        <div className="chess-room-spark spark-one">✦</div>
        <div className="chess-room-spark spark-two">♥</div>
        <div className="chess-room-piece chess-room-queen">♕</div>
        <div className="chess-room-bird">🐦</div>
        <div className="chess-room-knight">♘</div>
        <div className="chess-room-pawn">♟</div>
        <Badge className="chess-room-category">{game.category}</Badge>
        <h1>{game.title}</h1>
        <p>Challenge friends or practice your strategy with fun bots.<br />Every move is a step toward mastery! <Sparkles className="inline h-4 w-4 text-[#ffb21a]" /></p>
      </section>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="chess-room-tabs grid w-full max-w-[535px] grid-cols-3 mb-3">
          <TabsTrigger value="play" className="gap-2">
            <Gamepad2 className="w-4 h-4" /> Play
          </TabsTrigger>
          <TabsTrigger value="puzzles" className="gap-2">
            <Puzzle className="w-4 h-4" /> Puzzles
          </TabsTrigger>
          <TabsTrigger value="multiplayer" className="gap-2">
            <Swords className="w-4 h-4" /> Multiplayer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="play">
          <ChessProvider>
            <PlayTab gameId={game.id} />
          </ChessProvider>
        </TabsContent>

        <TabsContent value="puzzles">
          <PuzzleProvider>
            <PuzzlesTab />
          </PuzzleProvider>
        </TabsContent>

        <TabsContent value="multiplayer">
          <MultiplayerTab gameId={game.id} />
        </TabsContent>
      </Tabs>

      <div className="mt-8">
        <LeaderboardPreview gameId={game.id} />
      </div>
    </div>
  );
}

// ── Play tab ──────────────────────────────────────────────────────

function PlayTab({ gameId }: { gameId: string }) {
  const { game, makeMove, aiConfig, setAIConfig, resetGame, isAIThinking, isAITurn, makeAIMove } =
    useChess();
  const queryClient = useQueryClient();
  const submitScoreFn = useServerFn(submitScore);
  const [mode, setMode] = useState<"local" | "ai">("local");
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const prevTurn = useRef(game.turn);

  // Auto-trigger AI move
  useEffect(() => {
    console.log(
      "[PlayTab effect] turn:",
      game.turn,
      "aiColor:",
      aiConfig.color,
      "enabled:",
      aiConfig.enabled,
      "thinking:",
      isAIThinking,
    );
    if (aiConfig.enabled && !isAIThinking && !game.inCheckmate && !game.inDraw) {
      if (game.turn === aiConfig.color) {
        console.log("[PlayTab effect] Scheduling AI move in 250ms");
        const timer = setTimeout(makeAIMove, 250);
        return () => clearTimeout(timer);
      }
    }
  }, [
    game.turn,
    game.fen,
    aiConfig.enabled,
    isAIThinking,
    game.inCheckmate,
    game.inDraw,
    aiConfig.color,
    makeAIMove,
  ]);

  // Track game result for score submission
  const gameOver = game.inCheckmate || game.inStalemate || game.inDraw;
  const wonWithAI =
    gameOver &&
    game.inCheckmate &&
    aiConfig.enabled &&
    game.turn === aiConfig.color &&
    game.moves.length > 0;

  const scoreMutation = useMutation({
    mutationFn: async () => {
      if (scoreSubmitted) return;
      await submitScoreFn({
        data: {
          gameId,
          score: game.moves.length,
          metadata: { mode, result: game.status, asWhite: orientation === "white" },
        },
      });
    },
    onSuccess: () => {
      setScoreSubmitted(true);
      toast.success("Score submitted!");
      queryClient.invalidateQueries({ queryKey: ["game-leaderboard", gameId] });
      queryClient.invalidateQueries({ queryKey: ["global-leaderboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [selectedOpponent, setSelectedOpponent] = useState<Opponent | null>(null);
  const [botCategory, setBotCategory] = useState("beginner");

  const handleSetMode = (m: "local" | "ai") => {
    setMode(m);
    setScoreSubmitted(false);
    if (m === "local") {
      setAIConfig({ enabled: false, color: "black", depth: 3 });
      setSelectedOpponent(null);
    }
  };

  const handleSelectOpponent = (opponent: Opponent) => {
    setSelectedOpponent(opponent);
  };

  const handleStartAI = () => {
    if (!selectedOpponent) return;
    setMode("ai");
    setAIConfig({
      enabled: true,
      color: selectedOpponent.color || "black",
      depth: selectedOpponent.depth,
      elo: selectedOpponent.elo,
      opponentId: selectedOpponent.id,
    });
    setScoreSubmitted(false);
    resetGame();
  };

  const opponentLabel = selectedOpponent
    ? `${selectedOpponent.name} (${selectedOpponent.rating})`
    : aiConfig.opponentId
      ? (getOpponentById(aiConfig.opponentId)?.name ?? "AI")
      : "AI";

  // ── Mobile layout ───────────────────────────────────────────────
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div>
      {/* Mode selector + Bot grid */}
      {!aiConfig.enabled && (
        <Card className="chess-room-setup mb-3">
          <CardContent className="p-3 md:p-4">
            <div className="chess-room-setup-grid">
              <div className="chess-room-mode-area">
              <div className="flex gap-2 mb-5">
              <Button
                size="sm"
                variant={mode === "local" ? "default" : "outline"}
                className="chess-room-mode-button"
                onClick={() => handleSetMode("local")}
              >
                <Users className="w-4 h-4 mr-1" /> Two Player
              </Button>
              <Button
                size="sm"
                variant={mode === "ai" ? "default" : "outline"}
                className="chess-room-mode-button"
                onClick={() => handleSetMode("ai")}
              >
                <Bot className="w-4 h-4 mr-1" /> VS AI
              </Button>
            </div>
              <p className="chess-room-label">Choose difficulty</p>
              <div className="flex gap-1 overflow-x-auto pb-1">
                  {Object.keys(OPPONENTS).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setBotCategory(cat)}
                      className={`chess-room-difficulty px-3 py-1.5 text-xs font-bold rounded-full border transition whitespace-nowrap ${
                        botCategory === cat
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>
              </div>

                <div className="chess-room-opponents grid grid-cols-1 min-[520px]:grid-cols-3 gap-3">
                  {OPPONENTS[botCategory].map((opp) => {
                    const isSelected = selectedOpponent?.id === opp.id;
                    return (
                      <button
                        key={opp.id}
                        onClick={() => handleSelectOpponent(opp)}
                      className={`relative p-3 rounded-xl border-2 transition-all text-center ${
                          isSelected
                            ? "border-primary bg-primary/10 ring-1 ring-primary/50"
                            : "border-border hover:border-primary/40 hover:bg-secondary/50"
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <div className="relative flex-shrink-0 mb-1">
                            <Avatar className="h-14 w-14">
                              <AvatarImage src={opp.avatar} alt={opp.name} />
                              <AvatarFallback className="text-xs">{opp.name[0]}</AvatarFallback>
                            </Avatar>
                            {opp.featured && (
                              <Crown className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400 drop-shadow" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{opp.name}</p>
                            <p className="text-xs text-[#ff9418] font-bold"><BarChart3 className="inline h-3 w-3" /> {opp.rating}</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                          {opp.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
                <Button
                  onClick={handleStartAI}
                  disabled={!selectedOpponent}
                  className="chess-room-start w-full"
                >
                  <Play className="w-4 h-4 mr-1" fill="currentColor" />
                  {selectedOpponent ? `Play vs ${selectedOpponent.name}` : "Choose an opponent"}
                </Button>
          </CardContent>
        </Card>
      )}

      {/* AI active status bar */}
      {aiConfig.enabled && (
        <div className="flex items-center gap-3 mb-4 px-1">
          <Bot className="w-4 h-4 text-primary" />
          <span className="text-sm">
            VS {opponentLabel}
            {aiConfig.color === "black" ? " — You play White" : " — You play Black"}
          </span>
          <span className="text-xs text-muted-foreground ml-auto">
            {isAIThinking ? "AI thinking..." : game.inCheckmate ? "Game Over" : "Your turn"}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAIConfig({ ...aiConfig, enabled: false })}
          >
            Stop
          </Button>
        </div>
      )}

      {/* Board area */}
      <div className={`chess-room-game grid ${isMobile ? "grid-cols-1" : "grid-cols-3"} gap-3`}>
        <div className={isMobile ? "" : "col-span-2"}>
          <div className="chess-room-board-card">
          <div className="flex justify-between items-center mb-2 px-1">
            <Button
              variant="ghost"
              size="sm"
              className="chess-room-flip"
              onClick={() => setOrientation((o) => (o === "white" ? "black" : "white"))}
            >
              Flip board
            </Button>
            {game.inCheckmate && aiConfig.enabled && game.turn === aiConfig.color && (
              <Button
                size="sm"
                onClick={() => scoreMutation.mutate()}
                disabled={scoreMutation.isPending || scoreSubmitted}
                className="glow-primary"
              >
                <Trophy className="w-4 h-4 mr-1" />
                {scoreMutation.isPending
                  ? "Submitting..."
                  : scoreSubmitted
                    ? "Win Submitted"
                    : "Submit Win"}
              </Button>
            )}
          </div>
          <ChessBoard
            fen={game.fen}
            orientation={orientation}
            onMove={(from, to) => makeMove(from, to)}
            disabled={
              aiConfig.enabled &&
              (isAIThinking || (game.turn === aiConfig.color && !game.inCheckmate))
            }
            squareSize={isMobile ? Math.min(44, Math.floor((window.innerWidth - 48) / 8)) : 64}
            lastMove={game.lastMove}
          />
          </div>
        </div>
        {!isMobile && (
          <div className="col-span-1">
            <GameInfo />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Multiplayer tab ────────────────────────────────────────────────

function MultiplayerTab({ gameId }: { gameId: string }) {
  const mp = useChessMultiplayer();
  const queryClient = useQueryClient();
  const submitScoreFn = useServerFn(submitScore);
  const submittedRoomRef = useRef<string | null>(null);

  const isInRoom = mp.roomState !== null;
  const isPlaying = mp.roomState?.room.status === "playing";

  // Auto-submit score on game finish
  useEffect(() => {
    const roomState = mp.roomState;
    if (!roomState || roomState.room.status !== "finished") return;
    if (submittedRoomRef.current === roomState.room.id) return;

    const selfPlayer = roomState.players.find((p) => p.id === roomState.selfPlayerId);
    if (!selfPlayer) return;
    const won = roomState.room.result === "white_win" || roomState.room.result === "resign_black"
      ? selfPlayer.color === "white"
      : roomState.room.result === "black_win" || roomState.room.result === "resign_white"
        ? selfPlayer.color === "black"
        : false;

    submittedRoomRef.current = roomState.room.id;

    void (async () => {
      try {
        await submitScoreFn({
          data: {
            gameId,
            score: won ? roomState.moves.length : 0,
            metadata: {
              roomId: roomState.room.id,
              roomCode: roomState.room.code,
              result: roomState.room.result,
              color: selfPlayer.color,
              opponentName: roomState.players.find((p) => p.id !== selfPlayer.id)?.name,
            },
          },
        });
        queryClient.invalidateQueries({ queryKey: ["game-leaderboard", gameId] });
        queryClient.invalidateQueries({ queryKey: ["global-leaderboard"] });
        toast.success("Score submitted!");
      } catch {
        submittedRoomRef.current = null;
      }
    })();
  }, [gameId, mp.roomState, submitScoreFn, queryClient]);

  const mpActions = {
    state: mp.roomState,
    action: mp.action,
    onCreateRoom: mp.createRoom,
    onJoinRoom: mp.joinRoom,
    onLeaveRoom: mp.leaveRoom,
    onStartGame: mp.startGame,
  };

  if (isPlaying) {
    return (
      <MultiplayerGame
        state={mp.roomState!}
        action={mp.action}
        isMyTurn={mp.isMyTurn}
        lastMove={mp.lastMove}
        onMove={mp.makeMove}
        onResign={mp.resign}
        onLeave={mp.leaveRoom}
      />
    );
  }

  return (
    <MultiplayerLobby
      state={mp.roomState}
      action={mp.action}
      onCreateRoom={mp.createRoom}
      onJoinRoom={mp.joinRoom}
      onLeaveRoom={mp.leaveRoom}
      onStartGame={mp.startGame}
    />
  );
}

// ── Puzzles tab ───────────────────────────────────────────────────

function PuzzlesTab() {
  const p = usePuzzle();
  const [difficulty, setDifficulty] = useState<ChessPuzzle["difficulty"] | undefined>();

  // Load first puzzle on mount
  useEffect(() => {
    if (!p.puzzle && !p.loading) p.loadPuzzle();
  }, []);

  const themeCounts: Record<string, number> = {};
  for (const pz of PUZZLES) {
    themeCounts[pz.theme] = (themeCounts[pz.theme] || 0) + 1;
  }

  return (
    <div>
      {/* Puzzle header */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={!difficulty ? "default" : "outline"}
            onClick={() => {
              setDifficulty(undefined);
              p.loadPuzzle();
            }}
          >
            All
          </Button>
          {(["beginner", "intermediate", "advanced"] as const).map((d) => (
            <Button
              key={d}
              size="sm"
              variant={difficulty === d ? "default" : "outline"}
              onClick={() => {
                setDifficulty(d);
                p.loadPuzzle(d);
              }}
              className="capitalize"
            >
              {d}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto text-sm">
          <span className="text-muted-foreground">
            Solved: <span className="text-success font-bold">{p.totalSolved}</span>
          </span>
          {p.streak > 1 && <span className="text-yellow-400 font-bold">{p.streak} streak!</span>}
        </div>
      </div>

      {/* Puzzle area */}
      {p.loading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading puzzle...</p>
        </div>
      ) : p.error ? (
        <div className="text-center py-16">
          <p className="text-destructive">{p.error}</p>
          <Button variant="outline" className="mt-4" onClick={() => p.loadPuzzle(difficulty)}>
            Try Again
          </Button>
        </div>
      ) : p.puzzle && p.fen ? (
        <div className="grid md:grid-cols-3 gap-4">
          {/* Board */}
          <div className="md:col-span-2">
            <ChessBoard
              fen={p.fen}
              orientation={p.playerSide === "black" ? "black" : "white"}
              onMove={(from, to) => p.onMove(from, to)}
              disabled={p.solved || p.showSolution}
              squareSize={
                typeof window !== "undefined" && window.innerWidth < 768
                  ? Math.min(44, Math.floor((window.innerWidth - 48) / 8))
                  : 64
              }
            />
          </div>

          {/* Info panel */}
          <div className="space-y-3">
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{p.puzzle.theme}</Badge>
                  <Badge variant="outline" className="capitalize">
                    {p.puzzle.difficulty}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{p.puzzle.description}</p>
                <p className="text-xs text-muted-foreground">
                  {p.playerSide === "white" ? "You play White" : "You play Black"}
                </p>
              </CardContent>
            </Card>

            {/* Message */}
            {p.message && (
              <p
                className={`text-sm font-semibold px-1 ${p.message.includes("Incorrect") ? "text-destructive" : "text-success"}`}
              >
                {p.message}
              </p>
            )}

            {/* Hint */}
            {p.showHint && !p.solved && (
              <Card className="border-yellow-500/50 bg-yellow-500/5">
                <CardContent className="p-3">
                  <p className="text-sm">
                    <span className="text-yellow-400 font-semibold">Hint:</span> The next move is{" "}
                    <span className="font-mono font-bold">
                      {p.pv[p.idx]?.slice(0, 2)} → {p.pv[p.idx]?.slice(2, 4)}
                    </span>
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Solved! */}
            {p.solved && (
              <Card className="border-success/50 bg-success/5">
                <CardContent className="p-4 text-center">
                  <p className="text-success font-bold text-lg">Solved!</p>
                  <p className="text-xs text-muted-foreground">
                    {p.mistakes > 0
                      ? `${p.mistakes} mistake${p.mistakes > 1 ? "s" : ""}`
                      : "Perfect!"}
                    {p.hintsUsed > 0 && ` · ${p.hintsUsed} hint${p.hintsUsed > 1 ? "s" : ""}`}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Controls */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={p.showHintAction}
                disabled={p.solved || p.showHint || p.showSolution}
              >
                <Lightbulb className="w-4 h-4 mr-1" /> Hint
              </Button>
              <Button size="sm" variant="outline" onClick={p.toggleSolution}>
                <Eye className="w-4 h-4 mr-1" />
                {p.showSolution ? "Hide" : "Solution"}
              </Button>
              <Button size="sm" variant="outline" onClick={p.resetPuzzle} disabled={p.showSolution}>
                <RotateCcw className="w-4 h-4 mr-1" /> Reset
              </Button>
              <Button size="sm" onClick={p.nextPuzzle}>
                <SkipForward className="w-4 h-4 mr-1" /> Next
              </Button>
            </div>

            {/* Mistakes counter */}
            <p className="text-xs text-muted-foreground">
              Mistakes: <span className="font-semibold tabular-nums">{p.mistakes}</span>
              {p.hintsUsed > 0 && (
                <span>
                  {" "}
                  · Hints: <span className="font-semibold">{p.hintsUsed}</span>
                </span>
              )}
            </p>
          </div>
        </div>
      ) : null}

      {/* Theme legend */}
      <div className="mt-6">
        <p className="text-xs text-muted-foreground mb-2">Puzzle themes available:</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(themeCounts).map(([theme, count]) => (
            <Badge key={theme} variant="outline" className="text-xs">
              {theme} ({count})
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Leaderboard ───────────────────────────────────────────────────

function LeaderboardPreview({ gameId }: { gameId: string }) {
  const { data: lb, isLoading } = useQuery(
    queryOptions({
      queryKey: ["game-leaderboard", gameId],
      queryFn: () => (gameId ? getGameLeaderboard({ data: { gameId } }) : Promise.resolve([])),
      enabled: !!gameId,
      staleTime: 15_000,
    }),
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-4 h-4 text-primary" />
        <h2 className="font-semibold">Top players</h2>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : lb && lb.length > 0 ? (
        <ol className="space-y-2">
          {lb.map((row, i) => (
            <li key={row.id} className="flex items-center justify-between text-sm py-1">
              <span className="flex items-center gap-3">
                <span
                  className={`w-5 text-xs tabular-nums ${
                    i === 0
                      ? "text-yellow-400 font-bold"
                      : i === 1
                        ? "text-gray-300 font-semibold"
                        : i === 2
                          ? "text-amber-600 font-semibold"
                          : "text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="truncate">{row.username ?? "anon"}</span>
              </span>
              <span className="font-semibold tabular-nums">{row.score.toLocaleString()}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">No scores yet — be the first!</p>
      )}
    </div>
  );
}
