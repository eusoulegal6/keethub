import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { SOCKET_URL } from "@/games/paint-and-guess/config";

const HEARTBEAT_INTERVAL_MS = Number(import.meta.env.VITE_SOCKET_HEARTBEAT_INTERVAL_MS ?? 15000) || 15000;

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    newSocket.on("connect", () => {
      console.log("Connected to server");
      setIsConnected(true);
      toast.success("Connected to server");
      newSocket.emit("heartbeat");
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
      toast.error("Disconnected from server");
    });

    newSocket.on("heartbeat-ack", () => {
      console.debug("[Socket] ❤️ heartbeat-ack");
    });

    newSocket.on("error", (error: { message: string }) => {
      toast.error(error.message || "An error occurred");
    });

    heartbeatIntervalRef.current = window.setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit("heartbeat");
      }
    }, HEARTBEAT_INTERVAL_MS);

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      if (heartbeatIntervalRef.current !== null) {
        window.clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      newSocket.close();
    };
  }, []);

  return { socket, isConnected };
}

