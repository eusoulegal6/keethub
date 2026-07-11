import { useGame } from "@/games/paint-and-guess";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Users, Trophy, Pencil, Eye } from "lucide-react";
import { getAvatarEmoji, DEFAULT_AVATAR } from "@/lib/avatars";
import { AvatarConfig, decodeAvatarConfig, createDefaultAvatarConfig } from "@/lib/avatar/config";
import { getDiceBearAvatarUrl, getDiceBearAvatarUrlFromSeed } from "@/lib/avatar/dicebear/api";

export function PlayerList() {
  const { gameState, currentDrawer, isGameActive } = useGame();

  // Sort players: drawer first, then by score
  const sortedPlayers = [...gameState.players].sort((a, b) => {
    if (currentDrawer?.id === a.id) return -1;
    if (currentDrawer?.id === b.id) return 1;
    return b.score - a.score;
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Players ({gameState.players.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-2">
          {sortedPlayers.map((player) => {
            const isHost = gameState.ownerId === player.id;
            const isPlayerDrawer = currentDrawer?.id === player.id;
            const isMe = gameState.selfId === player.id;
            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                  isPlayerDrawer 
                    ? "bg-primary/10 border border-primary/30" 
                    : isMe 
                    ? "bg-accent" 
                    : "bg-muted"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isPlayerDrawer && isGameActive && (
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground">
                      <Pencil className="w-3 h-3" />
                    </div>
                  )}
                  {!isPlayerDrawer && isGameActive && (
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted-foreground/20 text-muted-foreground">
                      <Eye className="w-3 h-3" />
                    </div>
                  )}
                  <Avatar className="h-8 w-8">
                    {(() => {
                    // Check if avatar is a config object (new format) or string (old format)
                    if (!player.avatar) {
                      // No avatar - use default emoji
                      const defaultUrl = getDiceBearAvatarUrlFromSeed(DEFAULT_AVATAR.id, { format: 'png', size: 32 });
                      return (
                        <>
                          <AvatarImage src={defaultUrl} alt={player.name} />
                          <AvatarFallback className="text-lg bg-transparent p-0">
                            <span>{getAvatarEmoji(DEFAULT_AVATAR.id)}</span>
                          </AvatarFallback>
                        </>
                      );
                    }
                    
                    // Get avatar config
                    let avatarConfig: AvatarConfig | null = null;
                    
                    if (typeof player.avatar === 'string') {
                      // Try to decode as JSON config
                      avatarConfig = decodeAvatarConfig(player.avatar);
                      if (!avatarConfig) {
                        // Old emoji format - use seed-based generation
                        const avatarUrl = getDiceBearAvatarUrlFromSeed(player.avatar, { format: 'png', size: 32 });
                        return (
                          <>
                            <AvatarImage src={avatarUrl} alt={player.name} />
                            <AvatarFallback className="text-lg bg-transparent p-0">
                              <span>{getAvatarEmoji(player.avatar)}</span>
                            </AvatarFallback>
                          </>
                        );
                      }
                    } else {
                      // Already an AvatarConfig object
                      avatarConfig = player.avatar;
                    }
                    
                    // Check if custom image is uploaded
                    if (avatarConfig?.customImageUrl) {
                      return (
                        <>
                          <AvatarImage src={avatarConfig.customImageUrl} alt={player.name} />
                          <AvatarFallback className="text-lg bg-transparent p-0">
                            <span>{getAvatarEmoji(DEFAULT_AVATAR.id)}</span>
                          </AvatarFallback>
                        </>
                      );
                    }
                    
                    // Otherwise use DiceBear API
                    const avatarUrl = getDiceBearAvatarUrl(avatarConfig, { format: 'png', size: 32 });
                    return (
                      <>
                        <AvatarImage src={avatarUrl} alt={player.name} />
                        <AvatarFallback className="text-lg bg-transparent p-0">
                          <span>{getAvatarEmoji(DEFAULT_AVATAR.id)}</span>
                        </AvatarFallback>
                      </>
                    );
                  })()}
                </Avatar>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium truncate ${isMe ? "text-primary" : ""}`}>
                      {player.name}
                      {isMe && " (You)"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {isHost && <Badge variant="outline" className="text-xs">Host</Badge>}
                    {isPlayerDrawer && isGameActive && (
                      <Badge variant="default" className="text-xs bg-primary">Drawing</Badge>
                    )}
                    {!isGameActive && (
                      <Badge variant={player.isReady ? "default" : "secondary"} className="text-xs">
                        {player.isReady ? "Ready" : "Not Ready"}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="font-bold">{player.score}</span>
              </div>
            </div>
          );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

