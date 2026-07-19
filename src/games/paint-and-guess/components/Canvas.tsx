import { useEffect, useRef, useState } from "react";
import { Toolbar } from "./Toolbar";
import { useGame } from "@/games/paint-and-guess";
import { useCanvasLifecycle } from "./canvas/useCanvasLifecycle";
import { useCanvasDrawing } from "./canvas/useCanvasDrawing";
import { useCanvasSync } from "./canvas/useCanvasSync";
import { Clock, Eye, Pencil, Trophy, Users } from "lucide-react";

const STORAGE_KEY = "paint-and-guess-drawing-preferences";

const loadPreferences = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const prefs = JSON.parse(saved);
      return {
        color: prefs.color || "#000000",
        size: prefs.size || 5,
        tool: prefs.tool || "draw",
        opacity: prefs.opacity ?? 1,
        hardness: prefs.hardness ?? 0.7,
      };
    }
  } catch {
    // Ignore invalid local preferences.
  }
  return {
    color: "#000000",
    size: 5,
    tool: "draw" as const,
    opacity: 1,
    hardness: 0.7,
  };
};

export const Canvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [preferences] = useState(loadPreferences);
  const [activeColor, setActiveColor] = useState(preferences.color);
  const [brushSize, setBrushSize] = useState(preferences.size);
  const [debouncedBrushSize, setDebouncedBrushSize] = useState(preferences.size);
  const [brushOpacity, setBrushOpacity] = useState(preferences.opacity);
  const [brushHardness, setBrushHardness] = useState(preferences.hardness);
  const [activeTool, setActiveTool] = useState<"draw" | "erase">(preferences.tool);
  const [hasCanvasContent, setHasCanvasContent] = useState(false);
  const { gameState, isDrawer, isGameActive, sendDrawingEvent, clearCanvas } = useGame();
  const isReceivingRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          color: activeColor,
          size: brushSize,
          tool: activeTool,
          opacity: brushOpacity,
          hardness: brushHardness,
        }),
      );
    } catch (error) {
      console.debug("[Canvas] Failed to save preferences:", error);
    }
  }, [activeColor, brushSize, activeTool, brushOpacity, brushHardness]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBrushSize(brushSize);
    }, 100);
    return () => clearTimeout(timer);
  }, [brushSize]);

  const { fabricCanvas, isCanvasValid } = useCanvasLifecycle({
    canvasRef,
    containerRef,
    isDrawer,
    isGameActive,
    activeColor,
    brushSize: debouncedBrushSize,
    brushOpacity,
    brushHardness,
    activeTool,
    roomId: gameState.roomId,
  });

  const { handleUndo, handleClear } = useCanvasDrawing({
    fabricCanvas,
    isDrawer,
    isGameActive,
    activeTool,
    activeColor,
    brushSize: debouncedBrushSize,
    brushOpacity,
    brushHardness,
    sendDrawingEvent,
    isCanvasValid,
    isReceivingRef,
  });

  useCanvasSync({
    fabricCanvas,
    isDrawer,
    isGameActive,
    roundNumber: gameState.round.number,
    isCanvasValid,
    isReceivingRef,
  });

  useEffect(() => {
    setHasCanvasContent(false);
  }, [gameState.round.number]);

  useEffect(() => {
    if (!fabricCanvas) return;

    const updateCanvasContent = () => {
      setHasCanvasContent(fabricCanvas.getObjects().length > 0);
    };

    updateCanvasContent();
    fabricCanvas.on("object:added", updateCanvasContent);
    fabricCanvas.on("object:removed", updateCanvasContent);
    fabricCanvas.on("path:created", updateCanvasContent);

    return () => {
      fabricCanvas.off("object:added", updateCanvasContent);
      fabricCanvas.off("object:removed", updateCanvasContent);
      fabricCanvas.off("path:created", updateCanvasContent);
    };
  }, [fabricCanvas, gameState.round.number]);

  const handleToolChange = (tool: "draw" | "erase") => {
    if (!isDrawer || !isGameActive) return;
    setActiveTool(tool);
  };

  useEffect(() => {
    if (!isDrawer || !isGameActive) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) {
        if ((e.ctrlKey || e.metaKey) && e.key === "u" && !e.shiftKey) {
          e.preventDefault();
          if (handleUndo) handleUndo();
        }
        return;
      }

      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        setActiveTool("draw");
      } else if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        setActiveTool("erase");
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isDrawer, isGameActive, handleUndo]);

  const showOverlay = !isGameActive || gameState.phase === "round-ended" || gameState.phase === "game-ended";

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4">
      {isDrawer && gameState.phase === "drawing" && (
        <Toolbar
          activeTool={activeTool}
          activeColor={activeColor}
          brushSize={brushSize}
          brushOpacity={brushOpacity}
          brushHardness={brushHardness}
          hasCanvasContent={hasCanvasContent}
          onToolChange={handleToolChange}
          onColorChange={setActiveColor}
          onBrushSizeChange={setBrushSize}
          onBrushOpacityChange={setBrushOpacity}
          onBrushHardnessChange={setBrushHardness}
          onUndo={handleUndo}
          onClear={() => {
            handleClear(clearCanvas);
            setHasCanvasContent(false);
          }}
          disabled={!isGameActive || gameState.phase !== "drawing"}
        />
      )}

      <div
        ref={containerRef}
        className="min-h-[340px] flex-1 overflow-hidden rounded-lg border border-[#E6EAF2] bg-white p-3 shadow-[0_16px_38px_rgba(16,32,74,0.08)]"
      >
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-[#D9CCFF] bg-white">
          <canvas ref={canvasRef} className="max-h-full max-w-full" style={{ display: showOverlay ? "none" : "block" }} />

          {showOverlay && (
            <div className="absolute inset-0 flex items-center justify-center bg-white">
              <div className="max-w-sm text-center">
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#ECFBFA] text-[#10B8B5]">
                  {gameState.phase === "game-ended" ? (
                    <Trophy className="h-10 w-10" />
                  ) : gameState.phase === "round-ended" ? (
                    <Clock className="h-10 w-10" />
                  ) : (
                    <Users className="h-10 w-10" />
                  )}
                </div>
                <p className="text-2xl font-black text-[#10204A]">
                  {gameState.phase === "round-ended"
                    ? "Round Complete!"
                    : gameState.phase === "game-ended"
                      ? "Game Over!"
                      : "Waiting for game to start"}
                </p>
                <p className="mt-3 text-base font-medium leading-7 text-[#667085]">
                  {gameState.phase === "round-ended"
                    ? "Next round starting soon..."
                    : gameState.phase === "game-ended"
                      ? "Start a new game when ready"
                      : gameState.players.length < 2
                        ? "Need at least 2 players to start"
                        : "Click start game when ready"}
                </p>
              </div>
            </div>
          )}

          {!showOverlay && isDrawer && !hasCanvasContent && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-3 rounded-full bg-white/86 px-5 py-3 text-[#A78BFA]">
                <span className="text-sm font-black">Start drawing here!</span>
                <Pencil className="h-6 w-6" />
              </div>
            </div>
          )}

          {!showOverlay && !isDrawer && (
            <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2">
              <div className="flex items-center gap-2 rounded-full border border-[#B7ECEA] bg-white/92 px-4 py-2 text-sm font-extrabold text-[#087E7D] shadow-sm">
                <Eye className="h-4 w-4" />
                Watch and guess the word
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
