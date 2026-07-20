import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Trophy,
  Send,
  Lightbulb,
  Flag,
  Share2,
  MoreVertical,
  HelpCircle,
  BarChart3,
  Gift,
  ChevronDown,
  Sparkles,
} from "lucide-react";
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
import { getSimilarity, getDailyWord, getHintWords, isValidWord } from "@/lib/semantic/similarity";

// ── Game state types ──────────────────────────────────────────

interface Guess {
  word: string;
  similarity: number; // 0–100
}

interface GameState {
  targetWord: string;
  guesses: Guess[];
  isComplete: boolean;
  gaveUp: boolean;
  hintsUsed: number;
  scoreSubmitted: boolean;
}

// ── Similarity display ────────────────────────────────────────

type Heat = "perfect" | "burning" | "hot" | "warm" | "cool" | "cold";

function getHeat(sim: number): Heat {
  if (sim === 100) return "perfect";
  if (sim >= 70) return "burning";
  if (sim >= 50) return "hot";
  if (sim >= 30) return "warm";
  if (sim >= 15) return "cool";
  return "cold";
}

const HEAT_COLORS: Record<Heat, string> = {
  perfect: "#22c55e",
  burning: "#16a34a",
  hot: "#f59e0b",
  warm: "#f97316",
  cool: "#6366f1",
  cold: "#4b5563",
};

const HEAT_LABELS: Record<Heat, string> = {
  perfect: "Perfect!",
  burning: "🔥 Burning hot",
  hot: "Hot",
  warm: "Warm",
  cool: "Cool",
  cold: "Cold",
};

// ── Persistence ───────────────────────────────────────────────

const LS_KEY = "semanticGameV2";

function loadState(target: string): GameState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    if (s.targetWord !== target) return null;
    return { ...s, scoreSubmitted: s.scoreSubmitted ?? false };
  } catch {
    return null;
  }
}

function saveState(s: GameState) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

// ── Route ─────────────────────────────────────────────────────

const SEMANTIC_LOCAL: Game = LOCAL_GAMES.find((g) => g.slug === "semantic")!.data;

const gameQuery = queryOptions({
  queryKey: ["game", "semantic"],
  queryFn: () => getGameBySlug({ data: { slug: "semantic" } }),
  staleTime: 60_000,
});

