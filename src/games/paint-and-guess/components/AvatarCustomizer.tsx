import { useState, useEffect, useCallback, useRef } from "react";
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
import { AvatarPreviewDrawable } from "./avatar/preview";
import { AvatarConfig, createDefaultAvatarConfig, loadAvatarConfig, cloneAvatarConfig, generateAvatarId } from "@/lib/avatar/config";
import { validateAvatarConfig, sanitizeAvatarConfig } from "@/lib/avatar/validation";
import {
  SkinToneSelector,
  HairSelector,
  ClothesSelector,
  AccessoriesSelector,
  FaceSelector,
  StyleSelector,
} from "./avatar/categories";
import { Shuffle, RotateCcw, Upload, X } from "lucide-react";
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
    const loaded = initialConfig || loadAvatarConfig() || createDefaultAvatarConfig();
    // Validate and sanitize on load
    if (validateAvatarConfig(loaded)) {
      return loaded;
    }
    return sanitizeAvatarConfig(loaded);
  });

  // Track active category tab for category-aware emoji display
  const [activeCategory, setActiveCategory] = useState<string>('skin');

  // File input ref for image upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use immediate config for live preview sync (no debounce for better UX)
  // The preview will update instantly as users make selections

  // Update config when initialConfig changes
  useEffect(() => {
    if (open) {
      console.debug('[AvatarCustomizer] Dialog opened', { 
        hasInitialConfig: !!initialConfig,
        initialConfigId: initialConfig?.id 
      });
      
      if (initialConfig) {
        const cloned = cloneAvatarConfig(initialConfig);
        if (validateAvatarConfig(cloned)) {
          console.debug('[AvatarCustomizer] Using initial config', { id: cloned.id });
          setConfig(cloned);
        } else {
          console.warn('[AvatarCustomizer] Initial config invalid, sanitizing', { cloned });
          setConfig(sanitizeAvatarConfig(cloned));
        }
      } else {
        const loaded = loadAvatarConfig();
        if (loaded) {
          if (validateAvatarConfig(loaded)) {
            console.debug('[AvatarCustomizer] Loaded config from storage', { id: loaded.id });
            setConfig(loaded);
          } else {
            console.warn('[AvatarCustomizer] Loaded config invalid, sanitizing', { loaded });
            setConfig(sanitizeAvatarConfig(loaded));
          }
        } else {
          console.debug('[AvatarCustomizer] No saved config, using default');
        }
      }
    } else {
      console.debug('[AvatarCustomizer] Dialog closed');
    }
  }, [initialConfig, open]);

  const updateConfig = useCallback((updates: Partial<AvatarConfig> | ((prev: AvatarConfig) => Partial<AvatarConfig>)) => {
    console.debug('[AvatarCustomizer] updateConfig called', { updates });
    setConfig((prev) => {
      // Handle function updates (for nested object updates)
      const updateData = typeof updates === 'function' ? updates(prev) : updates;
      const updated = { ...prev, ...updateData };
      
      // Validate before updating
      if (!validateAvatarConfig(updated)) {
        console.warn('[AvatarCustomizer] Invalid config update, sanitizing...', { updated });
        const sanitized = sanitizeAvatarConfig(updated);
        sanitized.id = generateAvatarId(sanitized);
        console.debug('[AvatarCustomizer] Sanitized config', { sanitized });
        return sanitized;
      }
      
      updated.id = generateAvatarId(updated);
      console.debug('[AvatarCustomizer] Config updated', { 
        oldId: prev.id, 
        newId: updated.id,
        changes: Object.keys(updateData)
      });
      return updated;
    });
  }, []);

  const handleSave = useCallback(async () => {
    console.debug('[AvatarCustomizer] Save button clicked', { config });
    
    // Validate before saving
    if (!validateAvatarConfig(config)) {
      console.warn('[AvatarCustomizer] Invalid config on save', { config });
      toast.error('Invalid avatar configuration. Please check your selections.');
      const sanitized = sanitizeAvatarConfig(config);
      console.debug('[AvatarCustomizer] Sanitized config for save', { sanitized });
      setConfig(sanitized);
      return;
    }

    try {
      console.debug('[AvatarCustomizer] Saving avatar config', { 
        id: config.id,
        name: config.name,
        size: JSON.stringify(config).length
      });
      // Call onSave callback - the parent component (HubLayout) will handle local save and backend sync
      await onSave(config);
      console.log('[AvatarCustomizer] Avatar config saved successfully', { config });
      onOpenChange(false);
      toast.success('Avatar saved successfully!');
    } catch (error) {
      console.error('[AvatarCustomizer] Failed to save avatar:', error);
      toast.error('Failed to save avatar. Please try again.');
    }
  }, [config, onSave, onOpenChange]);

  const handleReset = () => {
    console.debug('[AvatarCustomizer] Reset button clicked', { 
      currentConfig: config,
      currentName: config.name 
    });
    const defaultConfig = createDefaultAvatarConfig(config.name);
    console.log('[AvatarCustomizer] Resetting to default config', { defaultConfig });
    setConfig(defaultConfig);
  };

  const handleRandomize = () => {
    console.debug('[AvatarCustomizer] Randomize button clicked', { currentConfig: config });
    
    const skinTones = getAssetsByCategory('skin-tone');
    const hairStyles = getAssetsByCategory('hair-style');
    const hairColors = getAssetsByCategory('hair-color');
    const tops = getAssetsByCategory('clothing-top');
    const bottoms = getAssetsByCategory('clothing-bottom');
    const outfits = getAssetsByCategory('clothing-outfit');
    const hats = getAssetsByCategory('accessory-hat');
    const glasses = getAssetsByCategory('accessory-glasses');
    const eyes = getAssetsByCategory('face-eyes');
    const eyebrows = getAssetsByCategory('face-eyebrows');
    const mouths = getAssetsByCategory('face-mouth');
    const facialHair = getAssetsByCategory('face-facial-hair');
    const bodyShapes = getAssetsByCategory('body-shape');

    console.debug('[AvatarCustomizer] Available options', {
      skinTones: skinTones.length,
      hairStyles: hairStyles.length,
      hairColors: hairColors.length,
      tops: tops.length,
      bottoms: bottoms.length,
      outfits: outfits.length,
      hats: hats.length,
      glasses: glasses.length,
      eyes: eyes.length,
      eyebrows: eyebrows.length,
      mouths: mouths.length,
      facialHair: facialHair.length,
      bodyShapes: bodyShapes.length,
    });

    const random = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const randomOrNull = <T,>(arr: T[]): T | null => 
      Math.random() > 0.5 ? random(arr) : null;

    const randomSelections = {
      skinTone: random(skinTones).id,
      hairStyle: random(hairStyles).id,
      hairColor: random(hairColors).id,
      top: randomOrNull(tops)?.id || null,
      bottom: randomOrNull(bottoms)?.id || null,
      outfit: randomOrNull(outfits)?.id || null,
      hat: randomOrNull(hats)?.id || null,
      glasses: randomOrNull(glasses)?.id || null,
      eyes: random(eyes).id,
      eyebrows: random(eyebrows).id,
      mouth: random(mouths).id,
      facialHair: randomOrNull(facialHair)?.id || null,
      bodyShape: random(bodyShapes).id,
      bodySize: random(['small', 'medium', 'large'] as const),
    };

    console.debug('[AvatarCustomizer] Random selections', randomSelections);

    const randomConfig: AvatarConfig = {
      ...config,
      skinTone: randomSelections.skinTone,
      hair: {
        style: randomSelections.hairStyle,
        color: randomSelections.hairColor,
      },
      clothes: {
        top: randomSelections.top,
        bottom: randomSelections.bottom,
        outfit: randomSelections.outfit,
        color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
      },
      accessories: {
        hat: randomSelections.hat,
        glasses: randomSelections.glasses,
        jewelry: [],
        other: [],
      },
      face: {
        eyes: randomSelections.eyes,
        eyebrows: randomSelections.eyebrows,
        mouth: randomSelections.mouth,
        facialHair: randomSelections.facialHair,
      },
      body: {
        shape: randomSelections.bodyShape,
        size: randomSelections.bodySize,
      },
    };

    randomConfig.id = generateAvatarId(randomConfig);
    console.log('[AvatarCustomizer] Random config generated', { 
      id: randomConfig.id,
      config: randomConfig 
    });
    setConfig(randomConfig);
  };

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Convert to data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        updateConfig({ customImageUrl: dataUrl });
        toast.success('Image uploaded successfully!');
      }
    };
    reader.onerror = () => {
      toast.error('Failed to read image file');
    };
    reader.readAsDataURL(file);
  }, [updateConfig]);

  const handleRemoveImage = useCallback(() => {
    updateConfig({ customImageUrl: undefined });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('Image removed');
  }, [updateConfig]);

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
              <AvatarPreviewDrawable 
                config={config} 
                size={200}
                onDrawingsChange={(drawingsJson) => {
                  updateConfig({ customDrawings: drawingsJson || undefined });
                }}
              />
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

            {/* Image Upload Controls */}
            <div className="space-y-2">
              <Label>Avatar Image</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="avatar-image-upload"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {config.customImageUrl ? 'Change Image' : 'Upload Image'}
                </Button>
                {config.customImageUrl && (
                  <Button
                    variant="outline"
                    onClick={handleRemoveImage}
                    size="icon"
                    title="Remove uploaded image"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {config.customImageUrl && (
                <p className="text-xs text-muted-foreground">
                  Using uploaded image instead of DiceBear avatar
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRandomize}
                className="flex-1"
              >
                <Shuffle className="w-4 h-4 mr-2" />
                Randomize
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex-1"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>

          {/* Right Side - Customization Options */}
          <div className="flex-1 flex flex-col min-w-0">
            <Tabs 
              defaultValue="skin" 
              className="flex-1 flex flex-col min-h-0"
              onValueChange={(value) => {
                console.debug('[AvatarCustomizer] Tab changed', { 
                  tab: value,
                  currentConfigId: config.id 
                });
                setActiveCategory(value);
              }}
            >
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
                            backgroundStyle: 'default',
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

