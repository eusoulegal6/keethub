import { useChess } from "./ChessContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RotateCcw, StepBack, Crown, Settings, ChevronRight } from "lucide-react";

export function GameInfo() {
  const { game, undoMove, resetGame, isAIThinking, aiConfig } = useChess();
  const status = game.status;
  const turn = game.turn;

  const statusLabel =
    status === "checkmate"
      ? `Checkmate! ${turn === "white" ? "Black" : "White"} wins`
      : status === "stalemate"
        ? "Stalemate — Draw"
        : status === "draw"
          ? "Draw"
          : isAIThinking
            ? "AI is thinking..."
            : `${turn === "white" ? "White" : "Black"} to move`;

  const moves = game.moves;
  // Group moves into pairs (white, black)
  const pairs: { n: number; white: string; black?: string }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({
      n: Math.floor(i / 2) + 1,
      white: moves[i].san,
      black: moves[i + 1]?.san,
    });
  }

  return (
    <div className="chess-room-info flex flex-col gap-3" style={{ minHeight: 400 }}>
      {/* Status */}
      <div className="chess-room-turn text-center">
        <Crown className="h-6 w-6 text-[#ffab14]" fill="currentColor" />
        <p
          className={`text-sm font-semibold ${
            status === "checkmate"
              ? "text-destructive"
              : status !== "playing"
                ? "text-muted-foreground"
                : "text-foreground"
          }`}
        >
          {statusLabel}
        </p>
        {game.inCheck && <p className="text-xs text-destructive mt-0.5">Check!</p>}
      </div>

      {/* Controls */}
      <div className="flex gap-2 justify-center">
        <Button variant="outline" size="icon" onClick={undoMove} disabled={moves.length === 0 || isAIThinking} title="Undo">
          <StepBack className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={resetGame} title="New Game">
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Move list */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm font-extrabold">Move list</p>
        {moves.length > 0 && <button onClick={resetGame} className="text-xs font-bold text-[#ff3b8d]">Clear</button>}
      </div>
      <ScrollArea className="chess-room-moves flex-1">
        <div className="space-y-0.5 text-sm font-mono">
          {pairs.slice(-20).map((p) => (
            <div key={p.n} className="flex gap-3 px-2 py-0.5 rounded hover:bg-secondary/50">
              <span className="text-muted-foreground w-6 text-right tabular-nums">{p.n}.</span>
              <span className="tabular-nums flex-1">{p.white}</span>
              <span className="tabular-nums flex-1 text-muted-foreground">{p.black ?? ""}</span>
            </div>
          ))}
          {moves.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No moves yet<br /><span className="font-semibold">✎ Make the first move!</span></p>
          )}
          {moves.length > 40 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              Showing last 20 of {Math.ceil(moves.length / 2)} moves
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Move count */}
      <p className="text-xs text-muted-foreground text-center">
        {moves.length} {moves.length === 1 ? "move" : "moves"}
      </p>
      <div className="chess-room-settings">
        <p><Settings className="inline h-4 w-4 mr-2" />Room settings</p>
        <span>Board theme <b>▦ &nbsp; Wood</b><ChevronRight className="h-4 w-4" /></span>
        <span>Piece style <b>♟ &nbsp; Classic</b><ChevronRight className="h-4 w-4" /></span>
        <span>Sound effects <b className="chess-room-switch" /></span>
      </div>
    </div>
  );
}
