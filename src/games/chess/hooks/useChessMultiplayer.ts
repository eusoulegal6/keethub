import { useState, useEffect, useCallback, useRef } from "react";
import { Chess } from "chess.js";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// ── Types ────────────────────────────────────────────────────────────

export type GameStatus = "waiting" | "playing" | "finished";

export interface ChessPlayer {
  id: string;
  userId: string;
  name: string;
  avatar: unknown;
  color: "white" | "black";
  isConnected: boolean;
}

export interface ChessRoom {
  id: string;
  code: string;
  name: string;
  status: GameStatus;
  result: string | null;
  currentFen: string;
  pgn: string;
  ownerId: string;
}

export interface ChessRoomState {
  success: boolean;
  room: ChessRoom;
  selfPlayerId: string;
  isOwner: boolean;
  myColor: "white" | "black";
  players: ChessPlayer[];
  moves: ChessMoveRecord[];
}

export interface ChessMoveRecord {
  id: string;
  playerId: string;
  uci: string;
  san: string;
  fen: string;
  moveNumber: number;
}

type RpcResult<T> = T & { success?: boolean; error?: string };

type RpcClient = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

async function callRpc<T>(
  fn: string,
  args?: Record<string, unknown>,
): Promise<RpcResult<T>> {
  const { data, error } = await (supabase as unknown as RpcClient).rpc(fn, args);
  if (error) throw new Error(error.message);
  const payload = data as RpcResult<T>;
  if (payload?.success === false) {
    throw new Error(payload.error ?? "Action failed");
  }
  return payload;
}

const ROOM_STORAGE_KEY = "chess-room-id";

// ── Hook ─────────────────────────────────────────────────────────────

