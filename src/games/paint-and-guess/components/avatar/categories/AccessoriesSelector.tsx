import { OptionGrid } from "./OptionGrid";
import { Label } from "@/components/ui/label";
import { AvatarConfig } from "@/lib/avatar/config";
import { ACCESSORY_HATS, ACCESSORY_GLASSES, ACCESSORY_OTHER } from "@/lib/avatar/categories/assets";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface AccessoriesSelectorProps {
  config: AvatarConfig;
  onUpdate: (updates: Partial<AvatarConfig['accessories']>) => void;
  renderer?: 'dicebear' | 'custom';
}

export function AccessoriesSelector({ config, onUpdate, renderer = 'dicebear' }: AccessoriesSelectorProps) {
  const isDiceBear = renderer === 'dicebear';

  const handleHatSelect = (id: string | null) => {
    console.debug('[AccessoriesSelector] Hat selected', { 
      id, 
      previousHat: config.accessories.hat 
    });
    onUpdate({ hat: id });
  };

  const handleGlassesSelect = (id: string | null) => {
    console.debug('[AccessoriesSelector] Glasses selected', { 
      id, 
      previousGlasses: config.accessories.glasses 
    });
    onUpdate({ glasses: id });
  };

  const handleOtherToggle = (id: string) => {
    const current = config.accessories.other || [];
    const newOther = current.includes(id)
      ? current.filter(item => item !== id)
      : [...current, id];
    
    console.debug('[AccessoriesSelector] Other accessory toggled', { 
      id, 
      newOther 
    });
    onUpdate({ other: newOther });
  };

  return (
    <div className="space-y-6">
      {/* Hats */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Hats</Label>
        <OptionGrid
          options={[
            { id: 'none', name: 'None', emoji: '' },
            ...ACCESSORY_HATS,
          ]}
          selectedId={config.accessories.hat || 'none'}
          onSelect={(id) => handleHatSelect(id === 'none' ? null : id)}
          columns={3}
          category="accessory-hat"
        />
      </div>

      {/* Glasses */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Glasses</Label>
        <OptionGrid
          options={[
            { id: 'none', name: 'None', emoji: '' },
            ...ACCESSORY_GLASSES,
          ]}
          selectedId={config.accessories.glasses || 'none'}
          onSelect={(id) => handleGlassesSelect(id === 'none' ? null : id)}
          columns={3}
          category="accessory-glasses"
        />
      </div>

      {/* Other Accessories - Only show for custom renderer */}
      {!isDiceBear && (
        <div>
          <Label className="text-sm font-medium mb-2 block">Other Accessories</Label>
          <div className="grid grid-cols-4 gap-2">
            {ACCESSORY_OTHER.map((option) => {
              const isSelected = (config.accessories.other || []).includes(option.id);
              return (
                <button
                  key={option.id}
                  onClick={() => handleOtherToggle(option.id)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 border-2 hover:scale-105 active:scale-95 ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-soft"
                      : "bg-card text-card-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {option.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isDiceBear && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Jewelry and other accessories are only available with the custom renderer.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

