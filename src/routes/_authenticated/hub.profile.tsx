import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { UserIcon } from "lucide-react";
import { getMyProfile, updateMyProfile } from "@/lib/profile.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect } from "react";
import { AvatarPreview } from "@/components/avatar/AvatarPreview";
import { AvatarCustomizer } from "@/components/avatar/AvatarCustomizer";
import type { AvatarConfig } from "@/lib/avatar/config";
import { createDefaultAvatarConfig, encodeAvatarConfig } from "@/lib/avatar/config";
import { validateAvatarConfig, sanitizeAvatarConfig } from "@/lib/avatar/validation";

const profileQuery = queryOptions({
  queryKey: ["me"],
  queryFn: () => getMyProfile(),
});

export const Route = createFileRoute("/_authenticated/hub/profile")({
  head: () => ({
    meta: [{ title: "Profile — GameHub" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(profileQuery),
  component: ProfilePage,
});

const schema = z.object({
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-z0-9_]+$/, "lowercase, numbers, underscores only"),
});

function parseAvatarConfig(raw: unknown): AvatarConfig {
  if (raw && typeof raw === "object" && (raw as Record<string, unknown>).id) {
    const obj = raw as Record<string, any>;
    if (validateAvatarConfig(obj)) return obj as unknown as AvatarConfig;
    return sanitizeAvatarConfig(obj);
  }
  return createDefaultAvatarConfig();
}

function ProfilePage() {
  const { data: profile } = useSuspenseQuery(profileQuery);
  const updateFn = useServerFn(updateMyProfile);
  const queryClient = useQueryClient();
  const [customizerOpen, setCustomizerOpen] = useState(false);

  const avatarConfig = parseAvatarConfig(profile?.avatar_config);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { username: profile?.username ?? "" },
  });

  useEffect(() => {
    if (profile?.username) form.reset({ username: profile.username });
  }, [profile?.username, form]);

  const mutate = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      updateFn({ data: { username: values.username } }),
    onSuccess: () => {
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSaveAvatar = async (config: AvatarConfig) => {
    const encodedConfig = encodeAvatarConfig(config);
    const avatarObj = JSON.parse(encodedConfig) as Record<string, unknown>;
    await updateFn({
      data: {
        username: profile?.username ?? "",
        avatar_config: avatarObj,
      },
    });
    queryClient.invalidateQueries({ queryKey: ["me"] });
  };

  const initial = profile?.username?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="px-6 py-8 md:px-10 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <UserIcon className="w-7 h-7 text-primary" />
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Profile</h1>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            type="button"
            onClick={() => setCustomizerOpen(true)}
            className="rounded-full overflow-hidden hover:ring-2 hover:ring-primary transition-all"
          >
            <AvatarPreview config={avatarConfig} size={80} />
          </button>
          <div>
            <p className="font-semibold text-lg">{profile?.username}</p>
            <p className="text-sm text-muted-foreground">
              Joined{" "}
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString()
                : "recently"}
            </p>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 mt-1 text-primary"
              onClick={() => setCustomizerOpen(true)}
            >
              Customize avatar
            </Button>
          </div>
        </div>

        <form
          onSubmit={form.handleSubmit((v) => mutate.mutate(v))}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" {...form.register("username")} />
            {form.formState.errors.username && (
              <p className="text-xs text-destructive">
                {form.formState.errors.username.message}
              </p>
            )}
          </div>
          <Button type="submit" disabled={mutate.isPending}>
            {mutate.isPending ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </div>

      <AvatarCustomizer
        open={customizerOpen}
        onOpenChange={setCustomizerOpen}
        onSave={handleSaveAvatar}
        initialConfig={avatarConfig}
      />
    </div>
  );
}
