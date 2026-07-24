import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/** Aggregated standing returned by the server-side get_leaderboard_standings RPC. */
export interface LeaderboardStanding {
  user_id: string;
  username: string | null;
  avatar_config: Json | null;
  total_score: number;
  submissions: number;
  best_game_title: string | null;
  best_game_slug: string | null;
  best_score: number | null;
  last_played_at: string;
}

/** Individual score row — used by per-game leaderboards and as an intermediate type. */
export interface LeaderboardEntry {
  id: string;
  score: number;
  created_at: string;
  user_id: string;
  username: string | null;
  avatar_config: Json | null;
  game_slug: string;
  game_title: string;
}

type GlobalScoreRow = {
  id: string;
  score: number;
  created_at: string;
  user_id: string;
  games: { slug: string | null; title: string | null } | null;
  profiles: { username: string | null; avatar_config: Json | null } | null;
};

type GameScoreRow = {
  id: string;
  score: number;
  created_at: string;
  user_id: string;
  profiles: { username: string | null } | null;
};

export const getGlobalLeaderboard = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        days: z.number().int().positive().nullable().optional(),
        limit: z.number().int().min(1).max(500).optional(),
      })
      .optional()
      .default({})
      .parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = publicClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rpcClient = supabase.rpc as any;
    const { data: standings, error } = await rpcClient("get_leaderboard_standings", {
      p_days: data.days ?? null,
      p_limit: data.limit ?? 100,
    });

    if (error) {
      console.error("[Leaderboard:getGlobalLeaderboard] RPC failed", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw new Error(error.message);
    }

    const result = (standings ?? []) as LeaderboardStanding[];
    console.log("[Leaderboard:getGlobalLeaderboard] fetched standings", {
      count: result.length,
    });

    return result;
  });

export const getUserScoresByGame = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("game_scores")
      .select("game_id, score, games(slug)")
      .eq("user_id", context.userId)
      .order("score", { ascending: false });

    if (error) throw new Error(error.message);

    const bestBySlug: Record<string, number> = {};
    for (const row of data ?? []) {
      const slug = (row.games as any)?.slug as string | undefined;
      if (slug && !(slug in bestBySlug)) {
        bestBySlug[slug] = row.score;
      }
    }
    return bestBySlug;
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
    const { data: game, error: gameError } = await context.supabase
      .from("games")
      .select("id")
      .eq("id", data.gameId)
      .maybeSingle();

    if (gameError) throw new Error(gameError.message);
    if (!game) throw new Error("Game not found");

    const { error } = await context.supabase.from("game_scores").insert({
      user_id: context.userId,
      game_id: data.gameId,
      score: data.score,
      metadata: (data.metadata ?? {}) as never,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
