import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChessBoard } from "@/lib/chess/ChessBoard";
import { Chess } from "chess.js";
import { Flag, Wifi, WifiOff } from "lucide-react";
import type { ChessRoomState } from "../hooks/useChessMultiplayer";

interface Props {
  state: ChessRoomState;
  action: string | null;
  isMyTurn: boolean;
  lastMove: { from: string; to: string } | undefined;
  onMove: (from: string, to: string, promotion?: string) => Promise<boolean>;
  onResign: () => Promise<void>;
  onLeave: () => Promise<void>;
}

export default function MultiplayerGame({
  state,
  action,
  isMyTurn,
  lastMove,
  onMove,
  onResign,
  onLeave,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [moveHistory, setMoveHistory] = useState<{ san: string; moveNumber: number }[]>([]);
  const infoContainerRef = useRef<HTMLDivElement>(null);

  // Derive move history from state moves
  useEffect(() => {
    setMoveHistory(
      state.moves.map((m) => ({ san: m.san, moveNumber: m.moveNumber })),
    );
  }, [state.moves]);

  // Auto-scroll move history
  useEffect(() => {
    if (infoContainerRef.current) {
      infoContainerRef.current.scrollTop = infoContainerRef.current.scrollHeight;
    }
  }, [moveHistory]);

  const opponent = state.players.find((p) => p.id !== state.selfPlayerId);
  const self = state.players.find((p) => p.id === state.selfPlayerId);
  const myColor = state.myColor;
  const game = new Chess(state.room.currentFen);

  // Derive game state from chess.js
  const isCheckmate = game.isCheckmate();
  const isStalemate = game.isStalemate();
  const isDraw = game.isDraw();
  const isOver = isCheckmate || isStalemate || isDraw || state.room.status === "finished";
  const turn = game.turn();

  // Build status/result message
  let statusMessage = "";
  if (state.room.status === "finished") {
    if (state.room.result === "white_win") statusMessage = "White wins by checkmate!";
    else if (state.room.result === "black_win") statusMessage = "Black wins by checkmate!";
    else if (state.room.result === "resign_white") statusMessage = "Black wins by resignation!";
    else if (state.room.result === "resign_black") statusMessage = "White wins by resignation!";
    else statusMessage = "Draw!";
  } else if (isCheckmate) {
    statusMessage = turn === "w" ? "Black wins!" : "White wins!";
  } else if (isStalemate) {
    statusMessage = "Stalemate — Draw!";
  } else if (isDraw) {
    statusMessage = "Draw!";
  } else if (game.inCheck()) {
    statusMessage = isMyTurn ? "You are in check!" : "Opponent is in check";
  } else {
    statusMessage = isMyTurn ? "Your turn" : "Opponent's turn";
  }

  const wins = didIWin();

  // Derive lastMoveForBoard from the state's last move
  const lastMoveForBoard = lastMove
    ? { from: lastMove.from as string, to: lastMove.to as string }
    : undefined;

  function didIWin(): boolean {
    if (state.room.status !== "finished") return false;
    const result = state.room.result;
    if (!result) return false;
    if (myColor === "white" && (result === "white_win" || result === "resign_black")) return true;
    if (myColor === "black" && (result === "black_win" || result === "resign_white")) return true;
    return false;
  }

  const handleMove = (from: string, to: string, promotion?: string): boolean => {
    if (!isMyTurn || isOver) return false;
    setError(null);
    onMove(from, to, promotion)
      .then(() => {})
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Invalid move");
      });
    return true; // ChessBoard expects sync return; actual validation is server-side
  };

  return (
    <div className="px-4 py-4 md:px-8 max-w-5xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {opponent ? (
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  opponent.isConnected ? "bg-green-500" : "bg-gray-400"
                }`}
              />
              <span className="font-semibold text-sm">{opponent.name}</span>
              {opponent.isConnected ? (
                <Wifi className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Waiting for opponent...</span>
          )}
          <Badge variant="outline" className="font-mono text-xs">
            {state.room.code}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="capitalize">
            {myColor}
          </Badge>
          {!isOver && (
            <Button
              variant="outline"
              size="sm"
              disabled={action !== null}
              onClick={() => onResign().catch(() => {})}
            >
              <Flag className="w-3.5 h-3.5 mr-1" />
              Resign
            </Button>
          )}
        </div>
      </div>

      {/* Opponent disconnected banner */}
      {opponent && !opponent.isConnected && !isOver && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center justify-between">
          <span><WifiOff className="w-4 h-4 inline mr-2" />Opponent disconnected — waiting...</span>
          <Button variant="outline" size="sm" onClick={() => onLeave().catch(() => {})}>
            Leave
          </Button>
        </div>
      )}

      {/* Board + Info layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <ChessBoard
            fen={state.room.currentFen}
            orientation={myColor}
            onMove={handleMove}
            disabled={!isMyTurn || isOver || action !== null}
            lastMove={lastMoveForBoard}
          />

          {/* Status bar */}
          <div className="mt-3 text-center">
            {error && (
              <p className="text-sm text-destructive font-medium mb-1">{error}</p>
            )}
            <p
              className={`text-sm font-semibold ${
                isOver ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {statusMessage}
            </p>
          </div>
        </div>

        {/* Move history panel */}
        <div className="flex flex-col gap-3">
          <div
            ref={infoContainerRef}
            className="rounded-lg border border-border bg-card p-4 max-h-[400px] overflow-y-auto"
          >
            <h3 className="text-sm font-semibold mb-3">Move History</h3>
            {moveHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground">No moves yet</p>
            ) : (
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs font-mono">
                {moveHistory.map((m, i) => (
                  <div key={i} className="flex gap-1">
                    <span className="text-muted-foreground">{m.moveNumber}.</span>
                    <span>{m.san}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isOver && (
            <div
              className={`rounded-lg p-4 text-center ${
                wins ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
              }`}
            >
              <p
                className={`text-lg font-extrabold ${
                  wins ? "text-green-700" : "text-red-700"
                }`}
              >
                {wins ? "You Win!" : "You Lose"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{statusMessage}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => onLeave().catch(() => {})}
              >
                Leave Game
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
