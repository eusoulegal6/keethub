import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { listGames, type Game } from "@/lib/games.functions";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useHubStore } from "@/stores/hub-store";
import { useMemo } from "react";
import { LOCAL_GAMES, PORTED_ROUTES } from "@/lib/local-games";

const gamesQuery = queryOptions({
  queryKey: ["games"],
  queryFn: () => listGames(),
});

export const Route = createFileRoute("/_authenticated/hub/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(gamesQuery),
  component: LibraryPage,
});

function mergeGames(serverGames: Game[]): Game[] {
  const seen = new Set(serverGames.map((g) => g.slug));
  const merged = [...serverGames];
  for (const local of LOCAL_GAMES) {
    if (!seen.has(local.slug)) {
      merged.push(local.data);
    }
  }
  return merged;
}

function LibraryPage() {
  const { data: serverGames } = useSuspenseQuery(gamesQuery);
  const games = useMemo(() => mergeGames(serverGames), [serverGames]);
  const search = useHubStore((s) => s.search);
  const setSearch = useHubStore((s) => s.setSearch);
  const activeCategory = useHubStore((s) => s.activeCategory);
  const setCategory = useHubStore((s) => s.setCategory);

  const categories = useMemo(
    () => Array.from(new Set(games.map((g) => g.category))).sort(),
    [games],
  );

  const filtered = games.filter((g) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      g.title.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q);
    const matchesCategory = !activeCategory || g.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="px-6 py-8 md:px-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Your library
          </h1>
          <p className="text-muted-foreground mt-1">
            {games.length} games ready to play
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search games..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setCategory(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
            !activeCategory
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
              activeCategory === c
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No games match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}

function GameCard({ game }: { game: Game }) {
  const accent = game.accent_color ?? "#a78bfa";
  const route = PORTED_ROUTES[game.slug];
  return (
    <Link
      {...(route
        ? { to: route as any }
        : { to: "/hub/games/$slug" as const, params: { slug: game.slug } })}
      className="group rounded-2xl overflow-hidden border border-border bg-game-card hover:border-primary/50 transition-all hover:-translate-y-1"
    >
      <div
        className="aspect-video relative flex items-end p-4"
        style={{
          background: `radial-gradient(circle at 30% 20%, ${accent}40, transparent 60%), linear-gradient(135deg, ${accent}30, oklch(0.22 0.035 268))`,
        }}
      >
        <div
          className="absolute top-3 right-3 w-2 h-2 rounded-full"
          style={{ backgroundColor: accent, boxShadow: `0 0 12px ${accent}` }}
        />
        <Badge
          variant="secondary"
          className="bg-background/60 backdrop-blur border-border/50"
        >
          {game.category}
        </Badge>
      </div>
      <div className="p-4">
        <h3 className="font-semibold group-hover:text-primary transition-colors">
          {game.title}
        </h3>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
          {game.description}
        </p>
      </div>
    </Link>
  );
}
