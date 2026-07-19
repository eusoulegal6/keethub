import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getAvatarEmoji, DEFAULT_AVATAR } from "@/lib/avatars";
import type { AvatarConfig } from "@/lib/avatar/config";
import { decodeAvatarConfig } from "@/lib/avatar/config";
import { getDiceBearAvatarUrl, getDiceBearAvatarUrlFromSeed } from "@/lib/avatar/dicebear/api";

type AvatarPlayer = {
  name: string;
  avatar?: string | AvatarConfig | null;
};

type PlayerAvatarSize = "sm" | "md" | "lg";

interface PlayerAvatarProps {
  player: AvatarPlayer;
  size?: PlayerAvatarSize;
  className?: string;
}

const SIZE_CLASS: Record<PlayerAvatarSize, string> = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-12 w-12",
};

const SIZE_PX: Record<PlayerAvatarSize, number> = {
  sm: 36,
  md: 44,
  lg: 48,
};

export function PlayerAvatar({ player, size = "md", className }: PlayerAvatarProps) {
  const pixelSize = SIZE_PX[size];
  const fallback = (
    <AvatarFallback className="bg-[#ECFBFA] p-0 text-lg">
      <span>{getAvatarEmoji(DEFAULT_AVATAR.id)}</span>
    </AvatarFallback>
  );

  if (!player.avatar) {
    const defaultUrl = getDiceBearAvatarUrlFromSeed(DEFAULT_AVATAR.id, {
      format: "png",
      size: pixelSize,
    });

    return (
      <Avatar className={cn(SIZE_CLASS[size], "border-2 border-white shadow-sm", className)}>
        <AvatarImage src={defaultUrl} alt={player.name} />
        {fallback}
      </Avatar>
    );
  }

  let avatarConfig: AvatarConfig | null = null;

  if (typeof player.avatar === "string") {
    avatarConfig = decodeAvatarConfig(player.avatar);
    if (!avatarConfig) {
      const avatarUrl = getDiceBearAvatarUrlFromSeed(player.avatar, {
        format: "png",
        size: pixelSize,
      });

      return (
        <Avatar className={cn(SIZE_CLASS[size], "border-2 border-white shadow-sm", className)}>
          <AvatarImage src={avatarUrl} alt={player.name} />
          <AvatarFallback className="bg-[#ECFBFA] p-0 text-lg">
            <span>{getAvatarEmoji(player.avatar)}</span>
          </AvatarFallback>
        </Avatar>
      );
    }
  } else {
    avatarConfig = player.avatar;
  }

  const avatarUrl = avatarConfig?.customImageUrl
    ? avatarConfig.customImageUrl
    : getDiceBearAvatarUrl(avatarConfig, { format: "png", size: pixelSize });

  return (
    <Avatar className={cn(SIZE_CLASS[size], "border-2 border-white shadow-sm", className)}>
      <AvatarImage src={avatarUrl} alt={player.name} />
      {fallback}
    </Avatar>
  );
}
