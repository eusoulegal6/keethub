import { AvatarConfig, DEFAULT_AVATAR_CONFIG } from "./config";

function isValidSkinTone(tone: string): boolean {
  if (/^#[0-9A-F]{6}$/i.test(tone)) return true;
  const validPresets = [
    "light", "medium-light", "medium", "medium-dark", "dark",
    "deep-brown", "golden",
  ];
  return validPresets.includes(tone);
}

function isValidHairColor(color: string): boolean {
  if (/^#[0-9A-F]{6}$/i.test(color)) return true;
  const validPresets = [
    "black", "brown", "blonde", "red", "gray", "white",
    "auburn", "platinum", "dark-brown", "light-brown",
  ];
  return validPresets.includes(color);
}

function isValidColor(color: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(color);
}

function isValidName(name: string): boolean {
  return typeof name === "string" && name.trim().length > 0 && name.length <= 30;
}

export function validateAvatarConfig(config: unknown): config is AvatarConfig {
  if (!config || typeof config !== "object") return false;
  const c = config as Record<string, any>;

  if (!c.id || typeof c.id !== "string") return false;
  if (!isValidName(c.name)) return false;
  if (!isValidSkinTone(c.skinTone)) return false;

  if (!c.hair || typeof c.hair !== "object") return false;
  if (!c.hair.style || typeof c.hair.style !== "string") return false;
  if (!c.hair.color || typeof c.hair.color !== "string") return false;
  if (!isValidHairColor(c.hair.color)) return false;

  if (!c.clothes || typeof c.clothes !== "object") return false;
  if (!isValidColor(c.clothes.color)) return false;

  if (!c.face || typeof c.face !== "object") return false;
  if (!c.face.eyes || typeof c.face.eyes !== "string") return false;
  if (!c.face.eyebrows || typeof c.face.eyebrows !== "string") return false;
  if (!c.face.mouth || typeof c.face.mouth !== "string") return false;

  if (!c.body || typeof c.body !== "object") return false;
  if (!c.body.shape || typeof c.body.shape !== "string") return false;
  if (!["small", "medium", "large"].includes(c.body.size)) return false;

  return true;
}

export function sanitizeAvatarConfig(input: Record<string, any>): AvatarConfig {
  return {
    id: typeof input.id === "string" ? input.id : DEFAULT_AVATAR_CONFIG.id,
    name: isValidName(input.name) ? input.name.trim() : DEFAULT_AVATAR_CONFIG.name,
    skinTone: isValidSkinTone(input.skinTone) ? input.skinTone : DEFAULT_AVATAR_CONFIG.skinTone,
    hair: {
      style: typeof input.hair?.style === "string" ? input.hair.style : DEFAULT_AVATAR_CONFIG.hair.style,
      color: isValidHairColor(input.hair?.color) ? input.hair.color : DEFAULT_AVATAR_CONFIG.hair.color,
    },
    clothes: {
      top: input.clothes?.top || null,
      bottom: input.clothes?.bottom || null,
      outfit: input.clothes?.outfit || null,
      color: isValidColor(input.clothes?.color) ? input.clothes.color : DEFAULT_AVATAR_CONFIG.clothes.color,
    },
    accessories: {
      hat: input.accessories?.hat || null,
      glasses: input.accessories?.glasses || null,
      jewelry: Array.isArray(input.accessories?.jewelry) ? input.accessories.jewelry : [],
      other: Array.isArray(input.accessories?.other) ? input.accessories.other : [],
    },
    face: {
      eyes: typeof input.face?.eyes === "string" ? input.face.eyes : DEFAULT_AVATAR_CONFIG.face.eyes,
      eyebrows: typeof input.face?.eyebrows === "string" ? input.face.eyebrows : DEFAULT_AVATAR_CONFIG.face.eyebrows,
      mouth: typeof input.face?.mouth === "string" ? input.face.mouth : DEFAULT_AVATAR_CONFIG.face.mouth,
      facialHair: input.face?.facialHair || null,
    },
    body: {
      shape: typeof input.body?.shape === "string" ? input.body.shape : DEFAULT_AVATAR_CONFIG.body.shape,
      size: ["small", "medium", "large"].includes(input.body?.size)
        ? input.body.size
        : DEFAULT_AVATAR_CONFIG.body.size,
    },
    customDrawings: typeof input.customDrawings === "string" ? input.customDrawings : undefined,
    customImageUrl: typeof input.customImageUrl === "string" && input.customImageUrl.startsWith("data:image/") ? input.customImageUrl : undefined,
    dicebear: input.dicebear || undefined,
  };
}
