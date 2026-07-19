import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown, ChevronUp, Palette, Pipette } from "lucide-react";
import { HexColorPicker } from "react-colorful";
import { colord } from "colord";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ColorPaletteProps {
  activeColor: string;
  onColorChange: (color: string) => void;
}

const PRESET_COLORS = [
  "#000000",
  "#FFFFFF",
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#06B6D4",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#A855F7",
  "#F59E0B",
] as const;

const RECENT_COLORS_MAX = 6;
const STORAGE_KEY = "paint-and-guess-recent-colors";

const isValidHexColor = (value: string): boolean => /^#[0-9A-F]{6}$/i.test(value);

export const ColorPalette = ({ activeColor, onColorChange }: ColorPaletteProps) => {
  const [customColor, setCustomColor] = useState(activeColor);
  const [showAdvancedPicker, setShowAdvancedPicker] = useState(false);
  const [showHarmonies, setShowHarmonies] = useState(false);
  const [recentColors, setRecentColors] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    setCustomColor(activeColor);
  }, [activeColor]);

  const colorHarmonies = useMemo(() => {
    try {
      const color = colord(activeColor);
      return [
        { label: "Comp", color: color.rotate(180).toHex() },
        { label: "Triad", color: color.rotate(120).toHex() },
        { label: "Triad", color: color.rotate(240).toHex() },
        { label: "Light", color: color.lighten(0.2).toHex() },
        { label: "Dark", color: color.darken(0.2).toHex() },
        { label: "Soft", color: color.desaturate(0.2).toHex() },
      ];
    } catch {
      return [];
    }
  }, [activeColor]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentColors));
    } catch (error) {
      console.debug("[ColorPalette] Failed to save recent colors:", error);
    }
  }, [recentColors]);

  const rememberColor = (color: string) => {
    setRecentColors((prev) => {
      const filtered = prev.filter((recentColor) => recentColor !== color);
      return [color, ...filtered].slice(0, RECENT_COLORS_MAX);
    });
  };

  const handleColorSelect = (color: string) => {
    onColorChange(color);
    setCustomColor(color);
    rememberColor(color);
  };

  const handleHexChange = (value: string) => {
    const nextValue = value.toUpperCase();
    if (nextValue !== "" && !/^#[0-9A-F]{0,6}$/i.test(nextValue)) return;

    setCustomColor(nextValue);
    if (isValidHexColor(nextValue)) {
      onColorChange(nextValue);
      rememberColor(nextValue);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-3 text-sm font-extrabold text-[#24375F]">Colors</p>
        <div className="flex flex-wrap gap-3">
          {PRESET_COLORS.map((color) => (
            <ColorSwatch
              key={color}
              color={color}
              label={color}
              onClick={() => handleColorSelect(color)}
              isActive={activeColor.toUpperCase() === color}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(160px,auto)_minmax(280px,1fr)_auto] lg:items-end">
        <div>
          <p className="mb-3 text-sm font-extrabold text-[#667085]">Recent</p>
          {recentColors.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {recentColors.slice(0, 3).map((color, index) => (
                <ColorSwatch
                  key={`${color}-${index}`}
                  color={color}
                  label={`Recent ${color}`}
                  size="sm"
                  onClick={() => handleColorSelect(color)}
                  isActive={activeColor.toUpperCase() === color.toUpperCase()}
                />
              ))}
            </div>
          ) : (
            <div className="flex h-10 items-center text-sm font-semibold text-[#98A2B3]">
              No recent colors yet
            </div>
          )}
        </div>

        <div>
          <p className="mb-3 text-sm font-extrabold text-[#667085]">Custom Color</p>
          <div className="flex min-w-0 items-center gap-3">
            <Popover open={showAdvancedPicker} onOpenChange={setShowAdvancedPicker}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="h-11 w-11 flex-shrink-0 rounded-lg border-2 border-[#E6EAF2] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#10B8B5] focus:ring-offset-2"
                  style={{
                    backgroundColor: isValidHexColor(customColor) ? customColor : activeColor,
                  }}
                  aria-label="Open advanced color picker"
                >
                  <span className="sr-only">Color preview</span>
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto rounded-lg border-[#E6EAF2] bg-white p-4"
                align="start"
              >
                <div className="space-y-3">
                  <HexColorPicker
                    color={isValidHexColor(customColor) ? customColor : activeColor}
                    onChange={(color: string) => {
                      setCustomColor(color.toUpperCase());
                      onColorChange(color);
                      rememberColor(color);
                    }}
                  />
                  <Input
                    type="text"
                    value={customColor.toUpperCase()}
                    onChange={(e) => handleHexChange(e.target.value)}
                    className="h-10 font-mono uppercase"
                    placeholder="#000000"
                    maxLength={7}
                    aria-label="Custom color hex code"
                  />
                </div>
              </PopoverContent>
            </Popover>

            <Input
              type="text"
              value={customColor.toUpperCase()}
              onChange={(e) => handleHexChange(e.target.value)}
              className="h-11 min-w-0 flex-1 rounded-lg border-[#DDE4EF] bg-white font-mono uppercase text-[#24375F] focus-visible:ring-[#10B8B5]"
              placeholder="#000000"
              maxLength={7}
              aria-label="Custom color hex code"
            />
            <Pipette className="h-5 w-5 flex-shrink-0 text-[#7037E8]" />
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => setShowHarmonies((value) => !value)}
          className="h-11 rounded-lg border-[#D7DDEA] bg-white px-4 text-sm font-extrabold text-[#7037E8] hover:bg-[#F6F1FF] hover:text-[#7037E8]"
          aria-expanded={showHarmonies}
        >
          <Palette className="mr-2 h-4 w-4" />
          Color Harmonies
          {showHarmonies ? (
            <ChevronUp className="ml-2 h-4 w-4" />
          ) : (
            <ChevronDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      </div>

      {showHarmonies && colorHarmonies.length > 0 && (
        <div className="rounded-lg border border-[#E6EAF2] bg-white p-3">
          <div className="flex flex-wrap gap-3">
            {colorHarmonies.map((harmony) => (
              <ColorSwatch
                key={`${harmony.label}-${harmony.color}`}
                color={harmony.color}
                label={harmony.label}
                size="sm"
                onClick={() => handleColorSelect(harmony.color)}
                isActive={activeColor.toUpperCase() === harmony.color.toUpperCase()}
                showLabel
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface ColorSwatchProps {
  color: string;
  label: string;
  onClick: () => void;
  isActive: boolean;
  size?: "sm" | "md";
  showLabel?: boolean;
}

const ColorSwatch = ({
  color,
  label,
  onClick,
  isActive,
  size = "md",
  showLabel = false,
}: ColorSwatchProps) => {
  const isLightColor = color.toUpperCase() === "#FFFFFF" || color.toUpperCase() === "#EAB308";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Select ${label} color ${color}`}
      aria-pressed={isActive}
      className="group flex flex-col items-center gap-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10B8B5] focus:ring-offset-2"
    >
      <span
        className={cn(
          "relative flex items-center justify-center rounded-full border-2 shadow-[0_7px_14px_rgba(16,32,74,0.10)] transition-transform group-hover:scale-105",
          size === "sm" ? "h-9 w-9" : "h-12 w-12",
          color.toUpperCase() === "#FFFFFF" ? "border-[#E6EAF2]" : "border-transparent",
          isActive && "ring-2 ring-[#7037E8] ring-offset-2",
        )}
        style={{ backgroundColor: color }}
      >
        {isActive && (
          <Check className={cn("h-5 w-5", isLightColor ? "text-[#10204A]" : "text-white")} />
        )}
      </span>
      {showLabel && <span className="text-xs font-bold text-[#667085]">{label}</span>}
    </button>
  );
};
