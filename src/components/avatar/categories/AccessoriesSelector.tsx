import { OptionGrid } from "./OptionGrid";
import { Label } from "@/components/ui/label";
import type { AvatarConfig } from "@/lib/avatar/config";
import { ACCESSORY_HATS, ACCESSORY_GLASSES } from "@/lib/avatar/categories/assets";

interface AccessoriesSelectorProps {
  config: AvatarConfig;
  onUpdate: (updates: Partial<AvatarConfig["accessories"]>) => void;
  renderer?: "dicebear" | "custom";
}

export function AccessoriesSelector({ config, onUpdate }: AccessoriesSelectorProps) {
  return (
    <div className="space-y-6">
      <div>
        <Label className="text-sm font-medium mb-2 block">Hats</Label>
        <OptionGrid
          options={[{ id: "none", name: "None", emoji: "" }, ...ACCESSORY_HATS]}
          selectedId={config.accessories.hat || "none"}
          onSelect={(id) => onUpdate({ hat: id === "none" ? null : id })}
          columns={3}
          category="accessory-hat"
        />
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Glasses</Label>
        <OptionGrid
          options={[{ id: "none", name: "None", emoji: "" }, ...ACCESSORY_GLASSES]}
          selectedId={config.accessories.glasses || "none"}
          onSelect={(id) => onUpdate({ glasses: id === "none" ? null : id })}
          columns={3}
          category="accessory-glasses"
        />
      </div>
    </div>
  );
}
