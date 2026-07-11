export interface AssetOption {
  id: string;
  name: string;
  emoji?: string;
  svg?: string;
  colorable?: boolean;
}

export const SKIN_TONE_PRESETS: AssetOption[] = [
  { id: "light", name: "Light", emoji: "👶", colorable: true },
  { id: "medium-light", name: "Medium Light", emoji: "👧", colorable: true },
  { id: "medium", name: "Medium", emoji: "👨", colorable: true },
  { id: "medium-dark", name: "Medium Dark", emoji: "👩", colorable: true },
  { id: "dark", name: "Dark", emoji: "👴", colorable: true },
  { id: "deep-brown", name: "Deep Brown", emoji: "👴", colorable: true },
  { id: "golden", name: "Golden", emoji: "👨", colorable: true },
];

export const SKIN_TONE_COLORS: Record<string, string> = {
  light: "#FFDBAC",
  "medium-light": "#F1C27D",
  medium: "#E0AC69",
  "medium-dark": "#C68642",
  dark: "#8D5524",
  "deep-brown": "#614335",
  golden: "#F8D25C",
};

export const HAIR_STYLES: AssetOption[] = [
  { id: "short", name: "Short", emoji: "👤" },
  { id: "medium", name: "Medium", emoji: "👨" },
  { id: "long", name: "Long", emoji: "👩" },
  { id: "curly", name: "Curly", emoji: "👨‍🦱" },
  { id: "wavy", name: "Wavy", emoji: "👩‍🦱" },
  { id: "bald", name: "Bald", emoji: "👨‍🦲" },
  { id: "bun", name: "Bun", emoji: "👩‍🦰" },
  { id: "ponytail", name: "Ponytail", emoji: "👱‍♀️" },
  { id: "bob", name: "Bob", emoji: "👩" },
  { id: "fro", name: "Afro", emoji: "👨‍🦱" },
  { id: "fro-band", name: "Afro with Band", emoji: "👨‍🦱" },
  { id: "dreads", name: "Dreadlocks", emoji: "👨" },
  { id: "dreads01", name: "Dreadlocks 1", emoji: "👨" },
  { id: "dreads02", name: "Dreadlocks 2", emoji: "👨" },
  { id: "shaggy", name: "Shaggy", emoji: "👨" },
  { id: "shaggy-mullet", name: "Shaggy Mullet", emoji: "👨" },
  { id: "straight01", name: "Straight 1", emoji: "👩" },
  { id: "straight02", name: "Straight 2", emoji: "👩" },
  { id: "straight-and-strand", name: "Straight & Strand", emoji: "👩" },
  { id: "frizzle", name: "Frizzle", emoji: "👩" },
  { id: "short-curly", name: "Short Curly", emoji: "👨" },
  { id: "short-flat", name: "Short Flat", emoji: "👨" },
  { id: "short-round", name: "Short Round", emoji: "👨" },
  { id: "short-waved", name: "Short Waved", emoji: "👨" },
  { id: "sides", name: "Sides", emoji: "👨" },
  { id: "the-caesar", name: "Caesar", emoji: "👨" },
  { id: "the-caesar-and-side-part", name: "Caesar Side Part", emoji: "👨" },
  { id: "big-hair", name: "Big Hair", emoji: "👩" },
  { id: "curvy", name: "Curvy", emoji: "👩" },
  { id: "long-but-not-too-long", name: "Long (Not Too Long)", emoji: "👩" },
  { id: "mia-wallace", name: "Mia Wallace", emoji: "👩" },
  { id: "shaved-sides", name: "Shaved Sides", emoji: "👨" },
  { id: "frida", name: "Frida", emoji: "👩" },
  { id: "hijab", name: "Hijab", emoji: "🧕" },
  { id: "turban", name: "Turban", emoji: "👳" },
];

export const HAIR_COLORS: AssetOption[] = [
  { id: "black", name: "Black", colorable: true },
  { id: "brown", name: "Brown", colorable: true },
  { id: "blonde", name: "Blonde", colorable: true },
  { id: "red", name: "Red", colorable: true },
  { id: "gray", name: "Gray", colorable: true },
  { id: "white", name: "White", colorable: true },
  { id: "auburn", name: "Auburn", colorable: true },
  { id: "platinum", name: "Platinum", colorable: true },
  { id: "dark-brown", name: "Dark Brown", colorable: true },
  { id: "light-brown", name: "Light Brown", colorable: true },
];

