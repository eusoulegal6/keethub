import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useGame } from "@/games/paint-and-guess";
import { GameHeader } from "@/games/paint-and-guess/components/GameHeader";
import { RoundSummary } from "@/games/paint-and-guess/components/RoundSummary";
import { LobbyStage } from "@/games/paint-and-guess/components/LobbyStage";
import { GameStage } from "@/games/paint-and-guess/components/GameStage";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { AvatarConfig } from "@/lib/avatar/config";
import { getGameBySlug } from "@/lib/games.functions";
import { submitScore } from "@/lib/scores.functions";

const paintAndGuessGameQuery = {
  queryKey: ["game", "paint-and-guess"],
  queryFn: () => getGameBySlug({ data: { slug: "paint-and-guess" } }),
  staleTime: 60_000,
};

export default function Room({ onBack }: { onBack: () => void }) {
  const { gameState, isGameActive, leaveRoom, startGame, setReadyState, updateAvatar } = useGame();
  const queryClient = useQueryClient();
  const submitScoreFn = useServerFn(submitScore);
  const { data: game } = useQuery(paintAndGuessGameQuery);
  const submittedRoomRef = useRef<string | null>(null);

  // Listen for avatar updates from HubLayout sidebar
  useEffect(() => {
    const handleAvatarUpdate = (event: Event) => {
      const detail = (event as CustomEvent<AvatarConfig>).detail;
      if (detail && gameState.roomId) {
        updateAvatar(detail);
      }
    };

    window.addEventListener("avatar-config-updated", handleAvatarUpdate);
    return () => window.removeEventListener("avatar-config-updated", handleAvatarUpdate);
  }, [gameState.roomId, updateAvatar]);

  useEffect(() => {
    if (!game || !gameState.roomId || gameState.phase !== "game-ended") return;
    if (submittedRoomRef.current === gameState.roomId) return;

    const currentPlayer = gameState.players.find((player) => player.id === gameState.selfId);
    if (!currentPlayer) return;

    submittedRoomRef.current = gameState.roomId;

    const finalRank =
      [...gameState.players]
        .sort((a, b) => b.score - a.score)
        .findIndex((player) => player.id === currentPlayer.id) + 1;

    void (async () => {
      try {
        await submitScoreFn({
          data: {
            gameId: game.id,
            score: currentPlayer.score,
            metadata: {
              roomId: gameState.roomId,
              finalRank,
              playerCount: gameState.players.length,
              maxRounds: gameState.maxRounds,
            },
          },
        });
        queryClient.invalidateQueries({ queryKey: ["game-leaderboard", game.id] });
        queryClient.invalidateQueries({ queryKey: ["global-leaderboard"] });
        toast.success("Final score submitted to leaderboard");
      } catch (error) {
        submittedRoomRef.current = null;
        toast.error(error instanceof Error ? error.message : "Failed to submit final score");
      }
    })();
  }, [
    game,
    gameState.maxRounds,
    gameState.phase,
    gameState.players,
    gameState.roomId,
    gameState.selfId,
    queryClient,
    submitScoreFn,
  ]);

  const handleLeaveRoom = () => {
    leaveRoom();
    onBack();
    toast.info("Left room");
  };

  const handleStartGame = () => {
    if (gameState.players.length < 2) {
      toast.error("Need at least 2 players to start");
      return;
    }
    const allReady = gameState.players.every((player) => player.isReady);
    if (!allReady) {
      toast.error("All players must be ready");
      return;
    }
    startGame();
  };

  const currentPlayer = gameState.players.find((player) => player.id === gameState.selfId);
  const isHost = gameState.ownerId === gameState.selfId;
  const isReady = currentPlayer?.isReady ?? false;
  const allPlayersReady =
    gameState.players.length >= 2 && gameState.players.every((player) => player.isReady);

  if (!gameState.roomId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-6">
          <p>Loading room...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <GameHeader />

      {/* Round Summary Overlay */}
      <RoundSummary />

      {/* Show different stages based on game state */}
      {isGameActive ? (
        <GameStage onLeaveRoom={handleLeaveRoom} />
      ) : (
        <LobbyStage
          isHost={isHost}
          isReady={isReady}
          allPlayersReady={allPlayersReady}
          playerCount={gameState.players.length}
          maxRounds={gameState.maxRounds}
          onReadyToggle={() => setReadyState(!isReady)}
          onStartGame={handleStartGame}
          onLeaveRoom={handleLeaveRoom}
        />
      )}
    </div>
  );
}
