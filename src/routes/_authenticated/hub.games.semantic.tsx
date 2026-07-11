import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Trophy, Send, Lightbulb, Flag, HelpCircle, Share2, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, FormEvent } from "react";
import { getGameBySlug, type Game } from "@/lib/games.functions";
import { LOCAL_GAMES } from "@/lib/local-games";
import { getGameLeaderboard, submitScore } from "@/lib/scores.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

// ── Word database ────────────────────────────────────────────────

interface RankGroup {
  similar: string[];
  rank: number;
}

const WORD_DB: Record<string, RankGroup[]> = {
  ocean: [
    { rank: 1, similar: ["sea", "water", "wave", "beach", "tide", "marine", "aquatic", "coast", "shore", "deep"] },
    { rank: 2, similar: ["lake", "river", "pond", "stream", "bay", "gulf", "inlet", "harbor", "lagoon"] },
    { rank: 3, similar: ["blue", "wet", "salt", "fish", "whale", "dolphin", "coral", "reef", "island"] },
    { rank: 4, similar: ["vast", "liquid", "surface", "depth", "horizon", "current"] },
  ],
  mountain: [
    { rank: 1, similar: ["peak", "summit", "hill", "cliff", "slope", "alpine", "elevation", "ridge", "volcano"] },
    { rank: 2, similar: ["rock", "stone", "high", "tall", "climb", "steep", "range", "valley"] },
    { rank: 3, similar: ["snow", "ice", "cold", "nature", "landscape", "terrain", "wilderness"] },
  ],
  forest: [
    { rank: 1, similar: ["tree", "woods", "woodland", "jungle", "grove", "timber", "pine", "oak"] },
    { rank: 2, similar: ["green", "leaf", "branch", "trunk", "nature", "wild", "vegetation"] },
    { rank: 3, similar: ["park", "garden", "plant", "grass", "bush", "shrub", "fauna"] },
  ],
  sunset: [
    { rank: 1, similar: ["dusk", "twilight", "evening", "dawn", "sunrise", "horizon", "sky"] },
    { rank: 2, similar: ["orange", "red", "pink", "golden", "light", "glow", "color"] },
    { rank: 3, similar: ["beautiful", "romantic", "peaceful", "calm", "serene", "view"] },
  ],
  thunder: [
    { rank: 1, similar: ["lightning", "storm", "rain", "weather", "clouds", "bolt", "flash"] },
    { rank: 2, similar: ["loud", "noise", "sound", "rumble", "boom", "crash", "roar"] },
    { rank: 3, similar: ["dark", "sky", "power", "nature", "force", "energy"] },
  ],
};

const WORDS = Object.keys(WORD_DB);

// ── Game logic ────────────────────────────────────────────────────

interface Guess {
  word: string;
  rank: number;
}

interface GameState {
  targetWord: string;
  guesses: Guess[];
  isComplete: boolean;
  gaveUp: boolean;
  hintsUsed: number;
}

function getDailyWord(): string {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
      86400000,
  );
  return WORDS[dayOfYear % WORDS.length];
}

function getSimilarityRank(target: string, guess: string): number {
  const guessLower = guess.toLowerCase().trim();
  if (guessLower === target.toLowerCase()) return 1;
  const groups = WORD_DB[target.toLowerCase()];
  if (!groups) return 9999;
  for (const g of groups) {
    if (g.similar.includes(guessLower)) return g.rank;
  }
  return Math.floor(Math.random() * 8000) + 2000;
}

type SimCategory = "perfect" | "excellent" | "great" | "good" | "medium" | "poor" | "cold";

function getSimCategory(rank: number): SimCategory {
  if (rank === 1) return "perfect";
  if (rank <= 10) return "excellent";
  if (rank <= 50) return "great";
  if (rank <= 100) return "good";
  if (rank <= 500) return "medium";
  if (rank <= 1000) return "poor";
  return "cold";
}

const SIM_COLORS: Record<SimCategory, string> = {
  perfect: "oklch(0.72 0.18 152)",      // success green
  excellent: "oklch(0.68 0.20 148)",
  great: "oklch(0.72 0.22 295)",         // primary purple
  good: "oklch(0.78 0.17 75)",           // warning amber
  medium: "oklch(0.65 0.24 40)",         // orange
  poor: "oklch(0.55 0.15 30)",           // red-ish
  cold: "oklch(0.35 0.04 265)",          // muted
};

function getSimPercentage(rank: number): number {
  if (rank === 1) return 100;
  if (rank <= 10) return 90;
  if (rank <= 50) return 80;
  if (rank <= 100) return 70;
  if (rank <= 500) return 50;
  if (rank <= 1000) return 30;
  return Math.max(5, 100 - Math.log10(rank) * 15);
}

