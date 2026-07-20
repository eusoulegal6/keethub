import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import {
  ArrowDownUp,
  ArrowRight,
  BookOpen,
  Brain,
  Clock3,
  Gamepad2,
  Palette,
  Search,
  Sparkles,
  Swords,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { Suspense, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { listGames, type Game } from "@/lib/games.functions";
import { LOCAL_GAMES, PORTED_ROUTES } from "@/lib/local-games";
import { cn } from "@/lib/utils";
import { useHubStore } from "@/stores/hub-store";

const gamesQuery = queryOptions({ queryKey: ["games"], queryFn: () => listGames() });

type WorldKey = "word" | "creative" | "quiz" | "strategy";
type GameTheme = {
  accent: string;
  soft: string;
  focus: string;
  icon: LucideIcon;
  displayTitle?: string;
};
type GameDisplay = GameTheme & { title: string; description: string; category: string };
type LearningWorld = {
  key: WorldKey;
  title: string;
  description: string;
  accent: string;
  soft: string;
  icon: LucideIcon;
};

const WORLDS: LearningWorld[] = [
  {
    key: "word",
    title: "Word World",
    description: "Vocabulary, meanings and clever clues",
    accent: "#08AAA7",
    soft: "#E8F8F6",
    icon: BookOpen,
  },
  {
    key: "creative",
    title: "Creative Cove",
    description: "Drawing, describing and speaking together",
    accent: "#43A8EA",
    soft: "#EAF6FE",
    icon: Palette,
  },
  {
    key: "quiz",
    title: "Quiz City",
    description: "Quick recall, facts and classroom competition",
    accent: "#FF3B8D",
    soft: "#FFF0F6",
    icon: Trophy,
  },
  {
    key: "strategy",
    title: "Strategy Peak",
    description: "Planning, logic and problem solving",
    accent: "#FF9418",
    soft: "#FFF6D9",
    icon: Swords,
  },
];

const gameArtworkBySlug: Record<string, string> = {
  "chess-blitz": "/games/chess-blitz-card.png",
  chess: "/games/chess-blitz-card.png",
  "scribble-scrattle": "/games/scribble-scrattle-card.png",
  "paint-and-guess": "/games/scribble-scrattle-card.png",
  "trivia-blitz": "/games/trivia-blitz-card.png",
  keetdash: "/games/keetdash-card.png",
  balderdash: "/games/keetdash-card.png",
};

const gameThemeBySlug: Record<string, GameTheme> = {
  semanteek: {
    displayTitle: "Semanteek",
    accent: "#08AAA7",
    soft: "#ECFBFA",
    focus: "Vocabulary clues",
    icon: BookOpen,
  },
  semantic: {
    displayTitle: "Semanteek",
    accent: "#08AAA7",
    soft: "#ECFBFA",
    focus: "Vocabulary clues",
    icon: BookOpen,
  },
  "chess-blitz": {
    displayTitle: "Chess Blitz",
    accent: "#FF9418",
    soft: "#FFF8D9",
    focus: "Strategy practice",
    icon: Swords,
  },
  chess: {
    displayTitle: "Chess Blitz",
    accent: "#FF9418",
    soft: "#FFF8D9",
    focus: "Strategy practice",
    icon: Swords,
  },
  "scribble-scrattle": {
    displayTitle: "Scribble Scrattle",
    accent: "#43A8EA",
    soft: "#ECFBFA",
    focus: "Draw and describe",
    icon: Palette,
  },
  "paint-and-guess": {
    displayTitle: "Scribble Scrattle",
    accent: "#43A8EA",
    soft: "#ECFBFA",
    focus: "Draw and describe",
    icon: Palette,
  },
  "trivia-blitz": {
    displayTitle: "Trivia Blitz",
    accent: "#FF3B8D",
    soft: "#FFF1F6",
    focus: "Quick answers",
    icon: Trophy,
  },
  keetdash: {
    displayTitle: "Keetdash",
    accent: "#762A87",
    soft: "#F7F1FF",
    focus: "Meaning and bluffing",
    icon: Brain,
  },
  balderdash: {
    displayTitle: "Keetdash",
    accent: "#762A87",
    soft: "#F7F1FF",
    focus: "Meaning and bluffing",
    icon: Brain,
  },
};
const categoryThemes: Record<string, GameTheme> = {
  arcade: { accent: "#43A8EA", soft: "#ECFBFA", focus: "Quick play", icon: Gamepad2 },
  party: { accent: "#43A8EA", soft: "#ECFBFA", focus: "Play together", icon: Palette },
  puzzle: { accent: "#08AAA7", soft: "#ECFBFA", focus: "Word skills", icon: BookOpen },
  strategy: { accent: "#FF9418", soft: "#FFF8D9", focus: "Strategy practice", icon: Swords },
  trivia: { accent: "#FF3B8D", soft: "#FFF1F6", focus: "Quick recall", icon: Trophy },
};
const defaultTheme: GameTheme = {
  accent: "#08AAA7",
  soft: "#ECFBFA",
  focus: "English practice",
  icon: Gamepad2,
};

export const Route = createFileRoute("/_authenticated/hub/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(gamesQuery),
  component: LearningWorldsPage,
});

function mergeGames(serverGames: Game[]): Game[] {
  const seen = new Set(serverGames.map((game) => game.slug));
  return [
    ...serverGames,
    ...LOCAL_GAMES.filter((game) => !seen.has(game.slug)).map((game) => game.data),
  ];
}

/** Assigns every game exactly once, while allowing new server games to join a sensible world. */
function getWorldForGame(game: Game): WorldKey {
  const slug = normalizeKey(game.slug);
  if (["semanteek", "semantic", "keetdash", "balderdash"].includes(slug)) return "word";
  if (["scribble-scrattle", "paint-and-guess", "ping-pong"].includes(slug)) return "creative";
  if (["trivia-blitz"].includes(slug)) return "quiz";
  if (["chess-blitz", "chess"].includes(slug)) return "strategy";
  const category = normalizeKey(game.category);
  if (["trivia", "quiz"].includes(category)) return "quiz";
  if (["strategy", "logic"].includes(category)) return "strategy";
  if (["party", "arcade", "creative", "drawing"].includes(category)) return "creative";
  return "word";
}

function LearningWorldsPage() {
  const { data: serverGames } = useSuspenseQuery(gamesQuery);
  const navigate = useNavigate();
  const games = useMemo(() => mergeGames(serverGames), [serverGames]);
  const search = useHubStore((state) => state.search);
  const setSearch = useHubStore((state) => state.setSearch);
  const activeCategory = useHubStore((state) => state.activeCategory);
  const setCategory = useHubStore((state) => state.setCategory);
  const sortMode = useHubStore((state) => state.sortMode);
  const setSortMode = useHubStore((state) => state.setSortMode);
  const recentlyPlayed = useHubStore((state) => state.recentlyPlayed);
  const trackGameVisit = useHubStore((state) => state.trackGameVisit);
  const categories = useMemo(
    () => Array.from(new Set(games.map((game) => game.category))).sort(),
    [games],
  );
  const recentGames = useMemo(
    () =>
      recentlyPlayed
        .map((slug) => games.find((game) => game.slug === slug))
        .filter(Boolean)
        .slice(0, 4) as Game[],
    [recentlyPlayed, games],
  );
  const filtered = useMemo(
    () => filterGames(games, search, activeCategory, sortMode, recentlyPlayed),
    [games, search, activeCategory, sortMode, recentlyPlayed],
  );
  const isExploring = Boolean(search.trim() || activeCategory || sortMode !== "default");

  const surpriseMe = () => {
    if (!games.length) return;
    const game = games[Math.floor(Math.random() * games.length)];
    trackGameVisit(game.slug);
    const route = PORTED_ROUTES[game.slug];
    if (route) navigate({ to: route as never });
    else navigate({ to: "/hub/games/$slug", params: { slug: game.slug } as never });
  };
  const resetFilters = () => {
    setSearch("");
    setCategory(null);
    setSortMode("default");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] overflow-hidden bg-[#FFFCF7] text-[#10204A]">
      <div className="relative mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
        <div className="pointer-events-none absolute -left-28 top-20 h-72 w-72 rounded-full bg-[#E8F8F6] opacity-80" />
        <div className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-[#FFF0F6] opacity-70" />
        <section className="relative max-w-4xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-extrabold text-[#087E7D] shadow-[0_10px_28px_rgba(16,32,74,0.08)]">
            <Sparkles className="h-4 w-4 text-[#FF9418]" />
            Learn through play
          </span>
          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
                Where do you want to learn today?
              </h1>
              <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-[#667085] sm:text-lg">
                Every world groups games by the skill they build.
              </p>
            </div>
            <button
              type="button"
              onClick={surpriseMe}
              disabled={!games.length}
              className="inline-flex h-13 shrink-0 items-center justify-center gap-2 rounded-full bg-[#FF3B8D] px-6 text-sm font-black tracking-wide text-white shadow-[0_14px_28px_rgba(255,59,141,0.28)] transition hover:-translate-y-0.5 hover:bg-[#e9327d] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3B8D] focus-visible:ring-offset-4"
            >
              <Sparkles className="h-4 w-4" />
              SURPRISE ME
            </button>
          </div>
        </section>

        <section className="relative mt-8 rounded-[2rem] border border-white bg-white/80 p-4 shadow-[0_18px_45px_rgba(16,32,74,0.08)] backdrop-blur sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#667085]" />
              <Input
                placeholder="Search games, skills or categories"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-12 rounded-full border-[#D7DEEA] bg-white pl-12 text-base font-semibold shadow-sm focus-visible:ring-[#08AAA7]"
              />
            </div>
            <label className="relative">
              <span className="sr-only">Sort games</span>
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as typeof sortMode)}
                className="h-12 w-full appearance-none rounded-full border border-[#D7DEEA] bg-white py-0 pl-4 pr-10 text-sm font-bold text-[#10204A] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08AAA7] lg:w-48"
              >
                <option value="default">World order</option>
                <option value="name-asc">Name A–Z</option>
                <option value="name-desc">Name Z–A</option>
                <option value="recent">Recently played</option>
              </select>
              <ArrowDownUp className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085]" />
            </label>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            <CategoryButton active={!activeCategory} onClick={() => setCategory(null)}>
              All skills
            </CategoryButton>
            {categories.map((category) => (
              <CategoryButton
                key={category}
                active={activeCategory === category}
                onClick={() => setCategory(category)}
              >
                {formatCategory(category)}
              </CategoryButton>
            ))}
            {isExploring && (
              <button
                type="button"
                onClick={resetFilters}
                className="shrink-0 px-3 text-sm font-extrabold text-[#087E7D] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08AAA7]"
              >
                Reset
              </button>
            )}
          </div>
        </section>

        {recentGames.length > 0 && (
          <section className="relative mt-8">
            <div className="mb-3 flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-[#FF9418]" />
              <h2 className="text-xl font-black">Continue playing</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {recentGames.map((game) => (
                <RecentGameCard key={game.slug} game={game} />
              ))}
            </div>
          </section>
        )}

        {isExploring ? (
          <Suspense fallback={<GameGridSkeleton />}>
            <DiscoveryResults games={filtered} totalGames={games.length} />
          </Suspense>
        ) : (
          <Suspense fallback={<GameGridSkeleton />}>
            <section className="relative mt-10 space-y-8">
              {WORLDS.map((world, index) => (
                <LearningWorldSection
                  key={world.key}
                  world={world}
                  games={games.filter((game) => getWorldForGame(game) === world.key)}
                  offset={index % 2 === 1}
                />
              ))}
            </section>
          </Suspense>
        )}
      </div>
    </div>
  );
}

function LearningWorldSection({
  world,
  games,
  offset,
}: {
  world: LearningWorld;
  games: Game[];
  offset: boolean;
}) {
  const Icon = world.icon;
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[2rem] p-5 shadow-[0_18px_42px_rgba(16,32,74,0.10)] sm:p-7 lg:p-9",
        offset && "xl:ml-12",
      )}
      style={{ backgroundColor: world.soft }}
    >
      <div className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-white/45" />
      <div className="relative grid gap-7 xl:grid-cols-[260px_minmax(0,1fr)] xl:items-start">
        <header>
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-sm">
            <Icon className="h-7 w-7" style={{ color: world.accent }} />
          </span>
          <h2 className="mt-5 text-3xl font-black tracking-tight">{world.title}</h2>
          <p className="mt-2 text-sm font-bold leading-6 text-[#52617E]">{world.description}</p>
        </header>
        <div>
          {games.length ? (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {games.map((game) => (
                <WorldGameCard key={game.slug} game={game} world={world} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white bg-white/55 p-8 text-sm font-bold text-[#667085]">
              New games will appear in this world soon.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function WorldGameCard({ game, world }: { game: Game; world: LearningWorld }) {
  const [imageFailed, setImageFailed] = useState(false);
  const display = getGameDisplay(game);
  const artwork = getArtworkForGame(game);
  const route = PORTED_ROUTES[game.slug];
  const trackGameVisit = useHubStore((state) => state.trackGameVisit);
  const content = (
    <article className="group flex h-full min-h-48 overflow-hidden rounded-2xl border border-white bg-white p-3 shadow-[0_10px_22px_rgba(16,32,74,0.08)] transition hover:-translate-y-1 hover:shadow-[0_16px_30px_rgba(16,32,74,0.14)]">
      <div
        className="grid w-24 shrink-0 place-items-center overflow-hidden rounded-xl sm:w-28"
        style={{ backgroundColor: display.soft }}
      >
        {artwork && !imageFailed ? (
          <img
            src={artwork}
            alt={`${display.title} artwork`}
            loading="lazy"
            className="h-full w-full object-contain"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <ArtworkFallback display={display} compact />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col px-3 py-1">
        <div
          className="flex items-center gap-1.5 text-xs font-extrabold"
          style={{ color: world.accent }}
        >
          <display.icon className="h-3.5 w-3.5" />
          {display.focus}
        </div>
        <h3 className="mt-2 truncate text-lg font-black">{display.title}</h3>
        <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-[#667085]">
          {display.description}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="text-xs font-bold text-[#667085]">{display.category}</span>
          <span
            className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-xs font-black text-white"
            style={{ backgroundColor: world.accent }}
          >
            PLAY <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </article>
  );
  const props = {
    onClick: () => trackGameVisit(game.slug),
    className:
      "block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10204A] focus-visible:ring-offset-4",
  };
  return route ? (
    <Link to={route as never} {...props}>
      {content}
    </Link>
  ) : (
    <Link to="/hub/games/$slug" params={{ slug: game.slug } as never} {...props}>
      {content}
    </Link>
  );
}

function DiscoveryResults({ games, totalGames }: { games: Game[]; totalGames: number }) {
  return (
    <section className="relative mt-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black">Explore all worlds</h2>
          <p className="mt-1 text-sm font-semibold text-[#667085]">
            {games.length} of {totalGames} games match your choices.
          </p>
        </div>
      </div>
      {games.length ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {games.map((game) => (
            <WorldGameCard
              key={game.slug}
              game={game}
              world={WORLDS.find((world) => world.key === getWorldForGame(game))!}
            />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-[2rem] border border-dashed border-[#C8D2E2] bg-white px-6 py-16 text-center">
          <Search className="mx-auto h-9 w-9 text-[#08AAA7]" />
          <h3 className="mt-4 text-xl font-black">No games found</h3>
          <p className="mt-2 text-sm font-semibold text-[#667085]">
            Try another search or reset your filters.
          </p>
        </div>
      )}
    </section>
  );
}

function RecentGameCard({ game }: { game: Game }) {
  const display = getGameDisplay(game);
  const artwork = getArtworkForGame(game);
  const route = PORTED_ROUTES[game.slug];
  const trackGameVisit = useHubStore((state) => state.trackGameVisit);
  const content = (
    <div className="group flex items-center gap-3 rounded-2xl border border-white bg-white p-3 shadow-[0_8px_18px_rgba(16,32,74,0.07)] transition hover:-translate-y-0.5">
      <span
        className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl"
        style={{ backgroundColor: display.soft }}
      >
        {artwork ? (
          <img src={artwork} alt="" loading="lazy" className="h-full w-full object-contain" />
        ) : (
          <display.icon className="h-5 w-5" style={{ color: display.accent }} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black">{display.title}</span>
        <span className="block truncate text-xs font-bold text-[#667085]">{display.focus}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-[#667085] transition group-hover:translate-x-0.5" />
    </div>
  );
  const props = {
    onClick: () => trackGameVisit(game.slug),
    className:
      "block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08AAA7] focus-visible:ring-offset-4",
  };
  return route ? (
    <Link to={route as never} {...props}>
      {content}
    </Link>
  ) : (
    <Link to="/hub/games/$slug" params={{ slug: game.slug } as never} {...props}>
      {content}
    </Link>
  );
}

function CategoryButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-10 shrink-0 rounded-full border px-4 text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08AAA7] focus-visible:ring-offset-2",
        active
          ? "border-[#10204A] bg-[#10204A] text-white"
          : "border-[#E8ECF4] bg-white text-[#667085] hover:border-[#08AAA7] hover:text-[#087E7D]",
      )}
    >
      {children}
    </button>
  );
}
function ArtworkFallback({
  display,
  compact = false,
}: {
  display: GameDisplay;
  compact?: boolean;
}) {
  const Icon = display.icon;
  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center">
      <Icon
        className={cn("text-current", compact ? "h-7 w-7" : "h-10 w-10")}
        style={{ color: display.accent }}
      />
      <span
        className={cn(
          "mt-2 font-black leading-tight text-[#10204A]",
          compact ? "text-xs" : "text-base",
        )}
      >
        {display.title}
      </span>
    </div>
  );
}
function GameCardSkeleton() {
  return (
    <div className="flex min-h-48 overflow-hidden rounded-2xl bg-white p-3">
      <Skeleton className="h-40 w-28 rounded-xl" />
      <div className="flex flex-1 flex-col gap-3 p-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

function GameGridSkeleton() {
  return (
    <div className="mt-10 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <GameCardSkeleton key={index} />
      ))}
    </div>
  );
}
function getArtworkForGame(game: Game) {
  return gameArtworkBySlug[normalizeKey(game.slug)] ?? game.thumbnail_url ?? null;
}
function getGameDisplay(game: Game): GameDisplay {
  const theme =
    gameThemeBySlug[normalizeKey(game.slug)] ??
    categoryThemes[normalizeKey(game.category)] ??
    defaultTheme;
  return {
    ...theme,
    title: theme.displayTitle ?? game.title,
    description: game.description,
    category: formatCategory(game.category),
  };
}
function filterGames(
  games: Game[],
  search: string,
  category: string | null,
  sortMode: string,
  recentlyPlayed: string[],
) {
  const query = search.trim().toLowerCase();
  const result = games.filter((game) => {
    const display = getGameDisplay(game);
    return (
      (!query ||
        [game.title, display.title, game.description, game.category, display.focus].some((value) =>
          value.toLowerCase().includes(query),
        )) &&
      (!category || game.category === category)
    );
  });
  if (sortMode === "name-asc")
    return [...result].sort((a, b) =>
      getGameDisplay(a).title.localeCompare(getGameDisplay(b).title),
    );
  if (sortMode === "name-desc")
    return [...result].sort((a, b) =>
      getGameDisplay(b).title.localeCompare(getGameDisplay(a).title),
    );
  if (sortMode === "recent")
    return [...result].sort((a, b) => {
      const ai = recentlyPlayed.indexOf(a.slug);
      const bi = recentlyPlayed.indexOf(b.slug);
      return (ai < 0 ? Infinity : ai) - (bi < 0 ? Infinity : bi);
    });
  return result;
}
function normalizeKey(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}
function formatCategory(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
