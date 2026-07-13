import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Trophy, Play } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useRef, useCallback } from "react";
import { getGameBySlug } from "@/lib/games.functions";
import { getGameLeaderboard, submitScore } from "@/lib/scores.functions";
import { LOCAL_GAMES } from "@/lib/local-games";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ── Game constants ──────────────────────────────────────────────
const W = 800;
const H = 400;
const PADDLE_W = 10;
const PADDLE_H = 80;
const BALL = 10;
const PADDLE_SPEED = 5;
const WIN_SCORE = 5;
const INITIAL_BALL_SPEED_X = 4;
const INITIAL_BALL_SPEED_Y = 2.5;

// ── Route ───────────────────────────────────────────────────────

const LOCAL_PING_PONG = LOCAL_GAMES.find((g) => g.slug === "ping-pong")!.data;

const gameQuery = queryOptions({
  queryKey: ["game", "ping-pong"],
  queryFn: async () => {
    const serverGame = await getGameBySlug({ data: { slug: "ping-pong" } });
    return serverGame ?? LOCAL_PING_PONG;
  },
  staleTime: 60_000,
});

export const Route = createFileRoute("/_authenticated/hub/games/ping-pong")({
  loader: async ({ context }) => {
    const game = await context.queryClient.ensureQueryData(gameQuery);
    return { game };
  },
  component: PingPongGame,
  notFoundComponent: () => (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Game not found</h2>
        <p className="mt-2 text-muted-foreground">Ping Pong hasn't been set up yet.</p>
        <Link to="/hub" className="mt-4 inline-block text-primary underline">
          Back to library
        </Link>
      </div>
    </div>
  ),
});

// ── Component ───────────────────────────────────────────────────