export const HAIR_COLOR_VALUES: Record<string, string> = {
  black: "#000000",
  brown: "#8B4513",
  blonde: "#FFD700",
  red: "#A0522D",
  gray: "#808080",
  white: "#FFFFFF",
  auburn: "#A55728",
  platinum: "#E8E1E1",
  "dark-brown": "#2C1B18",
  "light-brown": "#B58143",
};

export const CLOTHING_TOPS: AssetOption[] = [
  { id: "tshirt", name: "T-Shirt", emoji: "👕", colorable: true },
  { id: "dress-shirt", name: "Dress Shirt", emoji: "👔", colorable: true },
  { id: "tank-top", name: "Tank Top", emoji: "🎽", colorable: true },
  { id: "jacket", name: "Jacket", emoji: "🧥", colorable: true },
  { id: "hoodie", name: "Hoodie", emoji: "🧥", colorable: true },
  { id: "sweater", name: "Sweater", emoji: "🧶", colorable: true },
  { id: "shirt-vneck", name: "V-Neck Shirt", emoji: "👕", colorable: true },
  { id: "graphic-shirt", name: "Graphic Shirt", emoji: "👕", colorable: true },
  { id: "polo-shirt", name: "Polo Shirt", emoji: "👕", colorable: true },
  { id: "blazer", name: "Blazer", emoji: "👔", colorable: true },
  { id: "cardigan", name: "Cardigan", emoji: "🧶", colorable: true },
  { id: "pullover", name: "Pullover", emoji: "🧶", colorable: true },
  { id: "long-sleeve-tshirt", name: "Long Sleeve T-Shirt", emoji: "👕", colorable: true },
  { id: "crew-neck-sweater", name: "Crew Neck Sweater", emoji: "🧶", colorable: true },
  { id: "turtleneck", name: "Turtleneck", emoji: "👔", colorable: true },
];

export const CLOTHING_BOTTOMS: AssetOption[] = [
  { id: "jeans", name: "Jeans", emoji: "👖", colorable: true },
  { id: "shorts", name: "Shorts", emoji: "🩳", colorable: true },
  { id: "pants", name: "Pants", emoji: "👖", colorable: true },
  { id: "skirt", name: "Skirt", emoji: "👗", colorable: true },
  { id: "dress", name: "Dress", emoji: "👗", colorable: true },
  { id: "leggings", name: "Leggings", emoji: "👖", colorable: true },
  { id: "sweatpants", name: "Sweatpants", emoji: "👖", colorable: true },
  { id: "cargo-pants", name: "Cargo Pants", emoji: "👖", colorable: true },
  { id: "capri-pants", name: "Capri Pants", emoji: "👖", colorable: true },
  { id: "mini-skirt", name: "Mini Skirt", emoji: "👗", colorable: true },
  { id: "maxi-dress", name: "Maxi Dress", emoji: "👗", colorable: true },
  { id: "jumpsuit", name: "Jumpsuit", emoji: "👔", colorable: true },
];

export const CLOTHING_OUTFITS: AssetOption[] = [
  { id: "suit", name: "Suit", emoji: "🤵", colorable: true },
  { id: "uniform", name: "Uniform", emoji: "👔", colorable: true },
  { id: "costume", name: "Costume", emoji: "🎭", colorable: true },
  { id: "casual", name: "Casual", emoji: "👕", colorable: true },
  { id: "formal", name: "Formal", emoji: "👔", colorable: true },
  { id: "overall", name: "Overall", emoji: "👔", colorable: true },
  { id: "business-casual", name: "Business Casual", emoji: "👔", colorable: true },
  { id: "workout", name: "Workout", emoji: "🎽", colorable: true },
  { id: "professional", name: "Professional", emoji: "🤵", colorable: true },
  { id: "athletic", name: "Athletic", emoji: "👕", colorable: true },
  { id: "winter", name: "Winter", emoji: "🧥", colorable: true },
  { id: "sporty", name: "Sporty", emoji: "👕", colorable: true },
  { id: "business", name: "Business", emoji: "👔", colorable: true },
];

export const ACCESSORY_HATS: AssetOption[] = [
  { id: "cap", name: "Cap", emoji: "🧢" },
  { id: "beanie", name: "Beanie", emoji: "🧢" },
  { id: "fedora", name: "Fedora", emoji: "🎩" },
  { id: "helmet", name: "Helmet", emoji: "⛑️" },
  { id: "graduation-cap", name: "Graduation Cap", emoji: "🎓" },
  { id: "crown", name: "Crown", emoji: "👑" },
  { id: "winter-hat1", name: "Winter Hat 1", emoji: "🧢" },
  { id: "winter-hat02", name: "Winter Hat 2", emoji: "🧢" },
  { id: "winter-hat03", name: "Winter Hat 3", emoji: "🧢" },
  { id: "winter-hat04", name: "Winter Hat 4", emoji: "🧢" },
  { id: "hijab", name: "Hijab", emoji: "🧕" },
  { id: "turban", name: "Turban", emoji: "👳" },
];

