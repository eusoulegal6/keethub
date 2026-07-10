import { memo } from "react";

interface PieceProps { size?: number; className?: string }

const createPiece = (Svg: (p: PieceProps) => JSX.Element, name: string) => {
  const M = memo(Svg);
  M.displayName = name;
  return M;
};

export const WhiteKing = createPiece(({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 45 45" style={{ display: "block", filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.2))" }}>
    <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22.5 11.63V6M20 8h5" strokeLinejoin="miter"/>
      <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#fff" strokeLinecap="butt" strokeLinejoin="miter"/>
      <path d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7" fill="#fff"/>
      <path d="M32 29.5s8.5-4 6.03-9.65C34.15 14 25 18 22.5 24.5l.01 2.1-.01-2.1C20 18 10.85 14 6.97 19.85 4.5 25.5 13 29.5 13 29.5" fill="none" stroke="#000"/>
      <path d="M11.5 30c5.5-3 14.5-3 20 0M12 33.5c6-3 15-3 21 0" fill="none" stroke="#000"/>
    </g>
  </svg>
), "WhiteKing");

export const WhiteQueen = createPiece(({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 45 45" style={{ display: "block", filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.2))" }}>
    <g fill="#fff" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM24.5 7.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM33 9a2 2 0 1 1-4 0 2 2 0 1 1 4 0z"/>
      <path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z" strokeLinecap="butt"/>
      <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1 2.5-1 2.5-1.5 1.5 0 2.5 0 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-21-1.5-27 0z" strokeLinecap="butt"/>
      <path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none"/>
    </g>
  </svg>
), "WhiteQueen");

export const WhiteRook = createPiece(({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 45 45" style={{ display: "block", filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.2))" }}>
    <g fill="#fff" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" strokeLinecap="butt"/>
      <path d="M34 14l-3 3H14l-3-3"/><path d="M31 17v12.5H14V17" strokeLinecap="butt" strokeLinejoin="miter"/>
      <path d="M31 29.5l1.5 2.5h-20l1.5-2.5"/><path d="M11 14l1.5 3h20l1.5-3" fill="none" stroke="#000"/>
    </g>
  </svg>
), "WhiteRook");

export const WhiteBishop = createPiece(({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 45 45" style={{ display: "block", filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.2))" }}>
    <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <g fill="#fff" stroke="#000" strokeLinecap="butt" strokeWidth="1.5">
        <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z"/>
        <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-10.5-11 1-10.5 8.5-5 10.5-2.5 0-2.5 1.5-2.5 4 0 0-.5.5 0 2zM11.5 14.5c.5 2.5 1.5 3 3.5 3.5 2 1.5 2.5 1.5 2.5 1.5s.5 0 2.5-1.5c2-.5 3-1 3.5-3.5 0 0 .5-1.5-1-2.5-1.5-1-3.5-1-3.5-1s-2 0-3.5 1c-1.5 1-1 2.5-1 2.5z"/>
      </g>
      <path d="M17.5 11h10M15 14.5h15" stroke="#000" strokeLinejoin="miter" strokeWidth="1.5"/>
    </g>
  </svg>
), "WhiteBishop");

export const WhiteKnight = createPiece(({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 45 45" style={{ display: "block", filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.2))" }}>
    <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#fff"/>
      <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.04-.74 1.73-2.9 2-3 .5-2 4-3.5 6-3.5 2.5 0 4.5 1.5 5 3.5z" fill="#fff" stroke="#000" strokeLinecap="butt"/>
      <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z" fill="#000" strokeWidth="0.5"/>
      <path d="M14.933 15.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z" fill="#000" strokeWidth="1.5"/>
    </g>
  </svg>
), "WhiteKnight");

export const WhitePawn = createPiece(({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 45 45" style={{ display: "block", filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.2))" }}>
    <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23.13c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#fff" stroke="#000" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
), "WhitePawn");

