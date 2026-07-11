import { OptionGrid } from "./OptionGrid";
import { HAIR_STYLES, HAIR_COLORS, HAIR_COLOR_VALUES } from "@/lib/avatar/categories/assets";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AvatarConfig } from "@/lib/avatar/config";

interface HairSelectorProps {
  config: AvatarConfig;
  onUpdate: (updates: Partial<AvatarConfig['hair']>) => void;
}

export function HairSelector({ config, onUpdate }: HairSelectorProps) {
  const isPresetColor = Object.keys(HAIR_COLOR_VALUES).includes(config.hair.color);
  const currentColor = isPresetColor
    ? HAIR_COLOR_VALUES[config.hair.color]
    : config.hair.color;

  const handleStyleSelect = (id: string) => {
    console.debug('[HairSelector] Style selected', { 
      id, 
      previousStyle: config.hair.style 
    });
    onUpdate({ style: id });
  };

  const handleColorPresetSelect = (id: string) => {
    console.debug('[HairSelector] Color preset selected', { 
      id, 
      colorValue: HAIR_COLOR_VALUES[id],
      previousColor: config.hair.color 
    });
    onUpdate({ color: id });
  };

  const handleCustomColorChange = (color: string) => {
    console.debug('[HairSelector] Custom color changed', { 
      color, 
      previousColor: config.hair.color,
      isValid: /^#[0-9A-F]{6}$/i.test(color)
    });
    onUpdate({ color });
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-sm font-medium mb-2 block">Hair Style</Label>
        <OptionGrid
          options={HAIR_STYLES}
          selectedId={config.hair.style}
          onSelect={handleStyleSelect}
          columns={3}
          category="hair-style"
        />
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Hair Color (Presets)</Label>
        <OptionGrid
          options={HAIR_COLORS}
          selectedId={isPresetColor ? config.hair.color : null}
          onSelect={handleColorPresetSelect}
          columns={6}
          category="hair-color"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Custom Hair Color</Label>
        <div className="flex gap-3 items-center">
          <Input
            type="color"
            value={currentColor}
            onChange={(e) => handleCustomColorChange(e.target.value)}
            className="w-20 h-12 cursor-pointer rounded-xl border-2"
          />
          <Input
            type="text"
            value={currentColor.toUpperCase()}
            onChange={(e) => {
              const value = e.target.value;
              if (/^#[0-9A-F]{0,6}$/i.test(value) && value.length === 7) {
                handleCustomColorChange(value);
              }
            }}
            className="font-mono uppercase"
            placeholder="#000000"
            maxLength={7}
          />
        </div>
      </div>
    </div>
  );
}

