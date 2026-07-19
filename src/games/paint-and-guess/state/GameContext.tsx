import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRealtime, type RoomChannel } from "@/games/paint-and-guess/hooks/useRealtime";
import type { AvatarConfig } from "@/lib/avatar/config";

// ── Types ─────────────────────────────────────────────────────

interface Player {
  id: string;
  userId: string | null;  // auth.uid() — used for host comparison
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
  gamePin: string | null;
  playerName: string;
  ownerId: string | null;   // auth.uid() of the room host
  selfId: string | null;    // player row UUID from game_room_players
  authUserId: string | null; // auth.uid() for host comparison
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
  joinRoom: (
    roomId: string,
    playerName: string,
    avatar?: string | AvatarConfig,
    knownGamePin?: string | null,
  ) => Promise<void>;
  createRoom: (
    roomName: string,
    isPublic?: boolean,
    wordPack?: string,
  ) => Promise<{ roomId: string; gamePin: string | null }>;
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
    gamePin: null,
    playerName: "",
    ownerId: null,
    selfId: null,
    authUserId: null,
    players: [],
    phase: "lobby",
    round: createInitialRoundState(),
    maxRounds: 6,
  };
}

function createChatMessage(
  player: { id: string; name: string },
  message: string,
  type: ChatMessage["type"],
  timestamp = Date.now(),
): ChatMessage {
  return {
    id: `${timestamp}-${Math.random().toString(36).slice(2)}`,
    player,
    message,
    timestamp,
    type,
  };
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────

export function GameProvider({ children }: { children: ReactNode }) {
  const { joinRoomChannel, leaveRoomChannel } = useRealtime();
  const [gameState, setGameState] = useState<GameState>(createInitialGameState());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isConnected] = useState(true);
  const channelRef = useRef<RoomChannel | null>(null);
  const timerRef = useRef<number | null>(null);
  const advanceCalledRef = useRef(false);

  // ── Cleanup on unmount ──────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      channelRef.current?.unsubscribe();
    };
  }, []);

  // ── Fetch players helper ─────────────────────────────────────
  const fetchRoomPlayers = useCallback(async (roomId: string) => {
    const { data, error } = await supabase
      .from("game_room_players")
      .select("*")
      .eq("room_id", roomId);

    if (error) return;

    let playerList = (data || []).map((p: any) => ({
      id: p.id,
      userId: p.user_id ?? null,
      name: p.name,
      score: p.score,
      isReady: p.is_ready,
      avatar: p.avatar,
    }));

    // If selfId not yet set, find it by matching auth user to player user_id
    // (only needed until the migration adding userId to get_paint_room_state runs)
    let foundSelfId: string | null = null;
    if (data?.length) {
      const { data: authData } = await supabase.auth.getUser();
      const authUserId = authData.user?.id;
      if (authUserId) {
        const selfRow = data.find((p: any) => p.user_id === authUserId);
        if (selfRow) foundSelfId = selfRow.id;
      }
    }

    setGameState((prev) => ({
      ...prev,
      selfId: prev.selfId || foundSelfId || null,
      players: playerList,
    }));
  }, []);

  // ── Room event subscriber ───────────────────────────────────
  const subscribeToRoom = useCallback(
    (roomId: string) => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      const roomChannel = joinRoomChannel(roomId);
      channelRef.current = roomChannel;

      roomChannel.subscribe("player-joined", () => {
        fetchRoomPlayers(roomId);
      });

      roomChannel.subscribe("player-left", () => {
        fetchRoomPlayers(roomId);
      });

      roomChannel.subscribe("player-ready", () => {
        fetchRoomPlayers(roomId);
      });

      roomChannel.subscribe("player-avatar", (payload: any) => {
        setGameState((prev) => ({
          ...prev,
          players: prev.players.map((player) =>
            player.id === payload.playerId ? { ...player, avatar: payload.avatar } : player,
          ),
        }));
      });

      roomChannel.subscribe("game-started", (payload: any) => {
        setGameState((prev) => ({
          ...prev,
          phase: "drawing",
          round: {
            number: payload.roundNumber || 1,
            drawer: payload.drawer || null,
            word: payload.word || null,
            timeLeft: payload.roundTime ?? prev.round.roundTime,
            roundTime: payload.roundTime ?? prev.round.roundTime,
            deadlineAt: payload.deadlineAt ?? null,
            revealedWord: null,
            winner: null,
          },
        }));
        toast.info("Game started!");
      });

      roomChannel.subscribe("round-started", (payload: any) => {
        advanceCalledRef.current = false;
        setChatMessages([]);
        setGameState((prev) => ({
          ...prev,
          phase: "drawing",
          round: {
            number: payload.roundNumber,
            drawer: payload.drawer || null,
            word: payload.word || null,
            revealedWord: null,
            timeLeft: payload.roundTime,
            roundTime: payload.roundTime,
            winner: null,
            deadlineAt: payload.deadlineAt ?? null,
          },
        }));
        fetchRoomPlayers(roomId);
        window.dispatchEvent(new CustomEvent("round-started"));
      });

      roomChannel.subscribe("round-ended", (payload: any) => {
        advanceCalledRef.current = false;
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
      });

      roomChannel.subscribe("game-ended", (payload: any) => {
        advanceCalledRef.current = false;
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
        if (payload.player.name !== gameState.playerName) {
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
    },
    [joinRoomChannel, gameState.playerName, fetchRoomPlayers],
  );

  // ── advanceRound (shared by timer and sendGuess) ─────────────
  const advanceRound = useCallback(async (roomId: string) => {
    if (advanceCalledRef.current) return;
    advanceCalledRef.current = true;

    const { data } = await supabase.rpc("advance_paint_round", { p_room_id: roomId });
    const result = data as any;

    if (!result?.success || !channelRef.current) {
      advanceCalledRef.current = false;
      return;
    }

    if (result.gameEnded) {
      channelRef.current.broadcast("game-ended", { players: result.scores });
      // Update local scores
      if (Array.isArray(result.scores)) {
        setGameState((prev) => ({
          ...prev,
          phase: "game-ended",
          players: result.scores.map((s: any) => ({
            id: s.id,
            userId: s.userId ?? null,
            name: s.name,
            score: s.score,
            isReady: false,
          })),
        }));
      }
      return;
    }

    // Round ended
    channelRef.current.broadcast("round-ended", {
      word: result.previousWord || "",
      roundNumber: result.roundNumber - 1,
      players: result.players,
    });

    // 3-second delay then start next round
    await new Promise((r) => setTimeout(r, 3000));

    // Verify still in room (not left during delay)
    if (!channelRef.current || channelRef.current.id !== roomId) return;

    channelRef.current.broadcast("round-started", {
      drawer: result.drawer,
      roundTime: result.roundTime,
      roundNumber: result.roundNumber,
      word: result.word,
      deadlineAt: result.deadlineAt
        ? new Date(result.deadlineAt).getTime()
        : Date.now() + result.roundTime * 1000,
    });

    channelRef.current.broadcast("canvas-cleared", {});
  }, []);

  // ── Timer (client-side countdown from server deadline) ───────
  useEffect(() => {
    const deadline = gameState.round.deadlineAt;
    if (!deadline || gameState.phase !== "drawing") {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
      setGameState((prev) => ({
        ...prev,
        round: { ...prev.round, timeLeft: remaining },
      }));

      if (remaining <= 0 && gameState.roomId && !advanceCalledRef.current) {
        advanceRound(gameState.roomId);
      }
    };

    tick(); // immediate first tick
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(tick, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [gameState.round.deadlineAt, gameState.phase, gameState.roomId, advanceRound]);

  // ── Game actions ─────────────────────────────────────────────

  const joinRoom = useCallback(
    async (
      roomId: string,
      playerName: string,
      _avatar?: string | AvatarConfig,
      knownGamePin?: string | null,
    ) => {
      subscribeToRoom(roomId);

      // Set roomId synchronously so entry.tsx can transition the view
      setGameState((prev) => ({
        ...prev,
        roomId,
        gamePin: knownGamePin ?? prev.gamePin,
        playerName,
      }));

      // Fetch authoritative room state
      const { data } = await supabase.rpc("get_paint_room_state", { room_id: roomId });
      const state = data as any;

      if (!state?.success || !state.room) return;

      // Find selfId: first try userId field from DB, fall back to matching by name
      let selfId: string | null = null;
      const { data: authData } = await supabase.auth.getUser();
      const authUserId = authData.user?.id;

      const players = (state.players || []).map((p: any) => {
        if (authUserId && p.userId === authUserId) selfId = p.id;
        return {
          id: p.id,
          userId: p.userId ?? null,
          name: p.name,
          score: p.score,
          isReady: p.isReady ?? false,
          avatar: p.avatar,
        };
      });

      // Fallback: match by playerName if userId didn't match
      if (!selfId) {
        const byName = players.find((p: any) => p.name.toLowerCase() === playerName.toLowerCase());
        if (byName) selfId = byName.id;
      }

      // Use server deadline if available, otherwise compute from roundTime
      const serverDeadline = state.room.deadlineAt;
      const computedDeadline = serverDeadline
        ? serverDeadline // server already returns epoch ms
        : state.room.isGameActive
          ? Date.now() + state.room.roundTime * 1000
          : null;

      setGameState((prev) => ({
        ...prev,
        roomId,
        gamePin: state.room.gamePin ?? knownGamePin ?? prev.gamePin,
        playerName,
        selfId,
        authUserId: authUserId ?? null,
        ownerId: state.room.ownerId,
        players,
        phase: state.room.isGameActive ? "drawing" : "lobby",
        maxRounds: state.room.maxRounds,
        round: {
          ...prev.round,
          number: state.room.roundNumber,
          timeLeft: state.room.roundTime,
          roundTime: state.room.roundTime,
          deadlineAt: computedDeadline,
        },
      }));

      // Broadcast arrival to other players
      channelRef.current?.broadcast("player-joined", {
        playerName,
        playerId: selfId,
      });
    },
    [subscribeToRoom],
  );

  const createRoom = useCallback(
    async (
      roomName: string,
      _isPublic?: boolean,
      wordPack?: string,
    ): Promise<{ roomId: string; gamePin: string | null }> => {
      const { data, error } = await supabase.rpc("create_paint_room", {
        room_name: roomName,
        word_pack: wordPack || "classic",
      });

      if (error) throw error;
      const result = data as any;
      if (!result?.success) throw new Error("Failed to create room");
      return {
        roomId: result.roomId,
        gamePin: result.gamePin ?? null,
      };
    },
    [],
  );

  const leaveRoom = useCallback(() => {
    const roomId = gameState.roomId;
    if (roomId && channelRef.current) {
      channelRef.current.broadcast("player-left", {
        playerName: gameState.playerName,
        playerId: gameState.selfId,
      });
      channelRef.current.unsubscribe();
      channelRef.current = null;
      // Best-effort server cleanup
      void (async () => {
        try {
          await supabase.rpc("leave_paint_room", { p_room_id: roomId });
        } catch {
          // Ignore best-effort cleanup failures during local leave.
        }
      })();
      leaveRoomChannel(roomId);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    advanceCalledRef.current = false;
    setGameState(createInitialGameState());
    setChatMessages([]);
  }, [gameState.roomId, gameState.playerName, gameState.selfId, leaveRoomChannel]);

  const startGame = useCallback(async () => {
    if (!gameState.roomId || !channelRef.current) return;

    const { data, error } = await supabase.rpc("start_paint_game", {
      p_room_id: gameState.roomId,
    });

    if (error || !(data as any)?.success) {
      toast.error((data as any)?.error || "Failed to start game");
      return;
    }

    const result = data as any;
    // Convert server TIMESTAMPTZ to epoch ms
    const deadlineMs = result.deadlineAt
      ? new Date(result.deadlineAt).getTime()
      : Date.now() + result.roundTime * 1000;

    channelRef.current.broadcast("game-started", {
      drawer: result.drawer,
      roundTime: result.roundTime,
      roundNumber: result.roundNumber,
      word: result.word,
      deadlineAt: deadlineMs,
    });

    channelRef.current.broadcast("round-started", {
      drawer: result.drawer,
      roundTime: result.roundTime,
      roundNumber: result.roundNumber,
      word: result.word,
      deadlineAt: deadlineMs,
    });

    channelRef.current.broadcast("canvas-cleared", {});

    setGameState((prev) => ({
      ...prev,
      phase: "drawing",
      round: {
        number: 1,
        drawer: result.drawer,
        word: result.word,
        revealedWord: null,
        timeLeft: result.roundTime,
        roundTime: result.roundTime,
        winner: null,
        deadlineAt: deadlineMs,
      },
    }));
    toast.info(`Your word: ${result.word}`);
  }, [gameState.roomId]);

  const setReadyState = useCallback(
    async (isReady: boolean) => {
      if (!gameState.roomId || !channelRef.current) return;

      await supabase.rpc("set_player_ready", {
        room_id: gameState.roomId,
        is_ready: isReady,
      });

      // Optimistic local update
      setGameState((prev) => ({
        ...prev,
        players: prev.players.map((p) => (p.id === prev.selfId ? { ...p, isReady } : p)),
      }));

      channelRef.current.broadcast("player-ready", { isReady });
      // Also refresh from server to keep everyone in sync
      fetchRoomPlayers(gameState.roomId);
    },
    [gameState.roomId, gameState.selfId, fetchRoomPlayers],
  );

  const updateAvatar = useCallback(
    (avatar: string | AvatarConfig) => {
      setGameState((prev) => ({
        ...prev,
        players: prev.players.map((player) =>
          player.id === prev.selfId ? { ...player, avatar } : player,
        ),
      }));

      if (gameState.selfId) {
        channelRef.current?.broadcast("player-avatar", {
          playerId: gameState.selfId,
          avatar,
        });
      }
    },
    [gameState.selfId],
  );

  const sendGuess = useCallback(
    async (guess: string) => {
      if (!gameState.roomId || !channelRef.current) return;

      const { data } = await supabase.rpc("submit_paint_guess", {
        p_room_id: gameState.roomId,
        p_guess: guess,
      });

      const result = data as any;
      const player = gameState.players.find((p) => p.id === gameState.selfId) || {
        id: gameState.selfId || "",
        name: gameState.playerName,
      };

      if (result?.correct) {
        setChatMessages((prev) => [
          ...prev,
          createChatMessage(player, `Correctly guessed! +${result.points} points`, "correct-guess"),
        ]);
        channelRef.current.broadcast("correct-guess", {
          player,
          points: result.points,
        });
        fetchRoomPlayers(gameState.roomId);

        void advanceRound(gameState.roomId);
      } else if (!result?.already_guessed) {
        setChatMessages((prev) => [...prev, createChatMessage(player, guess, "wrong-guess")]);
        channelRef.current.broadcast("wrong-guess", { player, guess });
      }
    },
    [
      gameState.roomId,
      gameState.players,
      gameState.selfId,
      gameState.playerName,
      advanceRound,
      fetchRoomPlayers,
    ],
  );

  const sendChatMessage = useCallback(
    (message: string) => {
      if (!channelRef.current) return;
      const player = gameState.players.find((p) => p.id === gameState.selfId) || {
        id: gameState.selfId || "",
        name: gameState.playerName,
      };
      const timestamp = Date.now();

      setChatMessages((prev) => [
        ...prev,
        createChatMessage(player, message, "message", timestamp),
      ]);

      channelRef.current.broadcast("chat-message", {
        player,
        message,
        timestamp,
      });
    },
    [gameState.players, gameState.selfId, gameState.playerName],
  );

  const sendDrawingEvent = useCallback(
    (event: any) => {
      if (!channelRef.current) return;
      const isDrawer = gameState.selfId !== null && gameState.round.drawer?.id === gameState.selfId;
      if (!isDrawer) return;

      if (event.type === "path-start") {
        channelRef.current.broadcast("drawing:path-start", event);
      } else if (event.type === "path-update") {
        channelRef.current.broadcast("drawing:path-update", event);
      } else if (event.type === "path-complete") {
        channelRef.current.broadcast("drawing:path-complete", event);
      } else if (event.type === "path") {
        channelRef.current.broadcast("drawing:path-complete", event);
      }
    },
    [gameState.selfId, gameState.round.drawer],
  );

  const clearCanvas = useCallback(() => {
    if (!channelRef.current) return;
    const isDrawer = gameState.selfId !== null && gameState.round.drawer?.id === gameState.selfId;
    if (!isDrawer) return;
    channelRef.current.broadcast("canvas-cleared", {});
  }, [gameState.selfId, gameState.round.drawer]);

  // ── Computed values ──────────────────────────────────────────
  const isGameActive = gameState.phase !== "lobby" && gameState.phase !== "game-ended";
  const isDrawer = gameState.selfId !== null && gameState.round.drawer?.id === gameState.selfId;
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
        channel: channelRef.current,
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
