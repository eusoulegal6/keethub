import { memo } from "react";

const CDN = "https://lichess1.org/assets/piece/cburnett";

const pieceSrc = (type: string, color: string) =>
  `${CDN}/${color === "w" ? "w" : "b"}${type.toUpperCase()}.svg`;

export const ChessPiece = memo(
  ({ piece, size = 60 }: { piece: { type: string; color: string } | null; size?: number }) => {
    if (!piece) return null;
    return (
      <img
        src={pieceSrc(piece.type, piece.color)}
        alt={`${piece.color}${piece.type}`}
        width={size}
        height={size}
        style={{
          display: "block",
          imageRendering: "auto",
        }}
        draggable={false}
      />
    );
  },
  (prev, next) =>
    prev.piece?.type === next.piece?.type &&
    prev.piece?.color === next.piece?.color &&
    prev.size === next.size,
);

ChessPiece.displayName = "ChessPiece";
