import { useGame } from "@/games/paint-and-guess";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Eye, Pencil, Trophy, Users } from "lucide-react";
import { PlayerAvatar } from "./PlayerAvatar";

export function PlayerList() {
  const { gameState, currentDrawer, isGameActive } = useGame();

  const sortedPlayers = [...gameState.players].sort((a, b) => {
    if (currentDrawer?.id === a.id) return -1;
    if (currentDrawer?.id === b.id) return 1;
    return b.score - a.score;
  });

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-[#E6EAF2] bg-white p-4 shadow-[0_14px_36px_rgba(16,32,74,0.08)]">
      <div className="mb-4 flex items-center gap-2 text-[#10204A]">
        <Users className="h-5 w-5 text-[#7037E8]" />
        <h2 className="text-lg font-extrabold">Players ({gameState.players.length})</h2>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {sortedPlayers.map((player) => {
          const isHost = gameState.ownerId !== null && gameState.ownerId === player.userId;
          const isPlayerDrawer = currentDrawer?.id === player.id;
          const isMe = gameState.selfId === player.id;

          return (
            <div
              key={player.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                isPlayerDrawer && isGameActive
                  ? "border-[#FF86B5] bg-[#FFF1F6]"
                  : isMe
                    ? "border-[#8BE0DE] bg-[#ECFBFA]"
                    : "border-[#E6EAF2] bg-[#F8FAFD]",
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
                  isPlayerDrawer && isGameActive
                    ? "bg-[#FF2F85] text-white"
                    : "bg-[#EDF1F7] text-[#667085]",
                )}
              >
                {isPlayerDrawer && isGameActive ? (
                  <Pencil className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </div>

              <PlayerAvatar player={player} size="md" />

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "truncate text-base font-extrabold",
                      isMe ? "text-[#FF2F85]" : "text-[#10204A]",
                    )}
                  >
                    {player.name}
                    {isMe && " (You)"}
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {isHost && (
                    <Badge
                      variant="outline"
                      className="h-6 border-[#FF86B5] bg-white px-2 text-xs font-bold text-[#FF2F85]"
                    >
                      Host
                    </Badge>
                  )}
                  {isPlayerDrawer && isGameActive && (
                    <Badge className="h-6 bg-[#FF2F85] px-2 text-xs font-bold text-white">
                      Drawing
                    </Badge>
                  )}
                  {!isGameActive && (
                    <Badge
                      className={cn(
                        "h-6 px-2 text-xs font-bold",
                        player.isReady ? "bg-[#10B8B5] text-white" : "bg-[#F6F1FF] text-[#7037E8]",
                      )}
                    >
                      {player.isReady ? "Ready" : "Not Ready"}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-sm font-extrabold text-[#10204A] shadow-sm">
                <Trophy className="h-4 w-4 text-[#FF9818]" />
                {player.score}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
