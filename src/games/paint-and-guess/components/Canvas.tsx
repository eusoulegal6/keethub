import { useRef, useState, useEffect } from "react";
import { Toolbar } from "./Toolbar";
import { ColorPalette } from "./ColorPalette";
import { useGame } from "@/games/paint-and-guess";
import { useCanvasLifecycle } from "./canvas/useCanvasLifecycle";
import { useCanvasDrawing } from "./canvas/useCanvasDrawing";
import { useCanvasSync } from "./canvas/useCanvasSync";

const STORAGE_KEY = "paint-and-guess-drawing-preferences";

// Load preferences from localStorage
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
    // Ignore errors
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
  const { gameState, isDrawer, isGameActive, sendDrawingEvent, clearCanvas } = useGame();
  const isReceivingRef = useRef(false);
  
  // Persist preferences to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        color: activeColor,
        size: brushSize,
        tool: activeTool,
        opacity: brushOpacity,
        hardness: brushHardness,
      }));
    } catch (error) {
      console.debug("[Canvas] Failed to save preferences:", error);
    }
  }, [activeColor, brushSize, activeTool, brushOpacity, brushHardness]);

  // Debounce brush size changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBrushSize(brushSize);
    }, 100);
    return () => clearTimeout(timer);
  }, [brushSize]);
  
  // Canvas lifecycle management
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
  });
  
  // Drawing functionality
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
  
  // Synchronization (receiving events, clearing)
  useCanvasSync({
    fabricCanvas,
    isDrawer,
    isGameActive,
    roundNumber: gameState.round.number,
    isCanvasValid,
    isReceivingRef,
  });

  const handleToolChange = (tool: "draw" | "erase") => {
    if (!isDrawer || !isGameActive) return;
    setActiveTool(tool);
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!isDrawer || !isGameActive) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't interfere with browser shortcuts or when typing in inputs
      if (e.ctrlKey || e.metaKey || e.altKey) {
        // Allow Ctrl+U / Cmd+U for undo
        if ((e.ctrlKey || e.metaKey) && e.key === "u" && !e.shiftKey) {
          e.preventDefault();
          if (handleUndo) handleUndo();
        }
        return;
      }

      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      // Tool shortcuts
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

  // Show waiting state when game is not active or during round transition
  if (!isGameActive || gameState.phase === "round-ended" || gameState.phase === "game-ended") {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          {gameState.phase === "round-ended" ? (
            <>
              <p className="text-lg font-semibold mb-2">Round Complete!</p>
              <p className="text-muted-foreground">
                Next round starting soon...
              </p>
            </>
          ) : gameState.phase === "game-ended" ? (
            <>
              <p className="text-lg font-semibold mb-2">Game Over!</p>
              <p className="text-muted-foreground">
                Start a new game when ready
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold mb-2">Waiting for game to start...</p>
              <p className="text-muted-foreground">
                {gameState.players.length < 2
                  ? "Need at least 2 players to start"
                  : "Click 'Start Game' when ready"}
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="flex flex-col items-center gap-2 sm:gap-4 md:gap-6 p-2 sm:p-4 md:p-8 h-full w-full min-w-0 max-h-full overflow-hidden"
      style={{ minHeight: 0 }} // Ensure flex child can shrink
    >
      {/* Only show toolbar for drawers during active drawing phase */}
      {isDrawer && gameState.phase === "drawing" && (
        <div className="w-full min-w-0 max-w-full flex-shrink-0">
          <Toolbar
            activeTool={activeTool}
            brushSize={brushSize}
            brushOpacity={brushOpacity}
            brushHardness={brushHardness}
            onToolChange={handleToolChange}
            onBrushSizeChange={setBrushSize}
            onBrushOpacityChange={setBrushOpacity}
            onBrushHardnessChange={setBrushHardness}
            onUndo={handleUndo}
            onClear={() => handleClear(clearCanvas)}
            disabled={!isGameActive || gameState.phase !== "drawing"}
          />
        </div>
      )}
      
      <div className="flex-1 flex items-center justify-center w-full min-h-0 min-w-0 max-h-full overflow-hidden" style={{ minHeight: 0 }}>
        <div className="rounded-lg sm:rounded-xl md:rounded-2xl shadow-strong overflow-hidden border-2 sm:border-4 border-border bg-canvas-bg relative max-w-full max-h-full">
          <canvas 
            ref={canvasRef} 
            className="max-w-full max-h-full"
            style={{ display: 'block' }} // Prevent inline spacing
          />
          {!isDrawer && (
            <div className="absolute top-1 sm:top-2 left-1/2 transform -translate-x-1/2 pointer-events-none z-10">
              <div className="bg-background/90 px-2 sm:px-4 py-1 sm:py-2 rounded-lg border shadow-lg">
                <p className="text-xs sm:text-sm font-semibold">Watch and guess the word!</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {isDrawer && gameState.phase === "drawing" && (
        <div className="w-full min-w-0 max-w-full flex-shrink-0">
          <ColorPalette activeColor={activeColor} onColorChange={setActiveColor} />
        </div>
      )}
    </div>
  );
};