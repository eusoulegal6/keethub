import { useGame } from "@/games/paint-and-guess";
import { cn } from "@/lib/utils";
import { Clock, Eye, EyeOff, Pencil, Timer, Trophy, Users } from "lucide-react";

export function GameHeader() {
  const {
    gameState,
    isDrawer,
    currentDrawer,
    currentWord,
    timeLeft,
    roundNumber,
    revealedWord,
    roundWinner,
    isGameActive,
  } = useGame();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const roomLabel = gameState.gamePin ?? gameState.roomId;
  const isDrawingPhase = isGameActive && gameState.phase === "drawing";
  const timeIsLow = isDrawingPhase && timeLeft <= 10;

  const roleLabel = isDrawingPhase
    ? isDrawer
      ? "You're Drawing!"
      : `${currentDrawer?.name ?? "A player"} is drawing`
    : gameState.phase === "round-ended"
      ? "Round Complete"
      : gameState.phase === "game-ended"
        ? "Game Over"
        : "Waiting Room";

  return (
    <header className="px-4 pt-4 md:px-5">
      <div className="relative overflow-hidden rounded-lg bg-[linear-gradient(90deg,#FF2F85_0%,#FF72A9_58%,#FFE6F0_100%)] px-4 py-3 shadow-[0_18px_40px_rgba(255,47,133,0.18)] md:px-5">
        <div className="pointer-events-none absolute left-[38%] top-3 h-7 w-7 rounded-lg border-2 border-white/25" />
        <div className="pointer-events-none absolute right-[20%] top-4 h-10 w-20 rounded-full border-2 border-white/20" />
        <div className="relative flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <div className="rounded-lg bg-[#E92778]/65 px-4 py-2 text-xl font-black tracking-wide text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.08)] md:text-2xl">
              PIN: <span data-testid="room-pin">{roomLabel}</span>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-white/70 bg-[#E9FBFA] px-4 py-2 text-base font-extrabold text-[#087E7D] shadow-sm md:text-lg">
              {isDrawingPhase && isDrawer ? (
                <Pencil className="h-5 w-5" />
              ) : isDrawingPhase ? (
                <Eye className="h-5 w-5" />
              ) : gameState.phase === "game-ended" ? (
                <Trophy className="h-5 w-5" />
              ) : (
                <Clock className="h-5 w-5" />
              )}
              <span className="truncate">{roleLabel}</span>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-3">
            {isDrawingPhase && (
              <div className="flex items-center gap-3 rounded-lg border border-white/70 bg-white/88 px-4 py-2 text-[#FF2F85] shadow-sm">
                <div className="flex items-center gap-2">
                  <Timer className={cn("h-5 w-5", timeIsLow && "animate-pulse text-[#F2555D]")} />
                  <span className={cn("text-lg font-black", timeIsLow && "text-[#F2555D]")}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
                <div className="h-6 w-px bg-[#E6EAF2]" />
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <span className="text-base font-extrabold text-[#FF2F85]">
                    Round {roundNumber} / {gameState.maxRounds}
                  </span>
                </div>
              </div>
            )}

            {gameState.phase === "round-ended" && (
              <div className="flex items-center gap-3 rounded-lg border border-white/70 bg-white/88 px-4 py-2 text-[#10204A] shadow-sm">
                <Clock className="h-5 w-5 text-[#FF2F85]" />
                <span className="font-extrabold">Round {roundNumber} complete</span>
                {revealedWord && (
                  <span className="rounded-full bg-[#FFF8D9] px-3 py-1 text-sm font-black text-[#705200]">
                    {revealedWord.toUpperCase()}
                  </span>
                )}
                {roundWinner && (
                  <span className="rounded-full bg-[#FF9818] px-3 py-1 text-sm font-black text-white">
                    {roundWinner.name} won
                  </span>
                )}
              </div>
            )}

            {gameState.phase === "game-ended" && (
              <div className="flex items-center gap-2 rounded-lg border border-white/70 bg-white/88 px-4 py-2 text-[#10204A] shadow-sm">
                <Trophy className="h-5 w-5 text-[#FF9818]" />
                <span className="font-extrabold">Final scores are ready</span>
              </div>
            )}

            <div className="ml-auto flex min-w-[190px] items-center justify-between gap-3 rounded-lg border border-white/70 bg-white/82 px-4 py-2 text-[#10204A] shadow-sm">
              <span className="text-sm font-bold text-[#667085]">Your word:</span>
              {currentWord && isDrawer && gameState.phase === "drawing" ? (
                <span className="truncate text-xl font-black tracking-wide text-[#FF2F85]">
                  {currentWord.toUpperCase()}
                </span>
              ) : (
                <span className="flex items-center gap-2 text-sm font-extrabold text-[#98A2B3]">
                  <EyeOff className="h-4 w-4" />
                  Hidden
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
