import { useState, useEffect } from "react";
// Navigation handled by parent via onEnterRoom callback
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGame } from "@/games/paint-and-guess";
import { toast } from "sonner";
import { Users, Plus, LogIn } from "lucide-react";
import { AvatarConfig, createDefaultAvatarConfig } from "@/lib/avatar/config";
import { safeLoadAvatarConfig } from "@/lib/avatar/validation";
import { cn } from "@/lib/utils";
import { apiPath } from "@/games/paint-and-guess/config";

interface WordPack {
  id: string;
  name: string;
  description: string;
  icon: string;
  wordCount: number;
}

export default function Lobby({ onEnterRoom }: { onEnterRoom: () => void }) {
  const { createRoom, joinRoom, isConnected } = useGame();
  const [roomId, setRoomId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [selectedWordPack, setSelectedWordPack] = useState<string>("classic");
  const [wordPacks, setWordPacks] = useState<WordPack[]>([]);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(() => {
    return safeLoadAvatarConfig() || createDefaultAvatarConfig();
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    // Fetch available word packs
    fetch(apiPath("/api/word-packs"))
      .then((res) => res.json())
      .then((packs: WordPack[]) => {
        setWordPacks(packs);
      })
      .catch((error) => {
        console.error("Failed to fetch word packs:", error);
      });
  }, []);

  useEffect(() => {
    const handleAvatarUpdate = (event: Event) => {
      const detail = (event as CustomEvent<AvatarConfig>).detail;
      if (detail) {
        setAvatarConfig(detail);
      }
    };

    window.addEventListener("avatar-config-updated", handleAvatarUpdate as EventListener);
    return () => {
      window.removeEventListener("avatar-config-updated", handleAvatarUpdate as EventListener);
    };
  }, []);

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!roomName.trim()) {
      toast.error("Please enter a room name");
      return;
    }

    const latestAvatar = safeLoadAvatarConfig() || avatarConfig || createDefaultAvatarConfig();
    setAvatarConfig(latestAvatar);
    setIsCreating(true);
    try {
      const newRoomId = await createRoom(roomName, true, selectedWordPack);
      joinRoom(newRoomId, playerName, latestAvatar);
      onEnterRoom();
      toast.success("Room created!");
    } catch (error) {
      toast.error("Failed to create room");
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!roomId.trim()) {
      toast.error("Please enter a room ID");
      return;
    }

    const latestAvatar = safeLoadAvatarConfig() || avatarConfig || createDefaultAvatarConfig();
    setAvatarConfig(latestAvatar);
    setIsJoining(true);
    try {
      joinRoom(roomId.toUpperCase(), playerName, latestAvatar);
      onEnterRoom();
      toast.success("Joined room!");
    } catch (error) {
      toast.error("Failed to join room");
    } finally {
      setIsJoining(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Connecting...</CardTitle>
            <CardDescription>Please wait while we connect to the server</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Multiplayer Draw & Guess</CardTitle>
            <CardDescription>Create or join a room to start playing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Name</label>
              <Input
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
              />
            </div>

            <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              Customize your avatar from the left sidebar before creating or joining a room.
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                  {/* Create Room */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        Create Room
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Room Name</label>
                        <Input
                          placeholder="Room name"
                          value={roomName}
                          onChange={(e) => setRoomName(e.target.value)}
                          maxLength={30}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Word Pack</label>
                        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1">
                          {wordPacks.map((pack) => (
                            <button
                              key={pack.id}
                              type="button"
                              onClick={() => setSelectedWordPack(pack.id)}
                              className={cn(
                                "p-3 rounded-lg border-2 text-left transition-all hover:bg-accent",
                                selectedWordPack === pack.id
                                  ? "border-primary bg-primary/10"
                                  : "border-border bg-card"
                              )}
                            >
                              <div className="flex items-start gap-2">
                                <span className="text-2xl">{pack.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm">{pack.name}</div>
                                  <div className="text-xs text-muted-foreground line-clamp-1">
                                    {pack.description}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {pack.wordCount} words
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <Button
                        onClick={handleCreateRoom}
                        disabled={isCreating}
                        className="w-full"
                      >
                        {isCreating ? "Creating..." : "Create Room"}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Join Room */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <LogIn className="w-5 h-5" />
                        Join Room
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Room ID</label>
                        <Input
                          placeholder="Enter room ID"
                          value={roomId}
                          onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                          maxLength={6}
                        />
                      </div>
                      <Button
                        onClick={handleJoinRoom}
                        disabled={isJoining}
                        variant="outline"
                        className="w-full"
                      >
                        {isJoining ? "Joining..." : "Join Room"}
                      </Button>
                    </CardContent>
                  </Card>
                </div>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>Up to 6 players per room</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

