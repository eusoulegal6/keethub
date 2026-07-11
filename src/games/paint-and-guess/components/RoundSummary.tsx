import { useState, useEffect } from "react";
import { useGame } from "@/games/paint-and-guess";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Clock, Star, Users, X } from "lucide-react";

export function RoundSummary() {
  const { gameState, revealedWord, roundWinner, roundNumber } = useGame();
  const [isDismissed, setIsDismissed] = useState(false);

  // Reset dismissed state when phase changes away from summary phases
  useEffect(() => {
    if (gameState.phase !== "round-ended" && gameState.phase !== "game-ended") {
      setIsDismissed(false);
    }
  }, [gameState.phase]);

  // Auto-dismiss round-ended after a delay (when next round starts)
  useEffect(() => {
    if (gameState.phase === "round-ended") {
      setIsDismissed(false);
      // Auto-dismiss after 5 seconds or when next round starts
      const timer = setTimeout(() => {
        setIsDismissed(true);
      }, 5000); // 5 seconds
      return () => clearTimeout(timer);
    }
  }, [gameState.phase, roundNumber]);

  // Only show during round-ended or game-ended phase
  if (gameState.phase !== "round-ended" && gameState.phase !== "game-ended") {
    return null;
  }

  // Don't show round-ended summary if no round has actually occurred
  // This prevents the summary from showing when phase is incorrectly set to "round-ended"
  // without an actual round having happened (e.g., roundNumber === 0)
  if (gameState.phase === "round-ended" && roundNumber === 0) {
    return null;
  }

  // For game-ended, allow manual dismissal
  if (isDismissed && gameState.phase === "game-ended") {
    return null;
  }

  // Sort players by score (descending)
  const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
  const topPlayer = sortedPlayers[0];

  // For game-ended, make overlay less blocking (lower z-index, allow click-through on backdrop)
  const isGameEnded = gameState.phase === "game-ended";

  return (
    <div 
      className={`fixed inset-0 bg-background/80 backdrop-blur-sm ${isGameEnded ? "z-40 pointer-events-none" : "z-50"} flex items-center justify-center p-4`}
      onClick={isGameEnded ? () => setIsDismissed(true) : undefined}
    >
      <Card 
        className={`w-full max-w-md animate-in fade-in zoom-in duration-300 ${isGameEnded ? "pointer-events-auto" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="text-center pb-2 relative">
          {isGameEnded && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6"
              onClick={() => setIsDismissed(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          {gameState.phase === "game-ended" ? (
            <>
              <div className="flex justify-center mb-2">
                <Trophy className="w-12 h-12 text-yellow-500" />
              </div>
              <CardTitle className="text-2xl">Game Over!</CardTitle>
              {topPlayer && (
                <p className="text-lg text-muted-foreground mt-2">
                  🎉 <span className="font-bold text-foreground">{topPlayer.name}</span> wins with {topPlayer.score} points!
                </p>
              )}
            </>
          ) : (
            <>
              <div className="flex justify-center mb-2">
                <Clock className="w-10 h-10 text-primary" />
              </div>
              <CardTitle className="text-xl">Round {roundNumber} Complete</CardTitle>
              {revealedWord && (
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">The word was</p>
                  <p className="text-2xl font-bold tracking-wider">{revealedWord.toUpperCase()}</p>
                </div>
              )}
              {roundWinner && (
                <Badge className="mt-3 text-sm px-3 py-1 bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">
                  <Star className="w-4 h-4 mr-1" />
                  {roundWinner.name} guessed it first!
                </Badge>
              )}
            </>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Users className="w-4 h-4" />
              <span>Scoreboard</span>
            </div>
            {sortedPlayers.map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  index === 0 ? "bg-yellow-500/10 border border-yellow-500/30" : "bg-muted"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold ${index === 0 ? "text-yellow-500" : "text-muted-foreground"}`}>
                    #{index + 1}
                  </span>
                  <span className="font-medium">{player.name}</span>
                  {player.id === roundWinner?.id && (
                    <Badge variant="outline" className="text-xs">
                      +Points
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className={`w-4 h-4 ${index === 0 ? "text-yellow-500" : "text-muted-foreground"}`} />
                  <span className="font-bold">{player.score}</span>
                </div>
              </div>
            ))}
          </div>
          
          {gameState.phase === "round-ended" && (
            <p className="text-center text-sm text-muted-foreground mt-4 animate-pulse">
              Next round starting soon...
            </p>
          )}
          
          {gameState.phase === "game-ended" && (
            <div className="mt-4 space-y-2">
              <p className="text-center text-sm text-muted-foreground">
                Thanks for playing! Start a new game when ready.
              </p>
              <Button
                onClick={() => setIsDismissed(true)}
                className="w-full"
                variant="default"
              >
                Continue
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

