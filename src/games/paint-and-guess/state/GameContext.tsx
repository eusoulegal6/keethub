import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Socket } from "socket.io-client";
import { useSocket } from "@/games/paint-and-guess/hooks/useSocket";
import { toast } from "sonner";
import { AvatarConfig, encodeAvatarConfig } from "@/lib/avatar/config";
import { apiPath } from "@/games/paint-and-guess/config";

const PLAYER_STORAGE_KEY_PREFIX = "paint-and-guess:player:";

function getStoredPlayerId(roomId: string | null) {
  if (typeof window === "undefined" || !roomId) return null;
  return window.sessionStorage.getItem(`${PLAYER_STORAGE_KEY_PREFIX}${roomId}`);
}

function setStoredPlayerId(roomId: string | null, playerId: string | null) {
  if (typeof window === "undefined" || !roomId) return;
  if (playerId) {
    window.sessionStorage.setItem(`${PLAYER_STORAGE_KEY_PREFIX}${roomId}`, playerId);
  } else {
    window.sessionStorage.removeItem(`${PLAYER_STORAGE_KEY_PREFIX}${roomId}`);
  }
}

interface Player {
  id: string;
  name: string;
  score: number;
  isReady: boolean;
  avatar?: string | AvatarConfig; // Support both old string format and new config
}

type GamePhase = "lobby" | "drawing" | "round-ended" | "game-ended";

interface RoundState {
  number: number;
  drawer: Player | null;
  word: string | null; // Word for drawer only (null for guessers)
  revealedWord: string | null; // Word shown to everyone at round end
  timeLeft: number;
  roundTime: number;
  winner: Player | null; // Player who guessed correctly first
}

interface GameState {
  // Room info
  roomId: string | null;
  playerName: string;
  ownerId: string | null;
  selfId: string | null;
  
  // Players
  players: Player[];
  
  // Game phase (single source of truth)
  phase: GamePhase;
  
  // Round state (consolidated)
  round: RoundState;
  
  // Game settings
  maxRounds: number;
  
  // Computed values (derived, not stored)
  // These will be computed via helper functions
}

interface GameContextType {
  // Core state
  gameState: GameState;
  
  // Computed/derived values (for backward compatibility and convenience)
  isGameActive: boolean;
  isDrawer: boolean;
  currentDrawer: Player | null;
  currentWord: string | null;
  roundNumber: number;
  timeLeft: number;
  roundTime: number;
  revealedWord: string | null;
  roundWinner: Player | null;
  
  // Connection
  socket: Socket | null;
  isConnected: boolean;
  
  // Actions
  joinRoom: (roomId: string, playerName: string, avatar?: string | AvatarConfig) => void;
  createRoom: (roomName: string, isPublic?: boolean) => Promise<string>;
  leaveRoom: () => void;
  startGame: () => void;
  setReadyState: (isReady: boolean) => void;
  updateAvatar: (avatar: string | AvatarConfig) => void;
  sendGuess: (guess: string) => void;
  sendChatMessage: (message: string) => void;
  sendDrawingEvent: (event: any) => void;
  clearCanvas: () => void;
  
  // Chat
  chatMessages: ChatMessage[];
}

interface ChatMessage {
  id: string;
  player: { id: string; name: string };
  message: string;
  timestamp: number;
  type: "message" | "correct-guess" | "wrong-guess" | "system";
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// Helper functions to compute derived values from state
function getIsGameActive(phase: GamePhase): boolean {
  return phase !== "lobby" && phase !== "game-ended";
}

function getIsDrawer(state: GameState): boolean {
  return state.selfId !== null && state.round.drawer?.id === state.selfId;
}

function getCurrentWord(state: GameState): string | null {
  // Only return word if player is the drawer
  return getIsDrawer(state) ? state.round.word : null;
}

function getCurrentDrawer(state: GameState): Player | null {
  return state.round.drawer;
}

function getRoundNumber(state: GameState): number {
  return state.round.number;
}

function getTimeLeft(state: GameState): number {
  return state.round.timeLeft;
}

function getRoundTime(state: GameState): number {
  return state.round.roundTime;
}

function getRevealedWord(state: GameState): string | null {
  return state.round.revealedWord;
}

function getRoundWinner(state: GameState): Player | null {
  return state.round.winner;
}

// Helper to create initial round state
function createInitialRoundState(): RoundState {
  return {
    number: 0,
    drawer: null,
    word: null,
    revealedWord: null,
    timeLeft: 60,
    roundTime: 60,
    winner: null,
  };
}

// Helper to create initial game state
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

export function GameProvider({ children }: { children: ReactNode }) {
  const { socket, isConnected } = useSocket();
  const [gameState, setGameState] = useState<GameState>(createInitialGameState());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!socket) return;

