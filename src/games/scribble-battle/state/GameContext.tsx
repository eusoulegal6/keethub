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
import { useSBRealtime, type SBChannel } from "@/games/scribble-battle/hooks/useRealtime";
import type { AvatarConfig } from "@/lib/avatar/config";

// ── Types ─────────────────────────────────────────────────────

interface SBPlayer {
  id: string;
  userId: string | null;
  name: string;
  team: 1 | 2;
  score: number;
  isReady: boolean;
  hasGuessed: boolean;
  isConnected: boolean;
  winStreak: number;
  avatar?: string | AvatarConfig;
}

type SBPhase = "lobby" | "regular" | "final" | "game-ended";

interface SBRoundState {
  number: number;
  team1Drawer: SBPlayer | null;
  team2Drawer: SBPlayer | null;
  word: string | null;
  revealedWord: string | null;
  timeLeft: number;
  roundTime: number;
  deadlineAt: number | null;
  winningTeam: 1 | 2 | null;
}

interface SBGameState {
  roomId: string | null;
  gamePin: string | null;
  playerName: string;
  ownerId: string | null;
  selfId: string | null;
  authUserId: string | null;
  team: 1 | 2 | null;
  team1: SBPlayer[];
  team2: SBPlayer[];
  phase: SBPhase;
  round: SBRoundState;
  maxRegularRounds: number;
  team1Score: number;
  team2Score: number;
  team1FinalProgress: number;
  team2FinalProgress: number;
  finalWords: string[];
  finalWordCount: number;
}

interface SBChatMessage {
  id: string;
  player: { id: string; name: string; team: 1 | 2 };
  message: string;
  timestamp: number;
  type: "message" | "correct-guess" | "wrong-guess" | "system";
}

interface SBGameContextType {
  gameState: SBGameState;
  isGameActive: boolean;
  isDrawer: boolean;
  channel: SBChannel | null;
  isConnected: boolean;
  chatMessages: SBChatMessage[];
  joinRoom: (
    roomId: string,
    playerName: string,
    team?: 1 | 2,
    knownGamePin?: string | null,
  ) => Promise<void>;
  createRoom: (roomName: string, wordPack?: string) => Promise<{ roomId: string; gamePin: string | null }>;
  leaveRoom: () => void;
  startGame: () => void;
  setReadyState: (isReady: boolean) => void;
  switchTeam: (team: 1 | 2) => void;
  updateAvatar: (avatar: string | AvatarConfig) => void;
  sendGuess: (guess: string) => void;
  sendChatMessage: (message: string) => void;
  sendDrawingEvent: (event: any) => void;
  clearCanvas: () => void;
}

// ── Helpers ───────────────────────────────────────────────────

function createInitialRoundState(): SBRoundState {
  return {
    number: 0,
    team1Drawer: null,
    team2Drawer: null,
    word: null,
    revealedWord: null,
    timeLeft: 60,
    roundTime: 60,
    deadlineAt: null,
    winningTeam: null,
  };
}

function createInitialGameState(): SBGameState {
  return {
    roomId: null,
    gamePin: null,
    playerName: "",
    ownerId: null,
    selfId: null,
    authUserId: null,
    team: null,
    team1: [],
    team2: [],
    phase: "lobby",
    round: createInitialRoundState(),
    maxRegularRounds: 5,
    team1Score: 0,
    team2Score: 0,
    team1FinalProgress: 0,
    team2FinalProgress: 0,
    finalWords: [],
    finalWordCount: 0,
  };
}

const SBGameContext = createContext<SBGameContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────

