import { OptionGrid } from "./OptionGrid";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AvatarConfig } from "@/lib/avatar/config";
import {
  CLOTHING_GRAPHICS,
  BACKGROUND_STYLES,
  BACKGROUND_COLORS,
  BACKGROUND_COLOR_VALUES,
} from "@/lib/avatar/categories/assets";

interface StyleSelectorProps {
  config: AvatarConfig;
  onUpdate: (updates: Partial<AvatarConfig['dicebear']>) => void;
}

export function StyleSelector({ config, onUpdate }: StyleSelectorProps) {
  const dicebearOptions = config.dicebear || {
    clothingGraphic: null,
    backgroundStyle: 'default',
    backgroundColor: null,
  };

  // Check if current clothing supports graphics
  const supportsGraphics = 
    config.clothes.top === 'graphic-shirt' || 
    config.clothes.outfit === 'costume';

  const isPresetBgColor = Object.keys(BACKGROUND_COLOR_VALUES).includes(
    dicebearOptions.backgroundColor || ''
  );
  const currentBgColor = isPresetBgColor && dicebearOptions.backgroundColor
    ? BACKGROUND_COLOR_VALUES[dicebearOptions.backgroundColor]
    : dicebearOptions.backgroundColor || '#65c9ff';

  const handleGraphicSelect = (id: string | null) => {
    console.debug('[StyleSelector] Graphic selected', { 
      id, 
      previousGraphic: dicebearOptions.clothingGraphic 
    });
    onUpdate({ clothingGraphic: id });
  };

  const handleBackgroundStyleSelect = (id: string) => {
    console.debug('[StyleSelector] Background style selected', { 
      id, 
      previousStyle: dicebearOptions.backgroundStyle 
    });
    onUpdate({ backgroundStyle: id as 'default' | 'circle' });
  };

  const handleBackgroundColorPresetSelect = (id: string) => {
    console.debug('[StyleSelector] Background color preset selected', { 
      id,
      colorValue: BACKGROUND_COLOR_VALUES[id],
      previousColor: dicebearOptions.backgroundColor 
    });
    onUpdate({ backgroundColor: id });
  };

  const handleCustomBackgroundColorChange = (color: string) => {
    console.debug('[StyleSelector] Custom background color changed', { 
      color, 
      previousColor: dicebearOptions.backgroundColor,
      isValid: /^#[0-9A-F]{6}$/i.test(color)
    });
    onUpdate({ backgroundColor: color });
  };

  return (
    <div className="space-y-6">
      {/* Clothing Graphics - only show if graphic shirt is selected */}
      {supportsGraphics && (
        <div>
          <Label className="text-sm font-medium mb-2 block">Clothing Graphic</Label>
          <OptionGrid
            options={[
              { id: 'none', name: 'None', emoji: '⬜' },
              ...CLOTHING_GRAPHICS,
            ]}
            selectedId={dicebearOptions.clothingGraphic || 'none'}
            onSelect={(id) => handleGraphicSelect(id === 'none' ? null : id)}
            columns={3}
            category="clothing-graphic"
          />
        </div>
      )}

      {/* Background Style */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Background Shape</Label>
        <OptionGrid
          options={BACKGROUND_STYLES}
          selectedId={dicebearOptions.backgroundStyle}
          onSelect={handleBackgroundStyleSelect}
          columns={2}
          category="background-style"
        />
      </div>

      {/* Background Color Presets */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Background Color (Presets)</Label>
        <OptionGrid
          options={BACKGROUND_COLORS}
          selectedId={isPresetBgColor ? dicebearOptions.backgroundColor : null}
          onSelect={handleBackgroundColorPresetSelect}
          columns={3}
          category="background-color"
        />
      </div>

      {/* Custom Background Color */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Custom Background Color</Label>
        <div className="flex gap-3 items-center">
          <Input
            type="color"
            value={currentBgColor === 'transparent' ? '#65c9ff' : (currentBgColor.startsWith('#') ? currentBgColor : `#${currentBgColor}`)}
            onChange={(e) => handleCustomBackgroundColorChange(e.target.value)}
            className="w-20 h-12 cursor-pointer rounded-xl border-2"
          />
          <Input
            type="text"
            value={currentBgColor === 'transparent' ? 'transparent' : (currentBgColor.startsWith('#') ? currentBgColor.toUpperCase() : `#${currentBgColor.toUpperCase()}`)}
            onChange={(e) => {
              const value = e.target.value;
              if (value === 'transparent') {
                handleCustomBackgroundColorChange('transparent');
              } else if (/^#[0-9A-F]{0,6}$/i.test(value) && value.length === 7) {
                handleCustomBackgroundColorChange(value);
              }
            }}
            className="font-mono uppercase"
            placeholder="#65c9ff or transparent"
            maxLength={11}
          />
        </div>
      </div>
    </div>
  );
}

