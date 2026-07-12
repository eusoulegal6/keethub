import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export interface LeaderboardEntry {
  id: string;
  score: number;
  created_at: string;
  user_id: string;
  username: string | null;
  game_slug: string;
  game_title: string;
}

type GlobalScoreRow = {
  id: string;
  score: number;
  created_at: string;
  user_id: string;
  games: { slug: string | null; title: string | null } | null;
  profiles: { username: string | null } | null;
};

type GameScoreRow = {
  id: string;
  score: number;
  created_at: string;
  user_id: string;
  profiles: { username: string | null } | null;
};

export const getGlobalLeaderboard = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("game_scores")
    .select("id, score, created_at, user_id, games(slug, title), profiles(username)")
    .order("score", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as GlobalScoreRow[]).map((row) => ({
    id: row.id,
    score: row.score,
    created_at: row.created_at,
    user_id: row.user_id,
    username: row.profiles?.username ?? null,
    game_slug: row.games?.slug ?? "",
    game_title: row.games?.title ?? "",
  }));
});

export const getGameLeaderboard = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ gameId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: rows, error } = await supabase
      .from("game_scores")
      .select("id, score, created_at, user_id, profiles(username)")
      .eq("game_id", data.gameId)
      .order("score", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return ((rows ?? []) as unknown as GameScoreRow[]).map((row) => ({
      id: row.id,
      score: row.score,
      created_at: row.created_at,
      user_id: row.user_id,
      username: row.profiles?.username ?? null,
    }));
  });

export const submitScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        gameId: z.string().uuid(),
        score: z.number().int().min(0).max(10_000_000),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("game_scores").insert({
      user_id: context.userId,
      game_id: data.gameId,
      score: data.score,
      metadata: (data.metadata ?? {}) as never,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
