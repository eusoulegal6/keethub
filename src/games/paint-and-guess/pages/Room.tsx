import { useEffect } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { useGame } from "@/hub/games/paint-and-guess";
import { GameHeader } from "@/hub/games/paint-and-guess/components/GameHeader";
import { RoundSummary } from "@/hub/games/paint-and-guess/components/RoundSummary";
import { LobbyStage } from "@/hub/games/paint-and-guess/components/LobbyStage";
import { GameStage } from "@/hub/games/paint-and-guess/components/GameStage";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { AvatarConfig } from "@/lib/avatar/config";

export default function Room() {
  const { roomId } = useParams({ strict: false }) as { roomId?: string };
  const navigate = useNavigate();
  const { gameState, isGameActive, leaveRoom, startGame, isConnected, setReadyState, updateAvatar } = useGame();

  useEffect(() => {
    if (!isConnected) {
      navigate({ to: "/hub/games/paint-and-guess" });
      return;
    }
  }, [isConnected, navigate]);

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

  const handleLeaveRoom = () => {
    leaveRoom();
    navigate({ to: "/hub/games/paint-and-guess" });
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