function PingPongGame() {
  const { game } = Route.useLoaderData();
  const queryClient = useQueryClient();
  const submitScoreFn = useServerFn(submitScore);
  const accent = game.accent_color ?? "#06b6d4";

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  // UI state
  const [screen, setScreen] = useState<"menu" | "playing" | "over">("menu");
  const [mode, setMode] = useState<"two-player" | "ai">("two-player");
  const [winner, setWinner] = useState<"player" | "opponent" | null>(null);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);

  // Mutable game state (never triggers re-render mid-loop)
  // p1 = left paddle, p2 = right paddle
  const gs = useRef({
    p1Y: H / 2 - PADDLE_H / 2,
    p2Y: H / 2 - PADDLE_H / 2,
    bx: W / 2,
    by: H / 2,
    bvx: INITIAL_BALL_SPEED_X,
    bvy: INITIAL_BALL_SPEED_Y,
    score: { p1: 0, p2: 0 },
    hits: 0, // player (right paddle) contacts → leaderboard score
    keys: { w: false, s: false, ArrowUp: false, ArrowDown: false },
    touchY: null as number | null, // mobile: target Y for player paddle
  });

  const [displayScore, setDisplayScore] = useState({ p1: 0, p2: 0 });

  // ── Reset ───────────────────────────────────────────────────────
  const resetBall = useCallback(() => {
    gs.current.bx = W / 2;
    gs.current.by = H / 2;
    gs.current.bvx = (Math.random() > 0.5 ? 1 : -1) * INITIAL_BALL_SPEED_X;
    gs.current.bvy = (Math.random() > 0.5 ? 1 : -1) * INITIAL_BALL_SPEED_Y;
  }, []);

  const startGame = useCallback(() => {
    gs.current = {
      p1Y: H / 2 - PADDLE_H / 2,
      p2Y: H / 2 - PADDLE_H / 2,
      bx: W / 2,
      by: H / 2,
      bvx: INITIAL_BALL_SPEED_X,
      bvy: INITIAL_BALL_SPEED_Y,
      score: { p1: 0, p2: 0 },
      hits: 0,
      keys: { w: false, s: false, ArrowUp: false, ArrowDown: false },
      touchY: null,
    };
    setDisplayScore({ p1: 0, p2: 0 });
    setWinner(null);
    setScoreSubmitted(false);
    setScreen("playing");
    resetBall();
  }, [resetBall]);

  // ── Keyboard ─────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (["w", "s", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        gs.current.keys[e.key as keyof typeof gs.current.keys] = true;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (["w", "s", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        gs.current.keys[e.key as keyof typeof gs.current.keys] = false;
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // ── Touch ────────────────────────────────────────────────────────
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleY = H / rect.height;
    const y = (e.touches[0].clientY - rect.top) * scaleY;
    gs.current.touchY = Math.max(0, Math.min(H, y));
  }, []);

  const handleTouchEnd = useCallback(() => {
    gs.current.touchY = null;
  }, []);

  // ── Game loop ────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== "playing") return;

    const loop = () => {
      const s = gs.current;
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // ── Paddle movement ──────────────────────────────────────────
      if (mode === "ai") {
        // AI (left paddle) tracks the ball with imperfection
        const aiC = s.p1Y + PADDLE_H / 2;
        const ballC = s.by + BALL / 2;
        const aiSpeed = PADDLE_SPEED * 0.88;
        if (Math.abs(ballC - aiC) > 3 && s.bvx < 0) {
          // Only track when ball is coming toward AI
          if (ballC > aiC) s.p1Y = Math.min(H - PADDLE_H, s.p1Y + aiSpeed);
          else s.p1Y = Math.max(0, s.p1Y - aiSpeed);
        } else if (Math.abs(ballC - aiC) > 50 && s.bvx > 0) {
          // Slowly return to center when ball is going away
          const c = H / 2 - PADDLE_H / 2;
          if (s.p1Y < c - 2) s.p1Y += aiSpeed * 0.4;
          else if (s.p1Y > c + 2) s.p1Y -= aiSpeed * 0.4;
        }

        // Player (right paddle) — keyboard
        if (s.keys.w || s.keys.ArrowUp) s.p2Y = Math.max(0, s.p2Y - PADDLE_SPEED);
        if (s.keys.s || s.keys.ArrowDown) s.p2Y = Math.min(H - PADDLE_H, s.p2Y + PADDLE_SPEED);

        // Player — touch
        if (s.touchY !== null) {
          const target = s.touchY - PADDLE_H / 2;
          const diff = target - s.p2Y;
          if (Math.abs(diff) > 1) {
            s.p2Y += Math.sign(diff) * Math.min(Math.abs(diff), PADDLE_SPEED);
          }
          s.p2Y = Math.max(0, Math.min(H - PADDLE_H, s.p2Y));
        }
      } else {
        // Two-player: P1 (left) uses W/S, P2 (right) uses arrows
        if (s.keys.w) s.p1Y = Math.max(0, s.p1Y - PADDLE_SPEED);
        if (s.keys.s) s.p1Y = Math.min(H - PADDLE_H, s.p1Y + PADDLE_SPEED);
        if (s.keys.ArrowUp) s.p2Y = Math.max(0, s.p2Y - PADDLE_SPEED);
        if (s.keys.ArrowDown) s.p2Y = Math.min(H - PADDLE_H, s.p2Y + PADDLE_SPEED);

        // Two-player touch: left half = P1, right half = P2
        if (s.touchY !== null) {
          const target = s.touchY - PADDLE_H / 2;
          const paddle = s.bx < W / 2 ? "p1" : "p2"; // who to control
          const curY = paddle === "p1" ? s.p1Y : s.p2Y;
          const diff = target - curY;
          let newY = curY;
          if (Math.abs(diff) > 1) {
            newY = curY + Math.sign(diff) * Math.min(Math.abs(diff), PADDLE_SPEED);
          }
          newY = Math.max(0, Math.min(H - PADDLE_H, newY));
          if (paddle === "p1") s.p1Y = newY;
          else s.p2Y = newY;
        }
      }

      // ── Ball ──────────────────────────────────────────────────────
      s.bx += s.bvx;
      s.by += s.bvy;

      // Top/bottom walls
      if (s.by <= 0) {
        s.by = 0;
        s.bvy = Math.abs(s.bvy);
      }
      if (s.by >= H - BALL) {
        s.by = H - BALL;
        s.bvy = -Math.abs(s.bvy);
      }

      // Left paddle collision
      if (s.bx <= PADDLE_W && s.by + BALL >= s.p1Y && s.by <= s.p1Y + PADDLE_H && s.bvx < 0) {
        s.bvx = Math.abs(s.bvx) * 1.04; // speed up slightly per hit
        // Adjust Y angle based on where ball hit the paddle
        const hitPos = (s.by + BALL / 2 - (s.p1Y + PADDLE_H / 2)) / (PADDLE_H / 2);
        s.bvy += hitPos * 1.2;
        s.bx = PADDLE_W;
        if (mode === "two-player") {
          s.hits++;
        }
      }

      // Right paddle collision
      if (
        s.bx >= W - PADDLE_W - BALL &&
        s.by + BALL >= s.p2Y &&
        s.by <= s.p2Y + PADDLE_H &&
        s.bvx > 0
      ) {
        s.bvx = -Math.abs(s.bvx) * 1.04;
        const hitPos = (s.by + BALL / 2 - (s.p2Y + PADDLE_H / 2)) / (PADDLE_H / 2);
        s.bvy += hitPos * 1.2;
        s.bx = W - PADDLE_W - BALL;
        s.hits++; // player always controls right paddle
      }

      // Cap ball speed
      const speed = Math.sqrt(s.bvx * s.bvx + s.bvy * s.bvy);
      if (speed > 10) {
        const scale = 10 / speed;
        s.bvx *= scale;
        s.bvy *= scale;
      }

      // ── Scoring ───────────────────────────────────────────────────
      let scored = false;
      if (s.bx < 0) {
        // Ball past left wall → left paddle (P1) missed → P2 scores
        s.score.p2++;
        scored = true;
      } else if (s.bx > W) {
        // Ball past right wall → right paddle (P2) missed → P1 scores
        s.score.p1++;
        scored = true;
      }

      if (scored) {
        setDisplayScore({ ...s.score });
        const playerScore = mode === "ai" ? s.score.p2 : s.score.p1;
        const opponentScore = mode === "ai" ? s.score.p1 : s.score.p2;
        if (playerScore >= WIN_SCORE) {
          setWinner("player");
          setScreen("over");
          return;
        } else if (opponentScore >= WIN_SCORE) {
          setWinner("opponent");
          setScreen("over");
          return;
        }
        resetBall();
      }

      // ── Draw ───────────────────────────────────────────────────────
      ctx.fillStyle = "#111827"; // gray-900
      ctx.fillRect(0, 0, W, H);

      // Net
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = "#374151"; // gray-700
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(W / 2, H);
      ctx.stroke();
      ctx.setLineDash([]);

      // Paddles
      ctx.fillStyle = mode === "ai" ? "#a78bfa" : accent;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 12;
      ctx.fillRect(0, s.p1Y, PADDLE_W, PADDLE_H);
      ctx.fillRect(W - PADDLE_W, s.p2Y, PADDLE_W, PADDLE_H);
      ctx.shadowBlur = 0;

      // Ball
      ctx.fillStyle = "#f9fafb"; // gray-50
      ctx.shadowColor = "#f9fafb";
      ctx.shadowBlur = 8;
      ctx.fillRect(s.bx, s.by, BALL, BALL);
      ctx.shadowBlur = 0;

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [screen, mode, accent, resetBall]);

  // ── Score submission ─────────────────────────────────────────────
  const scoreMutation = useMutation({
    mutationFn: async () => {
      if (!game) return;
      await submitScoreFn({
        data: {
          gameId: game.id,
          score: gs.current.hits,
          metadata: { mode, p1Score: gs.current.score.p1, p2Score: gs.current.score.p2 },
        },
      });
    },
    onSuccess: () => {
      setScoreSubmitted(true);
      toast.success("Score submitted!");
      queryClient.invalidateQueries({ queryKey: ["game-leaderboard", game.id] });
      queryClient.invalidateQueries({ queryKey: ["global-leaderboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Player name labels ───────────────────────────────────────────
  // In AI mode: P1 = AI (left), P2 = human (right)
  // In two-player: P1 = Player 1 (left), P2 = Player 2 (right)
  const p1Label = mode === "ai" ? "AI" : "Player 1";
  const p2Label = mode === "ai" ? "You" : "Player 2";
  const playerScore = displayScore.p2; // player always controls right paddle
  const opponentScore = displayScore.p1;

  // ── Render: Menu ─────────────────────────────────────────────────
  if (screen === "menu") {
    return (
      <div className="px-6 py-8 md:px-10 max-w-3xl mx-auto">
        <Link
          to="/hub"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to library
        </Link>

        <div
          className="rounded-3xl border border-border p-8 md:p-12 text-center relative overflow-hidden"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${accent}30, transparent 60%), linear-gradient(180deg, ${accent}10, oklch(0.20 0.03 268))`,
          }}
        >
          <Badge variant="secondary" className="mb-4">
            {game.category}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2">{game.title}</h1>
          <p className="text-muted-foreground mb-8">{game.description}</p>

          {/* Mode picker */}
          <div className="flex gap-3 justify-center mb-6">
            <Button
              size="lg"
              variant={mode === "two-player" ? "default" : "outline"}
              onClick={() => setMode("two-player")}
              className="min-w-[140px]"
            >
              Two Player
            </Button>
            <Button
              size="lg"
              variant={mode === "ai" ? "default" : "outline"}
              onClick={() => setMode("ai")}
              className="min-w-[140px]"
            >
              VS AI
            </Button>
          </div>

          {/* Controls info */}
          <div className="text-sm text-muted-foreground space-y-1 mb-8">
            {mode === "two-player" ? (
              <>
                <p>
                  <kbd className="px-1.5 py-0.5 rounded bg-secondary text-xs font-mono">W</kbd>{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-secondary text-xs font-mono">S</kbd> —{" "}
                  {p1Label} (left)
                </p>
                <p>
                  <kbd className="px-1.5 py-0.5 rounded bg-secondary text-xs font-mono">↑</kbd>{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-secondary text-xs font-mono">↓</kbd> —{" "}
                  {p2Label} (right)
                </p>
              </>
            ) : (
              <>
                <p>
                  <kbd className="px-1.5 py-0.5 rounded bg-secondary text-xs font-mono">W</kbd>{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-secondary text-xs font-mono">S</kbd> or{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-secondary text-xs font-mono">↑</kbd>{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-secondary text-xs font-mono">↓</kbd> or
                  touch — You (right)
                </p>
                <p className="text-muted-foreground">AI controls left paddle</p>
              </>
            )}
            <p className="text-xs">First to {WIN_SCORE} wins</p>
          </div>

          <Button size="lg" onClick={startGame} className="glow-primary">
            <Play className="w-4 h-4 mr-1" fill="currentColor" />
            Start Game
          </Button>
        </div>

        {/* Leaderboard preview */}
        <LeaderboardPreview gameId={game.id} />
      </div>
    );
  }

  // ── Render: Playing / Game Over ──────────────────────────────────
  return (
    <div className="px-6 py-8 md:px-10 max-w-4xl mx-auto">
      <Link
        to="/hub"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to library
      </Link>

      {/* Scoreboard bar */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{p1Label}</p>
            <p className="text-2xl font-bold tabular-nums text-muted-foreground">{opponentScore}</p>
          </div>
          <span className="text-muted-foreground text-lg">—</span>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{p2Label}</p>
            <p className="text-2xl font-bold tabular-nums" style={{ color: accent }}>
              {playerScore}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {screen === "playing" && (
            <Button variant="outline" size="sm" onClick={() => setScreen("menu")}>
              Quit
            </Button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="rounded-2xl border border-border overflow-hidden relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full h-auto bg-gray-900"
          style={{ touchAction: "none" }}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />

        {/* Game Over overlay */}
        {screen === "over" && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm">
            <div className="text-center p-8 rounded-2xl bg-card border border-border max-w-sm w-full mx-4">
              <p className="text-sm text-muted-foreground mb-1">Game Over</p>
              <h2
                className="text-3xl font-extrabold mb-2"
                style={{ color: winner === "player" ? accent : "#ef4444" }}
              >
                {winner === "player" ? "You Win!" : `${p1Label} Wins!`}
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                {playerScore} – {opponentScore}
              </p>

              <div className="flex flex-col gap-3">
                <Button onClick={startGame} className="glow-primary">
                  Play Again
                </Button>
                {winner === "player" && (
                  <Button
                    variant="outline"
                    onClick={() => scoreMutation.mutate()}
                    disabled={scoreMutation.isPending || scoreSubmitted}
                  >
                    <Trophy className="w-4 h-4 mr-1" />
                    {scoreSubmitted
                      ? "Score Submitted"
                      : scoreMutation.isPending
                        ? "Submitting..."
                        : `Submit Score (${gs.current.hits} hits)`}
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setScreen("menu")}>
                  Main Menu
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile hint */}
      <p className="text-center text-xs text-muted-foreground mt-3 md:hidden">
        Touch and drag on the game area to move your paddle
      </p>

      {/* Leaderboard */}
      <div className="mt-8">
        <LeaderboardPreview gameId={game.id} />
      </div>
    </div>
  );
}

// ── Leaderboard preview ──────────────────────────────────────────

function LeaderboardPreview({ gameId }: { gameId: string }) {
  const { data: leaderboard, isLoading } = useQuery(
    queryOptions({
      queryKey: ["game-leaderboard", gameId],
      queryFn: () => (gameId ? getGameLeaderboard({ data: { gameId } }) : Promise.resolve([])),
      enabled: !!gameId,
      staleTime: 10_000,
    }),
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-4 h-4 text-primary" />
        <h2 className="font-semibold">Top players</h2>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading scores...</p>
      ) : leaderboard && leaderboard.length > 0 ? (
        <ol className="space-y-2">
          {leaderboard.map((row, i) => (
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
