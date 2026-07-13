import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Trophy, Play } from "lucide-react";
import { useState } from "react";
import { getGameBySlug } from "@/lib/games.functions";
import { getGameLeaderboard } from "@/lib/scores.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const gameQuery = (slug: string) =>
  queryOptions({
    queryKey: ["game", slug],
    queryFn: () => getGameBySlug({ data: { slug } }),
  });

const leaderboardQuery = (gameId: string | undefined) =>
  queryOptions({
    queryKey: ["game-leaderboard", gameId],
    queryFn: () => (gameId ? getGameLeaderboard({ data: { gameId } }) : Promise.resolve([])),
    enabled: !!gameId,
  });

export const Route = createFileRoute("/_authenticated/hub/games/$slug")({
  loader: async ({ context, params }) => {
    const game = await context.queryClient.ensureQueryData(gameQuery(params.slug));
    if (!game) throw notFound();
    return game;
  },
  component: GameDetail,
  errorComponent: ({ error }) => (
    <div className="p-10 text-center text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="p-10 text-center text-muted-foreground">
      Game not found.{" "}
      <Link to="/hub" className="text-primary underline">
        Back to library
      </Link>
    </div>
  ),
});

function GameDetail() {
  const { slug } = Route.useParams();
  const { data: game } = useSuspenseQuery(gameQuery(slug));
  const { data: leaderboard } = useSuspenseQuery(leaderboardQuery(game?.id));
  const [playing, setPlaying] = useState(false);
  const [score, setScore] = useState(0);

  if (!game) return null;
  const accent = game.accent_color ?? "#a78bfa";

  return (
    <div className="px-6 py-8 md:px-10 max-w-6xl mx-auto">
      <Link
        to="/hub"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to library
      </Link>

      <div
        className="rounded-3xl border border-border p-8 md:p-12 mb-8 relative overflow-hidden"
        style={{
          background: `radial-gradient(circle at 20% 20%, ${accent}30, transparent 60%), linear-gradient(135deg, ${accent}20, oklch(0.22 0.035 268))`,
        }}
      >
        <Badge variant="secondary" className="mb-4">
          {game.category}
        </Badge>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{game.title}</h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">{game.description}</p>
        <Button
          size="lg"
          className="mt-6 glow-primary"
          onClick={() => {
            setPlaying(true);
            setScore(0);
          }}
        >
          <Play className="w-4 h-4 mr-1" fill="currentColor" />
          Launch game
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="rounded-2xl border border-border bg-card aspect-video grid place-items-center relative overflow-hidden">
            {!playing ? (
              <div className="text-center p-8">
                <div className="text-6xl mb-3">🎮</div>
                <p className="text-muted-foreground">
                  Press <span className="text-foreground">Launch game</span> to start playing.
                </p>
              </div>
            ) : (
              <PlaceholderGameSurface
                accent={accent}
                score={score}
                onScoreChange={setScore}
                onFinish={() => {
                  setPlaying(false);
                }}
              />
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Top players</h2>
          </div>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scores yet — be the first!</p>
          ) : (
            <ol className="space-y-2">
              {leaderboard.map((row, i) => (
                <li key={row.id} className="flex items-center justify-between text-sm py-1">
                  <span className="flex items-center gap-3">
                    <span className="w-5 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                    <span className="truncate">{row.username ?? "anon"}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{row.score.toLocaleString()}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

function PlaceholderGameSurface({
  accent,
  score,
  onScoreChange,
  onFinish,
}: {
  accent: string;
  score: number;
  onScoreChange: (n: number) => void;
  onFinish: () => void;
}) {
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 flex items-center justify-center p-8 relative">
        <button
          className="w-24 h-24 rounded-full transition-transform hover:scale-110 active:scale-95"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${accent}, ${accent}80)`,
            boxShadow: `0 0 40px ${accent}80`,
          }}
          onClick={() => onScoreChange(score + 10)}
        >
          <span className="text-2xl font-bold text-white">TAP</span>
        </button>
      </div>
      <div className="border-t border-border p-3 flex items-center justify-between bg-background/40">
        <span className="text-sm">
          Score: <span className="font-bold tabular-nums text-primary">{score}</span>
        </span>
        <Button size="sm" variant="outline" onClick={onFinish}>
          Submit score
        </Button>
      </div>
    </div>
  );
}
