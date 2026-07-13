import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGame } from "@/games/paint-and-guess";
import { toast } from "sonner";
import { Users, Plus, LogIn } from "lucide-react";
import { AvatarConfig, createDefaultAvatarConfig } from "@/lib/avatar/config";
import { safeLoadAvatarConfig } from "@/lib/avatar/validation";
import { supabase } from "@/integrations/supabase/client";

export default function Lobby({ onEnterRoom }: { onEnterRoom: () => void }) {
  const { createRoom, joinRoom } = useGame();
  const [gamePin, setGamePin] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(() => {
    return safeLoadAvatarConfig() || createDefaultAvatarConfig();
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const handleAvatarUpdate = (event: Event) => {
      const detail = (event as CustomEvent<AvatarConfig>).detail;
      if (detail) setAvatarConfig(detail);
    };
    window.addEventListener("avatar-config-updated", handleAvatarUpdate as EventListener);
    return () =>
      window.removeEventListener("avatar-config-updated", handleAvatarUpdate as EventListener);
  }, []);

  // Auto-fill player name from Supabase profile
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase
          .from("profiles")
          .select("username")
          .eq("id", data.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile?.username) setPlayerName(profile.username);
          });
      }
    });
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

    setIsCreating(true);
    try {
      const room = await createRoom(roomName, true, "classic");

      // Join the room as first player (await ensures roomId is set in state before navigating)
      await joinRoom(room.roomId, playerName, avatarConfig, room.gamePin);
      onEnterRoom();
      toast.success("Room created!");
    } catch (error) {
      toast.error("Failed to create room. Is the game database set up?");
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!gamePin.trim()) {
      toast.error("Please enter a game PIN");
      return;
    }

    setIsJoining(true);
    try {
      const pin = gamePin.toUpperCase().trim();
      const { data, error } = await supabase.rpc("join_paint_room", {
        game_pin: pin,
      });

      if (error || !(data as any)?.success) {
        toast.error((data as any)?.error || "Invalid game PIN");
        setIsJoining(false);
        return;
      }

      const result = data as any;
      await joinRoom(result.roomId, playerName, avatarConfig, pin);
      onEnterRoom();
      toast.success("Joined room!");
    } catch (error) {
      toast.error("Failed to join room");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Multiplayer Draw &amp; Guess</CardTitle>
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
              Customize your avatar from your profile page before creating or joining a room.
            </div>

            <div className="grid md:grid-cols-2 gap-4">
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
                  <Button onClick={handleCreateRoom} disabled={isCreating} className="w-full">
                    {isCreating ? "Creating..." : "Create Room"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LogIn className="w-5 h-5" />
                    Join Room
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Game PIN</label>
                    <Input
                      placeholder="Enter 6-letter PIN"
                      value={gamePin}
                      onChange={(e) => setGamePin(e.target.value.toUpperCase())}
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
              <span>Share the 6-letter PIN with friends to join</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
