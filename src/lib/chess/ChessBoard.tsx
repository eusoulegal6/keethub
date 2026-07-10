import { useState, useCallback, useMemo, useEffect, memo } from "react";
import { Chess } from "chess.js";
import type { Square } from "chess.js";
import { ChessPiece } from "./chessPieces";

const LIGHT = "#f0d9b5";
const DARK = "#b58863";

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
  showRank: boolean;
  showFile: boolean;
  orientation: "white" | "black";
  disabled: boolean;
  sqSize: number;
  onClick: (sq: string) => void;
}

const ChessSquare = memo(
  ({ name, piece, isSelected, isLegalMove, isLastMove, bg, showRank, showFile, orientation, disabled, sqSize, onClick }: SquareProps) => {
    const file = name[0];
    const rank = name[1];
    return (
      <div
        onClick={() => onClick(name)}
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
        {showRank && (
          <span
            style={{
              position: "absolute",
              left: 2,
              top: 2,
              fontSize: Math.max(8, sqSize * 0.18),
              fontWeight: 600,
              color: bg === LIGHT ? "#b58863" : "#f0d9b5",
              pointerEvents: "none",
              lineHeight: 1,
            }}
          >
            {rank}
          </span>
        )}
        {showFile && (
          <span
            style={{
              position: "absolute",
              bottom: 2,
              right: 2,
              fontSize: Math.max(8, sqSize * 0.18),
              fontWeight: 600,
              color: bg === LIGHT ? "#b58863" : "#f0d9b5",
              pointerEvents: "none",
              lineHeight: 1,
            }}
          >
            {file}
          </span>
        )}
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
  (a, b) =>
    a.name === b.name && a.piece?.type === b.piece?.type && a.piece?.color === b.piece?.color &&
    a.isSelected === b.isSelected && a.isLegalMove === b.isLegalMove &&
    a.isLastMove === b.isLastMove && a.bg === b.bg && a.disabled === b.disabled &&
    a.sqSize === b.sqSize && a.orientation === b.orientation,
);

ChessSquare.displayName = "ChessSquare";

// ── Board ─────────────────────────────────────────────────────────

interface BoardProps {
  fen?: string;
  orientation?: "white" | "black";
  onMove?: (from: string, to: string) => boolean;
  disabled?: boolean;
  squareSize?: number;
  lastMove?: { from: string; to: string };
}

export function ChessBoard({ fen, orientation = "white", onMove, disabled = false, squareSize = 60, lastMove }: BoardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);

  // Reset selection when fen changes
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
  }, [game.fen()]);

  const handleClick = useCallback(
    (sq: string) => {
      if (disabled) return;

      if (selected && legalMoves.includes(sq)) {
        const success = onMove ? onMove(selected, sq) : true;
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
    [disabled, selected, legalMoves, pieceMap, game, onMove],
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
            showRank={orientation === "white" ? sq[1] === "1" : sq[1] === "8"}
            showFile={orientation === "white" ? sq[0] === "a" : sq[0] === "h"}
            orientation={orientation}
            disabled={disabled}
            sqSize={squareSize}
            onClick={handleClick}
          />,
        );
      }
    }
    return arr;
  }, [pieceMap, selected, legalMoves, lastMove, orientation, disabled, squareSize, handleClick]);

  const boardPx = squareSize * 8;

  return (
    <div style={{ touchAction: "none", userSelect: "none", display: "flex", justifyContent: "center" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(8, ${squareSize}px)`,
          gridTemplateRows: `repeat(8, ${squareSize}px)`,
          width: boardPx,
          height: boardPx,
          border: "2px solid #374151",
          borderRadius: 4,
          overflow: "hidden",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        }}
      >
        {squares}
      </div>
    </div>
  );
}
