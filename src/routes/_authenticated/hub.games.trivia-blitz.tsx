import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { getGameBySlug, type Game } from "@/lib/games.functions";
import { submitScore } from "@/lib/scores.functions";
import { LOCAL_GAMES } from "@/lib/local-games";
import { useTriviaStore } from "@/games/trivia-blitz/store";
import GameSetup from "@/games/trivia-blitz/components/GameSetup";
import QuestionIntro from "@/games/trivia-blitz/components/QuestionIntro";
import QuestionView from "@/games/trivia-blitz/components/QuestionView";
import AnswerReveal from "@/games/trivia-blitz/components/AnswerReveal";
import Scoreboard from "@/games/trivia-blitz/components/Scoreboard";
import FinalPodium from "@/games/trivia-blitz/components/FinalPodium";

const TRIVIA_LOCAL: Game = LOCAL_GAMES.find((g) => g.slug === "trivia-blitz")!.data;

const triviaGameQuery = queryOptions({
  queryKey: ["game", "trivia-blitz"],
  queryFn: () => getGameBySlug({ data: { slug: "trivia-blitz" } }),
  staleTime: 60_000,
});

export const Route = createFileRoute("/_authenticated/hub/games/trivia-blitz")({
  ssr: false,
  loader: async ({ context }) => {
    const game = await context.queryClient.ensureQueryData(triviaGameQuery);
    return { game: game ?? TRIVIA_LOCAL };
  },
  component: TriviaBlitzRoute,
});

function TriviaBlitzRoute() {
  const { game } = Route.useLoaderData();
  const queryClient = useQueryClient();
  const submitScoreFn = useServerFn(submitScore);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const phase = useTriviaStore((s) => s.phase);
  const score = useTriviaStore((s) => s.score);
  const reset = useTriviaStore((s) => s.reset);

  const handlePlayAgain = useCallback(() => {
    reset();
    setSubmitted(false);
  }, [reset]);

  const handleSubmitScore = useCallback(async () => {
    if (!game || submitted) return;
    setSubmitting(true);
    try {
      await submitScoreFn({
        data: {
          gameId: game.id,
          score,
          metadata: {
            categoryId: useTriviaStore.getState().categoryId,
            correctCount: useTriviaStore.getState().answers.filter((a) => a.isCorrect).length,
            totalQuestions: useTriviaStore.getState().questions.length,
          },
        },
      });
      setSubmitted(true);
      toast.success("Score submitted!");
      queryClient.invalidateQueries({ queryKey: ["game-leaderboard", game.id] });
      queryClient.invalidateQueries({ queryKey: ["global-leaderboard"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit score");
    } finally {
      setSubmitting(false);
    }
  }, [game, score, submitted, submitScoreFn, queryClient]);

  const renderPhase = () => {
    switch (phase) {
      case "setup":
        return <GameSetup />;
      case "question-intro":
        return <QuestionIntro />;
      case "question":
        return <QuestionView />;
      case "answer-reveal":
        return <AnswerReveal />;
      case "scoring":
        return <Scoreboard />;
      case "podium":
        return (
          <FinalPodium
            onPlayAgain={handlePlayAgain}
            onSubmitScore={handleSubmitScore}
            submitting={submitting}
            submitted={submitted}
          />
        );
      default:
        return <GameSetup />;
    }
  };

  return <div className="min-h-[calc(100vh-4rem)]">{renderPhase()}</div>;
}
