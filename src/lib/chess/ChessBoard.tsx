import { useState, useCallback, useMemo, useEffect, memo, useRef } from "react";
import { Chess } from "chess.js";
import type { Square } from "chess.js";
import { ChessPiece } from "./chessPieces";

const LIGHT = "#f0d9b5";
const DARK = "#b58863";
const COORD_COLOR = "#6b7280"; // gray-500

function getSquareName(row: number, col: number): string {
  return `${String.fromCharCode(97 + col)}${8 - row}`;
}

// ── Memoized square ──────────────────────────────────────────────

interface SquareProps {
  name: string;
  piece: { type: string; color: string } | null;
  isSelected: boolean;
  isLegalMove: boolean;
  isLastMove: boolean;
  bg: string;
  orientation: "white" | "black";
  disabled: boolean;
  sqSize: number;
  onClick: () => void;
}

const ChessSquare = memo(
  ({ name, piece, isSelected, isLegalMove, isLastMove, bg, orientation, disabled, sqSize, onClick }: SquareProps) => {
    return (
      <div
        onClick={onClick}
        style={{
          width: sqSize,
          height: sqSize,
          backgroundColor: isSelected ? "#baca44" : isLegalMove ? "#f6f669" : bg,
          boxShadow: isLastMove ? "inset 0 0 0 2px rgba(139,195,74,0.5)" : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: disabled ? "default" : piece || isLegalMove ? "pointer" : "default",
          position: "relative",
          userSelect: "none",
          transition: "background-color 0.15s",
        }}
      >
        {piece && <ChessPiece piece={piece} size={sqSize} />}
        {isLegalMove && !piece && (
          <div
            style={{
              width: Math.max(12, sqSize * 0.33),
              height: Math.max(12, sqSize * 0.33),
              borderRadius: "50%",
              backgroundColor: "#000",
              opacity: 0.3,
            }}
          />
        )}
      </div>
    );
  },
);

ChessSquare.displayName = "ChessSquare";

// ── Board ─────────────────────────────────────────────────────────

interface BoardProps {
  fen?: string;
  orientation?: "white" | "black";
  onMove?: (from: string, to: string, promotion?: string) => boolean;
  disabled?: boolean;
  squareSize?: number;
  lastMove?: { from: string; to: string };
}

