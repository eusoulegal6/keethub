import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Brain,
  Gamepad2,
  Palette,
  Search,
  Sparkles,
  Swords,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { Suspense, useMemo, useState } from "react";

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
  const activeCategory = useHubStore((state) => state.activeCategory);
  const sortMode = useHubStore((state) => state.sortMode);
  const recentlyPlayed = useHubStore((state) => state.recentlyPlayed);
  const trackGameVisit = useHubStore((state) => state.trackGameVisit);
  const setSearch = useHubStore((state) => state.setSearch);
  const setCategory = useHubStore((state) => state.setCategory);
  const setSortMode = useHubStore((state) => state.setSortMode);
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

  const clearFilters = () => {
    setSearch("");
    setCategory(null);
    setSortMode("default");
  };

  return (
    <div className="min-h-[calc(100vh-5.5rem)] overflow-x-clip bg-[#FFFCF7] text-[#10204A]">
      <div className="relative mx-auto w-full max-w-[1600px] px-5 pb-10 pt-10 sm:px-8 lg:px-16 lg:pt-11">
        <section className="relative z-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
                Where do you want to learn today?
              </h1>
              <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-[#667085] sm:text-lg">
                Every world groups games by the skill they build.
              </p>
            </div>
            <div className="flex w-full shrink-0 flex-col items-end gap-6 lg:w-[400px]">
              <button
                type="button"
                onClick={surpriseMe}
                disabled={!games.length}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#FF3B8D] px-11 text-sm font-black tracking-wide text-white shadow-[0_14px_28px_rgba(255,59,141,0.22)] transition hover:-translate-y-0.5 hover:bg-[#e9327d] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3B8D] focus-visible:ring-offset-4"
              >
                <Sparkles className="h-4 w-4" /> SURPRISE ME ★
              </button>
              <MascotCallout />
            </div>
          </div>
        </section>

        {isExploring ? (
          <Suspense fallback={<GameGridSkeleton />}>
            <DiscoveryResults games={filtered} totalGames={games.length} onClear={clearFilters} />
          </Suspense>
        ) : (
          <LearningWorldMap
            games={games}
            recentCount={recentGames.length}
            onViewWorld={(world) => setCategory(world)}
          />
        )}
      </div>
    </div>
  );
}

function MascotCallout() {
  return (
    <div className="relative flex w-full max-w-[400px] items-center gap-4 rounded-[1.4rem] border border-[#DFE5EE] bg-white px-5 py-4 shadow-[0_14px_30px_rgba(16,32,74,0.08)]">
      <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[#ECFBFA]">
        <img
          src="/primkeet-logo.png"
          alt=""
          className="h-9 w-14 max-w-none object-contain object-left"
        />
      </span>
      <p className="text-base font-black leading-5">
        Pick a world,
        <br />
        <span className="text-sm font-bold text-[#667085]">then choose your game!</span>
      </p>
      <span className="absolute -bottom-2 left-10 h-4 w-4 rotate-45 border-b border-r border-[#DFE5EE] bg-white" />
    </div>
  );
}

function LearningWorldMap({
  games,
  recentCount,
  onViewWorld,
}: {
  games: Game[];
  recentCount: number;
  onViewWorld: (category: string) => void;
}) {
  const used = new Set<string>();
  const featured = WORLDS.map((world) => {
    const picks = selectFeaturedGames(world, games, used);
    picks.forEach((game) => used.add(game.slug));
    return [world, picks] as const;
  });
  return (
    <section className="relative mt-5 lg:mt-2">
      <div className="relative grid gap-5 md:grid-cols-2 xl:block xl:h-[660px]">
        <JourneyPath />
        {featured.map(([world, worldGames]) => (
          <LearningWorldPanel
            key={world.key}
            world={world}
            games={worldGames}
            onViewWorld={onViewWorld}
          />
        ))}
        <WeeklyProgress recentCount={recentCount} />
      </div>
    </section>
  );
}

function JourneyPath() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-0 hidden h-full w-full xl:block"
      aria-hidden="true"
      viewBox="0 0 1500 660"
      preserveAspectRatio="none"
    >
      <path
        d="M260 175 C390 215 410 325 560 300 S825 120 925 190 S1130 390 1270 430"
        fill="none"
        stroke="#BBC7D8"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="1 24"
        opacity=".85"
      />
    </svg>
  );
}

function WeeklyProgress({ recentCount }: { recentCount: number }) {
  if (!recentCount) return null;
  return (
    <aside className="hidden xl:block xl:absolute xl:bottom-0 xl:left-0 xl:z-10 xl:w-[322px] rounded-[1.4rem] border border-[#DFE5EE] bg-white px-6 py-4 shadow-[0_10px_24px_rgba(16,32,74,0.06)]">
      <p className="text-xs font-black uppercase tracking-wide text-[#667085]">This week</p>
      <p className="mt-1 text-base font-black">
        {recentCount} {recentCount === 1 ? "game" : "games"} played
      </p>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#E8EDF5]">
        <span
          className="block h-full rounded-full bg-[#08AAA7]"
          style={{ width: `${Math.min(recentCount * 25, 100)}%` }}
        />
      </div>
    </aside>
  );
}

