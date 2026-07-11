import type { AvatarConfig } from "@/lib/avatar/config";
import { avatarConfigToDiceBearOptions } from "./mapper";

function getApiBaseUrl(): string {
  return "https://api.dicebear.com";
}

function buildQueryString(options: Record<string, any>): string {
  const params = new URLSearchParams();
  if (options.seed) params.append("seed", options.seed);
  Object.entries(options).forEach(([key, value]) => {
    if (key === "seed") return;
    if (Array.isArray(value)) {
      if (value.length > 0) params.append(key, value.join(","));
    } else if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  return params.toString();
}

export function getDiceBearAvatarUrl(
  config: AvatarConfig | null,
  options: {
    format?: "svg" | "png" | "jpg" | "jpeg" | "webp" | "avif";
    size?: number;
    style?: string;
  } = {},
): string {
  const { format = "svg", size, style = "avataaars" } = options;

  if (!config) {
    return `https://api.dicebear.com/9.x/${style}/${format}?seed=default`;
  }

  const mapping = avatarConfigToDiceBearOptions(config);
  const dicebearOptions: Record<string, any> = {
    seed: mapping.seed,
    ...mapping.options,
  };

  if (size && (format === "png" || format === "jpg" || format === "jpeg" || format === "webp" || format === "avif")) {
    dicebearOptions.size = size;
  }

  const queryString = buildQueryString(dicebearOptions);
  const baseUrl = getApiBaseUrl();
  const version = "9.x";

  return `${baseUrl}/${version}/${style}/${format}?${queryString}`;
}

export function getDiceBearAvatarUrlFromSeed(
  seed: string,
  options: {
    format?: "svg" | "png" | "jpg" | "jpeg" | "webp" | "avif";
    size?: number;
    style?: string;
  } = {},
): string {
  const { format = "svg", size, style = "avataaars" } = options;
  const params = new URLSearchParams();
  params.append("seed", seed);
  if (size && (format === "png" || format === "jpg" || format === "jpeg" || format === "webp" || format === "avif")) {
    params.append("size", String(size));
  }
  const baseUrl = getApiBaseUrl();
  const version = "9.x";
  return `${baseUrl}/${version}/${style}/${format}?${params.toString()}`;
}
