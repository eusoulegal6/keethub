import type { Options } from "@dicebear/avataaars";
import { AvatarConfig, generateAvatarId, DEFAULT_AVATAR_CONFIG } from "@/lib/avatar/config";
import {
  SKIN_TONE_COLORS,
  HAIR_COLOR_VALUES,
  BACKGROUND_COLOR_VALUES,
} from "@/lib/avatar/categories/assets";

export interface DiceBearMappingResult {
  seed: string;
  options: Options;
}

const DEFAULT_SKIN_COLOR = "ffdbb4";
const DEFAULT_HAIR_COLOR = "2c1b18";
const DEFAULT_CLOTHING_COLOR = "5199e4";
const DEFAULT_TOP_STYLE = "shortFlat";

const SKIN_PRESET_TO_HEX = Object.entries(SKIN_TONE_COLORS).reduce(
  (map, [id, value]) => {
    map[id] = normalizeHexColor(value, DEFAULT_SKIN_COLOR);
    return map;
  },
  {} as Record<string, string>,
);

const HAIR_PRESET_TO_HEX = Object.entries(HAIR_COLOR_VALUES).reduce(
  (map, [id, value]) => {
    map[id] = normalizeHexColor(value, DEFAULT_HAIR_COLOR);
    return map;
  },
  {} as Record<string, string>,
);

const HAIR_STYLE_MAP: Record<string, string> = {
  short: "shortFlat",
  medium: "shortRound",
  long: "longButNotTooLong",
  curly: "curly",
  wavy: "shortWaved",
  bald: "shavedSides",
  bun: "bun",
  ponytail: "straight02",
  bob: "bob",
  fro: "fro",
  "fro-band": "froBand",
  dreads: "dreads",
  dreads01: "dreads01",
  dreads02: "dreads02",
  shaggy: "shaggy",
  "shaggy-mullet": "shaggyMullet",
  straight01: "straight01",
  straight02: "straight02",
  "straight-and-strand": "straightAndStrand",
  frizzle: "frizzle",
  "short-curly": "shortCurly",
  "short-flat": "shortFlat",
  "short-round": "shortRound",
  "short-waved": "shortWaved",
  sides: "sides",
  "the-caesar": "theCaesar",
  "the-caesar-and-side-part": "theCaesarAndSidePart",
  "big-hair": "bigHair",
  curvy: "curvy",
  "long-but-not-too-long": "longButNotTooLong",
  "mia-wallace": "miaWallace",
  "shaved-sides": "shavedSides",
  frida: "frida",
  hijab: "hijab",
  turban: "turban",
};

const HAT_STYLE_MAP: Record<string, string> = {
  cap: "hat",
  beanie: "winterHat1",
  fedora: "hat",
  helmet: "winterHat04",
  "graduation-cap": "hat",
  crown: "hat",
  "winter-hat1": "winterHat1",
  "winter-hat02": "winterHat02",
  "winter-hat03": "winterHat03",
  "winter-hat04": "winterHat04",
  hijab: "hijab",
  turban: "turban",
};

const CLOTHING_MAP: Record<string, string> = {
  tshirt: "shirtCrewNeck",
  "dress-shirt": "blazerAndShirt",
  "tank-top": "shirtScoopNeck",
  jacket: "blazerAndSweater",
  hoodie: "hoodie",
  sweater: "collarAndSweater",
  "shirt-vneck": "shirtVNeck",
  "graphic-shirt": "graphicShirt",
  "polo-shirt": "shirtCrewNeck",
  blazer: "blazerAndShirt",
  cardigan: "collarAndSweater",
  pullover: "collarAndSweater",
  "long-sleeve-tshirt": "shirtCrewNeck",
  "crew-neck-sweater": "collarAndSweater",
  turtleneck: "shirtScoopNeck",
};

const OUTFIT_MAP: Record<string, string> = {
  suit: "blazerAndShirt",
  uniform: "overall",
  costume: "graphicShirt",
  casual: "shirtCrewNeck",
  formal: "blazerAndSweater",
  overall: "overall",
  "business-casual": "blazerAndShirt",
  workout: "hoodie",
  professional: "blazerAndSweater",
  athletic: "graphicShirt",
  winter: "collarAndSweater",
  sporty: "graphicShirt",
  business: "blazerAndShirt",
};

