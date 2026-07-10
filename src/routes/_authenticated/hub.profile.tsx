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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEffect } from "react";

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

function ProfilePage() {
  const { data: profile } = useSuspenseQuery(profileQuery);
  const updateFn = useServerFn(updateMyProfile);
  const queryClient = useQueryClient();

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

  const initial = profile?.username?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="px-6 py-8 md:px-10 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <UserIcon className="w-7 h-7 text-primary" />
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Profile
        </h1>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="w-20 h-20">
            <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-lg">{profile?.username}</p>
            <p className="text-sm text-muted-foreground">
              Joined{" "}
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString()
                : "recently"}
            </p>
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
    </div>
  );
}
