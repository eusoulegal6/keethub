import { useEffect } from "react";
import { Canvas as FabricCanvas, FabricObject } from "fabric";
import { toast } from "sonner";

interface UseCanvasDrawingOptions {
  fabricCanvas: FabricCanvas | null;
  isDrawer: boolean;
  isGameActive: boolean;
  activeTool: "draw" | "erase";
  activeColor: string;
  brushSize: number;
  brushOpacity: number;
  brushHardness: number;
  sendDrawingEvent: (event: { type: string; data?: any; [key: string]: any }) => void;
  isCanvasValid: (canvas: FabricCanvas | null) => canvas is FabricCanvas;
  isReceivingRef: React.MutableRefObject<boolean>;
}

/**
 * Handles drawing functionality: brush properties, sending drawing events
 */
export function useCanvasDrawing({
  fabricCanvas,
  isDrawer,
  isGameActive,
  activeTool,
  activeColor,
  brushSize,
  brushOpacity,
  brushHardness,
  sendDrawingEvent,
  isCanvasValid,
  isReceivingRef,
}: UseCanvasDrawingOptions) {
  // Update brush properties when tool, color, opacity, or hardness changes
  useEffect(() => {
    if (!isCanvasValid(fabricCanvas) || !fabricCanvas?.freeDrawingBrush) return;

    if (activeTool === "erase") {
      fabricCanvas.freeDrawingBrush.color = "#ffffff";
      fabricCanvas.freeDrawingBrush.width = brushSize * 2;
      // Reset shadow for eraser
      (fabricCanvas.freeDrawingBrush as any).shadow = null;
    } else {
      fabricCanvas.freeDrawingBrush.color = activeColor;
      fabricCanvas.freeDrawingBrush.width = brushSize;
      
      // Apply hardness using shadowBlur (0 = hard edge, higher = softer)
      const shadowBlur = brushHardness < 1 ? (1 - brushHardness) * brushSize * 2 : 0;
      (fabricCanvas.freeDrawingBrush as any).shadow = shadowBlur > 0 ? {
        blur: shadowBlur,
        offsetX: 0,
        offsetY: 0,
        color: activeColor,
      } : null;
    }
  }, [activeTool, activeColor, brushSize, brushOpacity, brushHardness, fabricCanvas, isCanvasValid]);

  // Update drawing mode when role or game state changes
  useEffect(() => {
    if (!isCanvasValid(fabricCanvas)) return;
    const canvas = fabricCanvas;
    
    canvas.isDrawingMode = isGameActive && isDrawer;
    
    // Disable all interactions for guessers
    if (!isDrawer) {
      canvas.selection = false;
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'default';
      canvas.moveCursor = 'default';
      canvas.skipTargetFind = true;
    } else {
      // Enable interactions for drawer
      canvas.selection = true;
      canvas.skipTargetFind = false;
    }
  }, [fabricCanvas, isDrawer, isGameActive, isCanvasValid]);

  // Send drawing events (drawer only) - Real-time streaming
  useEffect(() => {
    if (!isCanvasValid(fabricCanvas) || !isDrawer || !isGameActive) return;
    const canvas = fabricCanvas;

    let isDrawing = false;
    let currentPathId: string | null = null;
    let lastSentPath: any = null;
    let pathPoints: number[][] = [];
    let lastSentPointIndex = 0; // Track how many points we've sent
    let lastSendTime = 0; // Track when we last sent an update
    let lastPointTime = 0; // Track when last point was added (for velocity detection)
    let flushInterval: number | null = null; // Interval for periodic flushing during fast drawing
    const BATCH_INTERVAL_MS = 16; // ~60fps - send at most every frame
    const MIN_POINTS_PER_BATCH = 2; // Batch at least 2 points together (reduced for lower latency)
    const FAST_DRAW_THRESHOLD_MS = 8; // If points arrive faster than 8ms apart, it's fast drawing
    const FAST_DRAW_MIN_BATCH = 1; // During fast drawing, send every point (or every 2)
    const FLUSH_INTERVAL_MS = 8; // Flush pending points every 8ms during active drawing
    
    let drawerEventSequence = 0;

    // Handle path completion (finalize)
    const handlePathCreated = (e: { path: FabricObject }) => {
      if (isReceivingRef.current) return; // Prevent echo
      if (!isCanvasValid(canvas)) return;

      const path = e.path;
      
      // Apply opacity and hardness to the path object
      if (activeTool !== "erase") {
        path.set({
          opacity: brushOpacity,
        });
        
        // Apply hardness using shadowBlur
        const shadowBlur = brushHardness < 1 ? (1 - brushHardness) * brushSize * 2 : 0;
        if (shadowBlur > 0) {
          path.set({
            shadow: {
              blur: shadowBlur,
              offsetX: 0,
              offsetY: 0,
              color: activeColor,
            },
          });
        } else {
          path.set({ shadow: null });
        }
      }
      
      const pathData = path.toJSON();
      
      
      // Send final path
      sendDrawingEvent({
        type: "path-complete",
        pathId: currentPathId,
        sequence: ++drawerEventSequence,
        data: pathData,
      });

      // Send any remaining points that haven't been sent yet
      if (pathPoints.length > lastSentPointIndex) {
        const remainingPoints = pathPoints.slice(lastSentPointIndex);
        sendDrawingEvent({
          type: "path-update",
          pathId: currentPathId,
          sequence: ++drawerEventSequence,
          data: {
            newPoints: remainingPoints,
            startIndex: lastSentPointIndex,
            stroke: canvas.freeDrawingBrush?.color,
            strokeWidth: canvas.freeDrawingBrush?.width,
            opacity: activeTool === "erase" ? 1 : brushOpacity,
            hardness: activeTool === "erase" ? 1 : brushHardness,
          },
        });
      }

      // Clean up
      if (flushInterval) {
        clearInterval(flushInterval);
        flushInterval = null;
      }
      isDrawing = false;
      currentPathId = null;
      pathPoints = [];
      lastSentPath = null;
      lastSentPointIndex = 0;
      lastSendTime = 0;
      lastPointTime = 0;
    };

    // Send incremental updates during mouse move (only when drawing)
    // Note: We track drawing state via mouse:down/mouse:up, not button state,
    // because button state can become unreliable during long continuous strokes
    const handleMouseMove = (options: any) => {
      // Only check isDrawing flag - don't check isDrawingMode as it might be
      // temporarily disabled during certain operations, but we're still drawing
      if (!isDrawing) return;
      // Don't check options.e.buttons - it can become unreliable during long strokes
      // Don't check isDrawingMode - it might be temporarily disabled but drawing continues
      // Instead, rely on the isDrawing flag set by mouse:down/mouse:up
      
      try {
        const pointer = canvas.getPointer(options.e);
        pathPoints.push([pointer.x, pointer.y]);

        const now = Date.now();
        const timeSinceLastSend = now - lastSendTime;
        const timeSinceLastPoint = lastPointTime > 0 ? now - lastPointTime : Infinity;
        const newPointsCount = pathPoints.length - lastSentPointIndex;
        
        // Detect fast drawing (points arriving very quickly)
        const isFastDrawing = timeSinceLastPoint < FAST_DRAW_THRESHOLD_MS;
        const minBatchSize = isFastDrawing ? FAST_DRAW_MIN_BATCH : MIN_POINTS_PER_BATCH;
        
        // Adaptive batching: during fast drawing, send more frequently to avoid dropping points
        // During slow drawing, batch more aggressively to reduce network overhead
        const shouldSend = newPointsCount >= minBatchSize || 
                          (timeSinceLastSend >= BATCH_INTERVAL_MS && newPointsCount > 0) ||
                          (isFastDrawing && newPointsCount >= 1); // Fast drawing: send every point or every 2
        
        lastPointTime = now;
        
        if (shouldSend && pathPoints.length > lastSentPointIndex) {
          // Send only NEW points (differential update) - much smaller payload
          const newPoints = pathPoints.slice(lastSentPointIndex);
          
          const pathData = {
            newPoints: newPoints, // Only new points since last update
            startIndex: lastSentPointIndex, // Where these points start in the full path
            stroke: canvas.freeDrawingBrush?.color,
            strokeWidth: canvas.freeDrawingBrush?.width,
            opacity: activeTool === "erase" ? 1 : brushOpacity,
            hardness: activeTool === "erase" ? 1 : brushHardness,
          };


          // Send batched update
          sendDrawingEvent({
            type: "path-update",
            pathId: currentPathId,
            sequence: ++drawerEventSequence,
            data: pathData,
          });
          
          lastSentPointIndex = pathPoints.length;
          lastSendTime = now;
          lastSentPath = pathData;
        }
      } catch (error) {
      }
    };

    // Handle drawing start
    const handleMouseDown = (options: any) => {
      if (!canvas.isDrawingMode) return;
      if (isReceivingRef.current) return;

      // Ensure we're not already drawing (safety check)
      if (isDrawing) {
        // If we're already drawing, finalize the previous path first
        isDrawing = false;
        pathPoints = [];
        lastSentPointIndex = 0;
        lastSendTime = 0;
      }

      isDrawing = true;
      pathPoints = [];
      lastSentPointIndex = 0;
      lastSendTime = Date.now();
      lastPointTime = Date.now();
      currentPathId = `path-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Start periodic flush during active drawing to catch fast swipes
      if (flushInterval) {
        clearInterval(flushInterval);
      }
      flushInterval = window.setInterval(() => {
        if (!isDrawing || !currentPathId) {
          if (flushInterval) {
            clearInterval(flushInterval);
            flushInterval = null;
          }
          return;
        }
        
        // Flush pending points periodically during active drawing
        if (pathPoints.length > lastSentPointIndex) {
          const pendingPoints = pathPoints.slice(lastSentPointIndex);
          if (pendingPoints.length > 0) {
            sendDrawingEvent({
              type: "path-update",
              pathId: currentPathId,
              sequence: ++drawerEventSequence,
              data: {
                newPoints: pendingPoints,
                startIndex: lastSentPointIndex,
                stroke: canvas.freeDrawingBrush?.color,
                strokeWidth: canvas.freeDrawingBrush?.width,
                opacity: activeTool === "erase" ? 1 : brushOpacity,
                hardness: activeTool === "erase" ? 1 : brushHardness,
              },
            });
            lastSentPointIndex = pathPoints.length;
            lastSendTime = Date.now();
          }
        }
      }, FLUSH_INTERVAL_MS);
      
      // Send path start event
      sendDrawingEvent({
        type: "path-start",
        pathId: currentPathId,
        sequence: ++drawerEventSequence,
        color: canvas.freeDrawingBrush?.color,
        width: canvas.freeDrawingBrush?.width,
        opacity: activeTool === "erase" ? 1 : brushOpacity,
        hardness: activeTool === "erase" ? 1 : brushHardness,
      });

      // Note: We rely on mouse:move events for tracking.
      // If mouse:move stops firing, Fabric.js will still create the path
      // and path:created will fire when the mouse is released, sending the complete path.
    };

    // Reset path points on mouse up
    const handleMouseUp = () => {
      // Flush any remaining points immediately on mouse up
      // This ensures fast swipes don't lose points before path:created fires
      if (isDrawing && pathPoints.length > lastSentPointIndex && currentPathId) {
        const remainingPoints = pathPoints.slice(lastSentPointIndex);
        if (remainingPoints.length > 0) {
          sendDrawingEvent({
            type: "path-update",
            pathId: currentPathId,
            sequence: ++drawerEventSequence,
            data: {
              newPoints: remainingPoints,
              startIndex: lastSentPointIndex,
              stroke: canvas.freeDrawingBrush?.color,
              strokeWidth: canvas.freeDrawingBrush?.width,
              opacity: activeTool === "erase" ? 1 : brushOpacity,
              hardness: activeTool === "erase" ? 1 : brushHardness,
            },
          });
          lastSentPointIndex = pathPoints.length;
          lastSendTime = Date.now();
        }
      }
      // Don't clear pathPoints here - let path:created handle cleanup
      // This ensures path:created has access to all points for the complete path
      // Only stop accepting new points
      if (isDrawing) {
        isDrawing = false;
      }
    };

    canvas.on("path:created", handlePathCreated);
    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:move", handleMouseMove);
    canvas.on("mouse:up", handleMouseUp);

    return () => {
      // Clean up flush interval
      if (flushInterval) {
        clearInterval(flushInterval);
        flushInterval = null;
      }
      if (isCanvasValid(canvas)) {
        canvas.off("path:created", handlePathCreated);
        canvas.off("mouse:down", handleMouseDown);
        canvas.off("mouse:move", handleMouseMove);
        canvas.off("mouse:up", handleMouseUp);
      }
    };
  }, [fabricCanvas, isDrawer, isGameActive, sendDrawingEvent, isCanvasValid, isReceivingRef, activeTool, brushOpacity, brushHardness]);

  // Undo handler
  const handleUndo = () => {
    if (!isCanvasValid(fabricCanvas) || !isDrawer) return;
    const canvas = fabricCanvas;
    try {
      const objects = canvas.getObjects();
      if (objects.length > 0) {
        canvas.remove(objects[objects.length - 1]);
        canvas.renderAll();
        toast.info("Undo");
      }
    } catch (error) {
      console.error("[CanvasDrawing] Error undoing:", error);
    }
  };

  // Clear handler
  const handleClear = (clearCanvas: () => void) => {
    if (!isCanvasValid(fabricCanvas) || !isDrawer) return;
    const canvas = fabricCanvas;
    try {
      canvas.clear();
      canvas.backgroundColor = "#ffffff";
      canvas.renderAll();
      clearCanvas();
      toast.success("Canvas cleared!");
    } catch (error) {
      console.error("[CanvasDrawing] Error clearing canvas:", error);
    }
  };

  return {
    handleUndo,
    handleClear,
  };
}

