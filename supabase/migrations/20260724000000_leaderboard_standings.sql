-- Server-side leaderboard aggregation
-- Replaces client-side aggregation of raw score rows with a proper
-- database function that groups by user_id before ranking.
-- Fixes the correctness bug where the top-100 individual-score-row
-- cutoff silently dropped scores from users with many submissions.

CREATE OR REPLACE FUNCTION public.get_leaderboard_standings(
  p_days INT DEFAULT NULL,
  p_limit INT DEFAULT 100
)
RETURNS TABLE(
  user_id UUID,
  username TEXT,
  avatar_config JSONB,
  total_score BIGINT,
  submissions BIGINT,
  best_game_title TEXT,
  best_game_slug TEXT,
  best_score INT,
  last_played_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH filtered_scores AS (
    SELECT
      gs.user_id,
      gs.score,
      gs.game_id,
      gs.created_at
    FROM public.game_scores gs
    WHERE
      p_days IS NULL
      OR gs.created_at >= now() - make_interval(days => p_days)
  ),
  user_aggregates AS (
    SELECT
      fs.user_id,
      SUM(fs.score)::BIGINT AS total_score,
      COUNT(*)::BIGINT AS submissions,
      MAX(fs.created_at) AS last_played_at
    FROM filtered_scores fs
    GROUP BY fs.user_id
  ),
  best_games AS (
    SELECT DISTINCT ON (fs.user_id)
      fs.user_id,
      fs.score AS best_score,
      g.title AS best_game_title,
      g.slug AS best_game_slug
    FROM filtered_scores fs
    JOIN public.games g ON g.id = fs.game_id
    ORDER BY fs.user_id, fs.score DESC
  )
  SELECT
    ua.user_id,
    p.username,
    p.avatar_config,
    ua.total_score,
    ua.submissions,
    bg.best_game_title,
    bg.best_game_slug,
    bg.best_score,
    ua.last_played_at
  FROM user_aggregates ua
  JOIN public.profiles p ON p.id = ua.user_id
  LEFT JOIN best_games bg ON bg.user_id = ua.user_id
  ORDER BY ua.total_score DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard_standings TO anon, authenticated;