function LearningWorldPanel({
  world,
  games,
  onViewWorld,
}: {
  world: LearningWorld;
  games: Game[];
  onViewWorld: (category: string) => void;
}) {
  const Icon = world.icon;
  const position = {
    word: "xl:left-0 xl:top-[20px]",
    creative: "xl:left-[27%] xl:top-[85px]",
    quiz: "xl:left-[54%] xl:top-[18px]",
    strategy: "xl:right-[3%] xl:top-[325px]",
  }[world.key];
  return (
    <section
      className={cn(
        "relative z-10 overflow-hidden rounded-[2rem] p-5 shadow-[0_18px_42px_rgba(16,32,74,0.10)] sm:p-6 xl:absolute xl:w-[350px]",
        position,
      )}
      style={{ backgroundColor: world.soft }}
    >
      <div className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-white/45" />
      <div className="relative">
        <header className="flex items-center gap-3">
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-white"
            style={{ backgroundColor: world.accent }}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h2
              className="text-base font-black uppercase tracking-tight"
              style={{ color: world.accent }}
            >
              {world.title}
            </h2>
            <p className="mt-0.5 text-sm font-bold text-[#667085]" title={world.description}>
              {world.key === "word"
                ? "Vocabulary & meaning"
                : world.key === "creative"
                  ? "Drawing & speaking"
                  : world.key === "quiz"
                    ? "Recall & quick thinking"
                    : "Logic & planning"}
            </p>
          </div>
        </header>
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none]">
          {games.length ? (
            games.map((game) => (
              <div className="w-[calc(50%-6px)] min-w-[132px] flex-1" key={game.slug}>
                <WorldGameCard game={game} world={world} />
              </div>
            ))
          ) : (
            <div className="w-full rounded-2xl border border-dashed border-white bg-white/55 p-6 text-sm font-bold text-[#667085]">
              New games soon.
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => onViewWorld(world.key)}
          className="mt-3 text-xs font-black underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10204A]"
        >
          View all
        </button>
      </div>
    </section>
  );
}

function selectFeaturedGames(world: LearningWorld, games: Game[], used: Set<string>) {
  const priorities: Record<WorldKey, string[]> = {
    word: ["semanteek", "semantic", "keetdash", "balderdash"],
    creative: ["scribble-scrattle", "paint-and-guess", "ping-pong"],
    quiz: ["trivia-blitz"],
    strategy: ["chess-blitz", "chess"],
  };
  const ordered = [
    ...(priorities[world.key]
      .map((slug) => games.find((game) => normalizeKey(game.slug) === slug))
      .filter(Boolean) as Game[]),
    ...games.filter((game) => getWorldForGame(game) === world.key),
  ];
  return ordered
    .filter(
      (game, index, all) =>
        !used.has(game.slug) &&
        all.findIndex((candidate) => candidate.slug === game.slug) === index,
    )
    .slice(0, 2);
}

function WorldGameCard({ game, world }: { game: Game; world: LearningWorld }) {
  const [imageFailed, setImageFailed] = useState(false);
  const display = getGameDisplay(game);
  const artwork = getArtworkForGame(game);
  const route = PORTED_ROUTES[game.slug];
  const trackGameVisit = useHubStore((state) => state.trackGameVisit);
  const content = (
    <article className="group flex h-full min-h-[164px] flex-col overflow-hidden rounded-[1.25rem] border border-white bg-white p-3 shadow-[0_8px_18px_rgba(16,32,74,0.06)] transition hover:-translate-y-1 hover:shadow-[0_16px_30px_rgba(16,32,74,0.14)]">
      <div
        className="grid h-[82px] w-full shrink-0 place-items-center overflow-hidden rounded-xl"
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
      <div className="flex min-w-0 flex-1 flex-col px-1 pt-2">
        <h3 className="min-h-9 overflow-hidden text-sm font-black leading-[1.1]">
          {display.title}
        </h3>
        <div className="mt-auto pt-2">
          <span
            className="flex h-7 w-full items-center justify-center rounded-full text-[10px] font-black text-white"
            style={{ backgroundColor: world.accent }}
          >
            PLAY
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

function DiscoveryResults({
  games,
  totalGames,
  onClear,
}: {
  games: Game[];
  totalGames: number;
  onClear: () => void;
}) {
  return (
    <section className="relative mt-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black">Explore all worlds</h2>
          <p className="mt-1 text-sm font-semibold text-[#667085]">
            {games.length} of {totalGames} games match your choices.
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-full border border-[#D7DEEA] bg-white px-4 py-2 text-sm font-black text-[#52617E] transition hover:border-[#08AAA7] hover:text-[#087E7D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08AAA7]"
        >
          Clear filters
        </button>
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

function ArtworkFallback({
  display,
  compact = false,
}: {
  display: GameDisplay;
  compact?: boolean;
}) {
  const Icon = display.icon;
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden p-2">
      <span className="absolute -left-3 -top-3 h-11 w-11 rounded-full bg-white/70" />
      <span className="absolute -bottom-5 right-2 h-14 w-14 rounded-full bg-white/50" />
      <Icon
        className={cn("relative text-current", compact ? "h-7 w-7" : "h-10 w-10")}
        style={{ color: display.accent }}
      />
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
      (!category ||
        game.category === category ||
        (WORLDS.some((world) => world.key === category) && getWorldForGame(game) === category))
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
