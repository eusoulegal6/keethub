import { OptionGrid } from "./OptionGrid";
import { BODY_SHAPES, BODY_SIZES } from "@/lib/avatar/categories/assets";
import { Label } from "@/components/ui/label";
import { AvatarConfig } from "@/lib/avatar/config";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface BodySelectorProps {
  config: AvatarConfig;
  onUpdate: (updates: Partial<AvatarConfig['body']>) => void;
  renderer?: 'dicebear' | 'custom';
}

export function BodySelector({ config, onUpdate, renderer = 'dicebear' }: BodySelectorProps) {
  const isDiceBear = renderer === 'dicebear';

  const handleShapeSelect = (id: string) => {
    console.debug('[BodySelector] Shape selected', { 
      id, 
      previousShape: config.body.shape 
    });
    onUpdate({ shape: id });
  };

  const handleSizeSelect = (size: 'small' | 'medium' | 'large') => {
    console.debug('[BodySelector] Size selected', { 
      size, 
      previousSize: config.body.size 
    });
    onUpdate({ size });
  };

  if (isDiceBear) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Body shape and size customization is only available with the custom renderer.
          DiceBear avatars use a standard body shape.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-sm font-medium mb-2 block">Body Shape</Label>
        <OptionGrid
          options={BODY_SHAPES}
          selectedId={config.body.shape}
          onSelect={handleShapeSelect}
          columns={4}
          category="body-shape"
        />
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Body Size</Label>
        <div className="flex gap-2">
          {BODY_SIZES.map((size) => (
            <Button
              key={size.id}
              variant={config.body.size === size.id ? "default" : "outline"}
              onClick={() => handleSizeSelect(size.id as 'small' | 'medium' | 'large')}
              className="flex-1"
            >
              {size.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

