import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { getGameBySlug, type Game } from "@/lib/games.functions";
import { submitScore } from "@/lib/scores.functions";
import { LOCAL_GAMES } from "@/lib/local-games";
import { useTriviaStore } from "@/games/trivia-blitz/store";
import { useTriviaMultiplayer } from "@/games/trivia-blitz/hooks/useTriviaMultiplayer";
import GameSetup from "@/games/trivia-blitz/components/GameSetup";
import QuestionIntro from "@/games/trivia-blitz/components/QuestionIntro";
import QuestionView from "@/games/trivia-blitz/components/QuestionView";
import AnswerReveal from "@/games/trivia-blitz/components/AnswerReveal";
import Scoreboard from "@/games/trivia-blitz/components/Scoreboard";
import FinalPodium from "@/games/trivia-blitz/components/FinalPodium";
import MultiplayerQuestionView from "@/games/trivia-blitz/components/MultiplayerQuestionView";
import MultiplayerAnswerReveal from "@/games/trivia-blitz/components/MultiplayerAnswerReveal";
import MultiplayerScoreboard from "@/games/trivia-blitz/components/MultiplayerScoreboard";
import MultiplayerFinalPodium from "@/games/trivia-blitz/components/MultiplayerFinalPodium";

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

  // Solo state
  const soloPhase = useTriviaStore((s) => s.phase);
  const score = useTriviaStore((s) => s.score);
  const reset = useTriviaStore((s) => s.reset);

  // Multiplayer
  const mp = useTriviaMultiplayer();
  const mpPhase = mp.roomState?.room.phase ?? null;
  const submittedRoomRef = useRef<string | null>(null);

  const isMultiplayer = mp.roomState !== null;

  const mpActions = {
    state: mp.roomState,
    action: mp.action,
    onCreateRoom: mp.createRoom,
    onJoinRoom: mp.joinRoom,
    onLeaveRoom: mp.leaveRoom,
    onSetReady: mp.setReady,
    onSelectCategory: mp.selectCategory,
    onStartGame: mp.startGame,
  };

  // Auto-advance multiplayer phases
  const advanceCalledPhaseRef = useRef<string | null>(null);
  useEffect(() => {
    const phase = mp.roomState?.room.phase;
    const roomId = mp.roomState?.room.id;
    if (!phase || !roomId) return;

    // Only auto-advance intermediate phases
    const delays: Record<string, number> = {
      question_intro: 2500,
      answer_reveal: 3000,
      scoring: 2000,
    };
    const delay = delays[phase];
    if (delay === undefined) return;

    // Avoid calling advance twice for the same phase+room
    const key = `${roomId}:${phase}`;
    if (advanceCalledPhaseRef.current === key) return;
    advanceCalledPhaseRef.current = key;

    const timer = setTimeout(() => {
      void mp.advanceQuestion();
    }, delay);
    return () => {
      advanceCalledPhaseRef.current = null;
      clearTimeout(timer);
    };
  }, [mp.roomState?.room.phase, mp.roomState?.room.id, mp.advanceQuestion]);

  // Auto-submit multiplayer score on game finish
  useEffect(() => {
    const roomState = mp.roomState;
    if (!game || !roomState || roomState.room.phase !== "finished") return;
    if (submittedRoomRef.current === roomState.room.id) return;

    const selfPlayer = roomState.players.find((p) => p.id === roomState.selfPlayerId);
    if (!selfPlayer) return;

    submittedRoomRef.current = roomState.room.id;

    void (async () => {
      try {
        await submitScoreFn({
          data: {
            gameId: game.id,
            score: selfPlayer.score,
            metadata: {
              roomId: roomState.room.id,
              roomCode: roomState.room.code,
              finalRank:
                [...roomState.players]
                  .sort((a, b) => b.score - a.score)
                  .findIndex((p) => p.id === selfPlayer.id) + 1,
              playerCount: roomState.players.length,
              maxRounds: roomState.room.maxRounds,
              categoryId: roomState.room.categoryId,
            },
          },
        });
        queryClient.invalidateQueries({ queryKey: ["game-leaderboard", game.id] });
        queryClient.invalidateQueries({ queryKey: ["global-leaderboard"] });
      } catch {
        submittedRoomRef.current = null;
      }
    })();
  }, [game, mp.roomState, submitScoreFn, queryClient]);

  const handlePlayAgain = useCallback(() => {
    reset();
    setSubmitted(false);
  }, [reset]);

  const handleMpPlayAgain = useCallback(() => {
    setSubmitted(false);
    // Leave and go back to lobby
    void mp.leaveRoom();
  }, [mp]);

  const handleSoloSubmitScore = useCallback(async () => {
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

  // ── Multiplayer rendering ───────────────────────────────────
  if (isMultiplayer && mp.roomState) {
    const mpState = mp.roomState;

    const renderMultiplayerPhase = () => {
      switch (mpPhase) {
        case "lobby":
        case "category_select":
          return null; // Handled inside GameSetup when state is present

        case "question_intro":
          return (
            <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
              <div className="text-center">
                <p className="text-sm text-muted-foreground font-medium mb-2">
                  Question {mpState.room.roundNumber} of {mpState.room.maxRounds}
                </p>
                <h2 className="text-2xl md:text-3xl font-extrabold mb-4">Get Ready!</h2>
                <div className="flex justify-center items-center gap-1 mb-6">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-3 h-3 rounded-full bg-primary animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
                {mpState.currentQuestion && (
                  <p className="text-muted-foreground text-lg">
                    Category: {mpState.room.categoryId ?? "Trivia"}
                  </p>
                )}
              </div>
            </div>
          );

        case "question":
          return (
            <MultiplayerQuestionView
              state={mpState}
              action={mp.action}
              onSubmitAnswer={mp.submitAnswer}
              onAdvanceQuestion={mp.advanceQuestion}
            />
          );

        case "answer_reveal":
          return <MultiplayerAnswerReveal state={mpState} />;

        case "scoring":
          return <MultiplayerScoreboard state={mpState} />;

        case "finished":
          return (
            <MultiplayerFinalPodium
              state={mpState}
              submitting={false}
              submitted={submitted}
              onSubmitScore={() => {
                setSubmitting(true);
                // Score already auto-submitted via effect
                setSubmitted(true);
                setSubmitting(false);
                toast.success("Score submitted!");
              }}
              onPlayAgain={handleMpPlayAgain}
              onLeaveRoom={() => mp.leaveRoom()}
            />
          );

        default:
          return null;
      }
    };

    // Show GameSetup wrapper for lobby phases, or the game phase directly
    if (mpPhase === "lobby" || mpPhase === "category_select") {
      return (
        <GameSetup
          defaultMode="multiplayer"
          multiplayer={mpActions}
        />
      );
    }

    return <div className="min-h-[calc(100vh-4rem)]">{renderMultiplayerPhase()}</div>;
  }

  // ── Solo rendering ──────────────────────────────────────────
  const renderSoloPhase = () => {
    switch (soloPhase) {
      case "setup":
        return <GameSetup multiplayer={mpActions} />;
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
            onSubmitScore={handleSoloSubmitScore}
            submitting={submitting}
            submitted={submitted}
          />
        );
      default:
        return <GameSetup multiplayer={mpActions} />;
    }
  };

  return <div className="min-h-[calc(100vh-4rem)]">{renderSoloPhase()}</div>;
}