const GLASSES_MAP: Record<string, string> = {
  regular: "prescription01",
  sunglasses: "sunglasses",
  goggles: "kurt",
  monocle: "round",
  prescription01: "prescription01",
  prescription02: "prescription02",
  round: "round",
  wayfarers: "wayfarers",
  kurt: "kurt",
  eyepatch: "eyepatch",
};

const EYE_MAP: Record<string, string> = {
  default: "default",
  happy: "happy",
  surprised: "surprised",
  closed: "closed",
  cry: "cry",
  "eye-roll": "eyeRoll",
  hearts: "hearts",
  side: "side",
  squint: "squint",
  wink: "wink",
  "wink-wacky": "winkWacky",
  "x-dizzy": "xDizzy",
};

const EYEBROW_MAP: Record<string, string> = {
  default: "default",
  raised: "raisedExcited",
  angry: "angry",
  "angry-natural": "angryNatural",
  "default-natural": "defaultNatural",
  "flat-natural": "flatNatural",
  "frown-natural": "frownNatural",
  "raised-excited": "raisedExcited",
  "raised-excited-natural": "raisedExcitedNatural",
  "sad-concerned": "sadConcerned",
  "sad-concerned-natural": "sadConcernedNatural",
  "unibrow-natural": "unibrowNatural",
  "up-down": "upDown",
  "up-down-natural": "upDownNatural",
};

const MOUTH_MAP: Record<string, string> = {
  smile: "smile",
  neutral: "serious",
  laugh: "twinkle",
  concerned: "concerned",
  default: "default",
  disbelief: "disbelief",
  eating: "eating",
  grimace: "grimace",
  sad: "sad",
  "scream-open": "screamOpen",
  serious: "serious",
  tongue: "tongue",
  twinkle: "twinkle",
  vomit: "vomit",
};

const FACIAL_HAIR_MAP: Record<string, string> = {
  mustache: "moustacheFancy",
  beard: "beardMedium",
  goatee: "beardLight",
  "beard-light": "beardLight",
  "beard-majestic": "beardMajestic",
  "beard-medium": "beardMedium",
  "moustache-fancy": "moustacheFancy",
  "moustache-magnum": "moustacheMagnum",
};

const CLOTHING_GRAPHIC_MAP: Record<string, string> = {
  bat: "bat",
  bear: "bear",
  cumbia: "cumbia",
  deer: "deer",
  diamond: "diamond",
  hola: "hola",
  pizza: "pizza",
  resist: "resist",
  skull: "skull",
  "skull-outline": "skullOutline",
};

export function avatarConfigToDiceBearOptions(
  config: AvatarConfig,
): DiceBearMappingResult {
  const seed = config.id || generateAvatarId(config);
  const accessories = config.accessories ?? DEFAULT_AVATAR_CONFIG.accessories;
  const face = config.face ?? DEFAULT_AVATAR_CONFIG.face;
  const hair = config.hair ?? DEFAULT_AVATAR_CONFIG.hair;
  const clothes = config.clothes ?? DEFAULT_AVATAR_CONFIG.clothes;
  const useHat = Boolean(accessories.hat);
  const glassesStyle = mapGlasses(accessories.glasses);
  const facialHairStyle = mapFacialHair(face.facialHair);

  const dicebearOptions = config.dicebear || {
    clothingGraphic: null,
    backgroundStyle: "default",
    backgroundColor: null,
  };

  const clothingGraphic = mapClothingGraphic(dicebearOptions.clothingGraphic);
  const backgroundStyle = dicebearOptions.backgroundStyle === "circle" ? "circle" : "default";
  const backgroundColor = mapBackgroundColor(dicebearOptions.backgroundColor);

  const options: Options = {
    style: [backgroundStyle] as Options["style"],
    top: [mapTopStyle(useHat, accessories, hair) as NonNullable<Options["top"]>[number]],
    clothing: [mapClothing(clothes) as NonNullable<Options["clothing"]>[number]],
    clothingGraphic: clothingGraphic ? [clothingGraphic as NonNullable<Options["clothingGraphic"]>[number]] : undefined,
    hairColor: [mapHairColor(hair.color)],
    skinColor: [mapSkinTone(config.skinTone)],
    clothesColor: [mapClothingColor(clothes.color)],
    backgroundColor: backgroundColor ? [backgroundColor] : undefined,
    eyes: [mapEyes(face.eyes) as NonNullable<Options["eyes"]>[number]],
    eyebrows: [mapEyebrows(face.eyebrows) as NonNullable<Options["eyebrows"]>[number]],
    mouth: [mapMouth(face.mouth) as NonNullable<Options["mouth"]>[number]],
    hatColor: useHat ? [mapHatColor(clothes.color, hair.color)] : undefined,
    topProbability: 100,
    accessories: glassesStyle ? [glassesStyle as NonNullable<Options["accessories"]>[number]] : undefined,
    accessoriesProbability: glassesStyle ? 100 : 0,
    facialHair: facialHairStyle ? [facialHairStyle as NonNullable<Options["facialHair"]>[number]] : undefined,
    facialHairProbability: facialHairStyle ? 100 : 0,
    facialHairColor: facialHairStyle ? [mapHairColor(hair.color)] : undefined,
  };

  return { seed, options };
}

