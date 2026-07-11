import { useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import * as avataaars from "@dicebear/avataaars";
import type { AvatarConfig } from "@/lib/avatar/config";
import { avatarConfigToDiceBearOptions } from "@/lib/avatar/dicebear/mapper";

interface AvatarPreviewProps {
  config: AvatarConfig;
  size?: number;
  className?: string;
}

export function AvatarPreview({ config, size = 200, className = "" }: AvatarPreviewProps) {
  const svg = useMemo(() => {
    try {
      const mapping = avatarConfigToDiceBearOptions(config);
      const style = {
        create: avataaars.create,
        meta: avataaars.meta,
        schema: avataaars.schema,
      };
      const avatar = createAvatar(style, {
        seed: mapping.seed,
        ...mapping.options,
      });
      return avatar.toString();
    } catch {
      return `<svg width="${size}" height="${size}" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="95" fill="#e0e0e0"/>
        <text x="100" y="110" text-anchor="middle" font-size="40" fill="#666">👤</text>
      </svg>`;
    }
  }, [config, size]);

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      role="img"
      aria-label={`Avatar preview: ${config.name || "Custom avatar"}`}
    >
      <div
        dangerouslySetInnerHTML={{ __html: svg }}
        style={{ width: size, height: size }}
      />
    </div>
  );
}
