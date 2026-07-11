/**
 * Avatar Configuration System
 *
 * Core data structures and utilities for avatar customization.
 * Persistence is handled by Supabase via profile-store.ts, not localStorage.
 */

export interface AvatarHair {
  style: string;
  color: string;
}

export interface AvatarClothes {
  top: string | null;
  bottom: string | null;
  outfit: string | null;
  color: string;
}

export interface AvatarAccessories {
  hat: string | null;
  glasses: string | null;
  jewelry: string[];
  other: string[];
}

export interface AvatarFace {
  eyes: string;
  eyebrows: string;
  mouth: string;
  facialHair: string | null;
}

export interface AvatarBody {
  shape: string;
  size: "small" | "medium" | "large";
}

export interface DiceBearOptions {
  clothingGraphic: string | null;
  backgroundStyle: "default" | "circle";
  backgroundColor: string | null;
}

export interface AvatarConfig {
  id: string;
  name: string;
  skinTone: string;
  hair: AvatarHair;
  clothes: AvatarClothes;
  accessories: AvatarAccessories;
  face: AvatarFace;
  body: AvatarBody;
  dicebear?: DiceBearOptions;
  customDrawings?: string;
  customImageUrl?: string;
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  id: "default",
  name: "My Avatar",
  skinTone: "#FFDBAC",
  hair: {
    style: "short",
    color: "#000000",
  },
  clothes: {
    top: "tshirt",
    bottom: "jeans",
    outfit: null,
    color: "#3B82F6",
  },
  accessories: {
    hat: null,
    glasses: null,
    jewelry: [],
    other: [],
  },
  face: {
    eyes: "default",
    eyebrows: "default",
    mouth: "smile",
    facialHair: null,
  },
  body: {
    shape: "average",
    size: "medium",
  },
  dicebear: {
    clothingGraphic: null,
    backgroundStyle: "default",
    backgroundColor: null,
  },
};

export function generateAvatarId(config: AvatarConfig): string {
  const configString = JSON.stringify(config);
  let hash = 0;
  for (let i = 0; i < configString.length; i++) {
    const char = configString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `avatar-${Math.abs(hash).toString(36)}`;
}

export function createDefaultAvatarConfig(name?: string): AvatarConfig {
  return {
    ...DEFAULT_AVATAR_CONFIG,
    id: generateAvatarId(DEFAULT_AVATAR_CONFIG),
    name: name || DEFAULT_AVATAR_CONFIG.name,
  };
}

export function cloneAvatarConfig(config: AvatarConfig): AvatarConfig {
  return JSON.parse(JSON.stringify(config));
}

export function encodeAvatarConfig(config: AvatarConfig): string {
  return JSON.stringify(config);
}

export function decodeAvatarConfig(encoded: string): AvatarConfig | null {
  try {
    return JSON.parse(encoded) as AvatarConfig;
  } catch {
    return null;
  }
}