function mapSkinTone(value: string): string {
  if (!value) return DEFAULT_SKIN_COLOR;
  if (!value.startsWith("#") && SKIN_PRESET_TO_HEX[value]) return SKIN_PRESET_TO_HEX[value];
  return normalizeHexColor(value, DEFAULT_SKIN_COLOR);
}

function mapHairColor(value: string): string {
  if (!value) return DEFAULT_HAIR_COLOR;
  if (!value.startsWith("#") && HAIR_PRESET_TO_HEX[value]) return HAIR_PRESET_TO_HEX[value];
  return normalizeHexColor(value, DEFAULT_HAIR_COLOR);
}

function mapClothingColor(value: string): string {
  return normalizeHexColor(value, DEFAULT_CLOTHING_COLOR);
}

function mapHatColor(clothesColor: string, hairColor: string): string {
  if (clothesColor) return mapClothingColor(clothesColor);
  return mapHairColor(hairColor);
}

function mapTopStyle(
  useHat: boolean,
  accessories: AvatarConfig["accessories"],
  hair: AvatarConfig["hair"],
): string {
  if (useHat && accessories.hat) {
    return (
      HAT_STYLE_MAP[accessories.hat] ??
      HAIR_STYLE_MAP[hair.style] ??
      DEFAULT_TOP_STYLE
    );
  }
  return HAIR_STYLE_MAP[hair.style] ?? DEFAULT_TOP_STYLE;
}

function mapClothing(clothes: AvatarConfig["clothes"]): string {
  if (clothes.outfit) {
    return OUTFIT_MAP[clothes.outfit] ?? CLOTHING_MAP[clothes.top ?? ""] ?? "shirtCrewNeck";
  }
  if (clothes.top && CLOTHING_MAP[clothes.top]) return CLOTHING_MAP[clothes.top];
  return "shirtCrewNeck";
}

function mapGlasses(value: string | null): string | null {
  if (!value) return null;
  return GLASSES_MAP[value] ?? "round";
}

function mapEyes(value: string): string {
  return EYE_MAP[value] ?? "default";
}

function mapEyebrows(value: string): string {
  return EYEBROW_MAP[value] ?? "default";
}

function mapMouth(value: string): string {
  return MOUTH_MAP[value] ?? "smile";
}

function mapFacialHair(value: string | null): string | null {
  if (!value || value === "none") return null;
  return FACIAL_HAIR_MAP[value] ?? "beardLight";
}

function mapClothingGraphic(value: string | null): string | null {
  if (!value) return null;
  return CLOTHING_GRAPHIC_MAP[value] ?? null;
}

function mapBackgroundColor(value: string | null): string | null {
  if (!value) return null;
  if (BACKGROUND_COLOR_VALUES[value]) {
    const presetValue = BACKGROUND_COLOR_VALUES[value];
    if (presetValue === "transparent") return "transparent";
    return normalizeHexColor(presetValue, "65c9ff");
  }
  if (value.startsWith("#")) return normalizeHexColor(value, "65c9ff");
  return normalizeHexColor(value, "65c9ff");
}

function normalizeHexColor(value: string, fallback: string): string {
  if (!value) return fallback;
  const hex = value.startsWith("#") ? value.slice(1) : value;
  return /^[0-9a-fA-F]{6}$/.test(hex) ? hex.toLowerCase() : fallback;
}
