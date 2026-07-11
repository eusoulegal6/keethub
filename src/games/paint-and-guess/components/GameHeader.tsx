import { useGame } from "@/games/paint-and-guess";
import { Badge } from "@/components/ui/badge";
import { Timer, Users, Pencil, Eye, Trophy, Clock } from "lucide-react";

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
    isGameActive 
  } = useGame();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-gradient-to-r from-primary to-secondary py-2 sm:py-3 md:py-4 shadow-medium">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-4">
          {/* Left side - Room info and role badge */}
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <h1 className="text-base sm:text-xl md:text-2xl font-bold text-primary-foreground truncate">
              Room: {gameState.roomId}
            </h1>
            {isGameActive && (
              <>
                {isDrawer ? (
                  <Badge variant="secondary" className="text-xs sm:text-sm md:text-lg px-2 sm:px-3 py-1 flex items-center gap-1 sm:gap-2">
                    <Pencil className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">You're Drawing!</span>
                    <span className="sm:hidden">Drawing</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs sm:text-sm md:text-lg px-2 sm:px-3 py-1 flex items-center gap-1 sm:gap-2 bg-background/20 text-primary-foreground border-primary-foreground/30">
                    <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{currentDrawer?.name} is drawing</span>
                    <span className="sm:hidden truncate max-w-[100px]">{currentDrawer?.name}</span>
                  </Badge>
                )}
              </>
            )}
          </div>

          {/* Center - Timer and Round info */}
          {isGameActive && gameState.phase === "drawing" && (
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              <div className="flex items-center gap-1 sm:gap-2 text-primary-foreground">
                <Timer className={`w-4 h-4 sm:w-5 sm:h-5 ${timeLeft <= 10 ? "animate-pulse text-red-300" : ""}`} />
                <span className={`text-base sm:text-lg md:text-xl font-bold ${timeLeft <= 10 ? "text-red-300" : ""}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 text-primary-foreground">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base md:text-lg">
                  Round {roundNumber} / {gameState.maxRounds}
                </span>
              </div>
            </div>
          )}

          {/* Round ended state */}
          {gameState.phase === "round-ended" && (
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              <Badge variant="secondary" className="text-xs sm:text-sm md:text-lg px-2 sm:px-4 py-1 sm:py-2 flex items-center gap-1 sm:gap-2">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Round Over</span>
              </Badge>
              {revealedWord && (
                <span className="text-primary-foreground font-bold text-sm sm:text-base md:text-xl truncate">
                  Word: {revealedWord.toUpperCase()}
                </span>
              )}
              {roundWinner && (
                <Badge variant="default" className="text-xs sm:text-sm md:text-lg px-2 sm:px-3 py-1 flex items-center gap-1 sm:gap-2 bg-yellow-500 text-yellow-950">
                  <Trophy className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="truncate">{roundWinner.name} won!</span>
                </Badge>
              )}
            </div>
          )}

          {/* Game ended state */}
          {gameState.phase === "game-ended" && (
            <div className="flex items-center gap-2 sm:gap-4">
              <Badge variant="secondary" className="text-xs sm:text-sm md:text-lg px-2 sm:px-4 py-1 sm:py-2 flex items-center gap-1 sm:gap-2">
                <Trophy className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                Game Over!
              </Badge>
            </div>
          )}

          {/* Right side - Word for drawer only */}
          {currentWord && isDrawer && gameState.phase === "drawing" && (
            <div className="flex items-center gap-1 sm:gap-2 bg-background/20 rounded-lg px-2 sm:px-4 py-1 sm:py-2">
              <span className="text-primary-foreground/80 text-xs sm:text-sm hidden sm:inline">Your word:</span>
              <span className="text-primary-foreground font-bold text-sm sm:text-base md:text-xl tracking-wider">
                {currentWord.toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