export function ChessBoard({
  fen,
  orientation = "white",
  onMove,
  disabled = false,
  squareSize = 60,
  lastMove,
}: BoardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);

  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const legalRef = useRef(legalMoves);
  legalRef.current = legalMoves;
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  useEffect(() => {
    setSelected(null);
    setLegalMoves([]);
  }, [fen]);

  const game = useMemo(() => {
    try { return new Chess(fen); } catch { return new Chess(); }
  }, [fen]);

  const pieceMap = useMemo(() => {
    const m = new Map<string, { type: string; color: string } | null>();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = getSquareName(r, c);
        m.set(sq, game.get(sq as Square) || null);
      }
    }
    return m;
  }, [game.fen(), game]);

  const handleClick = useCallback(
    (sq: string) => {
      if (disabledRef.current) return;

      const sel = selectedRef.current;
      const legals = legalRef.current;
      const move = onMoveRef.current;

      if (sel && legals.includes(sq)) {
        const selectedPiece = pieceMap.get(sel);
        const promotion =
          selectedPiece?.type === "p" && (sq.endsWith("8") || sq.endsWith("1")) ? "q" : undefined;
        const success = move ? move(sel, sq, promotion) : true;
        if (success !== false) {
          setSelected(null);
          setLegalMoves([]);
        }
        return;
      }

      const piece = pieceMap.get(sq);
      const playerTurn = game.turn() === "w" ? "white" : "black";
      if (piece && piece.color === (playerTurn === "white" ? "w" : "b")) {
        setSelected(sq);
        const moves = game.moves({ square: sq as Square, verbose: true });
        setLegalMoves(moves.map((m) => m.to));
      } else {
        setSelected(null);
        setLegalMoves([]);
      }
    },
    [pieceMap, game],
  );

  const clickCallbacks = useMemo(() => ({} as Record<string, () => void>), [handleClick]);
  const getSquareClick = useCallback(
    (sq: string) => {
      if (!clickCallbacks[sq]) clickCallbacks[sq] = () => handleClick(sq);
      return clickCallbacks[sq];
    },
    [handleClick, clickCallbacks],
  );

  const squares = useMemo(() => {
    const arr = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const dr = orientation === "white" ? r : 7 - r;
        const dc = orientation === "white" ? c : 7 - c;
        const sq = getSquareName(dr, dc);
        const isLight = (dr + dc) % 2 === 0;
        arr.push(
          <ChessSquare
            key={sq}
            name={sq}
            piece={pieceMap.get(sq) || null}
            isSelected={selected === sq}
            isLegalMove={legalMoves.includes(sq)}
            isLastMove={lastMove?.from === sq || lastMove?.to === sq}
            bg={isLight ? LIGHT : DARK}
            orientation={orientation}
            disabled={disabled}
            sqSize={squareSize}
            onClick={getSquareClick(sq)}
          />,
        );
      }
    }
    return arr;
  }, [pieceMap, selected, legalMoves, lastMove, orientation, disabled, squareSize, getSquareClick]);

  const boardPx = squareSize * 8;
  const labelSize = Math.max(9, squareSize * 0.2);

  // Coordinate labels
  const files = orientation === "white"
    ? ["a", "b", "c", "d", "e", "f", "g", "h"]
    : ["h", "g", "f", "e", "d", "c", "b", "a"];
  const ranks = orientation === "white"
    ? ["8", "7", "6", "5", "4", "3", "2", "1"]
    : ["1", "2", "3", "4", "5", "6", "7", "8"];

  const labelStyle = (isLightSquare: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: squareSize,
    height: Math.max(12, squareSize * 0.25),
    fontSize: labelSize,
    fontWeight: 600,
    color: isLightSquare ? DARK : LIGHT,
    lineHeight: 1,
    userSelect: "none",
  });

  return (
    <div className="chess-room-board" style={{ touchAction: "none", userSelect: "none" }}>
      {/* Top file labels (adjacent to rank 8: a8=light, h8=dark) */}
      <div style={{ display: "flex", paddingLeft: Math.max(14, squareSize * 0.25) }}>
        {files.map((f, i) => (
          <div key={`top-${f}`} style={labelStyle(i % 2 === 0)}>
            {f}
          </div>
        ))}
      </div>

      <div style={{ display: "flex" }}>
        {/* Left rank labels (adjacent to a-file: a8=light, a7=dark, ...) */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {ranks.map((r, i) => (
            <div key={`left-${r}`} style={{ ...labelStyle(i % 2 === 0), width: Math.max(14, squareSize * 0.25), height: squareSize }}>
              {r}
            </div>
          ))}
        </div>

        {/* The board */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(8, ${squareSize}px)`,
            gridTemplateRows: `repeat(8, ${squareSize}px)`,
            width: boardPx,
            height: boardPx,
            border: "3px solid #9a5b2a",
            borderRadius: 8,
            overflow: "hidden",
            boxShadow: "0 4px 12px rgba(87,45,18,0.34)",
          }}
        >
          {squares}
        </div>

        {/* Right rank labels (adjacent to h-file: h8=dark, h7=light, ...) */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {ranks.map((r, i) => (
            <div key={`right-${r}`} style={{ ...labelStyle(i % 2 === 1), width: Math.max(14, squareSize * 0.25), height: squareSize }}>
              {r}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom file labels (adjacent to rank 1: a1=dark, h1=light) */}
      <div style={{ display: "flex", paddingLeft: Math.max(14, squareSize * 0.25) }}>
        {files.map((f, i) => (
          <div key={`bot-${f}`} style={labelStyle(i % 2 === 1)}>
            {f}
          </div>
        ))}
      </div>
    </div>
  );
}
