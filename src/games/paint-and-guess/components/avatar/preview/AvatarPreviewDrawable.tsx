/**
 * Drawable Avatar Preview Component
 * 
 * Displays an avatar preview with drawing capabilities on top.
 * Users can draw custom details directly on their avatar.
 * 
 * @module avatar/preview/AvatarPreviewDrawable
 */

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Canvas as FabricCanvas, PencilBrush, FabricObject, Image as FabricImage } from "fabric";
import { AvatarConfig } from "@/lib/avatar/config";
import { createAvatar } from "@dicebear/core";
import * as avataaars from "@dicebear/avataaars";
import { avatarConfigToDiceBearOptions } from "@/lib/avatar/dicebear/mapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, X, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface AvatarPreviewDrawableProps {
  config: AvatarConfig;
  size?: number;
  className?: string;
  onDrawingsChange?: (drawingsJson: string | null) => void;
}

export function AvatarPreviewDrawable({
  config,
  size = 200,
  className = "",
  onDrawingsChange,
}: AvatarPreviewDrawableProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [brushColor, setBrushColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(3);

  // Generate SVG avatar (only if no custom image is uploaded)
  const avatarSVG = useMemo(() => {
    // If custom image is uploaded, skip DiceBear generation
    if (config.customImageUrl) {
      return null;
    }
    
    try {
      const mapping = avatarConfigToDiceBearOptions(config);
      const style = {
        create: avataaars.create,
        meta: avataaars.meta,
        schema: avataaars.schema,
      };
      const avatar = createAvatar(style, {
        seed: mapping.seed,
        ...mapping.options,
      });
      return avatar.toString();
    } catch (error) {
      console.error("Failed to generate DiceBear avatar:", error);
      return `<svg width="${size}" height="${size}" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="95" fill="#e0e0e0"/>
        <text x="100" y="110" text-anchor="middle" font-size="40" fill="#666">👤</text>
      </svg>`;
    }
  }, [config, size]);

  // Initialize canvas with avatar as background
  useEffect(() => {
    if (!canvasRef.current) {
      console.debug('[AvatarPreviewDrawable] Canvas ref not available');
      return;
    }

    console.debug('[AvatarPreviewDrawable] Initializing canvas', {
      size,
      hasCustomDrawings: !!config.customDrawings,
      customDrawingsLength: config.customDrawings?.length || 0,
    });

    let canvas: FabricCanvas | null = null;

    // Create canvas with transparent background (avatar is CSS background)
    console.debug('[AvatarPreviewDrawable] Creating canvas');
    canvas = new FabricCanvas(canvasRef.current!, {
      width: size,
      height: size,
      backgroundColor: "transparent", // Transparent so avatar shows through
      isDrawingMode: false,
      renderOnAddRemove: true, // Ensure paths are rendered when added (Stack Overflow solution)
      preserveObjectStacking: true, // Preserve object order
      stateful: true, // Preserve object state
    });
    
    // CRITICAL: Initialize freeDrawingBrush (this was missing!)
    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = brushColor;
    canvas.freeDrawingBrush.width = brushSize;
    
    console.debug('[AvatarPreviewDrawable] Canvas created with brush initialized', {
      brushColor,
      brushSize,
    });

    setFabricCanvas(canvas);
    console.log('✅ [AvatarPreviewDrawable] Canvas initialized successfully', {
      canvasId: `canvas-${Date.now()}`,
      objectCount: canvas.getObjects().length,
    });

    // Monitor canvas events for debugging
    canvas.on('object:added', (e) => {
      const obj = e.target;
      const objId = (obj as any).__debugId || 'no-id';
      console.log('➕ [AvatarPreviewDrawable] Object added to canvas', {
        objId,
        type: obj.type,
        totalObjects: canvas.getObjects().length,
      });
    });

    canvas.on('object:removed', (e) => {
      const obj = e.target;
      const objId = (obj as any).__debugId || 'no-id';
      console.log('➖ [AvatarPreviewDrawable] Object removed from canvas', {
        objId,
        type: obj.type,
        totalObjects: canvas.getObjects().length,
      });
    });

    canvas.on('before:render', () => {
      const objects = canvas.getObjects();
      const pathIds = objects.map(obj => (obj as any).__debugId || 'no-id');
      console.log('🖼️ [AvatarPreviewDrawable] Before render', {
        objectCount: objects.length,
        pathIds,
      });
    });

    canvas.on('after:render', () => {
      const objects = canvas.getObjects();
      const pathIds = objects.map(obj => (obj as any).__debugId || 'no-id');
      console.log('🖼️ [AvatarPreviewDrawable] After render', {
        objectCount: objects.length,
        pathIds,
      });
    });

    return () => {
      console.log('🔄 [AvatarPreviewDrawable] ===== CANVAS CLEANUP =====', {
        objectCount: canvas?.getObjects().length || 0,
        pathIds: canvas?.getObjects().map(obj => (obj as any).__debugId || 'no-id') || [],
      });
      
      if (canvas) {
        canvas.dispose();
      }
      setFabricCanvas(null);
    };
  }, [avatarSVG, size]); // Removed config.customDrawings to prevent re-initialization when drawings change

  // Update drawing mode
  useEffect(() => {
    if (!fabricCanvas) return;
    
    const objectsBefore = fabricCanvas.getObjects();
    const objectCountBefore = objectsBefore.length;
    const pathIdsBefore = objectsBefore.map(obj => (obj as any).__debugId || 'no-id');
    
    console.log('🔄 [AvatarPreviewDrawable] ===== UPDATING DRAWING MODE =====', {
      isDrawingMode,
      currentMode: fabricCanvas.isDrawingMode,
      objectCountBefore,
      pathIdsBefore,
    });
    
    // CRITICAL: If disabling drawing mode, ensure any active drawing is finalized first
    // (Based on Stack Overflow solution: finalize path before ending drawing mode)
    if (!isDrawingMode && fabricCanvas.isDrawingMode) {
      // If we're disabling drawing mode, ensure any active path is finalized
      const brush = fabricCanvas.freeDrawingBrush as PencilBrush;
      if (brush && (brush as any)._isCurrentlyDrawing) {
        console.log('🖊️ [AvatarPreviewDrawable] Finalizing active drawing before disabling mode', {
          objectCountBefore,
        });
        // Trigger mouseUp to finalize the path
        const event = new MouseEvent('mouseup', { bubbles: true, cancelable: true });
        (fabricCanvas.lowerCanvasEl as HTMLElement).dispatchEvent(event);
        
        // Check objects after finalization
        const objectsAfterFinalize = fabricCanvas.getObjects();
        console.log('✅ [AvatarPreviewDrawable] After finalization', {
          objectCountBefore,
          objectCountAfter: objectsAfterFinalize.length,
          objectsAdded: objectsAfterFinalize.length - objectCountBefore,
        });
      }
    }
    
    fabricCanvas.isDrawingMode = isDrawingMode;
    
    // Ensure brush is ready when entering drawing mode
    if (isDrawingMode && fabricCanvas.freeDrawingBrush) {
      const brush = fabricCanvas.freeDrawingBrush as PencilBrush;
      brush.color = brushColor;
      brush.width = brushSize;
      console.log('🖌️ [AvatarPreviewDrawable] Brush configured for drawing mode', {
        color: brush.color,
        width: brush.width,
      });
    }
    
    // Render to ensure state is updated
    fabricCanvas.renderAll();
    
    // Check objects after mode change
    const objectsAfter = fabricCanvas.getObjects();
    const objectCountAfter = objectsAfter.length;
    const pathIdsAfter = objectsAfter.map(obj => (obj as any).__debugId || 'no-id');
    
    console.log('✅ [AvatarPreviewDrawable] Drawing mode updated', {
      isDrawingMode,
      objectCountBefore,
      objectCountAfter,
      objectsLost: objectCountBefore - objectCountAfter,
      pathIdsBefore,
      pathIdsAfter,
      pathsLost: pathIdsBefore.filter(id => !pathIdsAfter.includes(id)),
    });
    
    if (objectCountAfter < objectCountBefore) {
      console.error('❌ [AvatarPreviewDrawable] OBJECTS LOST DURING MODE CHANGE!', {
        lostCount: objectCountBefore - objectCountAfter,
        pathIdsBefore,
        pathIdsAfter,
        lostPathIds: pathIdsBefore.filter(id => !pathIdsAfter.includes(id)),
      });
    }
  }, [fabricCanvas, isDrawingMode, brushColor, brushSize]);

  // Update brush properties
  useEffect(() => {
    if (!fabricCanvas) return;
    
    // Ensure brush exists (create if it doesn't)
    if (!fabricCanvas.freeDrawingBrush) {
      console.debug('[AvatarPreviewDrawable] Creating freeDrawingBrush');
      fabricCanvas.freeDrawingBrush = new PencilBrush(fabricCanvas);
    }

    const brush = fabricCanvas.freeDrawingBrush as PencilBrush;
    console.debug('[AvatarPreviewDrawable] Updating brush properties', {
      color: brushColor,
      size: brushSize,
    });
    brush.color = brushColor;
    brush.width = brushSize;
  }, [fabricCanvas, brushColor, brushSize]);

  // Save drawings when they change (with debounce)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handlePathCreated = useCallback((e: { path: FabricObject }) => {
    if (!fabricCanvas || !onDrawingsChange) {
      console.debug('[AvatarPreviewDrawable] Path created but canvas or callback not available');
      return;
    }

    const path = e.path;
    const pathId = `path-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    (path as any).__debugId = pathId; // Tag path for tracking
    
    console.log('🎨 [AvatarPreviewDrawable] ===== PATH CREATED =====', {
      pathId,
      pathType: path.type,
      pathLeft: path.left,
      pathTop: path.top,
      pathWidth: path.width,
      pathHeight: path.height,
      pathStroke: (path as any).stroke,
      pathStrokeWidth: (path as any).strokeWidth,
    });

    // Get objects BEFORE any modifications
    const objectsBefore = fabricCanvas.getObjects();
    console.log('📊 [AvatarPreviewDrawable] Canvas state BEFORE path setup', {
      objectCount: objectsBefore.length,
      objectTypes: objectsBefore.map(obj => obj.type),
      pathInCanvas: objectsBefore.includes(path),
    });

    // Ensure the path is non-selectable and non-interactive (like Canvas.tsx does)
    path.selectable = false;
    path.evented = false;
    
    // Fabric.js should have already added the path, but verify it's in the objects array
    const objectsAfterConfig = fabricCanvas.getObjects();
    const pathInCanvas = objectsAfterConfig.includes(path);
    
    console.log('🔍 [AvatarPreviewDrawable] Path status after configuration', {
      pathId,
      pathInCanvas,
      totalObjects: objectsAfterConfig.length,
      objectIds: objectsAfterConfig.map((obj, idx) => ({
        index: idx,
        type: obj.type,
        id: (obj as any).__debugId || `obj-${idx}`,
      })),
    });
    
    // If path is not in canvas (shouldn't happen, but safety check), add it
    if (!pathInCanvas) {
      console.warn('⚠️ [AvatarPreviewDrawable] Path not in canvas objects, adding explicitly', {
        pathId,
        objectCountBefore: objectsAfterConfig.length,
      });
      fabricCanvas.add(path);
      const objectsAfterAdd = fabricCanvas.getObjects();
      console.log('✅ [AvatarPreviewDrawable] Path added explicitly', {
        pathId,
        objectCountAfter: objectsAfterAdd.length,
        pathNowInCanvas: objectsAfterAdd.includes(path),
      });
    }
    
    // CRITICAL: Force render to ensure path is visible (based on Stack Overflow solutions)
    // Use requestAnimationFrame to ensure rendering happens after path is fully added
    requestAnimationFrame(() => {
      if (fabricCanvas) {
        const objectsBeforeRender = fabricCanvas.getObjects();
        console.log('🖼️ [AvatarPreviewDrawable] Rendering canvas', {
          pathId,
          objectCount: objectsBeforeRender.length,
          pathInCanvas: objectsBeforeRender.includes(path),
        });
        
        fabricCanvas.renderAll();
        
        // Verify path is still there after render
        const objectsAfterRender = fabricCanvas.getObjects();
        const pathStillThere = objectsAfterRender.includes(path);
        console.log('✅ [AvatarPreviewDrawable] Canvas rendered', {
          pathId,
          objectCount: objectsAfterRender.length,
          pathStillInCanvas: pathStillThere,
          pathLost: !pathStillThere,
        });
        
        if (!pathStillThere) {
          console.error('❌ [AvatarPreviewDrawable] PATH DISAPPEARED AFTER RENDER!', {
            pathId,
            objectCountBefore: objectsBeforeRender.length,
            objectCountAfter: objectsAfterRender.length,
          });
        }
      }
    });

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce saves to avoid too many updates
    saveTimeoutRef.current = setTimeout(() => {
      if (!fabricCanvas) {
        console.warn('⚠️ [AvatarPreviewDrawable] Canvas not available during save');
        return;
      }
      
      // Save all drawing objects (avatar is CSS background, not saved)
      const allObjects = fabricCanvas.getObjects();
      const pathIds = allObjects.map(obj => (obj as any).__debugId || 'no-id');
      
      console.log('💾 [AvatarPreviewDrawable] Saving drawings', {
        objectCount: allObjects.length,
        pathIds,
        objectTypes: allObjects.map(obj => obj.type),
      });
      
      const drawingsData = {
        version: "6.9.0",
        objects: allObjects.map(obj => obj.toJSON()),
      };
      const jsonString = JSON.stringify(drawingsData);
      
      console.log('💾 [AvatarPreviewDrawable] Drawings saved', {
        objectCount: allObjects.length,
        jsonLength: jsonString.length,
        pathIds,
      });
      
      onDrawingsChange(jsonString);
    }, 500);
  }, [fabricCanvas, onDrawingsChange]);

  useEffect(() => {
    if (!fabricCanvas) return;
    fabricCanvas.on("path:created", handlePathCreated);
    return () => {
      fabricCanvas.off("path:created", handlePathCreated);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [fabricCanvas, handlePathCreated]);

  // Load existing drawings separately (after canvas is set) to avoid re-initialization
  // Use a ref to track if we've already loaded initial drawings to prevent reload loops
  const hasLoadedInitialDrawingsRef = useRef(false);
  const lastLoadedDrawingsRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (!fabricCanvas || !config.customDrawings) {
      // Reset ref if drawings are cleared
      if (!config.customDrawings) {
        hasLoadedInitialDrawingsRef.current = false;
        lastLoadedDrawingsRef.current = null;
      }
      return;
    }
    
    // Prevent reloading the same drawings (avoid infinite loop)
    if (config.customDrawings === lastLoadedDrawingsRef.current) {
      console.log('⏭️ [AvatarPreviewDrawable] Skipping reload - same drawings data');
      return;
    }
    
    const objectsBefore = fabricCanvas.getObjects();
    const objectCountBefore = objectsBefore.length;
    const pathIdsBefore = objectsBefore.map(obj => (obj as any).__debugId || 'no-id');
    
    console.log('📥 [AvatarPreviewDrawable] ===== LOADING CUSTOM DRAWINGS =====', {
      drawingsLength: config.customDrawings.length,
      objectCountBefore,
      pathIdsBefore,
      isInitialLoad: !hasLoadedInitialDrawingsRef.current,
    });
    
    try {
      const drawingsData = JSON.parse(config.customDrawings);
      if (drawingsData.objects && Array.isArray(drawingsData.objects)) {
        console.log('📦 [AvatarPreviewDrawable] Parsed drawings data', {
          objectCount: drawingsData.objects.length,
          objectTypes: drawingsData.objects.map((obj: any) => obj.type),
        });
        
        // Only clear existing objects if this is NOT the initial load
        // (Initial load happens when canvas is first created, and there are no objects yet)
        if (hasLoadedInitialDrawingsRef.current && objectCountBefore > 0) {
          const existingObjects = fabricCanvas.getObjects();
          const clearedIds = existingObjects.map(obj => (obj as any).__debugId || 'no-id');
          console.log('🗑️ [AvatarPreviewDrawable] Clearing existing objects before reload', {
            count: existingObjects.length,
            clearedIds,
          });
          
          existingObjects.forEach((obj) => {
            fabricCanvas.remove(obj);
          });
        }
        
        let loadedCount = 0;
        const totalObjects = drawingsData.objects.length;
        
        if (totalObjects === 0) {
          console.log('📭 [AvatarPreviewDrawable] No drawing objects to load');
          fabricCanvas.renderAll();
          lastLoadedDrawingsRef.current = config.customDrawings;
          hasLoadedInitialDrawingsRef.current = true;
        } else {
          // Load all objects
          const loadPromises: Promise<void>[] = [];
          
          drawingsData.objects.forEach((objData: any, index: number) => {
            const loadPromise = new Promise<void>((resolve) => {
              try {
                // Type assertion to handle Fabric.js type definitions
                (FabricObject.fromObject as any)(objData, (obj: FabricObject) => {
                  if (!fabricCanvas) {
                    resolve();
                    return;
                  }
                  
                  // Tag loaded objects for tracking
                  const loadedId = `loaded-${Date.now()}-${index}`;
                  (obj as any).__debugId = loadedId;
                  
                  obj.selectable = false;
                  obj.evented = false;
                  
                  const objectsBeforeAdd = fabricCanvas.getObjects();
                  fabricCanvas.add(obj);
                  const objectsAfterAdd = fabricCanvas.getObjects();
                  
                  console.log('➕ [AvatarPreviewDrawable] Loaded object', {
                    index,
                    loadedId,
                    type: obj.type,
                    objectCountBefore: objectsBeforeAdd.length,
                    objectCountAfter: objectsAfterAdd.length,
                    objectAdded: objectsAfterAdd.includes(obj),
                  });
                  
                  loadedCount++;
                  resolve();
                });
              } catch (error) {
                console.error('❌ [AvatarPreviewDrawable] Failed to load object', {
                  index,
                  error,
                });
                resolve();
              }
            });
            
            loadPromises.push(loadPromise);
          });
          
          // Wait for all objects to load
          Promise.all(loadPromises).then(() => {
            const finalObjects = fabricCanvas.getObjects();
            const finalPathIds = finalObjects.map(o => (o as any).__debugId || 'no-id');
            console.log('✅ [AvatarPreviewDrawable] All drawing objects loaded', {
              totalLoaded: loadedCount,
              expectedCount: totalObjects,
              finalObjectCount: finalObjects.length,
              finalPathIds,
            });
            
            if (finalObjects.length !== totalObjects) {
              console.error('❌ [AvatarPreviewDrawable] Object count mismatch!', {
                expected: totalObjects,
                actual: finalObjects.length,
              });
            }
            
            fabricCanvas.renderAll();
            lastLoadedDrawingsRef.current = config.customDrawings ?? null;
            hasLoadedInitialDrawingsRef.current = true;
          });
        }
      } else {
        console.warn('⚠️ [AvatarPreviewDrawable] Invalid drawings data structure');
        fabricCanvas.renderAll();
        lastLoadedDrawingsRef.current = config.customDrawings ?? null;
        hasLoadedInitialDrawingsRef.current = true;
      }
    } catch (error) {
      console.error("❌ [AvatarPreviewDrawable] Failed to load custom drawings:", error);
      fabricCanvas.renderAll();
      // Don't mark as loaded if there was an error
    }
  }, [fabricCanvas, config.customDrawings]);

  const handleClearDrawings = () => {
    if (!fabricCanvas) {
      console.warn('⚠️ [AvatarPreviewDrawable] Cannot clear drawings - canvas not available');
      return;
    }

    const objectsBefore = fabricCanvas.getObjects();
    const pathIdsBefore = objectsBefore.map(obj => (obj as any).__debugId || 'no-id');
    
    console.log('🗑️ [AvatarPreviewDrawable] ===== CLEARING ALL DRAWINGS =====', {
      objectCount: objectsBefore.length,
      pathIds: pathIdsBefore,
    });
    
    // Remove all drawing objects (avatar is CSS background, not a canvas object)
    objectsBefore.forEach((obj, index) => {
      const objId = (obj as any).__debugId || `obj-${index}`;
      console.log('🗑️ [AvatarPreviewDrawable] Removing object', {
        index,
        objId,
        type: obj.type,
      });
      fabricCanvas.remove(obj);
    });
    
    fabricCanvas.renderAll();
    
    const objectsAfter = fabricCanvas.getObjects();
    console.log('✅ [AvatarPreviewDrawable] Drawings cleared', {
      removedCount: objectsBefore.length,
      remainingCount: objectsAfter.length,
      pathIdsBefore,
    });

    if (onDrawingsChange) {
      onDrawingsChange(null);
    }
    toast.success("Drawings cleared");
  };

  // State for background image data URL (for DiceBear SVG)
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);

  // Create data URL for background (only for DiceBear SVG, not for custom images)
  useEffect(() => {
    // If custom image is uploaded, skip SVG processing
    if (config.customImageUrl || !avatarSVG) {
      setBackgroundImageUrl(null);
      return;
    }
    
    const svgBlob = new Blob([avatarSVG], { type: "image/svg+xml" });
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setBackgroundImageUrl(dataUrl);
    };
    reader.readAsDataURL(svgBlob);
  }, [avatarSVG, config.customImageUrl]);

  return (
    <div 
      className={`relative ${className}`} 
      style={{ 
        width: size, 
        height: isDrawingMode ? size + 60 : size, // Add space for controls when drawing mode is active
        minWidth: size,
        minHeight: size,
      }}
    >
      {/* Avatar preview box - fixed square size */}
      <div className="relative" style={{ width: size, height: size }}>
        {/* Avatar background layer */}
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            backgroundImage: config.customImageUrl 
              ? `url(${config.customImageUrl})` 
              : backgroundImageUrl 
                ? `url(${backgroundImageUrl})` 
                : 'none',
            backgroundSize: config.customImageUrl ? 'cover' : 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#ffffff',
          }}
        />
        
        {/* Drawable canvas layer */}
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 rounded-lg border-2 border-border shadow-soft"
          style={{ 
            width: `${size}px`, 
            height: `${size}px`,
            display: 'block',
            backgroundColor: 'transparent',
          }}
          width={size}
          height={size}
        />

        {/* Draw/Done button - positioned at bottom of preview box */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-10">
          <Button
            variant={isDrawingMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              console.debug('[AvatarPreviewDrawable] Toggling drawing mode', {
                current: isDrawingMode,
                new: !isDrawingMode,
              });
              setIsDrawingMode(!isDrawingMode);
            }}
            className="shadow-lg"
          >
            <Pencil className="w-4 h-4 mr-2" />
            {isDrawingMode ? "Done Drawing" : "Draw on Avatar"}
          </Button>
        </div>
      </div>
      
      {/* Drawing controls - positioned below avatar preview */}
      {isDrawingMode && (
        <div className="mt-2 flex justify-center">
          <div className="bg-background/90 backdrop-blur-sm p-2 rounded-lg border shadow-lg">
            <div className="flex gap-2 items-center">
              <Input
                type="color"
                value={brushColor}
                onChange={(e) => setBrushColor(e.target.value)}
                className="w-8 h-8 cursor-pointer rounded border"
                title="Brush Color"
              />
              <Input
                type="range"
                min="1"
                max="10"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-20"
                title="Brush Size"
              />
              <span className="text-xs text-muted-foreground w-6 text-center">
                {brushSize}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearDrawings}
                className="h-8 w-8"
                title="Clear Drawings"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