export function GameProvider({ children }: { children: ReactNode }) {
  const { joinRoomChannel, leaveRoomChannel } = useSBRealtime();
  const [gameState, setGameState] = useState<SBGameState>(createInitialGameState());
  const [chatMessages, setChatMessages] = useState<SBChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<SBChannel | null>(null);
  const timerRef = useRef<number | null>(null);
  const advanceCalledRef = useRef(false);
  const advanceRoundRef = useRef<() => Promise<void>>(async () => {});
  const roomIdRef = useRef<string | null>(null);
  const phaseRef = useRef<SBPhase>("lobby");

  // Fetch auth user on mount so authUserId is always available
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled || !data.user?.id) return;
      console.log("[SB:provider] mount authUserId =", data.user.id);
      setGameState((prev) => ({
        ...prev,
        authUserId: prev.authUserId || data.user!.id,
      }));
    })();
    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
      channelRef.current?.unsubscribe();
    };
  }, []);

  const fetchRoomPlayers = useCallback(async (roomId: string) => {
    const { data, error } = await supabase
      .from("scribble_battle_players")
      .select("*")
      .eq("room_id", roomId);

    if (error) return;

    const mapPlayer = (p: any): SBPlayer => ({
      id: p.id,
      userId: p.user_id ?? null,
      name: p.name,
      team: p.team,
      score: p.score,
      isReady: p.is_ready,
      hasGuessed: p.has_guessed,
      isConnected: p.is_connected,
      winStreak: p.win_streak,
      avatar: p.avatar,
    });

    const playerList = (data || []).map(mapPlayer);

    let foundSelfId: string | null = null;
    let foundTeam: 1 | 2 | null = null;
    let foundAuthUserId: string | null = null;
    if (data?.length) {
      const { data: authData } = await supabase.auth.getUser();
      const authUserId = authData.user?.id;
      if (authUserId) {
        const selfRow = data.find((p: any) => p.user_id === authUserId);
        if (selfRow) {
          foundSelfId = selfRow.id;
          foundTeam = selfRow.team as 1 | 2;
        }
        foundAuthUserId = authUserId;
      }
    }

    setGameState((prev) => ({
      ...prev,
      selfId: prev.selfId || foundSelfId || null,
      team: foundTeam ?? prev.team,
      authUserId: prev.authUserId || foundAuthUserId || null,
      team1: playerList.filter((p) => p.team === 1),
      team2: playerList.filter((p) => p.team === 2),
    }));
  }, []);

  const subscribeToRoom = useCallback(
    (roomId: string) => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      const sbChan = joinRoomChannel(roomId);
      channelRef.current = sbChan;

      sbChan.onStatusChange((connected: boolean) => setIsConnected(connected));

      sbChan.subscribe("player-joined", () => fetchRoomPlayers(roomId));
      sbChan.subscribe("player-left", () => fetchRoomPlayers(roomId));
      sbChan.subscribe("player-ready", () => fetchRoomPlayers(roomId));
      sbChan.subscribe("team-switch", () => fetchRoomPlayers(roomId));

      sbChan.subscribe("player-avatar", (payload: any) => {
        setGameState((prev) => ({
          ...prev,
          team1: prev.team1.map((p) =>
            p.id === payload.playerId ? { ...p, avatar: payload.avatar } : p,
          ),
          team2: prev.team2.map((p) =>
            p.id === payload.playerId ? { ...p, avatar: payload.avatar } : p,
          ),
        }));
      });

      sbChan.subscribe("game-started", (payload: any) => {
        setGameState((prev) => ({
          ...prev,
          phase: "regular",
          round: {
            number: payload.roundNumber || 1,
            team1Drawer: payload.team1Drawer || null,
            team2Drawer: payload.team2Drawer || null,
            word: payload.word || null,
            timeLeft: payload.roundTime ?? prev.round.roundTime,
            roundTime: payload.roundTime ?? prev.round.roundTime,
            deadlineAt: payload.deadlineAt ?? null,
            revealedWord: null,
            winningTeam: null,
          },
        }));
        toast.info("Game started! Get ready to draw!");
      });

      sbChan.subscribe("round-started", (payload: any) => {
        advanceCalledRef.current = false;
        setChatMessages([]);
        setGameState((prev) => ({
          ...prev,
          phase: payload.phase || "regular",
          round: {
            number: payload.roundNumber,
            team1Drawer: payload.team1Drawer || null,
            team2Drawer: payload.team2Drawer || null,
            word: payload.word || null,
            revealedWord: null,
            timeLeft: payload.roundTime,
            roundTime: payload.roundTime,
            winningTeam: null,
            deadlineAt: payload.deadlineAt ?? null,
          },
          team1Score: payload.team1Score ?? prev.team1Score,
          team2Score: payload.team2Score ?? prev.team2Score,
        }));
        fetchRoomPlayers(roomId);
        window.dispatchEvent(new CustomEvent("round-started"));
      });

      sbChan.subscribe("round-ended", (payload: any) => {
        advanceCalledRef.current = false;
        setGameState((prev) => ({
          ...prev,
          phase: prev.phase === "regular" ? "regular" : "final",
          team1: payload.players
            ? (payload.players as any[]).filter((p: any) => p.team === 1).map((p: any) => ({
                id: p.id, userId: null, name: p.name, team: 1 as const,
                score: p.score, isReady: false, hasGuessed: false,
                isConnected: true, winStreak: 0, avatar: p.avatar,
              }))
            : prev.team1,
          team2: payload.players
            ? (payload.players as any[]).filter((p: any) => p.team === 2).map((p: any) => ({
                id: p.id, userId: null, name: p.name, team: 2 as const,
                score: p.score, isReady: false, hasGuessed: false,
                isConnected: true, winStreak: 0, avatar: p.avatar,
              }))
            : prev.team2,
          team1Score: payload.team1Score ?? prev.team1Score,
          team2Score: payload.team2Score ?? prev.team2Score,
          round: {
            ...prev.round,
            word: null,
            revealedWord: payload.previousWord ?? prev.round.revealedWord,
            winningTeam: payload.winningTeam ?? null,
          },
        }));
        window.dispatchEvent(new CustomEvent("round-ended"));
      });

      sbChan.subscribe("final-round-update", (payload: any) => {
        setGameState((prev) => ({
          ...prev,
          team1FinalProgress: payload.team1Final ?? prev.team1FinalProgress,
          team2FinalProgress: payload.team2Final ?? prev.team2FinalProgress,
        }));
      });

      sbChan.subscribe("game-ended", (payload: any) => {
        advanceCalledRef.current = false;
        setGameState((prev) => ({
          ...prev,
          phase: "game-ended",
          team1: payload.players
            ? (payload.players as any[]).filter((p: any) => p.team === 1).map((p: any) => ({
                id: p.id, userId: null, name: p.name, team: 1 as const,
                score: p.score, isReady: false, hasGuessed: false,
                isConnected: true, winStreak: 0,
              }))
            : prev.team1,
          team2: payload.players
            ? (payload.players as any[]).filter((p: any) => p.team === 2).map((p: any) => ({
                id: p.id, userId: null, name: p.name, team: 2 as const,
                score: p.score, isReady: false, hasGuessed: false,
                isConnected: true, winStreak: 0,
              }))
            : prev.team2,
          team1Score: payload.team1Score ?? prev.team1Score,
          team2Score: payload.team2Score ?? prev.team2Score,
          team1FinalProgress: payload.team1Final ?? prev.team1FinalProgress,
          team2FinalProgress: payload.team2Final ?? prev.team2FinalProgress,
        }));
        toast.info("Game over!");
      });

      sbChan.subscribe("correct-guess", (payload: any) => {
        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            player: payload.player,
            message: `Guessed correctly! +${payload.points} pts`,
            timestamp: Date.now(),
            type: "correct-guess" as const,
          },
        ]);
        if (payload.player.name !== gameState.playerName) {
          toast.success(`${payload.player.name} guessed correctly!`);
        }
        fetchRoomPlayers(roomId);
      });

      sbChan.subscribe("wrong-guess", (payload: any) => {
        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            player: payload.player,
            message: payload.guess,
            timestamp: Date.now(),
            type: "wrong-guess" as const,
          },
        ]);
      });

      sbChan.subscribe("chat-message", (payload: any) => {
        setChatMessages((prev) => [
          ...prev,
          {
            id: payload.timestamp?.toString() || Date.now().toString(),
            player: payload.player,
            message: payload.message,
            timestamp: payload.timestamp || Date.now(),
            type: "message" as const,
          },
        ]);
      });

      sbChan.subscribe("drawing:path-start", () => {});
      sbChan.subscribe("drawing:path-update", (payload: any) => {
        window.dispatchEvent(new CustomEvent("drawing-event", { detail: payload }));
      });
      sbChan.subscribe("drawing:path-complete", (payload: any) => {
        window.dispatchEvent(new CustomEvent("drawing-event", { detail: payload }));
      });
      sbChan.subscribe("canvas-cleared", () => {
        window.dispatchEvent(new CustomEvent("canvas-cleared"));
      });

      return sbChan;
    },
    [joinRoomChannel, gameState.playerName, fetchRoomPlayers],
  );

  // Keep refs in sync with latest state
  useEffect(() => {
    roomIdRef.current = gameState.roomId;
    phaseRef.current = gameState.phase;
  }, [gameState.roomId, gameState.phase]);


  // ── Timer ──────────────────────────────────────────────────
  useEffect(() => {
    const deadline = gameState.round.deadlineAt;
    if (!deadline || (gameState.phase !== "regular" && gameState.phase !== "final")) {
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

      if (remaining <= 0 && roomIdRef.current && !advanceCalledRef.current) {
        advanceRoundRef.current();
      }
    };

    tick();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(tick, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [gameState.round.deadlineAt, gameState.phase, gameState.roomId]);

  // ── advanceRound ───────────────────────────────────────────
  const advanceRound = useCallback(async () => {
    const roomId = gameState.roomId;
    if (!roomId || advanceCalledRef.current) return;
    advanceCalledRef.current = true;

    const phase = gameState.phase;

    if (phase === "regular") {
      const { data, error } = await supabase.rpc("advance_sb_round", { p_room_id: roomId });
      const result = data as any;

      if (!result?.success || !channelRef.current) {
        advanceCalledRef.current = false;
        return;
      }

      if (result.gameEnded) {
        channelRef.current.broadcast("game-ended", {
          players: result.players,
          winningTeam: result.winningTeam,
          team1Score: result.team1Score,
          team2Score: result.team2Score,
          team1Final: result.team1Final,
          team2Final: result.team2Final,
        });
        setGameState((prev) => ({
          ...prev,
          phase: "game-ended" as const,
          team1Score: result.team1Score,
          team2Score: result.team2Score,
        }));
        return;
      }

      // Phase transition to final
      if (result.phase === "final") {
        advanceCalledRef.current = false;
        setChatMessages([]);
        setGameState((prev) => ({
          ...prev,
          phase: "final" as const,
          round: { ...prev.round, number: 1, timeLeft: prev.round.roundTime * 2 },
          finalWords: result.finalWords || [],
          finalWordCount: result.finalWords?.length || 0,
          team1Score: result.team1Score,
          team2Score: result.team2Score,
          team1FinalProgress: 0,
          team2FinalProgress: 0,
        }));
        fetchRoomPlayers(roomId);
        window.dispatchEvent(new CustomEvent("sb-final-stage"));
        channelRef.current.broadcast("round-started", result);
        return;
      }

      // Next regular round
      advanceCalledRef.current = false;
      setChatMessages([]);
      const nextDeadline = result.deadlineAt
        ? new Date(result.deadlineAt).getTime()
        : Date.now() + result.roundTime * 1000;

      setGameState((prev) => ({
        ...prev,
        phase: "regular" as const,
        round: {
          number: result.roundNumber,
          team1Drawer: result.team1Drawer,
          team2Drawer: result.team2Drawer,
          word: result.word,
          revealedWord: null,
          timeLeft: result.roundTime,
          roundTime: result.roundTime,
          winningTeam: null,
          deadlineAt: nextDeadline,
        },
      }));
      fetchRoomPlayers(roomId);
      window.dispatchEvent(new CustomEvent("round-started"));
      channelRef.current.broadcast("round-started", result);
      channelRef.current.broadcast("canvas-cleared", {});

      await new Promise((r) => setTimeout(r, 3000));
    } else if (phase === "final") {
      const { data, error } = await supabase.rpc("advance_sb_round", { p_room_id: roomId });
      const result = data as any;

      if (result?.success && result.gameEnded && channelRef.current) {
        channelRef.current.broadcast("game-ended", {
          players: result.players,
          winningTeam: result.winningTeam,
          team1Score: result.team1Score,
          team2Score: result.team2Score,
          team1Final: result.team1Final,
          team2Final: result.team2Final,
        });
        setGameState((prev) => ({
          ...prev,
          phase: "game-ended" as const,
          team1Score: result.team1Score,
          team2Score: result.team2Score,
          team1FinalProgress: result.team1Final,
          team2FinalProgress: result.team2Final,
        }));
      }
    }
  }, [gameState.roomId, gameState.phase, fetchRoomPlayers]);

  useEffect(() => {
    advanceRoundRef.current = advanceRound;
  }, [advanceRound]);


  // ── Game actions ───────────────────────────────────────────

  const joinRoom = useCallback(
    async (roomId: string, playerName: string, team?: 1 | 2, knownGamePin?: string | null) => {
      subscribeToRoom(roomId);

      setGameState((prev) => ({
        ...prev,
        roomId,
        gamePin: knownGamePin ?? prev.gamePin,
        playerName,
      }));

      const { data } = await supabase.rpc("get_sb_room_state", { room_id: roomId });
      const state = data as any;

      if (!state?.success || !state.room) return;

      let selfId: string | null = null;
      let playerTeam: 1 | 2 | null = null;
      let userId: string | null = null;

      // Get auth user for self-detection
      const { data: authData } = await supabase.auth.getUser();
      userId = authData.user?.id ?? null;

      const players = (state.players || []).map((p: any) => ({
        id: p.id,
        userId: null,
        name: p.name,
        team: p.team as 1 | 2,
        score: p.score,
        isReady: p.isReady ?? false,
        hasGuessed: p.hasGuessed ?? false,
        isConnected: p.isConnected ?? true,
        winStreak: p.winStreak ?? 0,
        avatar: p.avatar,
      }));

      for (const p of state.players || []) {
        // Prefer matching by userId, fall back to name match
        if (userId && p.user_id === userId) {
          selfId = p.id;
          playerTeam = p.team as 1 | 2;
        }
      }
      if (!selfId) {
        for (const p of state.players || []) {
          if (p.name.toLowerCase() === playerName.toLowerCase()) {
            selfId = p.id;
            playerTeam = p.team as 1 | 2;
            break;
          }
        }
      }

      const activePhase = state.room.isGameActive ? (state.room.phase as SBPhase) : "lobby";
      const serverDeadline = state.room.deadlineAt;
      const computedDeadline = serverDeadline
        ? Number(serverDeadline)
        : activePhase !== "lobby"
          ? Date.now() + state.room.roundTime * 1000
          : null;

      console.log("[SB:joinRoom] state from RPC:", {
        serverOwnerId: state.room.ownerId,
        serverOwnerIdType: typeof state.room.ownerId,
        userId,
        userIdType: typeof userId,
        prevAuthUserId: gameState.authUserId,
        prevOwnerId: gameState.ownerId,
        allRoomKeys: Object.keys(state.room),
      });

      setGameState((prev) => ({
        ...prev,
        roomId,
        authUserId: prev.authUserId || userId || null,
        gamePin: state.room.gamePin ?? knownGamePin ?? prev.gamePin,
        playerName,
        selfId,
        team: playerTeam ?? team ?? prev.team,
        ownerId: state.room.ownerId,
        phase: activePhase,
        maxRegularRounds: state.room.maxRegularRounds,
        team1Score: state.room.team1Score ?? 0,
        team2Score: state.room.team2Score ?? 0,
        team1FinalProgress: state.room.team1FinalProgress ?? 0,
        team2FinalProgress: state.room.team2FinalProgress ?? 0,
        team1: players.filter((p: SBPlayer) => p.team === 1),
        team2: players.filter((p: SBPlayer) => p.team === 2),
        round: {
          ...prev.round,
          number: state.room.roundNumber,
          timeLeft: state.room.roundTime,
          roundTime: state.room.roundTime,
          deadlineAt: computedDeadline,
        },
      }));

      channelRef.current?.broadcast("player-joined", {
        playerName,
        playerId: selfId,
      });
    },
    [subscribeToRoom],
  );

  const createRoom = useCallback(
    async (roomName: string, wordPack?: string): Promise<{ roomId: string; gamePin: string | null }> => {
      const { data, error } = await supabase.rpc("create_scribble_battle_room", {
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
      void (async () => {
        try {
          await supabase.rpc("leave_scribble_battle_room", { p_room_id: roomId });
        } catch {}
      })();
      leaveRoomChannel(roomId);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    advanceCalledRef.current = false;
    setIsConnected(false);
    setGameState(createInitialGameState());
    setChatMessages([]);
  }, [gameState.roomId, gameState.playerName, gameState.selfId, leaveRoomChannel]);

  const startGame = useCallback(async () => {
    if (!gameState.roomId || !channelRef.current) return;

    const { data, error } = await supabase.rpc("start_scribble_battle", {
      p_room_id: gameState.roomId,
    });

    if (error || !(data as any)?.success) {
      toast.error((data as any)?.error || "Failed to start game");
      return;
    }

    const result = data as any;
    const deadlineMs = result.deadlineAt
      ? new Date(result.deadlineAt).getTime()
      : Date.now() + result.roundTime * 1000;

    channelRef.current.broadcast("game-started", {
      roundNumber: result.roundNumber,
      roundTime: result.roundTime,
      team1Drawer: result.team1Drawer,
      team2Drawer: result.team2Drawer,
      word: result.word,
      deadlineAt: deadlineMs,
    });

    channelRef.current.broadcast("canvas-cleared", {});

    setGameState((prev) => ({
      ...prev,
      phase: "regular",
      round: {
        number: 1,
        team1Drawer: result.team1Drawer,
        team2Drawer: result.team2Drawer,
        word: result.word,
        revealedWord: null,
        timeLeft: result.roundTime,
        roundTime: result.roundTime,
        winningTeam: null,
        deadlineAt: deadlineMs,
      },
    }));
    toast.info(`Your word: ${result.word}`);
  }, [gameState.roomId]);

  const setReadyState = useCallback(
    async (isReady: boolean) => {
      if (!gameState.roomId || !channelRef.current) return;

      await supabase.rpc("set_sb_player_ready", {
        room_id: gameState.roomId,
        is_ready: isReady,
      });

      setGameState((prev) => {
        const updateTeam = (players: SBPlayer[]) =>
          players.map((p) => (p.id === prev.selfId ? { ...p, isReady } : p));
        return {
          ...prev,
          team1: updateTeam(prev.team1),
          team2: updateTeam(prev.team2),
        };
      });

      channelRef.current.broadcast("player-ready", { isReady });
      fetchRoomPlayers(gameState.roomId);
    },
    [gameState.roomId, gameState.selfId, fetchRoomPlayers],
  );

  const switchTeam = useCallback(
    async (team: 1 | 2) => {
      if (!gameState.roomId || !channelRef.current) {
        toast.error("Not connected to room");
        return;
      }

      const { data, error } = await supabase.rpc("switch_sb_team", {
        room_id: gameState.roomId,
        new_team: team,
      });

      if (error) {
        console.error("switch_sb_team RPC error:", error);
        toast.error(`Switch failed: ${error.message || "Unknown error"}`);
        return;
      }

      const result = data as any;
      if (!result?.success) {
        toast.error(result?.error || "Failed to switch team");
        return;
      }

      setGameState((prev) => ({ ...prev, team }));
      channelRef.current.broadcast("team-switch", {});
      fetchRoomPlayers(gameState.roomId);
    },
    [gameState.roomId, fetchRoomPlayers],
  );

  const updateAvatar = useCallback(
    (avatar: string | AvatarConfig) => {
      setGameState((prev) => ({
        ...prev,
        team1: prev.team1.map((p) => (p.id === prev.selfId ? { ...p, avatar } : p)),
        team2: prev.team2.map((p) => (p.id === prev.selfId ? { ...p, avatar } : p)),
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
      if (!gameState.roomId) return;

      if (!channelRef.current) {
        toast.error("Connection lost — please rejoin");
        return;
      }

      let result: any;
      try {
        const { data, error } = await supabase.rpc("submit_sb_guess", {
          p_room_id: gameState.roomId,
          p_guess: guess,
        });
        if (error) {
          toast.error("Failed to submit guess");
          return;
        }
        result = data as any;
      } catch {
        toast.error("Failed to submit guess");
        return;
      }

      if (!result?.success) {
        if (result?.error === "Drawer cannot guess for their own team") return;
        toast.error(result?.error || "Unknown error");
        return;
      }

      const player = {
        id: gameState.selfId || "",
        name: gameState.playerName,
        team: gameState.team || 1,
      } as { id: string; name: string; team: 1 | 2 };

      if (result.correct) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            player,
            message: `Guessed correctly! +${result.points} pts`,
            timestamp: Date.now(),
            type: "correct-guess" as const,
          },
        ]);
        channelRef.current.broadcast("correct-guess", {
          player,
          points: result.points,
          team: result.team,
        });
        fetchRoomPlayers(gameState.roomId);

        // In final phase, advance the team's word
        if (gameState.phase === "final" && gameState.team) {
          const { data: advanceData } = await supabase.rpc("advance_sb_final_word", {
            p_room_id: gameState.roomId,
            p_team: gameState.team,
          });
          const advanceResult = advanceData as any;
          if (advanceResult?.gameEnded) {
            channelRef.current.broadcast("game-ended", {
              players: advanceResult.players,
              winningTeam: advanceResult.winningTeam,
              team1Score: advanceResult.team1Score,
              team2Score: advanceResult.team2Score,
              team1Final: advanceResult.team1Final,
              team2Final: advanceResult.team2Final,
            });
          } else if (advanceResult?.success) {
            channelRef.current.broadcast("final-round-update", {
              team: gameState.team,
              team1Final: advanceResult.team1Final,
              team2Final: advanceResult.team2Final,
            });
            channelRef.current.broadcastToTeam?.(gameState.team, "round-started", {
              phase: "final",
              team: gameState.team,
              roundNumber: advanceResult.team1Final + advanceResult.team2Final,
              team1Drawer: gameState.team === 1 ? advanceResult.newDrawer : gameState.round.team1Drawer,
              team2Drawer: gameState.team === 2 ? advanceResult.newDrawer : gameState.round.team2Drawer,
              word: advanceResult.word,
              roundTime: gameState.round.roundTime * 2,
              deadlineAt: gameState.round.deadlineAt,
            });
          }
        } else {
          void advanceRound();
        }
      } else if (!result.already_guessed) {
        setChatMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), player, message: guess, timestamp: Date.now(), type: "wrong-guess" as const },
        ]);
        channelRef.current.broadcast("wrong-guess", { player, guess });
      }
    },
    [gameState, advanceRound, fetchRoomPlayers],
  );

  const sendChatMessage = useCallback(
    (message: string) => {
      if (!channelRef.current) return;
      const player = {
        id: gameState.selfId || "",
        name: gameState.playerName,
        team: gameState.team || 1,
      } as { id: string; name: string; team: 1 | 2 };
      const timestamp = Date.now();

      setChatMessages((prev) => [
        ...prev,
        { id: timestamp.toString(), player, message, timestamp, type: "message" as const },
      ]);
      channelRef.current.broadcast("chat-message", { player, message, timestamp });
    },
    [gameState.selfId, gameState.playerName, gameState.team],
  );

  const sendDrawingEvent = useCallback(
    (event: any) => {
      if (!channelRef.current || !gameState.team) return;
      const isTeamDrawer =
        gameState.selfId !== null &&
        ((gameState.team === 1 && gameState.round.team1Drawer?.id === gameState.selfId) ||
         (gameState.team === 2 && gameState.round.team2Drawer?.id === gameState.selfId));

      if (!isTeamDrawer) return;

      channelRef.current.broadcastToTeam(gameState.team, event.type, event);
    },
    [gameState.selfId, gameState.team, gameState.round],
  );

  const clearCanvas = useCallback(() => {
    if (!channelRef.current || !gameState.team) return;
    const isTeamDrawer =
      gameState.selfId !== null &&
      ((gameState.team === 1 && gameState.round.team1Drawer?.id === gameState.selfId) ||
       (gameState.team === 2 && gameState.round.team2Drawer?.id === gameState.selfId));

    if (!isTeamDrawer) return;
    channelRef.current.broadcastToTeam(gameState.team, "canvas-cleared", {});
  }, [gameState.selfId, gameState.team, gameState.round]);

  const isGameActive = gameState.phase !== "lobby" && gameState.phase !== "game-ended";
  const isDrawer =
    gameState.selfId !== null &&
    gameState.team !== null &&
    ((gameState.team === 1 && gameState.round.team1Drawer?.id === gameState.selfId) ||
     (gameState.team === 2 && gameState.round.team2Drawer?.id === gameState.selfId));

  const ctxValue: SBGameContextType = {
    gameState,
    isGameActive,
    isDrawer,
    channel: channelRef.current,
    isConnected,
    chatMessages,
    joinRoom,
    createRoom,
    leaveRoom,
    startGame,
    setReadyState,
    switchTeam,
    updateAvatar,
    sendGuess,
    sendChatMessage,
    sendDrawingEvent,
    clearCanvas,
  };

  return (
    <SBGameContext.Provider value={ctxValue}>
      {children}
    </SBGameContext.Provider>
  );
}

export function useSBGame() {
  const ctx = useContext(SBGameContext);
  if (ctx === undefined) {
    throw new Error("useSBGame must be used within GameProvider");
  }
  return ctx;
}
