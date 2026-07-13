import { useEffect, useRef, useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface RoomChannel {
  id: string;
  subscribe: (event: string, handler: (payload: any) => void) => () => void;
  broadcast: (event: string, payload: any) => void;
  unsubscribe: () => void;
}

const channelCache = new Map<
  string,
  {
    drawing: RealtimeChannel;
    events: RealtimeChannel;
  }
>();

export function useRealtime(): {
  joinRoomChannel: (roomId: string) => RoomChannel;
  leaveRoomChannel: (roomId: string) => void;
} {
  const channelsRef = useRef<Map<string, RoomChannel>>(new Map());

  const unsubscribeChannel = useCallback((roomId: string) => {
    const cached = channelCache.get(roomId);
    if (cached) {
      cached.drawing.unsubscribe();
      cached.events.unsubscribe();
      channelCache.delete(roomId);
    }
    channelsRef.current.delete(roomId);
  }, []);

  const joinRoomChannel = useCallback(
    (roomId: string): RoomChannel => {
      const existing = channelsRef.current.get(roomId);
      if (existing) return existing;

      const handlers = new Map<string, Set<(payload: any) => void>>();

      const drawingChannel = supabase.channel(`room:${roomId}:drawing`, {
        config: { broadcast: { self: false } },
      });
      const eventsChannel = supabase.channel(`room:${roomId}:events`, {
        config: { broadcast: { self: false } },
      });

      drawingChannel.subscribe();
      eventsChannel.subscribe();
      channelCache.set(roomId, {
        drawing: drawingChannel,
        events: eventsChannel,
      });

      const channel: RoomChannel = {
        id: roomId,

        subscribe(event, handler) {
          if (!handlers.has(event)) handlers.set(event, new Set());
          handlers.get(event)!.add(handler);

          const isDrawing = event.startsWith("drawing:") || event === "canvas-cleared";
          const chan = isDrawing ? drawingChannel : eventsChannel;

          chan.on("broadcast", { event }, ({ payload }) => {
            handler(payload);
          });

          return () => {
            handlers.get(event)?.delete(handler);
          };
        },

        broadcast(event, payload) {
          const isDrawing = event.startsWith("drawing:") || event === "canvas-cleared";
          const chan = isDrawing ? drawingChannel : eventsChannel;
          chan.send({
            type: "broadcast",
            event,
            payload,
          });
        },

        unsubscribe() {
          unsubscribeChannel(roomId);
        },
      };

      channelsRef.current.set(roomId, channel);
      return channel;
    },
    [unsubscribeChannel],
  );

  const leaveRoomChannel = useCallback(
    (roomId: string) => {
      unsubscribeChannel(roomId);
    },
    [unsubscribeChannel],
  );

  useEffect(() => {
    return () => {
      channelsRef.current.forEach((_, roomId) => {
        unsubscribeChannel(roomId);
      });
      channelsRef.current.clear();
    };
  }, [unsubscribeChannel]);

  return { joinRoomChannel, leaveRoomChannel };
}