export const Route = createFileRoute("/_authenticated/hub/games/semantic")({
  loader: async ({ context }) => {
    const game = await context.queryClient.ensureQueryData(gameQuery);
    return { game: game ?? SEMANTIC_LOCAL };
  },
  component: SemanticGame,
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

// ── Main component ────────────────────────────────────────────

function SemanticGame() {
  const { game } = Route.useLoaderData();
  const queryClient = useQueryClient();
  const submitScoreFn = useServerFn(submitScore);
  const accent = game.accent_color ?? "#22c55e";

  const dailyWord = getDailyWord();
  const [gs, setGs] = useState<GameState>(
    () =>
      loadState(dailyWord) ?? {
        targetWord: dailyWord,
        guesses: [],
        isComplete: false,
        gaveUp: false,
        hintsUsed: 0,
        scoreSubmitted: false,
      },
  );

  // Re-init state if the day changed since last visit
  useEffect(() => {
    if (gs.targetWord !== dailyWord) {
      setGs({
        targetWord: dailyWord,
        guesses: [],
        isComplete: false,
        gaveUp: false,
        hintsUsed: 0,
        scoreSubmitted: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyWord]);

  useEffect(() => {
    saveState(gs);
  }, [gs]);

  // ── Actions ──────────────────────────────────────────────────

  const handleGuess = (word: string) => {
    if (gs.isComplete) return;
    const lower = word.toLowerCase().trim();
    const sim = getSimilarity(lower, gs.targetWord);
    const won = lower === gs.targetWord;
    const newGuesses = [{ word: lower, similarity: sim }, ...gs.guesses];

    setGs((p) => ({ ...p, guesses: newGuesses, isComplete: won }));

    if (won) {
      toast.success(
        `You found "${gs.targetWord}" in ${newGuesses.length} ${newGuesses.length === 1 ? "guess" : "guesses"}!`,
      );
    } else if (sim >= 70) {
      toast(`🔥 ${sim}% — burning hot!`);
    } else if (sim >= 50) {
      toast(`Hot! ${sim}% — on the right track.`);
    }
  };

  const handleHint = () => {
    const guessed = new Set(gs.guesses.map((g) => g.word));
    const hints = getHintWords(gs.targetWord, 5, guessed);
    const available = hints.filter((h) => !guessed.has(h));
    if (gs.hintsUsed >= 3 || available.length === 0) {
      toast.error("No hints left.");
      return;
    }
    const hint = available[gs.hintsUsed];
    setGs((p) => ({ ...p, hintsUsed: p.hintsUsed + 1 }));
    toast(`Try: "${hint}"`);
  };

  const handleGiveUp = () => {
    setGs((p) => ({ ...p, isComplete: true, gaveUp: true }));
  };

  const handleShare = () => {
    const text = gs.gaveUp
      ? `I gave up on Semantic #${dailyWordIndex()} — the word was "${gs.targetWord}".`
      : `I found Semantic #${dailyWordIndex()} "${gs.targetWord}" in ${gs.guesses.length} ${gs.guesses.length === 1 ? "guess" : "guesses"}!`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Copied!");
    }
  };

  // ── Score ────────────────────────────────────────────────────

  const scoreMutation = useMutation({
    mutationFn: async () => {
      if (!game || gs.gaveUp || gs.scoreSubmitted) return;
      const s = Math.max(1, 101 - gs.guesses.length);
      await submitScoreFn({
        data: {
          gameId: game.id,
          score: s,
          metadata: { guessCount: gs.guesses.length, hints: gs.hintsUsed },
        },
      });
    },
    onSuccess: () => {
      setGs((p) => ({ ...p, scoreSubmitted: true }));
      toast.success("Score submitted!");
      queryClient.invalidateQueries({ queryKey: ["game-leaderboard", game.id] });
      queryClient.invalidateQueries({ queryKey: ["global-leaderboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-[1340px] px-5 py-7 md:px-10">
      <Link
        to="/hub"
        className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-[#667085] transition-colors hover:text-[#10204A]"
      >
        <ArrowLeft className="w-4 h-4" /> Back to library
      </Link>

      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#10204A]">{game.title}</h1>
          <p className="mt-1 text-sm font-medium text-[#667085]">
            #{dailyWordIndex()} · {gs.guesses.length}{" "}
            {gs.guesses.length === 1 ? "guess" : "guesses"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Help dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="h-10 rounded-xl border-[#E2E7F0] px-4 text-[#10204A] shadow-sm"
                size="sm"
              >
                <HelpCircle className="h-4 w-4" />
                <span>How to play</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>How to Play</DialogTitle>
                <DialogDescription className="space-y-3 pt-4">
                  <p>
                    Guess the secret word. Each guess gets a <strong>similarity score</strong>{" "}
                    (0–100%).
                  </p>
                  <p>
                    Words that share spelling patterns (prefixes, suffixes, letter sequences) score
                    higher:
                  </p>
                  {(
                    [
                      { h: "perfect", label: "100% — Exact match", c: HEAT_COLORS.perfect },
                      { h: "burning", label: "70–99% — Burning hot", c: HEAT_COLORS.burning },
                      { h: "hot", label: "50–69% — Hot", c: HEAT_COLORS.hot },
                      { h: "warm", label: "30–49% — Warm", c: HEAT_COLORS.warm },
                      { h: "cool", label: "15–29% — Cool", c: HEAT_COLORS.cool },
                      { h: "cold", label: "0–14% — Cold", c: HEAT_COLORS.cold },
                    ] as const
                  ).map((item) => (
                    <p key={item.h} className="text-sm flex items-center gap-2">
                      <span
                        className="inline-block w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: item.c }}
                      />{" "}
                      {item.label}
                    </p>
                  ))}
                  <p className="text-xs text-muted-foreground pt-2">
                    A new word every day. Fewer guesses = higher leaderboard score.
                  </p>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-10 w-10 rounded-xl border-[#E2E7F0] shadow-sm"
                size="icon"
                disabled={gs.isComplete}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleHint} disabled={gs.hintsUsed >= 3}>
                <Lightbulb className="mr-2 h-4 w-4" /> Hint ({3 - gs.hintsUsed} left)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleGiveUp} className="text-destructive">
                <Flag className="mr-2 h-4 w-4" /> Give Up
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_400px]">
        <main>
          {/* Active game */}
          {!gs.isComplete ? (
            <>
              <GuessInput onSubmit={handleGuess} />
              <HowToPlayCard />
              <GuessTable guesses={gs.guesses} />
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
                      The word was <span className="font-bold">"{gs.targetWord}"</span>. Better luck
                      tomorrow!
                    </CardDescription>
                  </>
                ) : (
                  <>
                    <div
                      className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
                      style={{ backgroundColor: HEAT_COLORS.perfect }}
                    >
                      <Trophy className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl">Congratulations!</CardTitle>
                    <CardDescription>
                      You found <span className="font-bold">"{gs.targetWord}"</span> in{" "}
                      {gs.guesses.length} {gs.guesses.length === 1 ? "guess" : "guesses"}!
                    </CardDescription>
                  </>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={handleShare} className="w-full" size="lg">
                  <Share2 className="mr-2 h-4 w-4" /> Share
                </Button>
                {!gs.gaveUp && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => scoreMutation.mutate()}
                    disabled={scoreMutation.isPending || gs.scoreSubmitted}
                  >
                    <Trophy className="mr-2 h-4 w-4" />
                    {scoreMutation.isPending
                      ? "Submitting..."
                      : gs.scoreSubmitted
                        ? "Score Submitted"
                        : "Submit Score"}
                  </Button>
                )}
                <p className="text-center text-sm text-muted-foreground">
                  New word available tomorrow!
                </p>
              </CardContent>
            </Card>
          )}
        </main>
        <aside className="space-y-5">
          <TemperatureCard guesses={gs.guesses} />
          <LeaderboardPreview gameId={game.id} />
          <DailyChallengeCard />
        </aside>
      </div>
    </div>
  );
}

// ── GuessInput ────────────────────────────────────────────────

function GuessInput({ onSubmit }: { onSubmit: (w: string) => void }) {
  const [v, setV] = useState("");

  const handle = (e: FormEvent) => {
    e.preventDefault();
    const t = v.trim();
    if (!isValidWord(t)) {
      toast.error("Enter a single word (letters only, 2+ characters).");
      return;
    }
    onSubmit(t);
    setV("");
  };

  return (
    <form onSubmit={handle} className="flex w-full gap-2">
      <Input
        type="text"
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="Type a word and press enter or send"
        className="h-[54px] flex-1 rounded-2xl border-[#B7B8F2] px-5 text-base shadow-[0_0_0_1px_rgba(139,92,246,0.08)] placeholder:text-[#7D88A7] focus-visible:ring-[#8B5CF6]"
        autoFocus
        autoComplete="off"
        spellCheck={false}
      />
      <Button
        type="submit"
        disabled={!v.trim()}
        size="icon"
        className="h-[54px] w-[58px] shrink-0 rounded-2xl bg-[#F35AA5] shadow-[0_8px_16px_rgba(243,90,165,0.25)] hover:bg-[#E84696]"
      >
        <Send className="h-5 w-5" />
      </Button>
    </form>
  );
}

function HowToPlayCard() {
  return (
    <section className="mt-6 flex min-h-[148px] items-center gap-6 rounded-2xl border border-[#E7EAF2] bg-[linear-gradient(105deg,#FFFFFF_20%,#FFFDF9)] p-6 shadow-[0_5px_12px_rgba(16,32,74,0.07)]">
      <div className="relative hidden h-24 w-48 shrink-0 items-center justify-center sm:flex">
        <div className="absolute h-20 w-20 rotate-45 rounded-2xl bg-[#F8F0FF]" />
        <div className="relative text-6xl">🔎</div>
        <Sparkles className="absolute left-1 top-3 h-6 w-6 fill-[#FFC940] text-[#FFC940]" />
        <Sparkles className="absolute bottom-2 right-3 h-5 w-5 fill-[#FF9CCE] text-[#FF9CCE]" />
      </div>
      <div>
        <h2 className="text-lg font-extrabold text-[#10204A]">Find the secret word!</h2>
        <p className="mt-1 text-sm leading-6 text-[#53617F]">
          Type any word you think is related to the secret word.
          <br />
          The closer your word, the higher it will rank.
          <br />
          Can you find the perfect match?
        </p>
      </div>
    </section>
  );
}

function GuessTable({ guesses }: { guesses: Guess[] }) {
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[#E7EAF2] bg-white p-4 shadow-[0_5px_12px_rgba(16,32,74,0.07)]">
      <h2 className="mb-3 flex items-center gap-2 text-base font-extrabold text-[#10204A]">
        <BarChart3 className="h-5 w-5 text-[#8B5CF6]" /> How close are you?
      </h2>
      <div className="overflow-hidden rounded-xl border border-[#E7EAF2]">
        <div className="grid grid-cols-[1.25fr_1.45fr_.65fr] border-b border-[#E7EAF2] bg-[#FBFCFE] px-5 py-3 text-xs font-medium uppercase tracking-wide text-[#687492]">
          <span>Your guesses</span>
          <span>Similarity</span>
          <span>Heat</span>
        </div>
        {guesses.length ? (
          <ScrollArea className="max-h-[330px]">
            <div>
              {guesses.map((guess, i) => (
                <GuessRow key={`${guess.word}-${i}`} guess={guess} />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="px-5 py-10 text-center text-sm text-[#687492]">
            Enter a word above to make your first guess.
          </div>
        )}
      </div>
      <button className="mx-auto mt-3 flex items-center gap-2 text-xs font-semibold text-[#53617F] hover:text-[#10204A]">
        Show more <ChevronDown className="h-4 w-4" />
      </button>
    </section>
  );
}

function GuessRow({ guess }: { guess: Guess }) {
  const heat = getHeat(guess.similarity);
  const color = HEAT_COLORS[heat];
  return (
    <div className="grid grid-cols-[1.25fr_1.45fr_.65fr] items-center border-b border-[#E7EAF2] px-5 py-3 last:border-0">
      <span className="font-semibold text-[#25355F]">{guess.word}</span>
      <div className="flex items-center gap-3">
        <span className="w-8 text-sm text-[#5F6D8E]">{guess.similarity}%</span>
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EEF0F5]">
          <span
            className="block h-full rounded-full"
            style={{ width: `${guess.similarity}%`, backgroundColor: color }}
          />
        </span>
      </div>
      <span className="ml-5 flex items-center gap-2 text-sm text-[#35425F]">
        <i className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        {HEAT_LABELS[heat].replace("🔥 ", "")}
      </span>
    </div>
  );
}

function TemperatureCard({ guesses }: { guesses: Guess[] }) {
  const best = guesses.reduce((max, item) => Math.max(max, item.similarity), 0);
  const heat = getHeat(best);
  const label =
    best >= 70
      ? "Burning hot"
      : best >= 50
        ? "Hot"
        : best >= 30
          ? "Warm"
          : best >= 15
            ? "Cool"
            : "Very cold";
  return (
    <section className="rounded-2xl border border-[#E1E6EF] bg-white p-5 shadow-[0_5px_12px_rgba(16,32,74,0.06)]">
      <h2 className="flex items-center gap-2 font-extrabold text-[#24355F]">
        <span className="text-xl">♨</span> Current temperature
      </h2>
      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="text-2xl font-extrabold text-[#FF6D1A]">{label}</p>
          <p className="mt-1 text-sm text-[#62708D]">
            {best ? "You're getting closer!" : "Make your first guess!"}
          </p>
        </div>
        <div className="text-6xl">{best >= 50 ? "🌞" : "🌤️"}</div>
      </div>
      <div className="mt-5 h-2 rounded-full bg-[linear-gradient(90deg,#3288ED_0%,#10C6BD_27%,#FFD231_53%,#FF991C_76%,#FF5B38_100%)]">
        <span className="relative block h-full" style={{ width: `${Math.max(3, best)}%` }}>
          <i className="absolute -right-2 -top-1.5 h-5 w-5 rounded-full border-4 border-white bg-[#FFB700] shadow" />
        </span>
      </div>
      <div className="mt-4 flex justify-between text-sm text-[#62708D]">
        <span>Very cold</span>
        <span>Hot</span>
      </div>
    </section>
  );
}

function DailyChallengeCard() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#F1DDEB] bg-[linear-gradient(120deg,#FFFDF9,#FFF4FB)] p-5">
      <Gift className="absolute bottom-3 right-6 h-16 w-16 text-[#7D73F5]" strokeWidth={1.4} />
      <h2 className="flex items-center gap-2 font-extrabold text-[#24355F]">
        <span className="text-2xl">⭐</span> Daily challenge
      </h2>
      <p className="mt-3 max-w-[250px] text-sm leading-6 text-[#596786]">
        Play today's challenge and earn
        <br />
        <strong className="text-[#2F3D61]">50 points!</strong>
      </p>
    </section>
  );
}

// ── Leaderboard ───────────────────────────────────────────────

function LeaderboardPreview({ gameId }: { gameId: string }) {
  const { data: lb, isLoading } = useQuery(
    queryOptions({
      queryKey: ["game-leaderboard", gameId],
      queryFn: () => (gameId ? getGameLeaderboard({ data: { gameId } }) : Promise.resolve([])),
      enabled: !!gameId,
      staleTime: 10_000,
    }),
  );

  return (
    <section className="rounded-2xl border border-[#E1E6EF] bg-white p-5 shadow-[0_5px_12px_rgba(16,32,74,0.06)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-[#FFB800]" />
          <h2 className="font-extrabold text-[#24355F]">Top players</h2>
        </div>
        <Link
          to="/hub/leaderboard"
          className="text-sm font-semibold text-[#397AF4] hover:underline"
        >
          View all
        </Link>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : lb && lb.length > 0 ? (
        <ol className="space-y-2">
          {lb.map((row, i) => (
            <li key={row.id} className="flex items-center justify-between py-1 text-sm">
              <span className="flex items-center gap-3">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs tabular-nums ${i === 0 ? "bg-[#FFE49B] text-[#B77A00] font-bold" : i === 1 ? "bg-[#E9EDF5] text-[#687492] font-semibold" : i === 2 ? "bg-[#FFD7B8] text-[#A95A10] font-semibold" : "bg-[#F4F5F8] text-[#687492]"}`}
                >
                  {i + 1}
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#7BA9FF] bg-[#FFF0C9] text-xs">
                  🧑
                </span>
                <span className="max-w-36 truncate font-medium text-[#35425F]">
                  {row.username ?? "anon"}
                </span>
              </span>
              <span className="font-medium tabular-nums text-[#667492]">
                {row.score.toLocaleString()}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">No scores yet — be the first!</p>
      )}
    </section>
  );
}

// ── Helpers ──────────────────────────────────────────────────

function dailyWordIndex(): number {
  const now = new Date();
  const utc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor(utc / 86400000);
}
