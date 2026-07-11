import { useEffect } from "react";
import { Canvas as FabricCanvas, FabricObject, Path } from "fabric";
import * as fabric from "fabric";

interface UseCanvasSyncOptions {
  fabricCanvas: FabricCanvas | null;
  isDrawer: boolean;
  isGameActive: boolean;
  roundNumber: number;
  isCanvasValid: (canvas: FabricCanvas | null) => boolean;
  isReceivingRef: React.MutableRefObject<boolean>;
}


let eventSequenceCounter = 0;

/**
 * Handles canvas synchronization: receiving drawing events, clearing, round transitions
 */
export function useCanvasSync({
  fabricCanvas,
  isDrawer,
  isGameActive,
  roundNumber,
  isCanvasValid,
  isReceivingRef,
}: UseCanvasSyncOptions) {
  // Ensure all objects are non-interactive for guessers
  useEffect(() => {
    if (!isCanvasValid(fabricCanvas) || isDrawer) return;

    const objects = fabricCanvas.getObjects();
    if (objects.length > 0) {
      objects.forEach((obj) => {
        obj.selectable = false;
        obj.evented = false;
        obj.hoverCursor = 'default';
        obj.moveCursor = 'default';
      });
      fabricCanvas.selection = false;
      if (fabricCanvas.requestRenderAll) {
        fabricCanvas.requestRenderAll();
      } else {
        fabricCanvas.renderAll();
      }
    }
  }, [fabricCanvas, isDrawer, isCanvasValid]);

  // Clear canvas on round changes
  useEffect(() => {
    if (!isCanvasValid(fabricCanvas) || !isGameActive) return;
    
    try {
      fabricCanvas.clear();
      fabricCanvas.backgroundColor = "#ffffff";
      fabricCanvas.renderAll();
    } catch (error) {
      console.error("[CanvasSync] Error clearing canvas:", error);
    }
  }, [fabricCanvas, roundNumber, isGameActive, isCanvasValid]);

  // Listen for canvas clear events (for both drawer and guessers)
  useEffect(() => {
    if (!isCanvasValid(fabricCanvas) || !isGameActive) return;
    
    const handleCanvasClear = () => {
      if (!isCanvasValid(fabricCanvas)) return;
      try {
        fabricCanvas.clear();
        fabricCanvas.backgroundColor = "#ffffff";
        fabricCanvas.requestRenderAll();
      } catch (error) {
        console.error("[CanvasSync] Error clearing canvas:", error);
      }
    };
    
    window.addEventListener("canvas-cleared", handleCanvasClear);
    
    return () => {
      window.removeEventListener("canvas-cleared", handleCanvasClear);
    };
  }, [fabricCanvas, isGameActive, isCanvasValid]);

  // Receive drawing events (guessers only)
  useEffect(() => {
    if (!isCanvasValid(fabricCanvas) || isDrawer || !isGameActive) {
      return;
    }


    // Track active paths being drawn in real-time
    const activePaths = new Map<string, FabricObject>();
    // Track paths that have been finalized (to ignore late path-update events)
    const finalizedPaths = new Set<string>();
    // Track brush properties (opacity, hardness) for each path
    const pathProperties = new Map<string, { opacity: number; hardness: number; strokeWidth: number }>();
    // Buffer path-update events that arrive after path-complete (for network latency handling)
    const pendingPathCompletes = new Map<string, {
      event: any;
      timestamp: number;
      bufferedUpdates: Array<{ event: any; timestamp: number; sequence: number }>;
    }>();
    // Track the highest sequence number seen for each path
    const pathMaxSequence = new Map<string, number>();
    
    
    // Batch rendering updates using requestAnimationFrame for smoother performance
    // Use a more aggressive batching strategy for network updates
    let renderScheduled = false;
    let pendingRenders = 0;
    const scheduleRender = (immediate = false) => {
      if (immediate) {
        // Immediate render for first update of a new path
        if (isCanvasValid(fabricCanvas)) {
          if (fabricCanvas.requestRenderAll) {
            fabricCanvas.requestRenderAll();
          } else {
            fabricCanvas.renderAll();
          }
        }
        return;
      }
      
      if (!renderScheduled && isCanvasValid(fabricCanvas)) {
        renderScheduled = true;
        pendingRenders = 0;
        requestAnimationFrame(() => {
          if (isCanvasValid(fabricCanvas)) {
            // Batch multiple pending renders into one
            if (fabricCanvas.requestRenderAll) {
              fabricCanvas.requestRenderAll();
            } else {
              fabricCanvas.renderAll();
            }
          }
          renderScheduled = false;
          pendingRenders = 0;
        });
      } else {
        pendingRenders++;
      }
    };

    // Debug: Log canvas state snapshot
    const logCanvasState = (label: string, pathId?: string) => {
      if (!isCanvasValid(fabricCanvas)) return;
      
      const objects = fabricCanvas.getObjects();
      const pathObjects = objects.filter(obj => obj.type === 'path');
      
      const state = {
        timestamp: Date.now(),
        label,
        pathId,
        totalObjects: objects.length,
        pathObjects: pathObjects.length,
        pathDetails: pathObjects.map((obj: any) => ({
          type: obj.type,
          pathLength: obj.path ? (Array.isArray(obj.path) ? obj.path.length : 'unknown') : 0,
          stroke: obj.stroke,
          strokeWidth: obj.strokeWidth,
        })),
      };
      
    };

    const handleDrawingEvent = (e: Event) => {
      if (!isCanvasValid(fabricCanvas)) {
        return;
      }
      
      const customEvent = e as CustomEvent;
      const event = customEvent.detail;
      const eventTimestamp = Date.now();
      const sequence = ++eventSequenceCounter;
      
      
      // Handle path start - create temporary path placeholder
      if (event.type === "path-start" && event.pathId) {
        // Initialize accumulated points for this new path
        accumulatedPathPoints.set(event.pathId, []);
        try {
          // Just store the path ID, the actual path will be created on first update
          // This prevents creating an empty path that might cause rendering issues
          if (!activePaths.has(event.pathId)) {
            activePaths.set(event.pathId, null as any); // Placeholder
          }
          // Remove from finalized set if it was there (new stroke with same ID pattern)
          finalizedPaths.delete(event.pathId);
          
          // Store brush properties from path-start event
          pathProperties.set(event.pathId, {
            opacity: event.opacity ?? 1,
            hardness: event.hardness ?? 1,
            strokeWidth: event.width ?? 5,
          });
          
        } catch (error) {
          console.error("[CanvasSync] Error creating path start:", error);
        }
        return;
      }

      // Handle path update - update existing path in real-time
      if (event.type === "path-update" && event.pathId && event.data) {
        const eventSequence = event.sequence || 0;
        const pathId = event.pathId;
        
        // Track max sequence for this path
        const currentMax = pathMaxSequence.get(pathId) || 0;
        if (eventSequence > currentMax) {
          pathMaxSequence.set(pathId, eventSequence);
        }
        
        // If path-complete is pending, buffer this update instead of applying immediately
        const pendingComplete = pendingPathCompletes.get(pathId);
        if (pendingComplete) {
          // Buffer this update - it will be applied before finalizing
          pendingComplete.bufferedUpdates.push({
            event,
            timestamp: eventTimestamp,
            sequence: eventSequence,
          });
          // Sort by sequence to ensure correct order
          pendingComplete.bufferedUpdates.sort((a, b) => a.sequence - b.sequence);
          return;
        }
        
        // Ignore path-update events for paths that have already been finalized
        // This prevents race conditions where path-complete arrives before all path-updates
        if (finalizedPaths.has(pathId)) {
          return;
        }
        
        try {
          let path = activePaths.get(event.pathId);
          
          // Handle both old format (full path) and new format (differential newPoints)
          let newPoints: number[][] = [];
          let allPathPoints: number[][] = [];
          
          if (event.data.newPoints) {
            // New differential format: append new points to accumulated path
            const accumulated = accumulatedPathPoints.get(event.pathId) || [];
            newPoints = event.data.newPoints;
            allPathPoints = [...accumulated, ...newPoints];
            accumulatedPathPoints.set(event.pathId, allPathPoints);
          } else if (event.data.path) {
            // Legacy format: full path array (for backwards compatibility)
            allPathPoints = event.data.path;
            accumulatedPathPoints.set(event.pathId, allPathPoints);
          } else {
            return; // Invalid event data
          }
          
          if (!allPathPoints || allPathPoints.length === 0) return;
          
          // Get or update stored properties from path-update
          const existing = pathProperties.get(event.pathId) || { opacity: 1, hardness: 1, strokeWidth: 5 };
          const currentProps = {
            opacity: event.data.opacity ?? existing.opacity,
            hardness: event.data.hardness ?? existing.hardness,
            strokeWidth: event.data.strokeWidth ?? existing.strokeWidth,
          };
          pathProperties.set(event.pathId, currentProps);
          

          if (!path || path === null) {
            // Create path if it doesn't exist - synchronous for immediate rendering
            if (!isCanvasValid(fabricCanvas)) return;

            // Build path array for Fabric.js (starts with M, then L commands)
            const fabricPath: any[] = [['M', allPathPoints[0][0], allPathPoints[0][1]]];
            for (let i = 1; i < allPathPoints.length; i++) {
              fabricPath.push(['L', allPathPoints[i][0], allPathPoints[i][1]]);
            }

            const opacity = event.data.opacity ?? 1;
            const hardness = event.data.hardness ?? 1;
            const shadowBlur = hardness < 1 ? (1 - hardness) * (event.data.strokeWidth || 5) * 2 : 0;
            
            path = new Path(fabricPath, {
              stroke: event.data.stroke || "#000000",
              strokeWidth: event.data.strokeWidth || 5,
              opacity: opacity,
              fill: "",
              selectable: false,
              evented: false,
              objectCaching: false,
              shadow: shadowBlur > 0 ? {
                blur: shadowBlur,
                offsetX: 0,
                offsetY: 0,
                color: event.data.stroke || "#000000",
              } : null,
            });

            activePaths.set(event.pathId, path);
            fabricCanvas.add(path);
            // Immediate render for new paths (first update) - critical for perceived latency
            scheduleRender(true);
          } else {
            // Update existing path with accumulated points
            // Build path array for Fabric.js
            const fabricPath: any[] = [['M', allPathPoints[0][0], allPathPoints[0][1]]];
            for (let i = 1; i < allPathPoints.length; i++) {
              fabricPath.push(['L', allPathPoints[i][0], allPathPoints[i][1]]);
            }

            // Use stored properties as fallback
            const opacity = currentProps.opacity;
            const hardness = currentProps.hardness;
            const shadowBlur = hardness < 1 ? (1 - hardness) * currentProps.strokeWidth * 2 : 0;
            
            (path as any).set({
              path: fabricPath,
              stroke: event.data.stroke,
              strokeWidth: currentProps.strokeWidth,
              opacity: opacity,
              shadow: shadowBlur > 0 ? {
                blur: shadowBlur,
                offsetX: 0,
                offsetY: 0,
                color: event.data.stroke || "#000000",
              } : null,
            });

            // Use batched rendering for updates (smoother performance)
            scheduleRender();
          }
          
        } catch (error) {
          console.error("[CanvasSync] Error updating path:", error);
        }
        return;
      }

      // Handle path complete - finalize path
      if (event.type === "path-complete" && event.data) {
        // If pathId is missing, try to match to the most recent unfinalized path
        let targetPathId = event.pathId;
        if (!targetPathId) {
          // Find the most recent path that hasn't been finalized
          const unfinalizedPaths = Array.from(activePaths.keys())
            .filter(id => !finalizedPaths.has(id));
          
          if (unfinalizedPaths.length > 0) {
            targetPathId = unfinalizedPaths[unfinalizedPaths.length - 1];
          } else {
            return; // Can't process without a pathId and no candidate paths
          }
        }
        
        const eventSequence = event.sequence || 0;
        const maxSequence = pathMaxSequence.get(targetPathId) || 0;
        
        // Store pending complete event and wait for late path-update events
        // This handles network latency on live servers where path-complete can arrive before all path-updates
        pendingPathCompletes.set(targetPathId, {
          event,
          timestamp: eventTimestamp,
          bufferedUpdates: [],
        });
        
        
        // Wait 30ms to catch any late path-update events (handles network latency)
        // Reduced further since we're now batching updates more efficiently
        setTimeout(() => {
          const pending = pendingPathCompletes.get(targetPathId);
          if (!pending) return; // Already processed
          
          // Apply any buffered path-update events first (they arrived after path-complete)
          if (pending.bufferedUpdates.length > 0) {
            
            // Apply buffered updates in sequence order - use the latest one (most points)
            const latestUpdate = pending.bufferedUpdates[pending.bufferedUpdates.length - 1];
            
            // Handle both old format (full path) and new format (differential newPoints)
            if (latestUpdate.event.data?.newPoints) {
              // New format: append to accumulated points
              const accumulated = accumulatedPathPoints.get(targetPathId) || [];
              const newPoints = latestUpdate.event.data.newPoints;
              accumulatedPathPoints.set(targetPathId, [...accumulated, ...newPoints]);
            } else if (latestUpdate.event.data?.path) {
              // Legacy format: replace accumulated points
              accumulatedPathPoints.set(targetPathId, latestUpdate.event.data.path);
            }
            
            const allPathPoints = accumulatedPathPoints.get(targetPathId) || [];
            
            if (allPathPoints.length > 0 && isCanvasValid(fabricCanvas)) {
              let path = activePaths.get(targetPathId);
              
              if (path) {
                // Update existing path with accumulated points
                const fabricPath: any[] = [['M', allPathPoints[0][0], allPathPoints[0][1]]];
                for (let i = 1; i < allPathPoints.length; i++) {
                  fabricPath.push(['L', allPathPoints[i][0], allPathPoints[i][1]]);
                }
                
                const storedProps = pathProperties.get(targetPathId) || { opacity: 1, hardness: 1, strokeWidth: 5 };
                const shadowBlur = storedProps.hardness < 1 ? (1 - storedProps.hardness) * storedProps.strokeWidth * 2 : 0;
                
                (path as any).set({
                  path: fabricPath,
                  stroke: latestUpdate.event.data.stroke,
                  strokeWidth: storedProps.strokeWidth,
                  opacity: storedProps.opacity,
                  shadow: shadowBlur > 0 ? {
                    blur: shadowBlur,
                    offsetX: 0,
                    offsetY: 0,
                    color: latestUpdate.event.data.stroke || "#000000",
                  } : null,
                });
                
                scheduleRender();
              }
            }
          }
          
          // Now finalize the path
          pendingPathCompletes.delete(targetPathId);
          
          // Mark this path as finalized to prevent late path-update events
          finalizedPaths.add(targetPathId);
          // Clean up accumulated points
          accumulatedPathPoints.delete(targetPathId);
          
          
          isReceivingRef.current = true;
          
          try {
            // Remove temporary path if it exists
            const tempPath = activePaths.get(targetPathId);
            if (tempPath) {
              try {
                fabricCanvas.remove(tempPath);
              } catch (e) {
                // Path might already be removed, ignore
              }
            }
            activePaths.delete(targetPathId);

            // Use enlivenObjects for final path (this is the complete, optimized path)
            // fabric.util is accessed from the fabric namespace
            fabric.util.enlivenObjects([pending.event.data]).then((objects: FabricObject[]) => {
            if (!isCanvasValid(fabricCanvas)) {
              isReceivingRef.current = false;
              return;
            }
            
            objects.forEach((obj) => {
              obj.selectable = false;
              obj.evented = false;
              obj.hoverCursor = 'default';
              obj.moveCursor = 'default';
              obj.objectCaching = false;
              
              // Ensure opacity and shadow are applied from stored properties or event data
              if (obj.type === 'path') {
                // Get properties from stored path properties (from path-start) or event data
                const storedProps = pathProperties.get(targetPathId);
                const opacity = storedProps?.opacity ?? event.data.opacity ?? obj.opacity ?? 1;
                const hardness = storedProps?.hardness ?? event.data.hardness ?? 1;
                const strokeWidth = obj.strokeWidth || storedProps?.strokeWidth || event.data.strokeWidth || 5;
                const strokeColor = obj.stroke || event.data.stroke || "#000000";
                
                // Apply opacity
                obj.set({ opacity: opacity });
                
                // Apply hardness using shadowBlur
                if (hardness < 1) {
                  const shadowBlur = (1 - hardness) * strokeWidth * 2;
                  obj.set({
                    shadow: {
                      blur: shadowBlur,
                      offsetX: 0,
                      offsetY: 0,
                      color: strokeColor,
                    },
                  });
                } else {
                  // Hard brush - no shadow
                  obj.set({ shadow: null });
                }
                
                // Clean up stored properties
                pathProperties.delete(targetPathId);
              }
              
              fabricCanvas.add(obj);
            });
            
            if (fabricCanvas.requestRenderAll) {
              fabricCanvas.requestRenderAll();
            } else {
              fabricCanvas.renderAll();
            }
            
            
            isReceivingRef.current = false;
          }).catch((err: Error) => {
            console.error("[CanvasSync] Error enlivening objects:", err);
            isReceivingRef.current = false;
          });
        } catch (error) {
          console.error("[CanvasSync] Error handling path complete:", error);
          isReceivingRef.current = false;
        }
        }, 200); // Wait 200ms for late path-update events (handles network latency)
        return;
      }

      // Legacy support: handle old "path" type events
      if (event.type === "path" && event.data && !isReceivingRef.current) {
        isReceivingRef.current = true;
        
        try {
          // fabric.util is accessed from the fabric namespace
          fabric.util.enlivenObjects([event.data]).then((objects: FabricObject[]) => {
            if (!isCanvasValid(fabricCanvas)) {
              isReceivingRef.current = false;
              return;
            }
            
            objects.forEach((obj) => {
              obj.selectable = false;
              obj.evented = false;
              obj.hoverCursor = 'default';
              obj.moveCursor = 'default';
              obj.objectCaching = false;
              fabricCanvas.add(obj);
            });
            
            if (fabricCanvas.requestRenderAll) {
              fabricCanvas.requestRenderAll();
            } else {
              fabricCanvas.renderAll();
            }
            isReceivingRef.current = false;
          }).catch((err: Error) => {
            console.error("[CanvasSync] Error enlivening objects:", err);
            isReceivingRef.current = false;
          });
        } catch (error) {
          console.error("[CanvasSync] Error handling drawing event:", error);
          isReceivingRef.current = false;
        }
      }
    };

    const handleCanvasCleared = () => {
      if (!isCanvasValid(fabricCanvas)) return;
      if (isReceivingRef.current) return;
      
      isReceivingRef.current = true;
      try {
        fabricCanvas.clear();
        fabricCanvas.backgroundColor = "#ffffff";
        fabricCanvas.requestRenderAll();
      } catch (error) {
        console.error("[CanvasSync] Error clearing canvas from event:", error);
      }
      isReceivingRef.current = false;
    };
    
    const handleRoundEnded = () => {
      if (!isCanvasValid(fabricCanvas)) return;
      try {
        fabricCanvas.clear();
        fabricCanvas.backgroundColor = "#ffffff";
        fabricCanvas.requestRenderAll();
      } catch (error) {
        console.error("[CanvasSync] Error clearing canvas on round end:", error);
      }
    };
    
    const handleRoundStarted = () => {
      if (!isCanvasValid(fabricCanvas)) return;
      try {
        fabricCanvas.clear();
        fabricCanvas.backgroundColor = "#ffffff";
        fabricCanvas.requestRenderAll();
      } catch (error) {
        console.error("[CanvasSync] Error clearing canvas on round start:", error);
      }
    };

    window.addEventListener("drawing-event", handleDrawingEvent);
    window.addEventListener("canvas-cleared", handleCanvasCleared);
    window.addEventListener("round-ended", handleRoundEnded);
    window.addEventListener("round-started", handleRoundStarted);

    return () => {
      window.removeEventListener("drawing-event", handleDrawingEvent);
      window.removeEventListener("canvas-cleared", handleCanvasCleared);
      window.removeEventListener("round-ended", handleRoundEnded);
      window.removeEventListener("round-started", handleRoundStarted);
    };
  }, [fabricCanvas, isDrawer, isGameActive, isCanvasValid, isReceivingRef]);
}