    socket.on("session", ({ playerId }: { playerId: string }) => {
      console.log(`[GameContext] 🔑 Session received: playerId=${playerId.substring(0, 8)}...`);
      setGameState((prev) => {
        if (prev.roomId) {
          setStoredPlayerId(prev.roomId, playerId);
          console.log(`[GameContext] 💾 Stored playerId in sessionStorage for room ${prev.roomId}`);
        }
        return {
          ...prev,
          selfId: playerId,
        };
      });
    });

    socket.on("room-state", (state: any) => {
      console.log(`[GameContext] 🏠 Room state received`, {
        roomId: state.id,
        players: state.players?.length || 0,
        isGameActive: state.isGameActive,
        roundNumber: state.roundNumber,
        ownerId: state.ownerId ? `${state.ownerId.substring(0, 8)}...` : 'none',
        currentDrawer: state.currentDrawer?.name || 'none',
      });
      
      setGameState((prev) => {
        const { id, isGameActive, currentDrawer, roundNumber, roundTime, timeLeft, currentWord, ...rest } = state;
        const nextRoomId = id ?? prev.roomId;
        if (prev.selfId && nextRoomId) {
          setStoredPlayerId(nextRoomId, prev.selfId);
        }
        
        // Determine phase from isGameActive
        const phase: GamePhase = isGameActive ? "drawing" : "lobby";
        
        // Clear round-end state (revealedWord, winner) when not in round-ended or game-ended phase
        // This prevents stale round-end data from persisting when joining a new room or resetting state
        const shouldClearRoundEndState = phase !== "round-ended" && phase !== "game-ended";
        
        return {
          ...prev,
          roomId: nextRoomId,
          players: rest.players ?? prev.players,
          ownerId: rest.ownerId ?? prev.ownerId,
          phase,
          round: {
            number: roundNumber ?? prev.round.number,
            drawer: currentDrawer ?? prev.round.drawer,
            word: currentWord ?? prev.round.word,
            revealedWord: shouldClearRoundEndState ? null : prev.round.revealedWord,
            timeLeft: timeLeft ?? prev.round.timeLeft,
            roundTime: roundTime ?? prev.round.roundTime,
            winner: shouldClearRoundEndState ? null : prev.round.winner,
          },
        };
      });
    });

    socket.on(
      "player-joined",
      ({ player, players, ownerId }: { player: Player; players: Player[]; ownerId: string | null }) => {
        setGameState((prev) => ({
          ...prev,
          players,
          ownerId: ownerId ?? prev.ownerId,
        }));
        toast.success(`${player.name} joined the room`);
      }
    );

    socket.on(
      "player-left",
      ({ players, ownerId }: { players: Player[]; ownerId: string | null }) => {
        setGameState((prev) => ({
          ...prev,
          players,
          ownerId: ownerId ?? prev.ownerId,
        }));
      }
    );

    socket.on(
      "game-started",
      ({ drawer, roundTime, roundNumber }: { drawer: Player; roundTime: number; roundNumber: number }) => {
        setGameState((prev) => ({
          ...prev,
          phase: "drawing",
          round: {
            number: roundNumber,
            drawer,
            word: null, // Will be set by draw-word event
            revealedWord: null,
            timeLeft: roundTime,
            roundTime,
            winner: null,
          },
        }));
        toast.info("Game started!");
      }
    );

    socket.on("draw-word", ({ word }: { word: string }) => {
      setGameState((prev) => ({
        ...prev,
        round: {
          ...prev.round,
          word, // Only drawer receives this event
        },
      }));
      toast.info(`Your word: ${word}`);
    });

    socket.on(
      "round-started",
      ({ drawer, roundTime, roundNumber }: { drawer: Player; roundTime: number; roundNumber: number }) => {
        setGameState((prev) => ({
          ...prev,
          phase: "drawing",
          round: {
            number: roundNumber,
            drawer,
            word: null, // Will be set by draw-word event for drawer
            revealedWord: null,
            timeLeft: roundTime,
            roundTime,
            winner: null,
          },
        }));
        setChatMessages([]);
        // Dispatch event to clear canvas for the new round
        window.dispatchEvent(new CustomEvent("round-started"));
        toast.info(`Round ${roundNumber} - ${drawer.name} is drawing!`);
      }
    );

