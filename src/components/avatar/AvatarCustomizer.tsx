import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AvatarPreview } from "./AvatarPreview";
import type { AvatarConfig } from "@/lib/avatar/config";
import {
  createDefaultAvatarConfig,
  cloneAvatarConfig,
  generateAvatarId,
} from "@/lib/avatar/config";
import { validateAvatarConfig, sanitizeAvatarConfig } from "@/lib/avatar/validation";
import {
  SkinToneSelector,
  HairSelector,
  ClothesSelector,
  AccessoriesSelector,
  FaceSelector,
  StyleSelector,
} from "./categories";
import { Shuffle, RotateCcw } from "lucide-react";
import { getAssetsByCategory } from "@/lib/avatar/categories/assets";
import { toast } from "sonner";

interface AvatarCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: AvatarConfig) => void | Promise<void>;
  initialConfig?: AvatarConfig | null;
}

export function AvatarCustomizer({
  open,
  onOpenChange,
  onSave,
  initialConfig,
}: AvatarCustomizerProps) {
  const [config, setConfig] = useState<AvatarConfig>(() => {
    const loaded = initialConfig || createDefaultAvatarConfig();
    if (validateAvatarConfig(loaded)) return loaded;
    return sanitizeAvatarConfig(loaded as Record<string, any>);
  });

  useEffect(() => {
    if (open) {
      if (initialConfig) {
        const cloned = cloneAvatarConfig(initialConfig);
        if (validateAvatarConfig(cloned)) {
          setConfig(cloned);
        } else {
          setConfig(sanitizeAvatarConfig(cloned as Record<string, any>));
        }
      }
    }
  }, [initialConfig, open]);

  const updateConfig = useCallback(
    (updates: Partial<AvatarConfig> | ((prev: AvatarConfig) => Partial<AvatarConfig>)) => {
      setConfig((prev) => {
        const updateData = typeof updates === "function" ? updates(prev) : updates;
        const updated = { ...prev, ...updateData };
        if (!validateAvatarConfig(updated)) {
          const sanitized = sanitizeAvatarConfig(updated as Record<string, any>);
          sanitized.id = generateAvatarId(sanitized);
          return sanitized;
        }
        updated.id = generateAvatarId(updated);
        return updated;
      });
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!validateAvatarConfig(config)) {
      toast.error("Invalid avatar configuration. Please check your selections.");
      const sanitized = sanitizeAvatarConfig(config as Record<string, any>);
      setConfig(sanitized);
      return;
    }
    try {
      await onSave(config);
      onOpenChange(false);
      toast.success("Avatar saved successfully!");
    } catch {
      toast.error("Failed to save avatar. Please try again.");
    }
  }, [config, onSave, onOpenChange]);

  const handleReset = () => {
    setConfig(createDefaultAvatarConfig(config.name));
  };

  const handleRandomize = () => {
    const random = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const randomOrNull = <T,>(arr: T[]): T | null =>
      Math.random() > 0.5 ? random(arr) : null;

    const skinTones = getAssetsByCategory("skin-tone");
    const hairStyles = getAssetsByCategory("hair-style");
    const hairColors = getAssetsByCategory("hair-color");
    const tops = getAssetsByCategory("clothing-top");
    const bottoms = getAssetsByCategory("clothing-bottom");
    const outfits = getAssetsByCategory("clothing-outfit");
    const hats = getAssetsByCategory("accessory-hat");
    const glasses = getAssetsByCategory("accessory-glasses");
    const eyes = getAssetsByCategory("face-eyes");
    const eyebrows = getAssetsByCategory("face-eyebrows");
    const mouths = getAssetsByCategory("face-mouth");
    const facialHair = getAssetsByCategory("face-facial-hair");
    const bodyShapes = getAssetsByCategory("body-shape");

    const randomConfig: AvatarConfig = {
      ...config,
      skinTone: random(skinTones).id,
      hair: { style: random(hairStyles).id, color: random(hairColors).id },
      clothes: {
        top: randomOrNull(tops)?.id || null,
        bottom: randomOrNull(bottoms)?.id || null,
        outfit: randomOrNull(outfits)?.id || null,
        color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`,
      },
      accessories: {
        hat: randomOrNull(hats)?.id || null,
        glasses: randomOrNull(glasses)?.id || null,
        jewelry: [],
        other: [],
      },
      face: {
        eyes: random(eyes).id,
        eyebrows: random(eyebrows).id,
        mouth: random(mouths).id,
        facialHair: randomOrNull(facialHair)?.id || null,
      },
      body: {
        shape: random(bodyShapes).id,
        size: random(["small", "medium", "large"] as const),
      },
    };
    randomConfig.id = generateAvatarId(randomConfig);
    setConfig(randomConfig);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[85vh] max-h-[600px] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Customize Your Avatar</DialogTitle>
          <DialogDescription>
            Personalize your avatar with custom skin tone, clothes, accessories, and more
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex gap-6 px-6 pb-6 overflow-hidden">
          {/* Left Side - Preview */}
          <div className="w-[300px] flex-shrink-0 flex flex-col gap-4">
            <div className="flex-1 flex items-center justify-center bg-muted rounded-lg p-4">
              <AvatarPreview config={config} size={200} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar-name">Avatar Name</Label>
              <Input
                id="avatar-name"
                value={config.name}
                onChange={(e) => updateConfig({ name: e.target.value })}
                placeholder="My Avatar"
                maxLength={30}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleRandomize} className="flex-1">
                <Shuffle className="w-4 h-4 mr-2" />
                Randomize
              </Button>
              <Button variant="outline" onClick={handleReset} className="flex-1">
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>

          {/* Right Side - Customization Options */}
          <div className="flex-1 flex flex-col min-w-0">
            <Tabs defaultValue="skin" className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-6 mb-4">
                <TabsTrigger value="skin">Skin</TabsTrigger>
                <TabsTrigger value="hair">Hair</TabsTrigger>
                <TabsTrigger value="clothes">Clothes</TabsTrigger>
                <TabsTrigger value="accessories">Accessories</TabsTrigger>
                <TabsTrigger value="face">Face</TabsTrigger>
                <TabsTrigger value="style">Style</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto pr-2">
                <TabsContent value="skin" className="mt-0">
                  <SkinToneSelector
                    selectedTone={config.skinTone}
                    onSelect={(tone) => updateConfig({ skinTone: tone })}
                  />
                </TabsContent>

                <TabsContent value="hair" className="mt-0">
                  <HairSelector
                    config={config}
                    onUpdate={(updates) =>
                      updateConfig((prev) => ({ hair: { ...prev.hair, ...updates } }))
                    }
                  />
                </TabsContent>

                <TabsContent value="clothes" className="mt-0">
                  <ClothesSelector
                    config={config}
                    renderer="dicebear"
                    onUpdate={(updates) =>
                      updateConfig((prev) => ({ clothes: { ...prev.clothes, ...updates } }))
                    }
                  />
                </TabsContent>

                <TabsContent value="accessories" className="mt-0">
                  <AccessoriesSelector
                    config={config}
                    renderer="dicebear"
                    onUpdate={(updates) =>
                      updateConfig((prev) => ({
                        accessories: { ...prev.accessories, ...updates },
                      }))
                    }
                  />
                </TabsContent>

                <TabsContent value="face" className="mt-0">
                  <FaceSelector
                    config={config}
                    onUpdate={(updates) =>
                      updateConfig((prev) => ({ face: { ...prev.face, ...updates } }))
                    }
                  />
                </TabsContent>

                <TabsContent value="style" className="mt-0">
                  <StyleSelector
                    config={config}
                    onUpdate={(updates) =>
                      updateConfig((prev) => ({
                        dicebear: {
                          ...(prev.dicebear || {
                            clothingGraphic: null,
                            backgroundStyle: "default" as const,
                            backgroundColor: null,
                          }),
                          ...updates,
                        },
                      }))
                    }
                  />
                </TabsContent>
              </div>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t mt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSave} className="flex-1">
                Save Avatar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
