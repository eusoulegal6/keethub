import { OptionGrid } from "./OptionGrid";
import { FACE_EYES, FACE_EYEBROWS, FACE_MOUTH } from "@/lib/avatar/categories/assets";
import { Label } from "@/components/ui/label";
import type { AvatarConfig } from "@/lib/avatar/config";

interface FaceSelectorProps {
  config: AvatarConfig;
  onUpdate: (updates: Partial<AvatarConfig["face"]>) => void;
}

export function FaceSelector({ config, onUpdate }: FaceSelectorProps) {
  return (
    <div className="space-y-6">
      <div>
        <Label className="text-sm font-medium mb-2 block">Eyes</Label>
        <OptionGrid
          options={FACE_EYES}
          selectedId={config.face.eyes}
          onSelect={(id) => onUpdate({ eyes: id })}
          columns={3}
          category="face-eyes"
        />
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Eyebrows</Label>
        <OptionGrid
          options={FACE_EYEBROWS}
          selectedId={config.face.eyebrows}
          onSelect={(id) => onUpdate({ eyebrows: id })}
          columns={3}
          category="face-eyebrows"
        />
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Mouth</Label>
        <OptionGrid
          options={FACE_MOUTH}
          selectedId={config.face.mouth}
          onSelect={(id) => onUpdate({ mouth: id })}
          columns={3}
          category="face-mouth"
        />
      </div>
    </div>
  );
}
