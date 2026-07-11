import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Paintbrush, Eraser, Undo, Trash2, Settings, ChevronDown, ChevronUp } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface BrushPreset {
  name: string;
  size: number;
  opacity: number;
  hardness: number;
}

const BRUSH_PRESETS: BrushPreset[] = [
  { name: "Thin", size: 2, opacity: 1, hardness: 1 },
  { name: "Medium", size: 10, opacity: 1, hardness: 0.7 },
  { name: "Thick", size: 30, opacity: 1, hardness: 0.5 },
  { name: "Soft", size: 15, opacity: 0.8, hardness: 0.2 },
  { name: "Hard", size: 15, opacity: 1, hardness: 1 },
  { name: "Watercolor", size: 20, opacity: 0.6, hardness: 0.3 },
];

interface ToolbarProps {
  activeTool: "draw" | "erase";
  brushSize: number;
  brushOpacity: number;
  brushHardness: number;
  onToolChange: (tool: "draw" | "erase") => void;
  onBrushSizeChange: (size: number) => void;
  onBrushOpacityChange: (opacity: number) => void;
  onBrushHardnessChange: (hardness: number) => void;
  onUndo: () => void;
  onClear: () => void;
  disabled?: boolean;
}

export const Toolbar = ({
  activeTool,
  brushSize,
  brushOpacity,
  brushHardness,
  onToolChange,
  onBrushSizeChange,
  onBrushOpacityChange,
  onBrushHardnessChange,
  onUndo,
  onClear,
  disabled = false,
}: ToolbarProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const applyPreset = (preset: BrushPreset) => {
    onBrushSizeChange(preset.size);
    onBrushOpacityChange(preset.opacity);
    onBrushHardnessChange(preset.hardness);
  };

  return (
    <div className="bg-toolbar-bg rounded-2xl p-4 md:p-6 shadow-medium border border-border opacity-90 w-full max-w-full min-w-0 overflow-hidden">
      <div className="flex flex-col gap-4 w-full min-w-0">
        {/* Main Toolbar Row */}
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 w-full min-w-0">
          {/* Drawing Tools */}
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant={activeTool === "draw" ? "default" : "outline"}
              size="lg"
              onClick={() => onToolChange("draw")}
              disabled={disabled}
              aria-label="Brush tool"
              aria-pressed={activeTool === "draw"}
              className="gap-2 transition-all hover:scale-105"
            >
              <Paintbrush className="w-5 h-5" />
              <span className="hidden sm:inline">Brush</span>
              <span className="sr-only"> (Press B)</span>
            </Button>
            <Button
              variant={activeTool === "erase" ? "default" : "outline"}
              size="lg"
              onClick={() => onToolChange("erase")}
              disabled={disabled}
              aria-label="Eraser tool"
              aria-pressed={activeTool === "erase"}
              className="gap-2 transition-all hover:scale-105"
            >
              <Eraser className="w-5 h-5" />
              <span className="hidden sm:inline">Eraser</span>
              <span className="sr-only"> (Press E)</span>
            </Button>
          </div>

          {/* Brush Size */}
          <div className="flex items-center gap-3 flex-1 min-w-0 w-full md:w-auto">
            <span className="text-sm font-medium whitespace-nowrap flex-shrink-0">Size:</span>
            <Slider
              value={[brushSize]}
              onValueChange={(value) => onBrushSizeChange(value[0])}
              min={1}
              max={50}
              step={1}
              disabled={disabled}
              className="flex-1 min-w-0"
              aria-label="Brush size"
              aria-valuemin={1}
              aria-valuemax={50}
              aria-valuenow={brushSize}
            />
            <span className="text-sm font-medium w-8 text-center flex-shrink-0">{brushSize}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="secondary"
              size="lg"
              onClick={onUndo}
              disabled={disabled}
              aria-label="Undo last action"
              className="gap-2 transition-all hover:scale-105"
            >
              <Undo className="w-5 h-5" />
              <span className="hidden sm:inline">Undo</span>
              <span className="sr-only"> (Press Ctrl+U or Cmd+U)</span>
            </Button>
            <Button
              variant="destructive"
              size="lg"
              onClick={onClear}
              disabled={disabled}
              aria-label="Clear canvas"
              className="gap-2 transition-all hover:scale-105"
            >
              <Trash2 className="w-5 h-5" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          </div>
        </div>

        {/* Advanced Controls */}
        <div className="border-t border-border pt-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full text-sm font-semibold text-foreground hover:text-primary transition-colors mb-3"
            aria-expanded={showAdvanced}
          >
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Advanced Brush Settings
            </span>
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showAdvanced && (
            <div className="space-y-4">
              {/* Brush Presets */}
              <div>
                <span className="text-xs text-muted-foreground mb-2 block">Brush Presets</span>
                <div className="flex gap-2 flex-wrap">
                  {BRUSH_PRESETS.map((preset) => (
                    <Button
                      key={preset.name}
                      variant="outline"
                      size="sm"
                      onClick={() => applyPreset(preset)}
                      disabled={disabled}
                      className="text-xs"
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Brush Opacity */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium whitespace-nowrap flex-shrink-0 min-w-[80px]">
                  Opacity:
                </span>
                <Slider
                  value={[brushOpacity]}
                  onValueChange={(value) => onBrushOpacityChange(value[0])}
                  min={0}
                  max={1}
                  step={0.1}
                  disabled={disabled}
                  className="flex-1 min-w-0"
                  aria-label="Brush opacity"
                  aria-valuemin={0}
                  aria-valuemax={1}
                  aria-valuenow={brushOpacity}
                />
                <span className="text-sm font-medium w-12 text-center flex-shrink-0">
                  {Math.round(brushOpacity * 100)}%
                </span>
              </div>

              {/* Brush Hardness */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium whitespace-nowrap flex-shrink-0 min-w-[80px]">
                  Hardness:
                </span>
                <Slider
                  value={[brushHardness]}
                  onValueChange={(value) => onBrushHardnessChange(value[0])}
                  min={0}
                  max={1}
                  step={0.1}
                  disabled={disabled}
                  className="flex-1 min-w-0"
                  aria-label="Brush hardness"
                  aria-valuemin={0}
                  aria-valuemax={1}
                  aria-valuenow={brushHardness}
                />
                <span className="text-sm font-medium w-12 text-center flex-shrink-0">
                  {Math.round(brushHardness * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
