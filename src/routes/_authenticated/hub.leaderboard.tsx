import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { getGlobalLeaderboard } from "@/lib/scores.functions";

const leaderboardQuery = queryOptions({
  queryKey: ["global-leaderboard"],
  queryFn: () => getGlobalLeaderboard(),
});

export const Route = createFileRoute("/_authenticated/hub/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — GameHub" },
      { name: "description", content: "Top scores across every GameHub title." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(leaderboardQuery),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { data: rows } = useSuspenseQuery(leaderboardQuery);
  return (
    <div className="px-6 py-8 md:px-10 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Trophy className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Global leaderboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Top 25 scores across every game
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No scores yet. Be the first to make the board.
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {rows.map((row, i) => (
            <Link
              key={row.id}
              to="/hub/games/$slug"
              params={{ slug: row.game_slug }}
              className="flex items-center gap-4 px-5 py-3 border-b border-border/60 last:border-0 hover:bg-accent/30 transition"
            >
              <span
                className={`w-8 text-center font-bold tabular-nums ${
                  i < 3 ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {row.username ?? "anonymous"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {row.game_title}
                </p>
              </div>
              <span className="font-bold tabular-nums text-lg">
                {row.score.toLocaleString()}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
