import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, PencilBrush } from "fabric";

interface CanvasSize {
  width: number;
  height: number;
}

interface UseCanvasLifecycleOptions {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  isDrawer: boolean;
  isGameActive: boolean;
  activeColor: string;
  brushSize: number;
  brushOpacity: number;
  brushHardness: number;
  activeTool: "draw" | "erase";
}

interface UseCanvasLifecycleReturn {
  fabricCanvas: FabricCanvas | null;
  isDisposed: boolean;
  isCanvasValid: (canvas: FabricCanvas | null) => boolean;
}

/**
 * Manages Fabric.js canvas lifecycle: initialization, disposal, and resizing
 */
export function useCanvasLifecycle({
  canvasRef,
  containerRef,
  isDrawer,
  isGameActive,
  activeColor,
  brushSize,
  brushOpacity,
  brushHardness,
  activeTool,
}: UseCanvasLifecycleOptions): UseCanvasLifecycleReturn {
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const isDisposedRef = useRef(false);
  const canvasReadyRef = useRef(false);

  // Calculate optimal canvas size based on container dimensions
  const calculateCanvasSize = useCallback((): CanvasSize => {
    if (!containerRef.current) {
      // Fallback to window size if container not ready
      const isMobile = window.innerWidth <= 768;
      const isSmallMobile = window.innerWidth <= 480;
      return {
        width: isSmallMobile 
          ? Math.min(window.innerWidth - 32, 320) 
          : isMobile 
          ? Math.min(window.innerWidth - 40, 400) 
          : 800,
        height: isSmallMobile ? 240 : isMobile ? 300 : 600,
      };
    }

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    // Get actual container dimensions (handle zero/negative values)
    const containerWidth = Math.max(containerRect.width, 0);
    const containerHeight = Math.max(containerRect.height, 0);
    
    if (containerWidth === 0 || containerHeight === 0) {
      // Fallback if container not measured yet
      const isMobile = window.innerWidth <= 768;
      return {
        width: isMobile ? Math.min(window.innerWidth - 40, 400) : 800,
        height: isMobile ? 300 : 600,
      };
    }
    
    // Account for toolbar and color palette space
    // Mobile: smaller UI elements
    // Note: Toolbar is only shown for drawers, so guessers need minimal space
    const isMobile = containerWidth <= 768;
    const isSmallMobile = containerWidth <= 480;
    
    const verticalSpaceForUI = isSmallMobile 
      ? (isDrawer ? 200 : 20)  // Guessers only need padding
      : isMobile 
      ? (isDrawer ? 240 : 30)   // Guessers only need padding
      : (isDrawer ? 280 : 40);  // Guessers only need padding
    
    const horizontalPadding = isSmallMobile ? 16 : isMobile ? 24 : 32;
    
    const availableWidth = containerWidth - horizontalPadding;
    const availableHeight = containerHeight - verticalSpaceForUI;
    
    // Target aspect ratio (4:3 for drawing canvas)
    const targetAspectRatio = 4 / 3;
    
    // Calculate dimensions that fit within available space
    let width = availableWidth;
    let height = width / targetAspectRatio;
    
    // If height exceeds available space, scale down based on height
    if (height > availableHeight) {
      height = Math.max(availableHeight, 0);
      width = height * targetAspectRatio;
    }
    
    // Ensure minimum sizes (smaller for mobile)
    const minWidth = isSmallMobile ? 250 : isMobile ? 280 : 300;
    const minHeight = isSmallMobile ? 188 : isMobile ? 210 : 225;
    
    width = Math.max(width, minWidth);
    height = Math.max(height, minHeight);
    
    // Ensure we don't exceed available space
    width = Math.min(width, availableWidth);
    height = Math.min(height, availableHeight);
    
    return {
      width: Math.floor(width),
      height: Math.floor(height),
    };
  }, [isDrawer, containerRef]);

  // Helper function to check if canvas is valid and not disposed
  const isCanvasValid = useCallback((canvas: FabricCanvas | null): boolean => {
    if (!canvas || isDisposedRef.current) {
      return false;
    }
    try {
      const lowerCanvasEl = (canvas as any).lowerCanvasEl;
      if (!lowerCanvasEl) {
        return false;
      }
      const context = lowerCanvasEl.getContext('2d');
      return !!context;
    } catch (error) {
      return false;
    }
  }, []);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    console.debug("[CanvasLifecycle] Initializing new canvas", {
      isGameActive,
      isDrawer,
    });

    isDisposedRef.current = false;
    canvasReadyRef.current = false;

    const { width, height } = calculateCanvasSize();

    const canvas = new FabricCanvas(canvasRef.current, {
      width,
      height,
      backgroundColor: "#ffffff",
      isDrawingMode: false,
      renderOnAddRemove: true,
      skipTargetFind: !isDrawer,
    });

    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = activeColor;
    canvas.freeDrawingBrush.width = activeTool === "erase" ? brushSize * 2 : brushSize;
    
    // Set brush opacity (Fabric.js uses shadowBlur and shadowColor for soft edges)
    // For opacity, we'll need to handle it in the drawing context
    // For hardness, we use shadowBlur (0 = hard, higher = soft)
    if (activeTool !== "erase") {
      const shadowBlur = brushHardness < 1 ? (1 - brushHardness) * brushSize * 2 : 0;
      (canvas.freeDrawingBrush as any).shadow = {
        blur: shadowBlur,
        offsetX: 0,
        offsetY: 0,
        color: activeColor,
      };
    }

    canvas.isDrawingMode = isGameActive && isDrawer;

    // Disable all interactions for guessers
    if (!isDrawer) {
      canvas.selection = false;
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'default';
      canvas.moveCursor = 'default';
      canvas.skipTargetFind = true;
    }

    setFabricCanvas(canvas);
    
    // Verify it's ready - Fabric.js should have lowerCanvasEl ready immediately
    // but we'll check in the next frame to be safe
    // Use a more robust check that doesn't spam warnings
    requestAnimationFrame(() => {
      try {
        const lowerCanvasEl = (canvas as any).lowerCanvasEl;
        if (lowerCanvasEl && lowerCanvasEl.getContext) {
          canvasReadyRef.current = true;
        } else {
          // Only warn if canvas is still valid (not disposed)
          // This can happen during HMR or rapid remounts
          if (!isDisposedRef.current && canvasRef.current) {
            // Try again in next frame - sometimes Fabric needs more time
            requestAnimationFrame(() => {
              const retryLowerCanvasEl = (canvas as any).lowerCanvasEl;
              if (retryLowerCanvasEl && retryLowerCanvasEl.getContext) {
                canvasReadyRef.current = true;
              }
              // Don't warn on retry - it's expected during HMR
            });
          }
        }
      } catch (error) {
        // Silently handle errors during initialization
        // This can happen during HMR or component unmount
      }
    });

    // Debounce resize handler to prevent excessive resizing
    let resizeTimeout: NodeJS.Timeout | null = null;
    const handleResize = () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = setTimeout(() => {
        if (isCanvasValid(canvas)) {
          const { width, height } = calculateCanvasSize();
          // Only resize if dimensions actually changed (avoid unnecessary renders)
          if (canvas.width !== width || canvas.height !== height) {
            canvas.setWidth(width);
            canvas.setHeight(height);
            canvas.renderAll();
          }
        }
      }, 150); // Debounce resize events
    };

    // ResizeObserver for container size changes
    const resizeObserver = new ResizeObserver(handleResize);

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Initial resize after delay (give container time to measure)
    const initialResizeTimeout = setTimeout(() => {
      if (isCanvasValid(canvas)) {
        const { width, height } = calculateCanvasSize();
        canvas.setWidth(width);
        canvas.setHeight(height);
        canvas.renderAll();
      }
    }, 200);

    // Window resize fallback (with debouncing)
    window.addEventListener("resize", handleResize);
    
    // Also listen for orientation changes on mobile
    const handleOrientationChange = () => {
      // Wait for orientation change to complete
      setTimeout(() => {
        if (isCanvasValid(canvas)) {
          const { width, height } = calculateCanvasSize();
          canvas.setWidth(width);
          canvas.setHeight(height);
          canvas.renderAll();
        }
      }, 300);
    };
    
    window.addEventListener("orientationchange", handleOrientationChange);

    return () => {
      console.debug("[CanvasLifecycle] Disposing canvas");
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      clearTimeout(initialResizeTimeout);
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleOrientationChange);
      isDisposedRef.current = true;
      
      setFabricCanvas(null);
      
      try {
        if (canvas && (canvas as any).lowerCanvasEl) {
          canvas.dispose();
        }
      } catch (error) {
        console.debug("[CanvasLifecycle] Error disposing canvas:", error);
      }
    };
  }, [canvasRef, containerRef, isGameActive, isDrawer, calculateCanvasSize, isCanvasValid]);

  // Update brush properties when they change (without re-initializing canvas)
  useEffect(() => {
    if (!isCanvasValid(fabricCanvas) || !fabricCanvas?.freeDrawingBrush) return;

    if (activeTool === "erase") {
      fabricCanvas.freeDrawingBrush.color = "#ffffff";
      fabricCanvas.freeDrawingBrush.width = brushSize * 2;
      (fabricCanvas.freeDrawingBrush as any).shadow = null;
    } else {
      fabricCanvas.freeDrawingBrush.color = activeColor;
      fabricCanvas.freeDrawingBrush.width = brushSize;
      
      // Apply hardness using shadowBlur
      const shadowBlur = brushHardness < 1 ? (1 - brushHardness) * brushSize * 2 : 0;
      (fabricCanvas.freeDrawingBrush as any).shadow = shadowBlur > 0 ? {
        blur: shadowBlur,
        offsetX: 0,
        offsetY: 0,
        color: activeColor,
      } : null;
    }
  }, [fabricCanvas, isCanvasValid, activeColor, brushSize, brushOpacity, brushHardness, activeTool]);

  return {
    fabricCanvas,
    isDisposed: isDisposedRef.current,
    isCanvasValid,
  };
}