export const ACCESSORY_GLASSES: AssetOption[] = [
  { id: "regular", name: "Regular Glasses", emoji: "👓" },
  { id: "sunglasses", name: "Sunglasses", emoji: "🕶️" },
  { id: "goggles", name: "Goggles", emoji: "🥽" },
  { id: "monocle", name: "Monocle", emoji: "🧐" },
  { id: "prescription01", name: "Prescription 1", emoji: "👓" },
  { id: "prescription02", name: "Prescription 2", emoji: "👓" },
  { id: "round", name: "Round", emoji: "👓" },
  { id: "wayfarers", name: "Wayfarers", emoji: "🕶️" },
  { id: "kurt", name: "Kurt", emoji: "🥽" },
  { id: "eyepatch", name: "Eyepatch", emoji: "👁️" },
];

export const ACCESSORY_OTHER: AssetOption[] = [
  { id: "ring", name: "Ring", emoji: "💍" },
  { id: "watch", name: "Watch", emoji: "⌚" },
  { id: "backpack", name: "Backpack", emoji: "🎒" },
  { id: "necklace", name: "Necklace", emoji: "📿" },
];

export const FACE_EYES: AssetOption[] = [
  { id: "default", name: "Default", emoji: "👁️" },
  { id: "happy", name: "Happy", emoji: "😊" },
  { id: "surprised", name: "Surprised", emoji: "😲" },
  { id: "closed", name: "Closed", emoji: "😴" },
  { id: "cry", name: "Cry", emoji: "😢" },
  { id: "eye-roll", name: "Eye Roll", emoji: "🙄" },
  { id: "hearts", name: "Hearts", emoji: "😍" },
  { id: "side", name: "Side", emoji: "👀" },
  { id: "squint", name: "Squint", emoji: "😑" },
  { id: "wink", name: "Wink", emoji: "😉" },
  { id: "wink-wacky", name: "Wink Wacky", emoji: "😜" },
  { id: "x-dizzy", name: "XDizzy", emoji: "😵" },
];

export const FACE_EYEBROWS: AssetOption[] = [
  { id: "default", name: "Default", emoji: "🤨" },
  { id: "raised", name: "Raised", emoji: "🤨" },
  { id: "angry", name: "Angry", emoji: "🤨" },
  { id: "angry-natural", name: "Angry Natural", emoji: "🤨" },
  { id: "default-natural", name: "Default Natural", emoji: "🤨" },
  { id: "flat-natural", name: "Flat Natural", emoji: "🤨" },
  { id: "frown-natural", name: "Frown Natural", emoji: "🤨" },
  { id: "raised-excited", name: "Raised Excited", emoji: "🤨" },
  { id: "raised-excited-natural", name: "Raised Excited Natural", emoji: "🤨" },
  { id: "sad-concerned", name: "Sad Concerned", emoji: "🤨" },
  { id: "sad-concerned-natural", name: "Sad Concerned Natural", emoji: "🤨" },
  { id: "unibrow-natural", name: "Unibrow Natural", emoji: "🤨" },
  { id: "up-down", name: "Up Down", emoji: "🤨" },
  { id: "up-down-natural", name: "Up Down Natural", emoji: "🤨" },
];

export const FACE_MOUTH: AssetOption[] = [
  { id: "smile", name: "Smile", emoji: "😊" },
  { id: "neutral", name: "Neutral", emoji: "😐" },
  { id: "laugh", name: "Laugh", emoji: "😃" },
  { id: "concerned", name: "Concerned", emoji: "😟" },
  { id: "default", name: "Default", emoji: "😐" },
  { id: "disbelief", name: "Disbelief", emoji: "😲" },
  { id: "eating", name: "Eating", emoji: "😋" },
  { id: "grimace", name: "Grimace", emoji: "😬" },
  { id: "sad", name: "Sad", emoji: "😢" },
  { id: "scream-open", name: "Scream Open", emoji: "😱" },
  { id: "serious", name: "Serious", emoji: "😐" },
  { id: "tongue", name: "Tongue", emoji: "😛" },
  { id: "twinkle", name: "Twinkle", emoji: "😊" },
  { id: "vomit", name: "Vomit", emoji: "🤮" },
];

