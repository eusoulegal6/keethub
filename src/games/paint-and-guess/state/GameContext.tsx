import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRealtime, type RoomChannel } from "@/games/paint-and-guess/hooks/useRealtime";
import type { AvatarConfig } from "@/lib/avatar/config";

// ── Types ─────────────────────────────────────────────────────

interface Player {
  id: string;
  name: string;
  score: number;
  isReady: boolean;
  avatar?: string | AvatarConfig;
}

type GamePhase = "lobby" | "drawing" | "round-ended" | "game-ended";

interface RoundState {
  number: number;
  drawer: Player | null;
  word: string | null;
  revealedWord: string | null;
  timeLeft: number;
  roundTime: number;
  winner: Player | null;
  deadlineAt: number | null;
}

interface GameState {
  roomId: string | null;
  playerName: string;
  ownerId: string | null;
  selfId: string | null;
  players: Player[];
  phase: GamePhase;
  round: RoundState;
  maxRounds: number;
}

interface GameContextType {
  gameState: GameState;
  isGameActive: boolean;
  isDrawer: boolean;
  currentDrawer: Player | null;
  currentWord: string | null;
  roundNumber: number;
  timeLeft: number;
  roundTime: number;
  revealedWord: string | null;
  roundWinner: Player | null;
  channel: RoomChannel | null;
  isConnected: boolean;
  joinRoom: (roomId: string, playerName: string, avatar?: string | AvatarConfig) => void;
  createRoom: (roomName: string, isPublic?: boolean, wordPack?: string) => Promise<string>;
  leaveRoom: () => void;
  startGame: () => void;
  setReadyState: (isReady: boolean) => void;
  updateAvatar: (avatar: string | AvatarConfig) => void;
  sendGuess: (guess: string) => void;
  sendChatMessage: (message: string) => void;
  sendDrawingEvent: (event: any) => void;
  clearCanvas: () => void;
  chatMessages: ChatMessage[];
}

interface ChatMessage {
  id: string;
  player: { id: string; name: string };
  message: string;
  timestamp: number;
  type: "message" | "correct-guess" | "wrong-guess" | "system";
}

// ── Helpers ───────────────────────────────────────────────────

function createInitialRoundState(): RoundState {
  return {
    number: 0,
    drawer: null,
    word: null,
    revealedWord: null,
    timeLeft: 60,
    roundTime: 60,
    winner: null,
    deadlineAt: null,
  };
}

