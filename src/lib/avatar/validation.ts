/**
 * Avatar Configuration Validation
 * Provides runtime validation for avatar configurations
 */

import { AvatarConfig, DEFAULT_AVATAR_CONFIG, loadAvatarConfig } from "./config";

/**
 * Validate skin tone format (hex color or preset ID)
 */
function isValidSkinTone(tone: string): boolean {
  // Check if it's a hex color
  if (/^#[0-9A-F]{6}$/i.test(tone)) {
    return true;
  }
  // Check if it's a valid preset
  const validPresets = [
    'light', 
    'medium-light', 
    'medium', 
    'medium-dark', 
    'dark',
    'deep-brown',  // Added in DiceBear selector enhancements
    'golden',      // Added in DiceBear selector enhancements
  ];
  return validPresets.includes(tone);
}

/**
 * Validate color format (hex only - for clothing, etc.)
 */
function isValidColor(color: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(color);
}

/**
 * Validate hair color format (hex color or preset ID)
 */
function isValidHairColor(color: string): boolean {
  // Check if it's a hex color
  if (/^#[0-9A-F]{6}$/i.test(color)) {
    return true;
  }
  // Also accept preset IDs for hair colors
  // This allows preset hair colors like 'black', 'brown', 'blonde', etc.
  const validHairColorPresets = [
    'black',
    'brown',
    'blonde',
    'red',
    'gray',
    'white',
    'auburn',      // Added in DiceBear selector enhancements
    'platinum',    // Added in DiceBear selector enhancements
    'dark-brown',  // Added in DiceBear selector enhancements
    'light-brown', // Added in DiceBear selector enhancements
  ];
  return validHairColorPresets.includes(color);
}

/**
 * Validate avatar name
 */
function isValidName(name: string): boolean {
  return typeof name === 'string' && name.trim().length > 0 && name.length <= 30;
}

/**
 * Validate avatar configuration
 */
export function validateAvatarConfig(config: unknown): config is AvatarConfig {
  if (!config || typeof config !== 'object') {
    return false;
  }

  const c = config as any;

  // Required fields
  if (!c.id || typeof c.id !== 'string') return false;
  if (!isValidName(c.name)) return false;
  if (!isValidSkinTone(c.skinTone)) return false;

  // Validate hair
  if (!c.hair || typeof c.hair !== 'object') return false;
  if (!c.hair.style || typeof c.hair.style !== 'string') return false;
  // Hair color can be hex or preset ID
  if (!c.hair.color || typeof c.hair.color !== 'string') return false;
  if (!isValidHairColor(c.hair.color)) return false;

  // Validate clothes
  if (!c.clothes || typeof c.clothes !== 'object') return false;
  if (!isValidColor(c.clothes.color)) return false;

  // Validate face
  if (!c.face || typeof c.face !== 'object') return false;
  if (!c.face.eyes || typeof c.face.eyes !== 'string') return false;
  if (!c.face.eyebrows || typeof c.face.eyebrows !== 'string') return false;
  if (!c.face.mouth || typeof c.face.mouth !== 'string') return false;

  // Validate body
  if (!c.body || typeof c.body !== 'object') return false;
  if (!c.body.shape || typeof c.body.shape !== 'string') return false;
  if (!['small', 'medium', 'large'].includes(c.body.size)) return false;

  return true;
}

/**
 * Sanitize and fix avatar configuration
 */
export function sanitizeAvatarConfig(config: any): AvatarConfig {
  const sanitized: AvatarConfig = {
    id: typeof config.id === 'string' ? config.id : DEFAULT_AVATAR_CONFIG.id,
    name: isValidName(config.name) ? config.name.trim() : DEFAULT_AVATAR_CONFIG.name,
    skinTone: isValidSkinTone(config.skinTone) ? config.skinTone : DEFAULT_AVATAR_CONFIG.skinTone,
    hair: {
      style: typeof config.hair?.style === 'string' ? config.hair.style : DEFAULT_AVATAR_CONFIG.hair.style,
      color: isValidHairColor(config.hair?.color) ? config.hair.color : DEFAULT_AVATAR_CONFIG.hair.color,
    },
    clothes: {
      top: config.clothes?.top || null,
      bottom: config.clothes?.bottom || null,
      outfit: config.clothes?.outfit || null,
      color: isValidColor(config.clothes?.color) ? config.clothes.color : DEFAULT_AVATAR_CONFIG.clothes.color,
    },
    accessories: {
      hat: config.accessories?.hat || null,
      glasses: config.accessories?.glasses || null,
      jewelry: Array.isArray(config.accessories?.jewelry) ? config.accessories.jewelry : [],
      other: Array.isArray(config.accessories?.other) ? config.accessories.other : [],
    },
    face: {
      eyes: typeof config.face?.eyes === 'string' ? config.face.eyes : DEFAULT_AVATAR_CONFIG.face.eyes,
      eyebrows: typeof config.face?.eyebrows === 'string' ? config.face.eyebrows : DEFAULT_AVATAR_CONFIG.face.eyebrows,
      mouth: typeof config.face?.mouth === 'string' ? config.face.mouth : DEFAULT_AVATAR_CONFIG.face.mouth,
      facialHair: config.face?.facialHair || null,
    },
    body: {
      shape: typeof config.body?.shape === 'string' ? config.body.shape : DEFAULT_AVATAR_CONFIG.body.shape,
      size: ['small', 'medium', 'large'].includes(config.body?.size) 
        ? config.body.size 
        : DEFAULT_AVATAR_CONFIG.body.size,
    },
    // Preserve optional fields
    customDrawings: typeof config.customDrawings === 'string' ? config.customDrawings : undefined,
    customImageUrl: typeof config.customImageUrl === 'string' && config.customImageUrl.startsWith('data:image/') ? config.customImageUrl : undefined,
    dicebear: config.dicebear || undefined,
  };

  return sanitized;
}

/**
 * Safe load with validation
 * 
 * @param {string | null | undefined} userId - Optional user ID to load user-specific avatar
 */
export function safeLoadAvatarConfig(userId?: string | null): AvatarConfig | null {
  try {
    const config = loadAvatarConfig(userId);
    
    if (!config) {
      return null;
    }

    if (validateAvatarConfig(config)) {
      return config;
    }

    console.warn('Invalid avatar config detected, sanitizing...');
    return sanitizeAvatarConfig(config);
  } catch (error) {
    console.error('Error loading avatar config:', error);
    return null;
  }
}