    socket.on("round-timer", ({ timeLeft }: { timeLeft: number }) => {
      setGameState((prev) => ({
        ...prev,
        round: {
          ...prev.round,
          timeLeft,
        },
      }));
    });

    socket.on(
      "round-ended",
      ({ word, scores, roundNumber }: { word: string; scores: Player[]; roundNumber: number }) => {
        setGameState((prev) => ({
          ...prev,
          players: scores,
          phase: "round-ended",
          round: {
            ...prev.round,
            number: roundNumber,
            word: null, // Clear secret word
            revealedWord: word, // Show revealed word to everyone
          },
        }));
        // Dispatch event to clear canvas
        window.dispatchEvent(new CustomEvent("round-ended"));
        toast.info(`Round ended! The word was: ${word}`);
      }
    );

    socket.on(
      "correct-guess",
      ({ player, points, word, players }: { player: Player; points: number; word: string; players?: Player[] }) => {
        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            player,
            message: `Correctly guessed! +${points} points`,
            timestamp: Date.now(),
            type: "correct-guess",
          },
        ]);
        setGameState((prev) => {
          const updatedState = {
            ...prev,
            players: players ?? prev.players.map((p) =>
              p.id === player.id ? { ...p, score: p.score + points } : p
            ),
            round: {
              ...prev.round,
              // Track first correct guesser as round winner
              winner: prev.round.winner ?? player,
            },
          };
          // Show toast if not the current player
          if (player.id !== prev.selfId) {
            toast.success(`${player.name} guessed correctly!`);
          }
          return updatedState;
        });
      }
    );

    socket.on("wrong-guess", ({ player, guess }: { player: Player; guess: string }) => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          player,
          message: guess,
          timestamp: Date.now(),
          type: "wrong-guess",
        },
      ]);
    });

    socket.on("chat-message", ({ player, message, timestamp }: ChatMessage) => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: timestamp.toString(),
          player,
          message,
          timestamp,
          type: "message",
        },
      ]);
    });

    socket.on("drawing-event", (event: any) => {
      // This will be handled by the Canvas component
      window.dispatchEvent(new CustomEvent("drawing-event", { detail: event }));
    });

    socket.on("canvas-cleared", () => {
      window.dispatchEvent(new CustomEvent("canvas-cleared"));
    });

    socket.on("player-ready", ({ players, ownerId }: { players: Player[]; ownerId: string | null }) => {
      setGameState((prev) => ({
        ...prev,
        players,
        ownerId: ownerId ?? prev.ownerId,
      }));
    });

    socket.on(
      "game-ended",
      ({ reason, scores }: { reason: string; scores?: Player[] }) => {
        setGameState((prev) => ({
          ...prev,
          phase: "game-ended",
          players: scores ?? prev.players,
          round: {
            ...prev.round,
            word: null, // Clear word
          },
        }));
        toast.info(`Game ended: ${reason}`);
      }
    );

    socket.on(
      "player-avatar-updated",
      ({ playerId, avatar, players }: { playerId: string; avatar: string | AvatarConfig; players: Player[] }) => {
        setGameState((prev) => {
          const updatedSelfId = prev.selfId;
          if (playerId === updatedSelfId) {
            console.log(`[GameContext] 🎨 Your avatar was updated`);
          } else {
            const player = players.find((p) => p.id === playerId);
            if (player) {
              console.log(`[GameContext] 🎨 Player ${player.name} updated their avatar`);
            }
          }
          return {
            ...prev,
            players,
          };
        });
      }
    );

    socket.on("error", ({ message }: { message: string }) => {
      toast.error(message);
    });

    return () => {
      socket.off("session");
      socket.off("room-state");
      socket.off("player-joined");
      socket.off("player-left");
      socket.off("game-started");
      socket.off("draw-word");
      socket.off("round-started");
      socket.off("round-timer");
      socket.off("round-ended");
      socket.off("correct-guess");
      socket.off("wrong-guess");
      socket.off("chat-message");
      socket.off("drawing-event");
      socket.off("canvas-cleared");
      socket.off("game-ended");
      socket.off("player-ready");
      socket.off("player-avatar-updated");
      socket.off("error");
    };
  }, [socket]); // Remove gameState dependencies - use functional updates instead

  const joinRoom = (roomId: string, playerName: string, avatar?: string | AvatarConfig) => {
    if (!socket) return;
    
    // Encode avatar config as JSON string if it's an object
    const avatarData = typeof avatar === 'object' ? encodeAvatarConfig(avatar) : avatar;
    const storedPlayerId = getStoredPlayerId(roomId);
    const isReconnect = Boolean(storedPlayerId);
    
    console.log(`[GameContext] 🚪 Joining room ${roomId}`, {
      playerName,
      isReconnect,
      storedPlayerId: storedPlayerId ? `${storedPlayerId.substring(0, 8)}...` : 'none',
      hasAvatar: Boolean(avatarData),
    });
    
    socket.emit("join-room", { roomId, playerName, avatar: avatarData, playerId: storedPlayerId });
    setGameState((prev) => ({
      ...prev,
      roomId,
      playerName,
      selfId: storedPlayerId ?? prev.selfId,
    }));
  };

  const createRoom = async (roomName: string, isPublic = true, wordPack = "classic"): Promise<string> => {
    try {
      console.log(`[GameContext] 🏠 Creating room`, { roomName, isPublic, wordPack });
      const response = await fetch(apiPath("/api/rooms"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: roomName,
          isPublic,
          maxPlayers: 6,
          roundTime: 60,
          maxRounds: 6,
          wordPack,
        }),
      });
      const data = await response.json();
      console.log(`[GameContext] ✅ Room created`, { roomId: data.roomId });
      return data.roomId;
    } catch (error) {
      console.error("Failed to create room:", error);
      throw error;
    }
  };

  const leaveRoom = () => {
    if (!socket) return;
    
    console.log(`[GameContext] 🚪 Leaving room`, { roomId: gameState.roomId });
    socket.emit("leave-room");
    setStoredPlayerId(gameState.roomId, null);
    setGameState(createInitialGameState());
    setChatMessages([]);
  };

  const startGame = () => {
    if (!socket) return;
    console.log(`[GameContext] 🎮 start-game emit`);
    socket.emit("start-game");
  };

  const setReadyState = (isReady: boolean) => {
    if (!socket) return;
    socket.emit("set-ready", { isReady });
  };

  const updateAvatar = (avatar: string | AvatarConfig) => {
    if (!socket || !gameState.roomId) return;
    
    // Encode avatar config as JSON string if it's an object
    const avatarData = typeof avatar === 'object' ? encodeAvatarConfig(avatar) : avatar;
    
    console.log(`[GameContext] 🎨 Updating avatar`, {
      roomId: gameState.roomId,
      hasAvatar: Boolean(avatarData),
    });
    
    socket.emit("update-avatar", { avatar: avatarData });
  };

  const sendGuess = (guess: string) => {
    if (!socket) return;
    console.log(`[GameContext] 🗨️ guess emit`, { guess });
    socket.emit("guess", { guess });
  };

  const sendChatMessage = (message: string) => {
    if (!socket) return;
    console.log(`[GameContext] 💬 chat-message emit`, { message });
    socket.emit("chat-message", { message });
  };

  const sendDrawingEvent = (event: any) => {
    if (!socket) return;
    const isDrawer = getIsDrawer(gameState);
    if (!isDrawer) return;
    if (event?.type) {
      console.debug(`[GameContext] ✏️ drawing-event emit`, { type: event.type });
    }
    socket.emit("drawing-event", event);
  };

  const clearCanvas = () => {
    if (!socket) return;
    const isDrawer = getIsDrawer(gameState);
    if (!isDrawer) return;
    console.debug(`[GameContext] 🧹 clear-canvas emit`);
    socket.emit("clear-canvas");
  };

  // Compute derived values
  const isGameActive = getIsGameActive(gameState.phase);
  const isDrawer = getIsDrawer(gameState);
  const currentDrawer = getCurrentDrawer(gameState);
  const currentWord = getCurrentWord(gameState);
  const roundNumber = getRoundNumber(gameState);
  const timeLeft = getTimeLeft(gameState);
  const roundTime = getRoundTime(gameState);
  const revealedWord = getRevealedWord(gameState);
  const roundWinner = getRoundWinner(gameState);

  return (
    <GameContext.Provider
      value={{
        gameState,
        // Computed values
        isGameActive,
        isDrawer,
        currentDrawer,
        currentWord,
        roundNumber,
        timeLeft,
        roundTime,
        revealedWord,
        roundWinner,
        // Connection
        socket,
        isConnected,
        // Actions
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
        // Chat
        chatMessages,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}