export const FACE_FACIAL_HAIR: AssetOption[] = [
  { id: "none", name: "None", emoji: "" },
  { id: "mustache", name: "Mustache", emoji: "👨" },
  { id: "beard", name: "Beard", emoji: "🧔" },
  { id: "goatee", name: "Goatee", emoji: "👨" },
  { id: "beard-light", name: "Beard Light", emoji: "🧔" },
  { id: "beard-majestic", name: "Beard Majestic", emoji: "🧔" },
  { id: "beard-medium", name: "Beard Medium", emoji: "🧔" },
  { id: "moustache-fancy", name: "Moustache Fancy", emoji: "👨" },
  { id: "moustache-magnum", name: "Moustache Magnum", emoji: "👨" },
];

export const BODY_SHAPES: AssetOption[] = [
  { id: "slim", name: "Slim", emoji: "👤" },
  { id: "average", name: "Average", emoji: "👤" },
  { id: "athletic", name: "Athletic", emoji: "💪" },
  { id: "curvy", name: "Curvy", emoji: "👤" },
];

export const BODY_SIZES: Array<{ id: string; name: string }> = [
  { id: "small", name: "Small" },
  { id: "medium", name: "Medium" },
  { id: "large", name: "Large" },
];

export const CLOTHING_GRAPHICS: AssetOption[] = [
  { id: "bat", name: "Bat", emoji: "🦇" },
  { id: "bear", name: "Bear", emoji: "🐻" },
  { id: "cumbia", name: "Cumbia", emoji: "🎵" },
  { id: "deer", name: "Deer", emoji: "🦌" },
  { id: "diamond", name: "Diamond", emoji: "💎" },
  { id: "hola", name: "Hola", emoji: "👋" },
  { id: "pizza", name: "Pizza", emoji: "🍕" },
  { id: "resist", name: "Resist", emoji: "✊" },
  { id: "skull", name: "Skull", emoji: "💀" },
  { id: "skull-outline", name: "Skull Outline", emoji: "💀" },
];

export const BACKGROUND_STYLES: AssetOption[] = [
  { id: "default", name: "Square", emoji: "⬜" },
  { id: "circle", name: "Circle", emoji: "⭕" },
];

export const BACKGROUND_COLORS: AssetOption[] = [
  { id: "transparent", name: "Transparent", emoji: "⬜", colorable: true },
  { id: "blue", name: "Blue", emoji: "🔵", colorable: true },
  { id: "light-blue", name: "Light Blue", emoji: "🔵", colorable: true },
  { id: "dark-blue", name: "Dark Blue", emoji: "🔵", colorable: true },
  { id: "gray", name: "Gray", emoji: "⚪", colorable: true },
  { id: "white", name: "White", emoji: "⚪", colorable: true },
];

export const BACKGROUND_COLOR_VALUES: Record<string, string> = {
  transparent: "transparent",
  blue: "65c9ff",
  "light-blue": "b1e2ff",
  "dark-blue": "25557c",
  gray: "929598",
  white: "ffffff",
};

export function getAssetById(
  category: AssetOption[],
  id: string,
): AssetOption | undefined {
  return category.find((asset) => asset.id === id);
}

export function getAssetsByCategory(category: string): AssetOption[] {
  switch (category) {
    case "skin-tone":
      return SKIN_TONE_PRESETS;
    case "hair-style":
      return HAIR_STYLES;
    case "hair-color":
      return HAIR_COLORS;
    case "clothing-top":
      return CLOTHING_TOPS;
    case "clothing-bottom":
      return CLOTHING_BOTTOMS;
    case "clothing-outfit":
      return CLOTHING_OUTFITS;
    case "clothing-graphic":
      return CLOTHING_GRAPHICS;
    case "accessory-hat":
      return ACCESSORY_HATS;
    case "accessory-glasses":
      return ACCESSORY_GLASSES;
    case "accessory-other":
      return ACCESSORY_OTHER;
    case "face-eyes":
      return FACE_EYES;
    case "face-eyebrows":
      return FACE_EYEBROWS;
    case "face-mouth":
      return FACE_MOUTH;
    case "face-facial-hair":
      return FACE_FACIAL_HAIR;
    case "body-shape":
      return BODY_SHAPES;
    case "background-style":
      return BACKGROUND_STYLES;
    case "background-color":
      return BACKGROUND_COLORS;
    default:
      return [];
  }
}
