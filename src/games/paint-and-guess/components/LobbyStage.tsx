import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayerList } from "./PlayerList";
import { Chat } from "./Chat";
import { LogOut, Play, Users } from "lucide-react";

interface LobbyStageProps {
  isHost: boolean;
  isReady: boolean;
  allPlayersReady: boolean;
  playerCount: number;
  maxRounds: number;
  onReadyToggle: () => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

/**
 * Lobby stage - players ready up before game starts
 * No canvas shown here, giving more room for players and chat
 */
export function LobbyStage({
  isHost,
  isReady,
  allPlayersReady,
  playerCount,
  maxRounds,
  onReadyToggle,
  onStartGame,
  onLeaveRoom,
}: LobbyStageProps) {
  return (
    <div className="container mx-auto p-2 sm:p-4 lg:p-6 h-[calc(100vh-5rem)] max-h-screen overflow-y-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 auto-rows-fr">
        {/* Left Sidebar - Players */}
        <div className="lg:col-span-1 flex flex-col min-h-[200px] lg:min-h-0 lg:max-h-full">
          <div className="flex-shrink-0 overflow-y-auto mb-3 sm:mb-4 max-h-[300px] lg:max-h-none">
            <PlayerList />
          </div>

          {/* Ready Up Section */}
          <Card className="flex-shrink-0 mb-3 sm:mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                Ready Up
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {playerCount < 2
                  ? "Waiting for more players..."
                  : allPlayersReady
                  ? "All players ready!"
                  : "Get ready to start"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3">
              <Button
                onClick={onReadyToggle}
                className="w-full text-sm sm:text-base"
                variant={isReady ? "secondary" : "default"}
                size="lg"
              >
                {isReady ? "Not Ready" : "Ready Up"}
              </Button>

              {isHost && (
                <Button
                  onClick={onStartGame}
                  className="w-full text-sm sm:text-base"
                  disabled={!allPlayersReady}
                  size="lg"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Game
                </Button>
              )}

              {!isHost && (
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {allPlayersReady
                      ? "Ready! Waiting for host to start."
                      : "Waiting for all players to ready up."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            onClick={onLeaveRoom}
            variant="outline"
            className="w-full flex-shrink-0 text-sm sm:text-base"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Leave Room
          </Button>
        </div>

        {/* Main Area - Game Info */}
        <div className="lg:col-span-1 flex flex-col min-h-[250px] lg:min-h-0 lg:max-h-full">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="text-base sm:text-lg">Game Rules</CardTitle>
              <CardDescription className="text-xs sm:text-sm">How to play</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 min-h-0">
              <div className="space-y-2 sm:space-y-3">
                <div>
                  <h3 className="font-semibold mb-1 text-sm sm:text-base">🎨 Drawing Phase</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    One player draws while others guess the word. You have 60 seconds per round.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1 text-sm sm:text-base">💬 Guessing</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Type your guesses in the chat. First correct guess wins points!
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1 text-sm sm:text-base">🏆 Scoring</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Correct guesses earn points. The player with the most points at the end wins!
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1 text-sm sm:text-base">🔄 Rounds</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Each player gets a turn to draw. The game continues for {maxRounds} rounds.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar - Chat */}
        <div className="lg:col-span-1 flex flex-col min-h-[300px] lg:min-h-0 lg:max-h-full">
          <Chat />
        </div>
      </div>
    </div>
  );
}