export const BlackKing = createPiece(({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 45 45" style={{ display: "block", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}>
    <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22.5 11.63V6" strokeLinejoin="miter"/>
      <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#000" strokeLinecap="butt" strokeLinejoin="miter"/>
      <path d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7" fill="#000"/>
      <path d="M32 29.5s8.5-4 6.03-9.65C34.15 14 25 18 22.5 24.5l.01 2.1-.01-2.1C20 18 10.85 14 6.97 19.85 4.5 25.5 13 29.5 13 29.5" stroke="#fff" strokeWidth="1"/>
      <path d="M11.5 30c5.5-3 14.5-3 20 0M12 33.5c6-3 15-3 21 0" stroke="#fff" strokeWidth="1"/>
    </g>
  </svg>
), "BlackKing");

export const BlackQueen = createPiece(({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 45 45" style={{ display: "block", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}>
    <g fill="#000" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM24.5 7.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM33 9a2 2 0 1 1-4 0 2 2 0 1 1 4 0z"/>
      <path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z" strokeLinecap="butt"/>
      <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1 2.5-1 2.5-1.5 1.5 0 2.5 0 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-21-1.5-27 0z" strokeLinecap="butt"/>
      <path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none" stroke="#fff" strokeWidth="1"/>
    </g>
  </svg>
), "BlackQueen");

export const BlackRook = createPiece(({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 45 45" style={{ display: "block", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}>
    <g fill="#000" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 39h27v-3H9v3zM12.5 32l1.5-2.5h17l1.5 2.5h-20zM12 36v-4h21v4H12z" strokeLinecap="butt"/>
      <path d="M14 29.5v-13h17v13H14z" strokeLinecap="butt" strokeLinejoin="miter"/>
      <path d="M14 16.5L11 14h23l-3 2.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5" strokeLinecap="butt"/>
      <path d="M12 35.5h21M13 31.5h19M14 29.5h17M14 16.5h17M11 14h23" fill="none" stroke="#fff" strokeWidth="1.2" strokeLinejoin="miter"/>
    </g>
  </svg>
), "BlackRook");

export const BlackBishop = createPiece(({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 45 45" style={{ display: "block", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}>
    <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <g fill="#000" strokeLinecap="butt" strokeWidth="1.5">
        <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z" fill="#000"/>
        <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-10.5-11 1-10.5 8.5-5 10.5-2.5 0-2.5 1.5-2.5 4 0 0-.5.5 0 2zM11.5 14.5c.5 2.5 1.5 3 3.5 3.5 2 1.5 2.5 1.5 2.5 1.5s.5 0 2.5-1.5c2-.5 3-1 3.5-3.5 0 0 .5-1.5-1-2.5-1.5-1-3.5-1-3.5-1s-2 0-3.5 1c-1.5 1-1 2.5-1 2.5z" fill="#000"/>
      </g>
      <path d="M17.5 11h10" fill="none" stroke="#fff" strokeLinejoin="miter" strokeWidth="1.5"/>
      <path d="M15 14.5h15" fill="none" stroke="#fff" strokeLinejoin="miter" strokeWidth="1.5"/>
    </g>
  </svg>
), "BlackBishop");

export const BlackKnight = createPiece(({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 45 45" style={{ display: "block", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}>
    <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#000"/>
      <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.04-.74 1.73-2.9 2-3 .5-2 4-3.5 6-3.5 2.5 0 4.5 1.5 5 3.5z" fill="#000"/>
      <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z" fill="#fff" strokeWidth="0.5"/>
      <path d="M14.933 15.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z" fill="#fff" strokeWidth="1.5"/>
    </g>
  </svg>
), "BlackKnight");

export const BlackPawn = createPiece(({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 45 45" style={{ display: "block", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}>
    <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23.13c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#000" stroke="#000" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
), "BlackPawn");

export const ChessPiece = memo(
  ({ piece, size = 60 }: { piece: { type: string; color: string } | null; size?: number }) => {
    if (!piece) return null;
    const key = `${piece.color}${piece.type.toUpperCase()}`;
    const p = { size };
    switch (key) {
      case "wK": return <WhiteKing {...p} />;
      case "wQ": return <WhiteQueen {...p} />;
      case "wR": return <WhiteRook {...p} />;
      case "wB": return <WhiteBishop {...p} />;
      case "wN": return <WhiteKnight {...p} />;
      case "wP": return <WhitePawn {...p} />;
      case "bK": return <BlackKing {...p} />;
      case "bQ": return <BlackQueen {...p} />;
      case "bR": return <BlackRook {...p} />;
      case "bB": return <BlackBishop {...p} />;
      case "bN": return <BlackKnight {...p} />;
      case "bP": return <BlackPawn {...p} />;
      default: return null;
    }
  },
  (prev, next) =>
    prev.piece?.type === next.piece?.type &&
    prev.piece?.color === next.piece?.color &&
    prev.size === next.size,
);
ChessPiece.displayName = "ChessPiece";
