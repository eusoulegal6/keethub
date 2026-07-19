import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Eraser, Paintbrush, Settings, Trash2, Undo } from "lucide-react";
import { ColorPalette } from "./ColorPalette";

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
  activeColor: string;
  brushSize: number;
  brushOpacity: number;
  brushHardness: number;
  hasCanvasContent: boolean;
  onToolChange: (tool: "draw" | "erase") => void;
  onColorChange: (color: string) => void;
  onBrushSizeChange: (size: number) => void;
  onBrushOpacityChange: (opacity: number) => void;
  onBrushHardnessChange: (hardness: number) => void;
  onUndo: () => void;
  onClear: () => void;
  disabled?: boolean;
}

export const Toolbar = ({
  activeTool,
  activeColor,
  brushSize,
  brushOpacity,
  brushHardness,
  hasCanvasContent,
  onToolChange,
  onColorChange,
  onBrushSizeChange,
  onBrushOpacityChange,
  onBrushHardnessChange,
  onUndo,
  onClear,
  disabled = false,
}: ToolbarProps) => {
  const [showAdvanced, setShowAdvanced] = useState(() => !hasCanvasContent);

  useEffect(() => {
    setShowAdvanced(!hasCanvasContent);
  }, [hasCanvasContent]);

  const applyPreset = (preset: BrushPreset) => {
    onBrushSizeChange(preset.size);
    onBrushOpacityChange(preset.opacity);
    onBrushHardnessChange(preset.hardness);
  };

  return (
    <div className="w-full rounded-lg border border-[#E6EAF2] bg-white p-4 shadow-[0_14px_34px_rgba(16,32,74,0.07)]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => onToolChange("draw")}
              disabled={disabled}
              aria-label="Brush tool"
              aria-pressed={activeTool === "draw"}
              className={cn(
                "h-12 rounded-lg px-5 text-base font-extrabold shadow-sm",
                activeTool === "draw"
                  ? "bg-[#FF2F85] text-white hover:bg-[#E92778] hover:text-white"
                  : "border border-[#D7DDEA] bg-white text-[#24375F] hover:bg-[#FFF1F6] hover:text-[#FF2F85]",
              )}
            >
              <Paintbrush className="mr-2 h-5 w-5" />
              Brush
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => onToolChange("erase")}
              disabled={disabled}
              aria-label="Eraser tool"
              aria-pressed={activeTool === "erase"}
              className={cn(
                "h-12 rounded-lg px-5 text-base font-extrabold shadow-sm",
                activeTool === "erase"
                  ? "bg-[#7037E8] text-white hover:bg-[#5F2ED1] hover:text-white"
                  : "border border-[#D7DDEA] bg-white text-[#24375F] hover:bg-[#F6F1FF] hover:text-[#7037E8]",
              )}
            >
              <Eraser className="mr-2 h-5 w-5" />
              Eraser
            </Button>
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-lg bg-[#FBFDFF] px-3 py-2">
            <span className="flex-shrink-0 text-sm font-extrabold text-[#24375F]">Size</span>
            <Slider
              value={[brushSize]}
              onValueChange={(value) => onBrushSizeChange(value[0])}
              min={1}
              max={50}
              step={1}
              disabled={disabled}
              className="min-w-[120px] flex-1"
              aria-label="Brush size"
              aria-valuemin={1}
              aria-valuemax={50}
              aria-valuenow={brushSize}
            />
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[#E6EAF2] bg-white text-base font-extrabold text-[#10204A]">
              {brushSize}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={onUndo}
              disabled={disabled}
              aria-label="Undo last action"
              className="h-12 rounded-lg bg-[#E9FBFA] px-5 text-base font-extrabold text-[#087E7D] shadow-sm hover:bg-[#D8F7F5] hover:text-[#087E7D]"
            >
              <Undo className="mr-2 h-5 w-5" />
              Undo
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={onClear}
              disabled={disabled}
              aria-label="Clear canvas"
              className="h-12 rounded-lg bg-[#F2555D] px-5 text-base font-extrabold text-white shadow-sm hover:bg-[#DC454D] hover:text-white"
            >
              <Trash2 className="mr-2 h-5 w-5" />
              Clear
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-[#E6EAF2] bg-[#FBFDFF] px-4 py-3">
          <button
            type="button"
            onClick={() => setShowAdvanced((value) => !value)}
            className="flex w-full items-center justify-between gap-3 text-left text-sm font-extrabold text-[#7037E8] transition-colors hover:text-[#5F2ED1]"
            aria-expanded={showAdvanced}
          >
            <span className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Brush Settings
            </span>
            {showAdvanced ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-4 border-t border-[#E6EAF2] pt-4">
              <ColorPalette activeColor={activeColor} onColorChange={onColorChange} />

              <div className="grid gap-4 border-t border-[#E6EAF2] pt-4 lg:grid-cols-[minmax(0,1fr)_260px_260px]">
                <div>
                  <p className="mb-2 text-sm font-extrabold text-[#24375F]">Brush presets</p>
                  <div className="flex flex-wrap gap-2">
                    {BRUSH_PRESETS.map((preset) => (
                      <Button
                        key={preset.name}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyPreset(preset)}
                        disabled={disabled}
                        className="h-9 rounded-lg border-[#D7DDEA] bg-white px-3 text-xs font-extrabold text-[#415070] hover:bg-[#F6F1FF] hover:text-[#7037E8]"
                      >
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="w-16 flex-shrink-0 text-sm font-extrabold text-[#24375F]">
                    Opacity
                  </span>
                  <Slider
                    value={[brushOpacity]}
                    onValueChange={(value) => onBrushOpacityChange(value[0])}
                    min={0}
                    max={1}
                    step={0.1}
                    disabled={disabled}
                    className="min-w-0 flex-1"
                    aria-label="Brush opacity"
                    aria-valuemin={0}
                    aria-valuemax={1}
                    aria-valuenow={brushOpacity}
                  />
                  <span className="w-10 flex-shrink-0 text-right text-sm font-extrabold text-[#10204A]">
                    {Math.round(brushOpacity * 100)}%
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="w-20 flex-shrink-0 text-sm font-extrabold text-[#24375F]">
                    Hardness
                  </span>
                  <Slider
                    value={[brushHardness]}
                    onValueChange={(value) => onBrushHardnessChange(value[0])}
                    min={0}
                    max={1}
                    step={0.1}
                    disabled={disabled}
                    className="min-w-0 flex-1"
                    aria-label="Brush hardness"
                    aria-valuemin={0}
                    aria-valuemax={1}
                    aria-valuenow={brushHardness}
                  />
                  <span className="w-10 flex-shrink-0 text-right text-sm font-extrabold text-[#10204A]">
                    {Math.round(brushHardness * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
