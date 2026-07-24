import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Crown, LogOut, Play, Users, Copy, Clipboard } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ChessRoomState } from "../hooks/useChessMultiplayer";

interface Props {
  state: ChessRoomState | null;
  action: string | null;
  onCreateRoom: (name: string) => Promise<{ roomId: string; roomCode: string }>;
  onJoinRoom: (code: string) => Promise<void>;
  onLeaveRoom: () => Promise<void>;
  onStartGame: () => Promise<void>;
}

export default function MultiplayerLobby({
  state,
  action,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onStartGame,
}: Props) {
  const [createName, setCreateName] = useState("Chess Room");
  const [joinCode, setJoinCode] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isInRoom = state !== null;
  const isHost = state?.isOwner ?? false;
  const code = state?.room.code ?? createdCode;
  const players = state?.players ?? [];
  const bothConnected = players.length >= 2 && players.every((p) => p.isConnected);

  const handleCreate = useCallback(async () => {
    setError(null);
    try {
      const result = await onCreateRoom(createName);
      setCreatedCode(result.roomCode);
      toast.success(`Room created! Code: ${result.roomCode}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create room");
    }
  }, [createName, onCreateRoom]);

  const handleJoin = useCallback(async () => {
    setError(null);
    try {
      await onJoinRoom(joinCode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join room");
    }
  }, [joinCode, onJoinRoom]);

  const copyCode = () => {
    if (code) {
      void navigator.clipboard.writeText(code);
      toast.success("Code copied!");
    }
  };

  // ── In-room lobby ───────────────────────────────────────────────
  if (isInRoom) {
    return (
      <div className="max-w-lg mx-auto px-4 py-4 md:py-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
            {state.room.name}
          </h1>
          <div className="flex items-center justify-center gap-3 text-muted-foreground">
            <span className="text-lg font-mono tracking-wider font-bold">{code}</span>
            <button
              type="button"
              onClick={copyCode}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Waiting for opponent...
          </p>
        </div>

        {/* Player list */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Players ({players.length}/2)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {players.map((player) => (
              <div
                key={player.id}
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2",
                  player.isConnected ? "bg-muted/30" : "bg-muted/10 opacity-50",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {player.color === "white" ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white border-2 border-gray-300 text-xs font-bold text-gray-700">
                        &nbsp;
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-800 border-2 border-gray-600 text-xs font-bold text-white">
                        &nbsp;
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{player.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{player.color}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {player.userId === state.room.ownerId && (
                    <Crown className="w-4 h-4 text-yellow-500" />
                  )}
                  {!player.isConnected && (
                    <span className="text-xs text-muted-foreground">Disconnected</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onLeaveRoom().catch(() => {})}
            disabled={action !== null}
            className="flex-shrink-0"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Leave
          </Button>

          {isHost && (
            <Button
              className="flex-1 glow-primary"
              disabled={!bothConnected || action !== null}
              onClick={() => onStartGame().catch((e) => toast.error(e instanceof Error ? e.message : "Failed"))}
            >
              <Play className="w-4 h-4 mr-2" />
              {!bothConnected ? "Waiting for opponent..." : "Start Game"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Join/Create panel ───────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto px-4 py-4 md:py-8">
      <div className="text-center mb-6">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3">
          Chess
        </h1>
        <p className="text-muted-foreground text-base md:text-lg max-w-md mx-auto">
          Play against a friend in real time. Create a room or join one with a PIN.
        </p>
      </div>

      {error && (
        <Card className="mb-4 border-destructive/50 bg-destructive/5">
          <CardContent className="py-3 text-center text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {/* Create */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create a Room</CardTitle>
            <CardDescription>Start a new game and send the code to a friend</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {createdCode ? (
              <div className="text-center py-2">
                <p className="text-sm text-muted-foreground mb-2">Share this code:</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl font-mono font-bold tracking-widest">{createdCode}</span>
                  <button
                    type="button"
                    onClick={copyCode}
                    className="p-1.5 rounded-md hover:bg-muted transition-colors"
                  >
                    <Clipboard className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Waiting for opponent to join...</p>
              </div>
            ) : (
              <>
                <Input
                  placeholder="Room name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                />
                <Button className="w-full" disabled={action !== null} onClick={handleCreate}>
                  Create Room
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Join */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Join a Room</CardTitle>
            <CardDescription>Enter a 6-digit PIN to join</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="000000"
              maxLength={6}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            <Button
              variant="outline"
              className="w-full"
              disabled={joinCode.length !== 6 || action !== null}
              onClick={handleJoin}
            >
              Join Room
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