function createInitialGameState(): GameState {
  return {
    roomId: null,
    playerName: "",
    ownerId: null,
    selfId: null,
    players: [],
    phase: "lobby",
    round: createInitialRoundState(),
    maxRounds: 6,
  };
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────

export function GameProvider({ children }: { children: ReactNode }) {
  const { joinRoomChannel, leaveRoomChannel } = useRealtime();
  const [gameState, setGameState] = useState<GameState>(createInitialGameState());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [channel, setChannel] = useState<RoomChannel | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const channelRef = { current: null as RoomChannel | null };

  // ── Cleanup on unmount ──────────────────────────────────────
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, []);

  // ── Room event subscriber ───────────────────────────────────
  const subscribeToRoom = useCallback((roomId: string) => {
    const roomChannel = joinRoomChannel(roomId);
    channelRef.current = roomChannel;
    setChannel(roomChannel);

    roomChannel.subscribe("player-joined", (payload: any) => {
      toast.success(`${payload.playerName} joined`);
      fetchRoomPlayers(roomId);
    });

    roomChannel.subscribe("player-left", (payload: any) => {
      toast.info(`${payload.playerName} left`);
      fetchRoomPlayers(roomId);
    });

    roomChannel.subscribe("player-ready", (payload: any) => {
      fetchRoomPlayers(roomId);
    });

    roomChannel.subscribe("game-started", (payload: any) => {
      setGameState((prev) => ({
        ...prev,
        phase: "drawing",
        round: {
          ...prev.round,
          number: payload.roundNumber || 1,
          drawer: payload.drawer || null,
          timeLeft: payload.roundTime ?? prev.round.roundTime,
          roundTime: payload.roundTime ?? prev.round.roundTime,
          deadlineAt: payload.deadlineAt ?? null,
          revealedWord: null,
          winner: null,
          word: null,
        },
      }));
      toast.info("Game started!");
    });

    roomChannel.subscribe("draw-word", (payload: any) => {
      setGameState((prev) => ({
        ...prev,
        round: { ...prev.round, word: payload.word },
      }));
    });

    roomChannel.subscribe("round-started", (payload: any) => {
      setGameState((prev) => ({
        ...prev,
        phase: "drawing",
        round: {
          number: payload.roundNumber,
          drawer: payload.drawer || null,
          word: null,
          revealedWord: null,
          timeLeft: payload.roundTime,
          roundTime: payload.roundTime,
          winner: null,
          deadlineAt: payload.deadlineAt ?? null,
        },
      }));
      window.dispatchEvent(new CustomEvent("round-started"));
      toast.info(`Round ${payload.roundNumber} - ${
        payload.drawer?.name || "Someone"
      } is drawing!`);
    });

    roomChannel.subscribe("round-ended", (payload: any) => {
      setGameState((prev) => ({
        ...prev,
        phase: "round-ended",
        players: payload.players ?? prev.players,
        round: {
          ...prev.round,
          number: payload.roundNumber ?? prev.round.number,
          word: null,
          revealedWord: payload.word ?? prev.round.revealedWord,
        },
      }));
      window.dispatchEvent(new CustomEvent("round-ended"));
      toast.info(`Round ended! The word was: ${payload.word}`);
    });

    roomChannel.subscribe("game-ended", (payload: any) => {
      setGameState((prev) => ({
        ...prev,
        phase: "game-ended",
        players: payload.players ?? prev.players,
      }));
      toast.info("Game over!");
    });

    roomChannel.subscribe("correct-guess", (payload: any) => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          player: payload.player,
          message: `Correctly guessed! +${payload.points} points`,
          timestamp: Date.now(),
          type: "correct-guess",
        },
      ]);
      if (payload.player.id !== gameState.selfId) {
        toast.success(`${payload.player.name} guessed correctly!`);
      }
      fetchRoomPlayers(roomId);
    });

    roomChannel.subscribe("wrong-guess", (payload: any) => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          player: payload.player,
          message: payload.guess,
          timestamp: Date.now(),
          type: "wrong-guess",
        },
      ]);
    });

    roomChannel.subscribe("chat-message", (payload: any) => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: payload.timestamp?.toString() || Date.now().toString(),
          player: payload.player,
          message: payload.message,
          timestamp: payload.timestamp || Date.now(),
          type: "message",
        },
      ]);
    });

    roomChannel.subscribe("drawing:path-start", () => {});
    roomChannel.subscribe("drawing:path-update", (payload: any) => {
      window.dispatchEvent(new CustomEvent("drawing-event", { detail: payload }));
    });
    roomChannel.subscribe("drawing:path-complete", (payload: any) => {
      window.dispatchEvent(new CustomEvent("drawing-event", { detail: payload }));
    });
    roomChannel.subscribe("canvas-cleared", () => {
      window.dispatchEvent(new CustomEvent("canvas-cleared"));
    });

    return roomChannel;
  }, [joinRoomChannel, gameState.selfId, fetchRoomPlayers]);

  // ── Fetch players helper ─────────────────────────────────────
  function fetchRoomPlayers(roomId: string) {
    // Read state directly from DB for authoritative player list
    supabase
      .from("game_room_players")
      .select("*")
      .eq("room_id", roomId)
      .then(({ data, error }) => {
        if (error) return;
        setGameState((prev) => ({
          ...prev,
          players: (data || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            score: p.score,
            isReady: p.is_ready,
            avatar: p.avatar,
          })),
        }));
      });
  }

  // ── Game actions ─────────────────────────────────────────────

  const joinRoom = useCallback(async (
    roomId: string,
    playerName: string,
    _avatar?: string | AvatarConfig,
  ) => {
    const channel = subscribeToRoom(roomId);

    setGameState((prev) => ({
      ...prev,
      roomId,
      playerName,
    }));

    // Get current room state from server
    const { data } = await supabase.rpc("get_paint_room_state", { room_id: roomId });
    const state = data as any;

    if (state?.success && state.room) {
      setGameState((prev) => ({
        ...prev,
        roomId,
        playerName,
        ownerId: state.room.ownerId,
        players: (state.players || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          score: p.score,
          isReady: p.isReady,
          avatar: p.avatar,
        })),
        phase: state.room.isGameActive ? "drawing" : "lobby",
        maxRounds: state.room.maxRounds,
        round: {
          ...prev.round,
          number: state.room.roundNumber,
          timeLeft: state.room.roundTime,
          roundTime: state.room.roundTime,
          deadlineAt: state.room.deadlineAt,
        },
      }));
    }
  }, [subscribeToRoom]);

  const createRoom = useCallback(async (
    roomName: string,
    _isPublic?: boolean,
    wordPack?: string,
  ): Promise<string> => {
    const { data, error } = await supabase.rpc("create_paint_room", {
      room_name: roomName,
      word_pack: wordPack || "classic",
    });

    if (error) throw error;
    const result = data as any;
    if (!result?.success) throw new Error("Failed to create room");
    return result.roomId;
  }, []);

  const leaveRoom = useCallback(() => {
    if (gameState.roomId) {
      const roomId = gameState.roomId;
      void (async () => {
        try {
          await supabase.rpc("leave_paint_room", {
            room_id: roomId,
          });
        } catch {
          // Best-effort cleanup; local state is reset regardless.
        }
      })();
      leaveRoomChannel(roomId);
    }
    setGameState(createInitialGameState());
    setChatMessages([]);
    setChannel(null);
  }, [gameState.roomId, leaveRoomChannel]);

  const startGame = useCallback(async () => {
    if (!gameState.roomId || !channelRef.current) return;

    const { data, error } = await supabase.rpc("start_paint_game", {
      room_id: gameState.roomId,
    });

    if (error || !(data as any)?.success) {
      toast.error((data as any)?.error || "Failed to start game");
      return;
    }

    const result = data as any;

    // Broadcast to all players
    channelRef.current.broadcast("game-started", {
      drawer: result.drawer,
      roundTime: result.roundTime,
      roundNumber: result.roundNumber,
      deadlineAt: Date.now() + result.roundTime * 1000,
    });

    channelRef.current.broadcast("round-started", {
      drawer: result.drawer,
      roundTime: result.roundTime,
      roundNumber: result.roundNumber,
      deadlineAt: Date.now() + result.roundTime * 1000,
    });

    channelRef.current.broadcast("canvas-cleared", {});

    setGameState((prev) => ({
      ...prev,
      phase: "drawing",
      players: prev.players.map((p) => ({
        ...p,
        hasGuessed: false,
        isReady: false,
      })),
      round: {
        number: 1,
        drawer: result.drawer,
        word: result.word,
        revealedWord: null,
        timeLeft: result.roundTime,
        roundTime: result.roundTime,
        winner: null,
        deadlineAt: Date.now() + result.roundTime * 1000,
      },
    }));
    toast.info(`Your word: ${result.word}`);
  }, [gameState.roomId]);

  const setReadyState = useCallback(async (isReady: boolean) => {
    if (!gameState.roomId || !channelRef.current) return;

    await supabase.rpc("set_player_ready", {
      room_id: gameState.roomId,
      is_ready: isReady,
    });

    channelRef.current.broadcast("player-ready", { isReady });
    fetchRoomPlayers(gameState.roomId);
  }, [gameState.roomId, fetchRoomPlayers]);

  const updateAvatar = useCallback((_avatar: string | AvatarConfig) => {
    // Avatar is stored client-side in localStorage; the old server stored it
    // in the backend profiles table. For now this is a no-op on the server side.
  }, []);

  const sendGuess = useCallback(async (guess: string) => {
    if (!gameState.roomId || !channelRef.current) return;

    const { data } = await supabase.rpc("submit_paint_guess", {
      room_id: gameState.roomId,
      guess,
    });

    const result = data as any;
    const player = gameState.players.find((p) => {
      return p.id === gameState.selfId;
    }) || { id: gameState.selfId || "", name: gameState.playerName };

    if (result?.correct) {
      channelRef.current.broadcast("correct-guess", {
        player,
        points: result.points,
      });
    } else if (!result?.already_guessed) {
      channelRef.current.broadcast("wrong-guess", {
        player,
        guess,
      });
    }
  }, [gameState.roomId, gameState.players, gameState.selfId, gameState.playerName]);

  const sendChatMessage = useCallback((message: string) => {
    if (!channelRef.current) return;
    const player = gameState.players.find((p) => p.id === gameState.selfId)
      || { id: gameState.selfId || "", name: gameState.playerName };

    channelRef.current.broadcast("chat-message", {
      player,
      message,
      timestamp: Date.now(),
    });
  }, [gameState.players, gameState.selfId, gameState.playerName]);

  const sendDrawingEvent = useCallback((event: any) => {
    if (!channelRef.current) return;
    const isDrawer = gameState.selfId !== null
      && gameState.round.drawer?.id === gameState.selfId;
    if (!isDrawer) return;

    // Map Fabric.js event types to broadcast events
    if (event.type === "path-start") {
      channelRef.current.broadcast("drawing:path-start", event);
    } else if (event.type === "path-update") {
      channelRef.current.broadcast("drawing:path-update", event);
    } else if (event.type === "path-complete") {
      channelRef.current.broadcast("drawing:path-complete", event);
    } else if (event.type === "path") {
      channelRef.current.broadcast("drawing:path-complete", event);
    }
  }, [gameState.selfId, gameState.round.drawer]);

  const clearCanvas = useCallback(() => {
    if (!channelRef.current) return;
    const isDrawer = gameState.selfId !== null
      && gameState.round.drawer?.id === gameState.selfId;
    if (!isDrawer) return;
    channelRef.current.broadcast("canvas-cleared", {});
  }, [gameState.selfId, gameState.round.drawer]);

  // ── Timer (client-side countdown from server deadline) ───────
  useEffect(() => {
    const deadline = gameState.round.deadlineAt;
    if (!deadline || gameState.phase !== "drawing") return;

    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
      setGameState((prev) => ({
        ...prev,
        round: { ...prev.round, timeLeft: remaining },
      }));

      if (remaining <= 0) {
        // Round ended by timeout — trigger advance
        if (gameState.roomId) {
          advanceRound(gameState.roomId);
        }
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [gameState.round.deadlineAt, gameState.phase]);

  const advanceRound = useCallback(async (roomId: string) => {
    const { data } = await supabase.rpc("advance_paint_round", { room_id: roomId });
    const result = data as any;

    if (!result?.success || !channelRef.current) return;

    if (result.gameEnded) {
      channelRef.current.broadcast("game-ended", {
        scores: result.scores,
      });
    } else {
      // Get the previous word from the response
      await new Promise((r) => setTimeout(r, 3000)); // 3s delay between rounds

      channelRef.current.broadcast("round-ended", {
        word: result.previousWord || "",
        roundNumber: result.roundNumber - 1,
      });

      // After delay, start next round
      channelRef.current.broadcast("round-started", {
        drawer: result.drawer,
        roundTime: result.roundTime,
        roundNumber: result.roundNumber,
        deadlineAt: Date.now() + result.roundTime * 1000,
      });

      channelRef.current.broadcast("canvas-cleared", {});
    }
  }, []);

  // ── Computed values ──────────────────────────────────────────
  const isGameActive = gameState.phase !== "lobby" && gameState.phase !== "game-ended";
  const isDrawer = gameState.selfId !== null
    && gameState.round.drawer?.id === gameState.selfId;
  const currentDrawer = gameState.round.drawer;
  const currentWord = isDrawer ? gameState.round.word : null;
  const roundNumber = gameState.round.number;
  const timeLeft = gameState.round.timeLeft;
  const roundTime = gameState.round.roundTime;
  const revealedWord = gameState.round.revealedWord;
  const roundWinner = gameState.round.winner;

  return (
    <GameContext.Provider
      value={{
        gameState,
        isGameActive,
        isDrawer,
        currentDrawer,
        currentWord,
        roundNumber,
        timeLeft,
        roundTime,
        revealedWord,
        roundWinner,
        channel,
        isConnected,
        joinRoom,
        createRoom,
        leaveRoom,
        startGame,
        setReadyState,
        updateAvatar,
        sendGuess,
        sendChatMessage,
        sendDrawingEvent,
        clearCanvas,
        chatMessages,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (ctx === undefined) {
    throw new Error("useGame must be used within GameProvider");
  }
  return ctx;
}
