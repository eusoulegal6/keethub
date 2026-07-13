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
    <div className="px-6 py-8 md:px-10 max-w-2xl mx-auto">
      <Link
        to="/hub"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to library
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">{game.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            #{dailyWordIndex()} · {gs.guesses.length}{" "}
            {gs.guesses.length === 1 ? "guess" : "guesses"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Help dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <HelpCircle className="h-4 w-4" />
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
              <Button variant="outline" size="icon" disabled={gs.isComplete}>
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

      {/* Active game */}
      {!gs.isComplete ? (
        <>
          <GuessInput onSubmit={handleGuess} />
          <div className="mt-6">
            {gs.guesses.length === 0 ? (
              <div className="text-center text-muted-foreground py-16">
                <p className="text-lg">Enter a word above to make your first guess.</p>
                <p className="text-sm mt-2">Words that look similar to the target score higher.</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[50vh]">
                <div className="space-y-2">
                  {gs.guesses.map((guess, i) => {
                    const heat = getHeat(guess.similarity);
                    const color = HEAT_COLORS[heat];
                    return (
                      <div
                        key={`${guess.word}-${i}`}
                        className="relative overflow-hidden rounded-lg border bg-card p-4 transition-colors"
                      >
                        <div
                          className="absolute inset-0 opacity-[0.12]"
                          style={{
                            background: `linear-gradient(to right, ${color} ${guess.similarity}%, transparent ${guess.similarity}%)`,
                          }}
                        />
                        <div className="relative flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-lg">{guess.word}</p>
                            <p className="text-xs text-muted-foreground">{HEAT_LABELS[heat]}</p>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-xl tabular-nums" style={{ color }}>
                              {guess.similarity}%
                            </div>
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

      {/* Leaderboard */}
      <div className="mt-8">
        <LeaderboardPreview gameId={game.id} />
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
    <form onSubmit={handle} className="flex gap-2 w-full">
      <Input
        type="text"
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="Type a word..."
        className="flex-1 text-base"
        autoFocus
        autoComplete="off"
        spellCheck={false}
      />
      <Button type="submit" disabled={!v.trim()} size="icon" className="shrink-0">
        <Send className="h-4 w-4" />
      </Button>
    </form>
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
                  className={`w-5 text-xs tabular-nums ${i === 0 ? "text-yellow-400 font-bold" : i === 1 ? "text-gray-300 font-semibold" : i === 2 ? "text-amber-600 font-semibold" : "text-muted-foreground"}`}
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

// ── Helpers ──────────────────────────────────────────────────

function dailyWordIndex(): number {
  const now = new Date();
  const utc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor(utc / 86400000);
}
