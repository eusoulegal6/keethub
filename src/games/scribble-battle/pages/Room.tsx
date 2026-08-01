import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useSBGame } from "@/games/scribble-battle/state/GameContext";
import { GameHeader } from "@/games/scribble-battle/components/GameHeader";
import { TeamLobbyStage } from "@/games/scribble-battle/components/TeamLobbyStage";
import { GameStage } from "@/games/scribble-battle/components/GameStage";
import { RoundSummary } from "@/games/scribble-battle/components/RoundSummary";
import { MatchResults } from "@/games/scribble-battle/components/MatchResults";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import type { AvatarConfig } from "@/lib/avatar/config";
import { getGameBySlug } from "@/lib/games.functions";
import { submitScore } from "@/lib/scores.functions";

const sbGameQuery = {
  queryKey: ["game", "scribble-battle"],
  queryFn: () => getGameBySlug({ data: { slug: "scribble-battle" } }),
  staleTime: 60_000,
};

function Room({ onBack }: { onBack: () => void }) {
  const {
    gameState,
    isGameActive,
    leaveRoom,
    startGame,
    setReadyState,
    switchTeam,
    updateAvatar,
  } = useSBGame();
  const queryClient = useQueryClient();
  const submitScoreFn = useServerFn(submitScore);
  const { data: game } = useQuery(sbGameQuery);
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

  // Submit score on game end
  useEffect(() => {
    if (!game || !gameState.roomId || gameState.phase !== "game-ended") return;
    if (submittedRoomRef.current === gameState.roomId) return;

    const allPlayers = [...gameState.team1, ...gameState.team2];
    const currentPlayer = allPlayers.find((p) => p.id === gameState.selfId);
    if (!currentPlayer) return;

    submittedRoomRef.current = gameState.roomId;

    void (async () => {
      try {
        await submitScoreFn({
          data: {
            gameId: game.id,
            score: currentPlayer.score,
            metadata: {
              roomId: gameState.roomId,
              team: gameState.team,
              team1Score: gameState.team1Score,
              team2Score: gameState.team2Score,
            },
          },
        });
        queryClient.invalidateQueries({ queryKey: ["game-leaderboard", game.id] });
        queryClient.invalidateQueries({ queryKey: ["global-leaderboard"] });
        toast.success("Score submitted to leaderboard");
      } catch (error) {
        submittedRoomRef.current = null;
        toast.error(error instanceof Error ? error.message : "Failed to submit score");
      }
    })();
  }, [game, gameState, queryClient, submitScoreFn]);

  const handleLeaveRoom = () => {
    leaveRoom();
    onBack();
    toast.info("Left room");
  };

  const handleStartGame = () => {
    if (gameState.team1.length < 2 || gameState.team2.length < 2) {
      toast.error("Each team needs at least 2 players");
      return;
    }
    const allReady = [...gameState.team1, ...gameState.team2].every((p) => p.isReady);
    if (!allReady) {
      toast.error("All players must be ready");
      return;
    }
    startGame();
  };

  // Clear score-submission guard only after a new game actually starts,
  // not before the RPC call — if startGame fails (e.g. non-host clicks
  // "Play Again"), the guard must stay in place to prevent duplicate scores.
  useEffect(() => {
    if (gameState.phase !== "game-ended") {
      submittedRoomRef.current = null;
    }
  }, [gameState.phase]);

  const handleRematch = () => {
    if (gameState.team1.length < 2 || gameState.team2.length < 2) {
      toast.error("Each team needs at least 2 players");
      return;
    }
    startGame();
  };
  const isHost = gameState.ownerId !== null && gameState.ownerId === gameState.authUserId;
  const currentPlayer = [...gameState.team1, ...gameState.team2].find(
    (p) => p.id === gameState.selfId,
  );
  const isReady = currentPlayer?.isReady ?? false;
  const allPlayersReady =
    gameState.team1.length >= 2 &&
    gameState.team2.length >= 2 &&
    [...gameState.team1, ...gameState.team2].every((p) => p.isReady);

  if (!gameState.roomId) {
    return (
      <div className="flex h-full items-center justify-center bg-[#FBFDFF]">
        <Card className="p-6"><p>Loading room...</p></Card>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#FBFDFF] text-[#10204A]">
      {isGameActive && <GameHeader />}
      <RoundSummary />
      <MatchResults onRematch={handleRematch} onLeave={handleLeaveRoom} />

      {isGameActive ? (
        <GameStage onLeaveRoom={handleLeaveRoom} />
      ) : gameState.phase === "game-ended" ? (
        <div className="flex h-full items-center justify-center" />
      ) : (
        <TeamLobbyStage
          isHost={isHost}
          isReady={isReady}
          allPlayersReady={allPlayersReady}
          gamePin={gameState.gamePin}
          onReadyToggle={() => setReadyState(!isReady)}
          onStartGame={handleStartGame}
          onLeaveRoom={handleLeaveRoom}
          onSwitchTeam={switchTeam}
          currentTeam={gameState.team}
        />
      )}
    </div>
  );
}

export default Room;
