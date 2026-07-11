/**
 * Avatar Preview Emoji Generator
 * 
 * Determines which emoji to display in the avatar preview based on the selected customization options.
 * Uses a priority system to select the most representative emoji.
 * 
 * @module avatar/preview/getPreviewEmoji
 */

import { AvatarConfig } from "@/lib/avatar/config";
import {
  ACCESSORY_HATS,
  ACCESSORY_GLASSES,
  CLOTHING_OUTFITS,
  CLOTHING_TOPS,
  CLOTHING_BOTTOMS,
  HAIR_STYLES,
  SKIN_TONE_PRESETS,
  getAssetById,
} from "@/lib/avatar/categories/assets";

/**
 * Get the preview emoji for an avatar configuration
 * 
 * Uses a priority system:
 * 1. Hat/head accessory (most visible)
 * 2. Outfit (if selected)
 * 3. Hair style with character variation
 * 4. Top/bottom clothing combination
 * 5. Skin tone preset
 * 6. Default person emoji
 * 
 * @param config - Avatar configuration
 * @returns Emoji string to display in preview
 */
export function getPreviewEmoji(config: AvatarConfig): string {
  // Priority 1: Hat/head accessory (most visible, overrides everything)
  if (config.accessories.hat) {
    const hat = getAssetById(ACCESSORY_HATS, config.accessories.hat);
    if (hat?.emoji) {
      return hat.emoji;
    }
  }

  // Priority 2: Outfit (complete outfit overrides individual clothing)
  if (config.clothes.outfit) {
    const outfit = getAssetById(CLOTHING_OUTFITS, config.clothes.outfit);
    if (outfit?.emoji) {
      // For outfits, prefer character emojis that represent the outfit
      // Map specific outfits to character emojis
      switch (config.clothes.outfit) {
        case 'suit':
          return '🤵';
        case 'costume':
          return '🎭';
        case 'uniform':
          return '👔';
        default:
          return outfit.emoji;
      }
    }
  }

  // Priority 3: Hair style (many hair styles already have character emojis)
  const hairStyle = getAssetById(HAIR_STYLES, config.hair.style);
  if (hairStyle?.emoji && hairStyle.emoji !== '👤') {
    // Use hair style emoji directly if it's not the generic person emoji
    // Hair styles like 'curly' (👨‍🦱), 'wavy' (👩‍🦱), 'bald' (👨‍🦲), etc. are character emojis
    return hairStyle.emoji;
  }

  // Priority 4: Bottom clothing (dress/skirt indicates female character)
  // Check this before top clothing, as dress/skirt gives us a character emoji
  if (!config.clothes.outfit && config.clothes.bottom) {
    const bottom = getAssetById(CLOTHING_BOTTOMS, config.clothes.bottom);
    if (bottom) {
      switch (config.clothes.bottom) {
        case 'dress':
          return '👗'; // Dress is a character emoji
        case 'skirt':
          return '👗'; // Skirt indicates female character
        default:
          // Fall through to next priority
          break;
      }
    }
  }

  // Priority 5: Top clothing (only use character-representative emojis)
  // Note: Most clothing emojis are just objects, not characters
  // Only use specific ones that work well as character representations
  if (!config.clothes.outfit && config.clothes.top) {
    const top = getAssetById(CLOTHING_TOPS, config.clothes.top);
    // For most tops, we'll prefer to use other hints (hair, skin tone) instead
    // Only use character emojis for specific formal wear
    if (top) {
      switch (config.clothes.top) {
        case 'dress-shirt':
          // Dress shirt often indicates formal/business attire
          // Use a character emoji that represents this
          return '👔';
        default:
          // Fall through to next priority (prefer hair/skin tone hints)
          break;
      }
    }
  }

  // Priority 6: Skin tone preset (use the preset's emoji if available)
  // Check if skinTone is a preset ID (not a hex color)
  // Skin tone presets have character emojis (👶, 👧, 👨, 👩, 👴)
  if (!config.skinTone.startsWith('#')) {
    const skinTone = getAssetById(SKIN_TONE_PRESETS, config.skinTone);
    if (skinTone?.emoji) {
      return skinTone.emoji;
    }
  }

  // Priority 7: Try to infer character from clothing and hair hints
  // If we have a top but no outfit, try to pick a character based on clothing style
  // This is better than showing a generic emoji or clothing item emoji
  if (!config.clothes.outfit && config.clothes.top) {
    // Use a neutral character emoji based on other hints
    if (config.hair.style === 'long' || config.hair.style === 'wavy' || config.hair.style === 'bun' || config.hair.style === 'ponytail') {
      return '👩'; // Female character for long hair
    }
    if (config.hair.style === 'bald') {
      return '👨‍🦲'; // Bald male
    }
    if (config.hair.style === 'medium' || config.hair.style === 'curly') {
      return '👨'; // Male character for medium/curly hair
    }
    // Default to male character for tops (better than generic or clothing emoji)
    return '👨';
  }
  
  // Priority 8: Hair style default (only if not generic)
  // Use hair style emoji as fallback, but skip if it's generic
  if (hairStyle?.emoji && hairStyle.emoji !== '👤') {
    return hairStyle.emoji;
  }

  // Priority 9: Facial hair (beard indicates male character)
  if (config.face.facialHair && config.face.facialHair !== 'none') {
    switch (config.face.facialHair) {
      case 'beard':
        return '🧔';
      case 'mustache':
      case 'goatee':
        return '👨';
      default:
        break;
    }
  }

  // Priority 10: Glasses (add glasses to base character)
  if (config.accessories.glasses) {
    const glasses = getAssetById(ACCESSORY_GLASSES, config.accessories.glasses);
    if (glasses?.emoji === '🧐') {
      return '🧐'; // Monocle is a character emoji
    }
    // For other glasses, we'd need to combine, but emojis don't compose well
    // So we'll fall through to default
  }
  
  // Priority 11: Hair style as last resort (even if generic)
  // Use hair style emoji if we have nothing else
  if (hairStyle?.emoji) {
    return hairStyle.emoji;
  }

  // Final fallback: Use character emoji based on hints
  // Try to pick based on hair style (most reliable indicator)
  if (config.hair.style === 'long' || config.hair.style === 'wavy' || config.hair.style === 'bun' || config.hair.style === 'ponytail') {
    return '👩'; // Female character for long hair styles
  }
  
  if (config.hair.style === 'bald') {
    return '👨‍🦲'; // Bald male
  }
  
  if (config.hair.style === 'medium' || config.hair.style === 'curly') {
    return '👨'; // Medium/curly hair usually indicates male
  }

  // Check clothing hints
  if (config.clothes.bottom === 'dress' || config.clothes.bottom === 'skirt') {
    return '👩'; // Female character for dress/skirt
  }
  
  // If we have clothing, use a generic character emoji
  if (config.clothes.top || config.clothes.bottom || config.clothes.outfit) {
    return '👤'; // Generic person (better than nothing)
  }

  // Final fallback: generic person
  return '👤';
}

