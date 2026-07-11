/**
 * Avatar Emoji Parts Extractor
 * 
 * Extracts individual emoji components from avatar configuration to build a humanoid pattern.
 * Returns separate emojis for head, body, hat, glasses, and other accessories that can be
 * layered and positioned to create a composite avatar preview.
 * 
 * @module avatar/preview/getAvatarEmojiParts
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
  FACE_EYES,
  FACE_MOUTH,
  getAssetById,
} from "@/lib/avatar/categories/assets";

/**
 * Emoji parts for constructing a humanoid avatar
 */
export interface AvatarEmojiParts {
  /** Hat/head accessory emoji (top layer) */
  hat: string | null;
  /** Head/face emoji with hair (middle layer) */
  head: string;
  /** Body/clothing emoji (bottom layer) */
  body: string;
  /** Glasses/eyewear emoji (overlay on head) */
  glasses: string | null;
  /** Facial hair emoji (overlay on head) */
  facialHair: string | null;
}

/**
 * Get head emoji based on hair style, skin tone, and facial hair
 * Facial hair can change the character representation (e.g., beard → 🧔)
 * Category-aware: prioritizes emojis based on active category
 */
function getHeadEmoji(config: AvatarConfig, activeCategory: string): string {
  // Category-aware priority: show emojis relevant to the active category
  
  // If "hair" category is active, prioritize hair style emojis
  if (activeCategory === 'hair') {
    const hairStyle = getAssetById(HAIR_STYLES, config.hair.style);
    if (hairStyle?.emoji && hairStyle.emoji !== '👤') {
      return hairStyle.emoji;
    }
    // Fallback for hair category
    if (config.hair.style === 'long' || config.hair.style === 'wavy' || config.hair.style === 'bun' || config.hair.style === 'ponytail') {
      return '👩';
    }
    if (config.hair.style === 'bald') {
      return '👨‍🦲';
    }
    if (config.hair.style === 'medium' || config.hair.style === 'curly') {
      return '👨';
    }
  }
  
  // If "face" category is active, prioritize facial features
  if (activeCategory === 'face') {
    // Facial hair can override head emoji
    if (config.face.facialHair === 'beard') {
      return '🧔';
    }
    // Use hair style that shows face better
    const hairStyle = getAssetById(HAIR_STYLES, config.hair.style);
    if (hairStyle?.emoji && hairStyle.emoji !== '👤') {
      return hairStyle.emoji;
    }
  }
  
  // If "skin" category is active, prioritize skin tone emojis
  if (activeCategory === 'skin') {
    if (!config.skinTone.startsWith('#')) {
      const skinTone = getAssetById(SKIN_TONE_PRESETS, config.skinTone);
      if (skinTone?.emoji) {
        return skinTone.emoji;
      }
    }
  }
  
  // Default priority order (when category doesn't specifically require different emoji)
  // Priority 1: Facial hair can override head emoji
  if (config.face.facialHair === 'beard') {
    return '🧔';
  }
  
  // Priority 2: Hair style with character emoji
  const hairStyle = getAssetById(HAIR_STYLES, config.hair.style);
  if (hairStyle?.emoji && hairStyle.emoji !== '👤') {
    return hairStyle.emoji;
  }
  
  // Priority 3: Skin tone preset emoji
  if (!config.skinTone.startsWith('#')) {
    const skinTone = getAssetById(SKIN_TONE_PRESETS, config.skinTone);
    if (skinTone?.emoji) {
      return skinTone.emoji;
    }
  }
  
  // Priority 4: Fallback to gender-neutral or hair-based character
  if (config.hair.style === 'long' || config.hair.style === 'wavy' || config.hair.style === 'bun' || config.hair.style === 'ponytail') {
    return '👩';
  }
  
  if (config.hair.style === 'bald') {
    return '👨‍🦲';
  }
  
  if (config.hair.style === 'medium' || config.hair.style === 'curly') {
    return '👨';
  }
  
  // Default to neutral character
  return '👤';
}

/**
 * Get body emoji based on clothing
 * Returns empty string if no separate body layer is needed (head emoji covers it)
 * Category-aware: shows clothing emojis when "clothes" category is active
 * 
 * Note: We avoid double character emojis (e.g., head character + body character)
 * Body is only shown for specific cases where it adds value (dress, etc.)
 */
