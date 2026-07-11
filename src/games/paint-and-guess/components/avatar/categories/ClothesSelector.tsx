import { OptionGrid } from "./OptionGrid";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AvatarConfig } from "@/lib/avatar/config";
import {
  CLOTHING_TOPS,
  CLOTHING_BOTTOMS,
  CLOTHING_OUTFITS,
} from "@/lib/avatar/categories/assets";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface ClothesSelectorProps {
  config: AvatarConfig;
  onUpdate: (updates: Partial<AvatarConfig['clothes']>) => void;
  renderer?: 'dicebear' | 'custom';
}

export function ClothesSelector({ config, onUpdate, renderer = 'dicebear' }: ClothesSelectorProps) {
  const isDiceBear = renderer === 'dicebear';

  const handleTopSelect = (id: string | null) => {
    console.debug('[ClothesSelector] Top selected', { 
      id, 
      previousTop: config.clothes.top 
    });
    // When selecting a top, clear outfit
    onUpdate({ top: id, outfit: null });
  };

  const handleBottomSelect = (id: string | null) => {
    console.debug('[ClothesSelector] Bottom selected', { 
      id, 
      previousBottom: config.clothes.bottom 
    });
    // When selecting a bottom, clear outfit
    onUpdate({ bottom: id, outfit: null });
  };

  const handleOutfitSelect = (id: string | null) => {
    console.debug('[ClothesSelector] Outfit selected', { 
      id, 
      previousOutfit: config.clothes.outfit 
    });
    // When selecting an outfit, clear top and bottom
    onUpdate({ outfit: id, top: null, bottom: null });
  };

  const handleColorChange = (color: string) => {
    console.debug('[ClothesSelector] Color changed', { 
      color, 
      previousColor: config.clothes.color,
      isValid: /^#[0-9A-F]{6}$/i.test(color)
    });
    onUpdate({ color });
  };

  return (
    <div className="space-y-6">
      {/* Full Outfits - These override top/bottom */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Full Outfits</Label>
        <OptionGrid
          options={[
            { id: 'none', name: 'None', emoji: '⬜' },
            ...CLOTHING_OUTFITS,
          ]}
          selectedId={config.clothes.outfit || 'none'}
          onSelect={(id) => handleOutfitSelect(id === 'none' ? null : id)}
          columns={3}
          category="clothing-outfit"
        />
        <p className="text-xs text-muted-foreground mt-2">
          Selecting an outfit will override top and bottom selections
        </p>
      </div>

      {/* Tops - Only show if no outfit is selected */}
      {!config.clothes.outfit && (
        <div>
          <Label className="text-sm font-medium mb-2 block">Tops</Label>
          <OptionGrid
            options={[
              { id: 'none', name: 'None', emoji: '⬜' },
              ...CLOTHING_TOPS,
            ]}
            selectedId={config.clothes.top || 'none'}
            onSelect={(id) => handleTopSelect(id === 'none' ? null : id)}
            columns={3}
            category="clothing-top"
          />
        </div>
      )}

      {/* Bottoms - Only show if no outfit is selected and only for custom renderer */}
      {!config.clothes.outfit && !isDiceBear && (
        <div>
          <Label className="text-sm font-medium mb-2 block">Bottoms</Label>
          <OptionGrid
            options={[
              { id: 'none', name: 'None', emoji: '⬜' },
              ...CLOTHING_BOTTOMS,
            ]}
            selectedId={config.clothes.bottom || 'none'}
            onSelect={(id) => handleBottomSelect(id === 'none' ? null : id)}
            columns={3}
            category="clothing-bottom"
          />
        </div>
      )}

      {!config.clothes.outfit && isDiceBear && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Bottom clothing selection is only available with the custom renderer.
            DiceBear avatars use full-body clothing items.
          </AlertDescription>
        </Alert>
      )}

      {/* Clothing Color */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Clothing Color</Label>
        <div className="flex gap-3 items-center">
          <Input
            type="color"
            value={config.clothes.color}
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-20 h-12 cursor-pointer rounded-xl border-2"
          />
          <Input
            type="text"
            value={config.clothes.color.toUpperCase()}
            onChange={(e) => {
              const value = e.target.value;
              if (/^#[0-9A-F]{0,6}$/i.test(value) && value.length === 7) {
                handleColorChange(value);
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
