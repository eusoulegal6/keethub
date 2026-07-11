import { OptionGrid } from "./OptionGrid";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { AvatarConfig } from "@/lib/avatar/config";
import {
  CLOTHING_GRAPHICS,
  BACKGROUND_STYLES,
  BACKGROUND_COLORS,
  BACKGROUND_COLOR_VALUES,
} from "@/lib/avatar/categories/assets";

interface StyleSelectorProps {
  config: AvatarConfig;
  onUpdate: (updates: Partial<NonNullable<AvatarConfig["dicebear"]>>) => void;
}

export function StyleSelector({ config, onUpdate }: StyleSelectorProps) {
  const dicebearOptions = config.dicebear || {
    clothingGraphic: null,
    backgroundStyle: "default" as const,
    backgroundColor: null,
  };

  const supportsGraphics =
    config.clothes.top === "graphic-shirt" || config.clothes.outfit === "costume";

  const isPresetBgColor = Object.keys(BACKGROUND_COLOR_VALUES).includes(
    dicebearOptions.backgroundColor || "",
  );
  const currentBgColor =
    isPresetBgColor && dicebearOptions.backgroundColor
      ? BACKGROUND_COLOR_VALUES[dicebearOptions.backgroundColor]
      : dicebearOptions.backgroundColor || "#65c9ff";

  return (
    <div className="space-y-6">
      {supportsGraphics && (
        <div>
          <Label className="text-sm font-medium mb-2 block">Clothing Graphic</Label>
          <OptionGrid
            options={[{ id: "none", name: "None", emoji: "" }, ...CLOTHING_GRAPHICS]}
            selectedId={dicebearOptions.clothingGraphic || "none"}
            onSelect={(id) => onUpdate({ clothingGraphic: id === "none" ? null : id })}
            columns={3}
            category="clothing-graphic"
          />
        </div>
      )}

      <div>
        <Label className="text-sm font-medium mb-2 block">Background Shape</Label>
        <OptionGrid
          options={BACKGROUND_STYLES}
          selectedId={dicebearOptions.backgroundStyle}
          onSelect={(id) => onUpdate({ backgroundStyle: id as "default" | "circle" })}
          columns={2}
          category="background-style"
        />
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Background Color (Presets)</Label>
        <OptionGrid
          options={BACKGROUND_COLORS}
          selectedId={isPresetBgColor ? dicebearOptions.backgroundColor : null}
          onSelect={(id) => onUpdate({ backgroundColor: id })}
          columns={3}
          category="background-color"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Custom Background Color</Label>
        <div className="flex gap-3 items-center">
          <Input
            type="color"
            value={currentBgColor === "transparent" ? "#65c9ff" : (currentBgColor.startsWith("#") ? currentBgColor : `#${currentBgColor}`)}
            onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
            className="w-20 h-12 cursor-pointer rounded-xl border-2"
          />
          <Input
            type="text"
            value={currentBgColor === "transparent" ? "transparent" : (currentBgColor.startsWith("#") ? currentBgColor.toUpperCase() : `#${currentBgColor.toUpperCase()}`)}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "transparent") {
                onUpdate({ backgroundColor: "transparent" });
              } else if (/^#[0-9A-F]{0,6}$/i.test(value) && value.length === 7) {
                onUpdate({ backgroundColor: value });
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