export function useChessMultiplayer() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [state, setState] = useState<ChessRoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const gameRef = useRef(new Chess());

  // ── Load room state ──────────────────────────────────────────────
  const loadState = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const roomState = await callRpc<ChessRoomState>("get_chess_room_state", {
        p_room_id: id,
      });
      setState(roomState as ChessRoomState);

      // Rebuild chess.js from server FEN (skip if same as our internal state)
      if (roomState.room?.currentFen) {
        try {
          gameRef.current = new Chess(roomState.room.currentFen);
        } catch {
          // Invalid FEN — use starting position
          gameRef.current = new Chess();
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/room not found|not in this room|unauthorized/i.test(message)) {
        localStorage.removeItem(ROOM_STORAGE_KEY);
        setRoomId(null);
        setState(null);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Reconnection on mount ────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem(ROOM_STORAGE_KEY);
    if (!saved) { setLoading(false); return; }
    setRoomId(saved);
    void loadState(saved).catch(() => {});
  }, [loadState]);

  // ── Realtime channel ─────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`chess:${roomId}`, {
        config: { broadcast: { self: false } },
      })
      .on("broadcast", { event: "state-changed" }, () => {
        void loadState(roomId);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current === channel) channelRef.current = null;
      void channel.unsubscribe();
    };
  }, [loadState, roomId]);

  // ── Polling fallback ─────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;
    const timer = window.setInterval(() => {
      void loadState(roomId);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [loadState, roomId]);

  // ── Broadcast helper ─────────────────────────────────────────────
  const notifyRoom = useCallback(() => {
    void channelRef.current?.send({
      type: "broadcast",
      event: "state-changed",
      payload: { at: Date.now() },
    });
  }, []);

  // ── runAction ────────────────────────────────────────────────────
  const runAction = useCallback(
    async (
      label: string,
      fn: string,
      args: Record<string, unknown>,
    ) => {
      if (!roomId) return;
      setAction(label);
      try {
        await callRpc(fn, args);
        await loadState(roomId);
        notifyRoom();
      } catch (error) {
        throw error;
      } finally {
        setAction(null);
      }
    },
    [loadState, notifyRoom, roomId],
  );

  // ── Actions ──────────────────────────────────────────────────────
  const createRoom = useCallback(
    async (name: string) => {
      const result = await callRpc<{ roomId: string; roomCode: string }>(
        "create_chess_room",
        { p_room_name: name },
      );
      const id = result.roomId;
      localStorage.setItem(ROOM_STORAGE_KEY, id);
      setRoomId(id);
      gameRef.current = new Chess();
      await loadState(id);
      return { roomId: result.roomId, roomCode: result.roomCode };
    },
    [loadState],
  );

  const joinRoom = useCallback(
    async (code: string) => {
      const result = await callRpc<{ roomId: string }>("join_chess_room", {
        p_room_code: code,
      });
      const id = result.roomId;
      localStorage.setItem(ROOM_STORAGE_KEY, id);
      setRoomId(id);
      await loadState(id);
    },
    [loadState],
  );

  const leaveRoom = useCallback(async () => {
    if (!roomId) return;
    setAction("leave");
    try {
      await callRpc("leave_chess_room", { p_room_id: roomId });
      notifyRoom();
    } catch {
      // Best-effort
    } finally {
      localStorage.removeItem(ROOM_STORAGE_KEY);
      setRoomId(null);
      setState(null);
      setAction(null);
      gameRef.current = new Chess();
    }
  }, [notifyRoom, roomId]);

  const startGame = useCallback(
    () => runAction("start", "start_chess_game", { p_room_id: roomId }),
    [runAction, roomId],
  );

  const makeMove = useCallback(
    async (from: string, to: string, promotion?: string): Promise<boolean> => {
      if (!roomId || !state) return false;

      // Validate move locally first with chess.js
      const game = gameRef.current;
      const moveResult = game.move({ from, to, promotion: promotion || "q" });
      if (!moveResult) return false;

      const uci = `${from}${to}${promotion || ""}`;
      const san = moveResult.san;
      const fen = game.fen();

      setAction("move");
      try {
        await callRpc("make_chess_move", {
          p_room_id: roomId,
          p_move_uci: uci,
          p_move_san: san,
          p_result_fen: fen,
        });
        notifyRoom();

        // Check if game is over after our move
        if (game.isGameOver()) {
          let result: string | null = null;
          if (game.isCheckmate()) {
            result = state.myColor === "white" ? "white_win" : "black_win";
          } else {
            result = "draw";
          }
          if (result) {
            await callRpc("finish_chess_game", {
              p_room_id: roomId,
              p_result: result,
            });
            notifyRoom();
          }
        }
        return true;
      } catch {
        // Undo the move locally if server rejected it
        game.undo();
        throw new Error("Move rejected by server");
      } finally {
        setAction(null);
      }
    },
    [notifyRoom, roomId, state],
  );

  const resign = useCallback(async () => {
    if (!roomId || !state) return;
    const result = state.myColor === "white" ? "resign_white" : "resign_black";
    await runAction("resign", "finish_chess_game", {
      p_room_id: roomId,
      p_result: result,
    });
  }, [runAction, roomId, state]);

  // ── Derived state ────────────────────────────────────────────────
  const opponent = state?.players.find((p) => p.id !== state.selfPlayerId) ?? null;
  const isMyTurn = state
    ? (() => {
        const turnChar = state.room.currentFen.split(" ")[1];
        return (state.myColor === "white" && turnChar === "w") ||
               (state.myColor === "black" && turnChar === "b");
      })()
    : false;
  const isGameOver = state
    ? state.room.status === "finished"
    : false;

  // Parse last move from FEN for board highlighting
  const lastMove = (() => {
    if (!state || state.moves.length === 0) return undefined;
    const lastMv = state.moves[state.moves.length - 1];
    return { from: lastMv.uci.slice(0, 2), to: lastMv.uci.slice(2, 4) };
  })();

  return {
    roomState: state,
    loading,
    action,
    roomId,
    opponent,
    isMyTurn,
    isGameOver,
    gameRef,
    lastMove,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    makeMove,
    resign,
    loadState,
    notifyRoom,
  };
}
