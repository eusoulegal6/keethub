import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Palette, ChevronDown, ChevronUp } from "lucide-react";
import { HexColorPicker } from "react-colorful";
import { colord } from "colord";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ColorPaletteProps {
  activeColor: string;
  onColorChange: (color: string) => void;
}

const PRESET_COLORS = [
  "#000000", // Black
  "#FFFFFF", // White
  "#EF4444", // Red
  "#F97316", // Orange
  "#EAB308", // Yellow
  "#22C55E", // Green
  "#06B6D4", // Cyan
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#A855F7", // Violet
  "#F59E0B", // Amber
] as const;

const RECENT_COLORS_MAX = 6;
const STORAGE_KEY = "paint-and-guess-recent-colors";

// Validate hex color format
const isValidHexColor = (value: string): boolean => {
  return /^#[0-9A-F]{6}$/i.test(value);
};

export const ColorPalette = ({ activeColor, onColorChange }: ColorPaletteProps) => {
  // Sync customColor with activeColor prop
  const [customColor, setCustomColor] = useState(activeColor);
  const [showAdvancedPicker, setShowAdvancedPicker] = useState(false);
  const [showHarmonies, setShowHarmonies] = useState(false);
  
  // Load recent colors from localStorage
  const [recentColors, setRecentColors] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync customColor when activeColor prop changes
  useEffect(() => {
    setCustomColor(activeColor);
  }, [activeColor]);

  // Generate color harmonies using colord
  const colorHarmonies = useMemo(() => {
    try {
      const color = colord(activeColor);
      return {
        complementary: color.rotate(180).toHex(),
        triadic1: color.rotate(120).toHex(),
        triadic2: color.rotate(240).toHex(),
        analogous1: color.rotate(-30).toHex(),
        analogous2: color.rotate(30).toHex(),
        lighter: color.lighten(0.2).toHex(),
        darker: color.darken(0.2).toHex(),
        saturated: color.saturate(0.2).toHex(),
        desaturated: color.desaturate(0.2).toHex(),
      };
    } catch {
      return null;
    }
  }, [activeColor]);

  // Persist recent colors to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentColors));
    } catch (error) {
      console.debug("[ColorPalette] Failed to save recent colors:", error);
    }
  }, [recentColors]);

  const handleColorSelect = (color: string) => {
    onColorChange(color);
    setCustomColor(color);
    
    // Add to recent colors (remove if already exists, then add to front)
    setRecentColors((prev) => {
      const filtered = prev.filter((c) => c !== color);
      return [color, ...filtered].slice(0, RECENT_COLORS_MAX);
    });
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    
    // Only update active color if valid
    if (isValidHexColor(color)) {
      onColorChange(color);
      // Add to recent colors without calling handleColorSelect (avoid double call)
      setRecentColors((prev) => {
        const filtered = prev.filter((c) => c !== color);
        return [color, ...filtered].slice(0, RECENT_COLORS_MAX);
      });
    }
  };

  return (
    <div className="bg-toolbar-bg rounded-2xl p-4 md:p-6 shadow-medium border border-border">
      <div className="space-y-4">
        {/* Preset Colors */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-foreground">Colors</h3>
          <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => handleColorSelect(color)}
                aria-label={`Select color ${color}`}
                aria-pressed={activeColor === color}
                className="relative w-full aspect-square rounded-xl transition-all hover:scale-110 active:scale-95 shadow-soft focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                style={{
                  backgroundColor: color,
                  border: color === "#FFFFFF" ? "2px solid #e5e7eb" : "none",
                }}
              >
                {activeColor === color && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check
                      className="w-5 h-5"
                      style={{ color: color === "#FFFFFF" || color === "#EAB308" ? "#000000" : "#FFFFFF" }}
                    />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Recent Colors */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-foreground">Recent</h3>
          {recentColors.length > 0 ? (
            <div className="flex gap-2 flex-wrap">
              {recentColors.map((color, index) => (
                <button
                  key={`${color}-${index}`}
                  onClick={() => handleColorSelect(color)}
                  aria-label={`Select recent color ${color}`}
                  aria-pressed={activeColor === color}
                  className="relative w-12 h-12 rounded-xl transition-all hover:scale-110 active:scale-95 shadow-soft focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  style={{ backgroundColor: color }}
                >
                  {activeColor === color && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No recent colors yet</div>
          )}
        </div>

        {/* Color Harmonies */}
        {colorHarmonies && (
          <div>
            <button
              onClick={() => setShowHarmonies(!showHarmonies)}
              className="flex items-center justify-between w-full text-sm font-semibold mb-3 text-foreground hover:text-primary transition-colors"
              aria-expanded={showHarmonies}
            >
              <span className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Color Harmonies
              </span>
              {showHarmonies ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {showHarmonies && (
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-muted-foreground mb-2 block">Complementary & Triadic</span>
                  <div className="flex gap-2 flex-wrap">
                    <ColorSwatch
                      color={colorHarmonies.complementary}
                      label="Complementary"
                      onClick={() => handleColorSelect(colorHarmonies.complementary)}
                      isActive={activeColor === colorHarmonies.complementary}
                    />
                    <ColorSwatch
                      color={colorHarmonies.triadic1}
                      label="Triadic 1"
                      onClick={() => handleColorSelect(colorHarmonies.triadic1)}
                      isActive={activeColor === colorHarmonies.triadic1}
                    />
                    <ColorSwatch
                      color={colorHarmonies.triadic2}
                      label="Triadic 2"
                      onClick={() => handleColorSelect(colorHarmonies.triadic2)}
                      isActive={activeColor === colorHarmonies.triadic2}
                    />
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground mb-2 block">Analogous</span>
                  <div className="flex gap-2 flex-wrap">
                    <ColorSwatch
                      color={colorHarmonies.analogous1}
                      label="Analogous 1"
                      onClick={() => handleColorSelect(colorHarmonies.analogous1)}
                      isActive={activeColor === colorHarmonies.analogous1}
                    />
                    <ColorSwatch
                      color={colorHarmonies.analogous2}
                      label="Analogous 2"
                      onClick={() => handleColorSelect(colorHarmonies.analogous2)}
                      isActive={activeColor === colorHarmonies.analogous2}
                    />
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground mb-2 block">Variations</span>
                  <div className="flex gap-2 flex-wrap">
                    <ColorSwatch
                      color={colorHarmonies.lighter}
                      label="Lighter"
                      onClick={() => handleColorSelect(colorHarmonies.lighter)}
                      isActive={activeColor === colorHarmonies.lighter}
                    />
                    <ColorSwatch
                      color={colorHarmonies.darker}
                      label="Darker"
                      onClick={() => handleColorSelect(colorHarmonies.darker)}
                      isActive={activeColor === colorHarmonies.darker}
                    />
                    <ColorSwatch
                      color={colorHarmonies.saturated}
                      label="More Saturated"
                      onClick={() => handleColorSelect(colorHarmonies.saturated)}
                      isActive={activeColor === colorHarmonies.saturated}
                    />
                    <ColorSwatch
                      color={colorHarmonies.desaturated}
                      label="Less Saturated"
                      onClick={() => handleColorSelect(colorHarmonies.desaturated)}
                      isActive={activeColor === colorHarmonies.desaturated}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Custom Color Picker */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-foreground">Custom Color</h3>
          <div className="space-y-3">
            <div className="flex gap-3 items-center">
              <Popover open={showAdvancedPicker} onOpenChange={setShowAdvancedPicker}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-20 h-12 p-0 border-2 rounded-xl cursor-pointer"
                    style={{ backgroundColor: customColor }}
                    aria-label="Open advanced color picker"
                  >
                    <span className="sr-only">Color preview</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="start">
                  <div className="space-y-3">
                    <HexColorPicker
                      color={customColor}
                      onChange={(color) => {
                        setCustomColor(color);
                        if (isValidHexColor(color)) {
                          onColorChange(color);
                          setRecentColors((prev) => {
                            const filtered = prev.filter((c) => c !== color);
                            return [color, ...filtered].slice(0, RECENT_COLORS_MAX);
                          });
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={customColor.toUpperCase()}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase();
                          if (value === "" || /^#[0-9A-F]{0,6}$/i.test(value)) {
                            setCustomColor(value);
                            if (isValidHexColor(value)) {
                              onColorChange(value);
                              setRecentColors((prev) => {
                                const filtered = prev.filter((c) => c !== value);
                                return [value, ...filtered].slice(0, RECENT_COLORS_MAX);
                              });
                            }
                          }
                        }}
                        className="font-mono uppercase flex-1"
                        placeholder="#000000"
                        maxLength={7}
                        aria-label="Custom color hex code"
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Input
                type="text"
                value={customColor.toUpperCase()}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  // Allow empty or partial hex codes while typing
                  if (value === "" || /^#[0-9A-F]{0,6}$/i.test(value)) {
                    setCustomColor(value);
                    // Only apply if valid complete hex color
                    if (isValidHexColor(value)) {
                      onColorChange(value);
                      // Add to recent colors without calling handleColorSelect (avoid double call)
                      setRecentColors((prev) => {
                        const filtered = prev.filter((c) => c !== value);
                        return [value, ...filtered].slice(0, RECENT_COLORS_MAX);
                      });
                    }
                  }
                }}
                className="font-mono uppercase flex-1"
                placeholder="#000000"
                maxLength={7}
                aria-label="Custom color hex code"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Click the color box to open advanced picker
            </div>
          </div>
        </div>

        {/* Active Color Preview */}
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <span className="text-sm font-medium text-muted-foreground">Active:</span>
          <div
            className="w-10 h-10 rounded-full shadow-medium border-2 border-border"
            style={{ backgroundColor: activeColor }}
          />
          <span className="font-mono text-sm font-medium">{activeColor.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
};

// Helper component for color swatches with labels
interface ColorSwatchProps {
  color: string;
  label: string;
  onClick: () => void;
  isActive: boolean;
}

const ColorSwatch = ({ color, label, onClick, isActive }: ColorSwatchProps) => {
  return (
    <button
      onClick={onClick}
      aria-label={`Select ${label} color ${color}`}
      aria-pressed={isActive}
      className="relative group flex flex-col items-center gap-1 transition-all hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg p-1"
    >
      <div
        className="w-10 h-10 rounded-lg shadow-soft border-2 transition-all"
        style={{
          backgroundColor: color,
          borderColor: isActive ? "var(--primary)" : "transparent",
        }}
      >
        {isActive && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Check className="w-4 h-4 text-white drop-shadow-md" />
          </div>
        )}
      </div>
      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
        {label}
      </span>
    </button>
  );
};