function getHint(target: string, usedHints: number): string | null {
  const groups = WORD_DB[target.toLowerCase()];
  if (!groups || usedHints >= 3) return null;
  const rank1 = groups[0]?.similar ?? [];
  return usedHints < rank1.length ? rank1[usedHints] : null;
}

const LS_KEY = "semanticGameV1";

function loadGameState(): GameState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as GameState;
    if (state.targetWord !== getDailyWord()) return null;
    return state;
  } catch {
    return null;
  }
}

function saveGameState(state: GameState): void {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

// ── Route ─────────────────────────────────────────────────────────

const SEMANTIC_LOCAL: Game = LOCAL_GAMES.find(g => g.slug === "semantic")!.data;

const gameQuery = queryOptions({
  queryKey: ["game", "semantic"],
  queryFn: () => getGameBySlug({ data: { slug: "semantic" } }),
  staleTime: 60_000,
});

export const Route = createFileRoute("/_authenticated/hub/games/semantic")({
  loader: async ({ context }) => {
    const game = await context.queryClient.ensureQueryData(gameQuery);
    // Fall back to local definition if Supabase doesn't have the row yet
    return { game: game ?? SEMANTIC_LOCAL };
  },
  component: SemanticGame,
  notFoundComponent: () => (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Game not found</h2>
        <p className="mt-2 text-muted-foreground">Semantic hasn't been set up yet.</p>
        <Link to="/hub" className="mt-4 inline-block text-primary underline">
          Back to library
        </Link>
      </div>
    </div>
  ),
});

// ── Component ─────────────────────────────────────────────────────

function SemanticGame() {
  const { game } = Route.useLoaderData();
  const queryClient = useQueryClient();
  const submitScoreFn = useServerFn(submitScore);
  const accent = game.accent_color ?? "#22c55e";

  const [gs, setGs] = useState<GameState>(() => {
    const loaded = loadGameState();
    if (loaded) return loaded;
    return {
      targetWord: getDailyWord(),
      guesses: [],
      isComplete: false,
      gaveUp: false,
      hintsUsed: 0,
    };
  });

  useEffect(() => {
    saveGameState(gs);
  }, [gs]);

  // ── Actions ──────────────────────────────────────────────────────
  const handleGuess = (word: string) => {
    if (gs.isComplete) return;
    const rank = getSimilarityRank(gs.targetWord, word);
    const newGuesses = [{ word, rank }, ...gs.guesses];
    const won = rank === 1;

    setGs((prev) => ({ ...prev, guesses: newGuesses, isComplete: won }));

    if (won) {
      toast.success(`You found "${gs.targetWord}" in ${newGuesses.length} guesses!`);
    } else if (rank <= 10) {
      toast(`Getting hot! Rank ${rank} — very close!`);
    } else if (rank <= 50) {
      toast(`Good guess! Rank ${rank} — you're on the right track.`);
    }
  };

  const handleHint = () => {
    if (gs.hintsUsed >= 3) {
      toast.error("No hints left — you've used all 3.");
      return;
    }
    const hint = getHint(gs.targetWord, gs.hintsUsed);
    if (hint) {
      setGs((prev) => ({ ...prev, hintsUsed: prev.hintsUsed + 1 }));
      toast(`Try: "${hint}"`);
    }
  };

  const handleGiveUp = () => {
    setGs((prev) => ({ ...prev, isComplete: true, gaveUp: true }));
  };

  const handleShare = () => {
    const text = gs.gaveUp
      ? `I gave up on today's Semantic word: "${gs.targetWord}"`
      : `I found "${gs.targetWord}" in ${gs.guesses.length} guesses!`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    }
  };

  // ── Score submission ─────────────────────────────────────────────
  const scoreMutation = useMutation({
    mutationFn: async () => {
      if (!game || gs.gaveUp) return;
      // Higher is better: 1 guess = 100, 20 guesses = 81
      const s = Math.max(1, 101 - gs.guesses.length);
      await submitScoreFn({
        data: { gameId: game.id, score: s, metadata: { guessCount: gs.guesses.length, hintsUsed: gs.hintsUsed } },
      });
    },
    onSuccess: () => {
      toast.success("Score submitted!");
      queryClient.invalidateQueries({ queryKey: ["game-leaderboard", game.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Help dialog trigger ─────────────────────────────────────────
  const helpTrigger = (
    <DialogTrigger asChild>
      <Button variant="outline" size="icon">
        <HelpCircle className="h-4 w-4" />
      </Button>
    </DialogTrigger>
  );

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="px-6 py-8 md:px-10 max-w-2xl mx-auto">
      <Link
        to="/hub"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to library
      </Link>

      {/* Header bar */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">{game.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {gs.guesses.length} {gs.guesses.length === 1 ? "guess" : "guesses"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Dialog>
            {helpTrigger}
            <DialogContent>
              <DialogHeader>
                <DialogTitle>How to Play</DialogTitle>
                <DialogDescription className="space-y-3 pt-4">
                  <p>Guess the secret word by entering <strong>semantically similar</strong> words.</p>
                  <p>Each guess receives a <strong>rank</strong> — the closer to #1, the more similar:</p>
                  {[
                    { cat: "perfect", label: "Rank 1 — Perfect match", color: SIM_COLORS.perfect },
                    { cat: "excellent", label: "Rank 2–10 — Excellent", color: SIM_COLORS.excellent },
                    { cat: "great", label: "Rank 11–50 — Great", color: SIM_COLORS.great },
                    { cat: "good", label: "Rank 51–100 — Good", color: SIM_COLORS.good },
                    { cat: "cold", label: "Rank 100+ — Cold", color: SIM_COLORS.cold },
                  ].map((item) => (
                    <p key={item.cat} className="text-sm flex items-center gap-2">
                      <span
                        className="inline-block w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      {item.label}
                    </p>
                  ))}
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" disabled={gs.isComplete}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleHint} disabled={gs.hintsUsed >= 3}>
                <Lightbulb className="mr-2 h-4 w-4" />
                Get Hint ({3 - gs.hintsUsed} left)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleGiveUp} className="text-destructive">
                <Flag className="mr-2 h-4 w-4" />
                Give Up
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Game area */}
      {!gs.isComplete ? (
        <>
          <GuessInput onSubmit={handleGuess} />

          <div className="mt-6">
            {gs.guesses.length === 0 ? (
              <div className="text-center text-muted-foreground py-16">
                <p className="text-lg">No guesses yet. Type a word above!</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[50vh]">
                <div className="space-y-2">
                  {gs.guesses.map((guess, i) => {
                    const cat = getSimCategory(guess.rank);
                    const pct = getSimPercentage(guess.rank);
                    const color = SIM_COLORS[cat];
                    return (
                      <div
                        key={`${guess.word}-${i}`}
                        className="guess-item relative overflow-hidden rounded-lg border bg-card p-4"
                      >
                        <div
                          className="absolute inset-0 opacity-10 transition-all"
                          style={{
                            background: `linear-gradient(to right, ${color} ${pct}%, transparent ${pct}%)`,
                          }}
                        />
                        <div className="relative flex items-center justify-between">
                          <p className="font-semibold text-lg capitalize">{guess.word}</p>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">Rank</div>
                              <div className="font-bold text-lg tabular-nums">#{guess.rank}</div>
                            </div>
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: color }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </>
      ) : (
        /* Game over */
        <Card className="w-full border-2">
          <CardHeader className="text-center">
            {gs.gaveUp ? (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Flag className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle className="text-2xl">Game Over</CardTitle>
                <CardDescription>
                  The word was <span className="font-bold capitalize">"{gs.targetWord}"</span>. Better luck tomorrow!
                </CardDescription>
              </>
            ) : (
              <>
                <div
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
                  style={{ backgroundColor: SIM_COLORS.perfect }}
                >
                  <Trophy className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl">Congratulations!</CardTitle>
                <CardDescription>
                  You found <span className="font-bold capitalize">"{gs.targetWord}"</span> in{" "}
                  {gs.guesses.length} {gs.guesses.length === 1 ? "guess" : "guesses"}!
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={handleShare} className="w-full" size="lg">
              <Share2 className="mr-2 h-4 w-4" />
              Share Result
            </Button>
            {!gs.gaveUp && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => scoreMutation.mutate()}
                disabled={scoreMutation.isPending}
              >
                <Trophy className="mr-2 h-4 w-4" />
                {scoreMutation.isPending ? "Submitting..." : "Submit Score"}
              </Button>
            )}
            <p className="text-center text-sm text-muted-foreground">
              New word available tomorrow!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      <div className="mt-8">
        <LeaderboardPreview gameId={game.id} />
      </div>
    </div>
  );
}

// ── Guess input ────────────────────────────────────────────────────

function GuessInput({ onSubmit }: { onSubmit: (word: string) => void }) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim().toLowerCase();
    if (trimmed) {
      onSubmit(trimmed);
      setValue("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full">
      <Input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type a word..."
        className="flex-1 text-base"
        autoFocus
        autoComplete="off"
        spellCheck={false}
      />
      <Button type="submit" disabled={!value.trim()} size="icon" className="shrink-0">
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}

// ── Leaderboard preview ───────────────────────────────────────────

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
