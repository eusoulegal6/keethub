/**
 * Avatar SVG Data Generator
 * 
 * Generates SVG rendering data from avatar configuration.
 * This module converts AvatarConfig into SVG paths, shapes, and styles
 * following the reference pattern for accurate visual representation.
 * 
 * @module avatar/preview/getAvatarSVGData
 */

import { AvatarConfig } from "@/lib/avatar/config";
import {
  SKIN_TONE_COLORS,
  HAIR_COLOR_VALUES,
  getAssetById,
  HAIR_STYLES,
} from "@/lib/avatar/categories/assets";

/**
 * Resolve skin tone color from config
 * Returns hex color whether it's a preset ID or custom hex
 */
function getSkinToneColor(config: AvatarConfig): string {
  if (config.skinTone.startsWith('#')) {
    return config.skinTone;
  }
  return SKIN_TONE_COLORS[config.skinTone] || '#FFDBAC';
}

/**
 * Resolve hair color from config
 * Returns hex color whether it's a preset ID or custom hex
 */
function getHairColor(config: AvatarConfig): string {
  if (config.hair.color.startsWith('#')) {
    return config.hair.color;
  }
  return HAIR_COLOR_VALUES[config.hair.color] || '#000000';
}

/**
 * Get clothing color from config
 */
function getClothingColor(config: AvatarConfig): string {
  return config.clothes.color || '#3B82F6';
}

/**
 * Generate SVG data for avatar rendering
 */
export interface AvatarSVGData {
  skinTone: string;
  hairColor: string;
  clothingColor: string;
  hairStyle: string;
  hasHat: boolean;
  hasGlasses: boolean;
  eyeType: string;
  eyebrowType: string;
  mouthType: string;
  hasFacialHair: boolean;
  facialHairType: string | null;
  outfitType: string | null;
}

export function getAvatarSVGData(config: AvatarConfig): AvatarSVGData {
  return {
    skinTone: getSkinToneColor(config),
    hairColor: getHairColor(config),
    clothingColor: getClothingColor(config),
    hairStyle: config.hair.style,
    hasHat: config.accessories.hat !== null,
    hasGlasses: config.accessories.glasses !== null,
    eyeType: config.face.eyes,
    eyebrowType: config.face.eyebrows,
    mouthType: config.face.mouth,
    hasFacialHair: config.face.facialHair !== null && config.face.facialHair !== 'none',
    facialHairType: config.face.facialHair,
    outfitType: config.clothes.outfit,
  };
}