function getBodyEmoji(config: AvatarConfig, activeCategory: string): string {
  // If "clothes" category is active, prioritize showing clothing-related emojis
  if (activeCategory === 'clothes') {
    // Show outfit emoji if selected
    if (config.clothes.outfit) {
      const outfit = getAssetById(CLOTHING_OUTFITS, config.clothes.outfit);
      if (outfit) {
        switch (config.clothes.outfit) {
          case 'suit':
            return '🤵';
          case 'costume':
            return '🎭';
          default:
            // For other outfits, show the outfit emoji if it's a character representation
            if (outfit.emoji && outfit.emoji !== '👕') {
              return outfit.emoji;
            }
        }
      }
    }
    
    // Show dress/skirt emoji if selected
    if (config.clothes.bottom) {
      const bottom = getAssetById(CLOTHING_BOTTOMS, config.clothes.bottom);
      if (bottom) {
        switch (config.clothes.bottom) {
          case 'dress':
            return '👗';
          case 'skirt':
            return '👗';
          default:
            break;
        }
      }
    }
    
    // Show top clothing emoji if selected (for clothes category, show the item)
    if (config.clothes.top) {
      const top = getAssetById(CLOTHING_TOPS, config.clothes.top);
      if (top?.emoji) {
        // Return the clothing item emoji when clothes category is active
        return top.emoji;
      }
    }
  }
  
  // Default behavior (when not in clothes category): only show character representations
  // Priority 1: Bottom clothing (dress/skirt - distinct character representation)
  if (config.clothes.bottom) {
    const bottom = getAssetById(CLOTHING_BOTTOMS, config.clothes.bottom);
    if (bottom) {
      switch (config.clothes.bottom) {
        case 'dress':
          return '👗';
        case 'skirt':
          return '👗';
        default:
          break;
      }
    }
  }
  
  // For outfits and tops (when not in clothes category), skip body layer
  // The head emoji already represents the character
  
  return '';
}

/**
 * Get hat emoji if hat is selected
 * Category-aware: prioritizes hat emoji when "accessories" category is active
 */
function getHatEmoji(config: AvatarConfig, activeCategory: string): string | null {
  // If "accessories" category is active, always show hat if selected
  if (activeCategory === 'accessories' && config.accessories.hat) {
    const hat = getAssetById(ACCESSORY_HATS, config.accessories.hat);
    return hat?.emoji || null;
  }
  
  // Default: show hat if selected
  if (config.accessories.hat) {
    const hat = getAssetById(ACCESSORY_HATS, config.accessories.hat);
    return hat?.emoji || null;
  }
  return null;
}

/**
 * Get glasses emoji if glasses are selected
 * Category-aware: prioritizes glasses emoji when "accessories" category is active
 */
function getGlassesEmoji(config: AvatarConfig, activeCategory: string): string | null {
  // If "accessories" category is active, always show glasses if selected
  if (activeCategory === 'accessories' && config.accessories.glasses) {
    const glasses = getAssetById(ACCESSORY_GLASSES, config.accessories.glasses);
    return glasses?.emoji || null;
  }
  
  // Default: show glasses if selected
  if (config.accessories.glasses) {
    const glasses = getAssetById(ACCESSORY_GLASSES, config.accessories.glasses);
    return glasses?.emoji || null;
  }
  return null;
}

/**
 * Get facial hair emoji if facial hair is selected
 * Note: Beard is handled in getHeadEmoji (changes head to 🧔)
 * Category-aware: prioritizes facial hair when "face" category is active
 */
function getFacialHairEmoji(config: AvatarConfig, activeCategory: string): string | null {
  // If "face" category is active, show facial hair more prominently
  if (activeCategory === 'face') {
    if (config.face.facialHair === 'beard') {
      // Beard is already shown in head emoji, but we can indicate it's selected
      return null; // Already in head
    }
    // For other facial hair, return null (overlaying doesn't work well)
    return null;
  }
  
  // Default: skip beard (already in head), return null for others
  if (config.face.facialHair && config.face.facialHair !== 'none' && config.face.facialHair !== 'beard') {
    return null;
  }
  return null;
}

/**
 * Extract emoji parts from avatar configuration
 * 
 * Returns separate emoji components that can be layered to create a humanoid avatar pattern.
 * Emojis are prioritized based on the active category to show relevant emojis for the current tab.
 * 
 * @param config - Avatar configuration
 * @param activeCategory - Active category tab (e.g., 'skin', 'hair', 'clothes', 'accessories', 'face')
 * @returns Object containing emoji parts for hat, head, body, glasses, and facial hair
 */
export function getAvatarEmojiParts(config: AvatarConfig, activeCategory: string = 'skin'): AvatarEmojiParts {
  // Category-aware emoji selection: prioritize emojis based on active category
  return {
    hat: getHatEmoji(config, activeCategory),
    head: getHeadEmoji(config, activeCategory),
    body: getBodyEmoji(config, activeCategory),
    glasses: getGlassesEmoji(config, activeCategory),
    facialHair: getFacialHairEmoji(config, activeCategory),
  };
}

