import { useState } from "react";
import { OptionGrid } from "./OptionGrid";
import { SKIN_TONE_PRESETS, SKIN_TONE_COLORS } from "@/lib/avatar/categories/assets";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SkinToneSelectorProps {
  selectedTone: string;
  onSelect: (tone: string) => void;
}

export function SkinToneSelector({ selectedTone, onSelect }: SkinToneSelectorProps) {
  const [customColor, setCustomColor] = useState(
    SKIN_TONE_COLORS[selectedTone] || selectedTone,
  );

  const isPreset = Object.keys(SKIN_TONE_COLORS).includes(selectedTone);
  const currentColor = isPreset ? SKIN_TONE_COLORS[selectedTone] : selectedTone;

  const handlePresetSelect = (presetId: string) => {
    onSelect(presetId);
    setCustomColor(SKIN_TONE_COLORS[presetId]);
  };

  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
    onSelect(color);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium mb-2 block">Preset Tones</Label>
        <OptionGrid
          options={SKIN_TONE_PRESETS}
          selectedId={isPreset ? selectedTone : null}
          onSelect={handlePresetSelect}
          columns={5}
          category="skin-tone"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Custom Color</Label>
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
              if (/^#[0-9A-F]{0,6}$/i.test(value)) {
                setCustomColor(value);
                if (value.length === 7) handleCustomColorChange(value);
              }
            }}
            className="font-mono uppercase"
            placeholder="#FFDBAC"
            maxLength={7}
          />
        </div>
      </div>
    </div>
  );
}
