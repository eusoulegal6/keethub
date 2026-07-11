import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import type { AvatarConfig } from "@/lib/avatar/config";
import { createDefaultAvatarConfig } from "@/lib/avatar/config";
import { validateAvatarConfig, sanitizeAvatarConfig } from "@/lib/avatar/validation";
import type { Json } from "@/integrations/supabase/types";

interface ProfileState {
  avatarConfig: AvatarConfig;
  username: string;
  isLoading: boolean;
  isLoaded: boolean;

  loadProfile: (userId: string) => Promise<void>;
  saveAvatarConfig: (config: AvatarConfig, userId: string) => Promise<void>;
  setAvatarConfig: (config: AvatarConfig) => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  avatarConfig: createDefaultAvatarConfig(),
  username: "",
  isLoading: false,
  isLoaded: false,

  loadProfile: async (userId: string) => {
    if (get().isLoading) return;
    set({ isLoading: true });

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, avatar_config")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;

      let config = createDefaultAvatarConfig();
      if (data?.avatar_config && typeof data.avatar_config === "object") {
        const raw = data.avatar_config as Record<string, any>;
        if (raw.id) {
          if (validateAvatarConfig(raw)) {
            config = raw as unknown as AvatarConfig;
          } else {
            config = sanitizeAvatarConfig(raw);
          }
        }
      }

      set({
        avatarConfig: config,
        username: data?.username || "",
        isLoading: false,
        isLoaded: true,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  saveAvatarConfig: async (config: AvatarConfig, userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_config: config as unknown as Json })
      .eq("id", userId);

    if (error) throw new Error(error.message);

    set({ avatarConfig: config });
  },

  setAvatarConfig: (config: AvatarConfig) => {
    set({ avatarConfig: config });
  },
}));
