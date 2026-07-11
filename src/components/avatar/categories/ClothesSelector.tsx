import { OptionGrid } from "./OptionGrid";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { AvatarConfig } from "@/lib/avatar/config";
import { CLOTHING_TOPS, CLOTHING_BOTTOMS, CLOTHING_OUTFITS } from "@/lib/avatar/categories/assets";

interface ClothesSelectorProps {
  config: AvatarConfig;
  onUpdate: (updates: Partial<AvatarConfig["clothes"]>) => void;
  renderer?: "dicebear" | "custom";
}

export function ClothesSelector({ config, onUpdate, renderer = "dicebear" }: ClothesSelectorProps) {
  const isDiceBear = renderer === "dicebear";

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-sm font-medium mb-2 block">Full Outfits</Label>
        <OptionGrid
          options={[
            { id: "none", name: "None", emoji: "" },
            ...CLOTHING_OUTFITS,
          ]}
          selectedId={config.clothes.outfit || "none"}
          onSelect={(id) =>
            onUpdate(id === "none" ? { outfit: null } : { outfit: id, top: null, bottom: null })
          }
          columns={3}
          category="clothing-outfit"
        />
        <p className="text-xs text-muted-foreground mt-2">
          Selecting an outfit will override top and bottom selections
        </p>
      </div>

      {!config.clothes.outfit && (
        <div>
          <Label className="text-sm font-medium mb-2 block">Tops</Label>
          <OptionGrid
            options={[{ id: "none", name: "None", emoji: "" }, ...CLOTHING_TOPS]}
            selectedId={config.clothes.top || "none"}
            onSelect={(id) => onUpdate({ top: id === "none" ? null : id, outfit: null })}
            columns={3}
            category="clothing-top"
          />
        </div>
      )}

      {!config.clothes.outfit && !isDiceBear && (
        <div>
          <Label className="text-sm font-medium mb-2 block">Bottoms</Label>
          <OptionGrid
            options={[{ id: "none", name: "None", emoji: "" }, ...CLOTHING_BOTTOMS]}
            selectedId={config.clothes.bottom || "none"}
            onSelect={(id) => onUpdate({ bottom: id === "none" ? null : id, outfit: null })}
            columns={3}
            category="clothing-bottom"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-sm font-medium">Clothing Color</Label>
        <div className="flex gap-3 items-center">
          <Input
            type="color"
            value={config.clothes.color}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className="w-20 h-12 cursor-pointer rounded-xl border-2"
          />
          <Input
            type="text"
            value={config.clothes.color.toUpperCase()}
            onChange={(e) => {
              const value = e.target.value;
              if (/^#[0-9A-F]{0,6}$/i.test(value) && value.length === 7) {
                onUpdate({ color: value });
              }
            }}
            className="font-mono uppercase"
            placeholder="#3B82F6"
            maxLength={7}
          />
        </div>
      </div>
    </div>
  );
}
