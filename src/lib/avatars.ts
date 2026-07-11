export interface AvatarOption {
  id: string;
  emoji: string;
  name: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: "artist", emoji: "🎨", name: "Artist" },
  { id: "actor", emoji: "🎭", name: "Actor" },
  { id: "clown", emoji: "🎪", name: "Clown" },
  { id: "robot", emoji: "🤖", name: "Robot" },
  { id: "alien", emoji: "👽", name: "Alien" },
  { id: "ninja", emoji: "🥷", name: "Ninja" },
  { id: "wizard", emoji: "🧙", name: "Wizard" },
  { id: "superhero", emoji: "🦸", name: "Superhero" },
  { id: "pirate", emoji: "🏴‍☠️", name: "Pirate" },
  { id: "detective", emoji: "🕵️", name: "Detective" },
  { id: "astronaut", emoji: "👨‍🚀", name: "Astronaut" },
  { id: "chef", emoji: "👨‍🍳", name: "Chef" },
  { id: "doctor", emoji: "👨‍⚕️", name: "Doctor" },
  { id: "firefighter", emoji: "👨‍🚒", name: "Firefighter" },
  { id: "musician", emoji: "🎵", name: "Musician" },
  { id: "sports", emoji: "⚽", name: "Athlete" },
];

export const DEFAULT_AVATAR = AVATAR_OPTIONS[0];

const AVATAR_STORAGE_KEY = "paint-and-guess-selected-avatar";

export function getStoredAvatar(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AVATAR_STORAGE_KEY);
}

export function setStoredAvatar(avatarId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AVATAR_STORAGE_KEY, avatarId);
}

export function getAvatarById(id: string): AvatarOption {
  return AVATAR_OPTIONS.find((avatar) => avatar.id === id) || DEFAULT_AVATAR;
}

export function getAvatarEmoji(id: string): string {
  return getAvatarById(id).emoji;
}

