import { useState, useCallback } from "react";
import { GameProvider, useGame } from "./state/GameContext";
import Lobby from "./pages/Lobby";
import Room from "./pages/Room";

function PaintAndGuessApp() {
  const [inRoom, setInRoom] = useState(false);
  const { gameState } = useGame();

  const handleEnterRoom = useCallback(() => setInRoom(true), []);
  const handleBack = useCallback(() => setInRoom(false), []);

  if (inRoom && gameState.roomId) {
    return <Room key={gameState.roomId} onBack={handleBack} />;
  }

  return <Lobby onEnterRoom={handleEnterRoom} />;
}

export default function PaintAndGuessEntry() {
  return (
    <GameProvider>
      <PaintAndGuessApp />
    </GameProvider>
  );
}
