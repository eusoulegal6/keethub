import type { AvatarConfig } from "./config";
import { createDefaultAvatarConfig } from "./config";
import { getDiceBearAvatarUrl } from "./dicebear/api";
import { validateAvatarConfig, sanitizeAvatarConfig } from "./validation";

export function parseAvatarConfig(raw: unknown): AvatarConfig {
  if (raw && typeof raw === "object" && (raw as Record<string, unknown>).id) {
    const obj = raw as Record<string, any>;
    if (validateAvatarConfig(obj)) return obj as unknown as AvatarConfig;
    return sanitizeAvatarConfig(obj);
  }
  return createDefaultAvatarConfig();
}

export function getAvatarUrlFromProfile(raw: unknown, size?: number): string {
  return getDiceBearAvatarUrl(parseAvatarConfig(raw), {
    format: size ? "png" : "svg",
    size,
  });
}
