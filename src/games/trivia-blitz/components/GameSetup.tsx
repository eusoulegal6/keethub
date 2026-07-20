import { useState } from "react";
import { Play, Users, Zap } from "lucide-react";
import { useTriviaStore } from "../store";
import { cn } from "@/lib/utils";
import MultiplayerLobby from "./MultiplayerLobby";
import type { TriviaRoomState } from "../hooks/useTriviaMultiplayer";

type Mode = "solo" | "multiplayer";

interface MultiplayerActions {
  state: TriviaRoomState | null;
  action: string | null;
  onCreateRoom: (name: string) => Promise<{ roomId: string; roomCode: string }>;
  onJoinRoom: (code: string) => Promise<void>;
  onLeaveRoom: () => Promise<void>;
  onSetReady: (isReady: boolean) => Promise<void>;
  onSelectCategory: (categoryId: string) => Promise<void>;
  onStartGame: () => Promise<void>;
}

interface Props {
  multiplayer?: MultiplayerActions;
  defaultMode?: Mode;
  onSwitchToMultiplayer?: () => void;
}

const categoryStyles: Record<string, { card: string; count: string }> = {
  general: { card: "from-violet-500 to-indigo-500", count: "text-indigo-600" },
  science: { card: "from-emerald-500 to-green-500", count: "text-emerald-600" },
  history: { card: "from-orange-400 to-orange-500", count: "text-orange-600" },
  "pop-culture": { card: "from-pink-500 to-rose-500", count: "text-pink-600" },
  sports: { card: "from-blue-500 to-blue-600", count: "text-blue-600" },
  geography: { card: "from-cyan-500 to-teal-500", count: "text-teal-600" },
  technology: { card: "from-amber-400 to-yellow-500", count: "text-amber-600" },
};

export default function GameSetup({ multiplayer, defaultMode = "solo", onSwitchToMultiplayer }: Props) {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const quizzes = useTriviaStore((s) => s.availableQuizzes);
  const startGame = useTriviaStore((s) => s.startGame);

  if (mode === "multiplayer" && multiplayer) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button
          type="button"
          onClick={() => setMode("solo")}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <Play className="size-4" /> Back to solo quiz
        </button>
        <MultiplayerLobby
          state={multiplayer.state}
          action={multiplayer.action}
          onCreateRoom={multiplayer.onCreateRoom}
          onJoinRoom={multiplayer.onJoinRoom}
          onLeaveRoom={multiplayer.onLeaveRoom}
          onSetReady={multiplayer.onSetReady}
          onSelectCategory={multiplayer.onSelectCategory}
          onStartGame={multiplayer.onStartGame}
        />
      </div>
    );
  }

  return (
    <main className="trivia-blitz-setup">
      <div className="trivia-blitz-spark trivia-blitz-spark-left" aria-hidden="true">☆</div>
      <div className="trivia-blitz-spark trivia-blitz-spark-right" aria-hidden="true">✦</div>
      <section className="trivia-blitz-content">
        <header className="mb-6 text-center md:mb-7">
          <span className="trivia-blitz-live"><Zap className="size-3.5 fill-current" /> Live quiz</span>
          <h1>Trivia Blitz</h1>
          <p>Pick a category, <strong>answer fast</strong>, climb the ranks.</p>
        </header>

        {(multiplayer || onSwitchToMultiplayer) && (
          <div className="flex justify-center mb-5">
            <div className="trivia-blitz-mode-tabs">
              <span className="trivia-blitz-mode-tab active">
                <Play className="size-3.5" />
                Solo
              </span>
              <button
                type="button"
                onClick={() => multiplayer ? setMode("multiplayer") : onSwitchToMultiplayer?.()}
                className="trivia-blitz-mode-tab"
              >
                <Users className="size-3.5" />
                Multiplayer
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {quizzes.map((quiz) => {
            const style = categoryStyles[quiz.id] ?? categoryStyles.general;
            return (
              <button
                key={quiz.id}
                type="button"
                onClick={() => startGame(quiz.id)}
                className={cn("trivia-blitz-category bg-gradient-to-br", style.card)}
                aria-label={`Start ${quiz.name} quiz`}
              >
                <span className="trivia-blitz-category-icon" aria-hidden="true">{quiz.icon}</span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block text-xl font-extrabold leading-tight md:text-2xl">{quiz.name}</span>
                  <span className="mt-1 block max-w-56 text-sm font-medium leading-5 text-white/95 md:text-base">{quiz.description}</span>
                </span>
                <span className={cn("trivia-blitz-question-count", style.count)}>{quiz.questionCount} Qs</span>
              </button>
            );
          })}
        </div>

        <footer className="trivia-blitz-footer">
          <span><Zap className="size-4 fill-current" /> Single-player speed quiz</span>
          <i>•</i><span>7 questions per game</span><i>•</i><span>Earn up to <strong>2x points</strong> for speed!</span>
          {(multiplayer || onSwitchToMultiplayer) && (
            <button
              type="button"
              onClick={() => multiplayer ? setMode("multiplayer") : onSwitchToMultiplayer?.()}
              className="trivia-blitz-multiplayer"
            >
              <Users className="size-3.5" /> Play with friends
            </button>
          )}
        </footer>
      </section>
    </main>
  );
}
