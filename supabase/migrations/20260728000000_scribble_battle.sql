-- Scribble Battle — team-based drawing & guessing game
-- Reuses game_words table for word packs
-- Idempotent: safe to re-run after partial failure

-- ── Rooms ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scribble_battle_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_pin TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  word_pack TEXT DEFAULT 'classic',
  round_time INTEGER NOT NULL DEFAULT 60,
  max_regular_rounds INTEGER NOT NULL DEFAULT 5,
  owner_id UUID,
  is_game_active BOOLEAN NOT NULL DEFAULT false,
  phase TEXT NOT NULL DEFAULT 'lobby'
    CHECK (phase IN ('lobby','regular','final','game-ended')),
  round_number INTEGER NOT NULL DEFAULT 0,
  team1_drawer_id UUID,
  team2_drawer_id UUID,
  round_deadline_at TIMESTAMPTZ,
  word_history TEXT[] DEFAULT '{}',
  team1_score INTEGER NOT NULL DEFAULT 0,
  team2_score INTEGER NOT NULL DEFAULT 0,
  team1_final_progress INTEGER NOT NULL DEFAULT 0,
  team2_final_progress INTEGER NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.scribble_battle_rooms TO authenticated;
GRANT UPDATE ON public.scribble_battle_rooms TO authenticated;
GRANT ALL ON public.scribble_battle_rooms TO service_role;

ALTER TABLE public.scribble_battle_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SB rooms viewable by authenticated" ON public.scribble_battle_rooms;
CREATE POLICY "SB rooms viewable by authenticated"
  ON public.scribble_battle_rooms FOR SELECT USING (true);

DROP POLICY IF EXISTS "SB rooms creatable by authenticated" ON public.scribble_battle_rooms;
CREATE POLICY "SB rooms creatable by authenticated"
  ON public.scribble_battle_rooms FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "SB room owner can update" ON public.scribble_battle_rooms;
CREATE POLICY "SB room owner can update"
  ON public.scribble_battle_rooms FOR UPDATE
  USING (auth.uid() = owner_id);

-- ── Players ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scribble_battle_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.scribble_battle_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  avatar JSONB DEFAULT '{}'::jsonb,
  team INTEGER NOT NULL CHECK (team IN (1, 2)),
  score INTEGER NOT NULL DEFAULT 0,
  is_ready BOOLEAN NOT NULL DEFAULT false,
  has_guessed BOOLEAN NOT NULL DEFAULT false,
  is_connected BOOLEAN NOT NULL DEFAULT true,
  win_streak INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, name)
);

CREATE INDEX IF NOT EXISTS sb_players_room_id_idx ON public.scribble_battle_players (room_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scribble_battle_players TO authenticated;
GRANT ALL ON public.scribble_battle_players TO service_role;

ALTER TABLE public.scribble_battle_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SB players viewable by authenticated" ON public.scribble_battle_players;
CREATE POLICY "SB players viewable by authenticated"
  ON public.scribble_battle_players FOR SELECT USING (true);

DROP POLICY IF EXISTS "SB players can join rooms" ON public.scribble_battle_players;
CREATE POLICY "SB players can join rooms"
  ON public.scribble_battle_players FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "SB players can update own row" ON public.scribble_battle_players;
CREATE POLICY "SB players can update own row"
  ON public.scribble_battle_players FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "SB players can leave rooms" ON public.scribble_battle_players;
CREATE POLICY "SB players can leave rooms"
  ON public.scribble_battle_players FOR DELETE
  USING (auth.uid() = user_id);

-- ── Round secrets (reuses pattern from paint-and-guess) ─────────
CREATE TABLE IF NOT EXISTS public.scribble_battle_round_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.scribble_battle_rooms(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  word TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, round_number)
);

GRANT ALL ON public.scribble_battle_round_secrets TO service_role;

ALTER TABLE public.scribble_battle_round_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SB round secrets are service_role only" ON public.scribble_battle_round_secrets;
CREATE POLICY "SB round secrets are service_role only"
  ON public.scribble_battle_round_secrets FOR SELECT USING (false);

-- ── Round history ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scribble_battle_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.scribble_battle_rooms(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('regular', 'final')),
  team1_drawer_id UUID NOT NULL,
  team2_drawer_id UUID NOT NULL,
  word TEXT NOT NULL,
  winning_team INTEGER CHECK (winning_team IN (1, 2)),
  correct_guesser_id UUID,
  duration_ms INTEGER NOT NULL,
  finished_by TEXT NOT NULL DEFAULT 'timeout'
    CHECK (finished_by IN ('timeout', 'correct_guess')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.scribble_battle_rounds TO authenticated;
GRANT ALL ON public.scribble_battle_rounds TO service_role;

ALTER TABLE public.scribble_battle_rounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SB round results viewable by authenticated" ON public.scribble_battle_rounds;
CREATE POLICY "SB round results viewable by authenticated"
  ON public.scribble_battle_rounds FOR SELECT USING (true);

-- ── Canvas checkpoints (two per round — one per team) ───────────
CREATE TABLE IF NOT EXISTS public.scribble_battle_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.scribble_battle_rooms(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  team INTEGER NOT NULL CHECK (team IN (1, 2)),
  fabric_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, round_number, team)
);

GRANT SELECT, INSERT, UPDATE ON public.scribble_battle_checkpoints TO authenticated;
GRANT ALL ON public.scribble_battle_checkpoints TO service_role;

ALTER TABLE public.scribble_battle_checkpoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SB room participants can view checkpoints" ON public.scribble_battle_checkpoints;
CREATE POLICY "SB room participants can view checkpoints"
  ON public.scribble_battle_checkpoints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.scribble_battle_players
      WHERE room_id = scribble_battle_checkpoints.room_id
      AND user_id = auth.uid()
    )
  );

-- ── Triggers ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_sb_rooms_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_activity_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sb_rooms_touch_updated_at ON public.scribble_battle_rooms;
CREATE TRIGGER sb_rooms_touch_updated_at
  BEFORE UPDATE ON public.scribble_battle_rooms
  FOR EACH ROW EXECUTE FUNCTION public.tg_sb_rooms_updated_at();

-- ══════════════════════════════════════════════════════════════════
-- RPC Functions (all use CREATE OR REPLACE, safe to re-run)
-- ══════════════════════════════════════════════════════════════════

-- ── Create room ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_scribble_battle_room(
  room_name TEXT,
  word_pack TEXT DEFAULT 'classic',
  round_time INT DEFAULT 60,
  max_regular_rounds INT DEFAULT 5
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_room_id UUID;
  new_pin TEXT;
  player_name TEXT;
  avatar_json JSONB;
BEGIN
  SELECT p.username INTO player_name
  FROM public.profiles p WHERE p.id = auth.uid();

  IF player_name IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  SELECT COALESCE(p.avatar_config, '{}'::jsonb) INTO avatar_json
  FROM public.profiles p WHERE p.id = auth.uid();

  new_pin := public.generate_game_pin();

  INSERT INTO public.scribble_battle_rooms (
    game_pin, name, word_pack, round_time, max_regular_rounds
  ) VALUES (
    new_pin, room_name, word_pack, round_time, max_regular_rounds
  )
  RETURNING id INTO new_room_id;

  UPDATE public.scribble_battle_rooms SET owner_id = auth.uid()
  WHERE id = new_room_id;

  -- Creator defaults to Team 1
  INSERT INTO public.scribble_battle_players (
    room_id, user_id, name, avatar, score, team
  ) VALUES (
    new_room_id, auth.uid(), player_name, avatar_json, 0, 1
  );

  RETURN jsonb_build_object(
    'roomId', new_room_id,
    'gamePin', new_pin,
    'success', true
  );
END;
$$;

-- ── Join room ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.join_scribble_battle_room(
  p_game_pin TEXT,
  p_team INT DEFAULT 1
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_room public.scribble_battle_rooms%ROWTYPE;
  player_name TEXT;
  avatar_json JSONB;
BEGIN
  SELECT * INTO target_room FROM public.scribble_battle_rooms
  WHERE game_pin = join_scribble_battle_room.p_game_pin;

  IF target_room IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid game PIN');
  END IF;

  IF target_room.is_game_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game already started');
  END IF;

  SELECT p.username INTO player_name
  FROM public.profiles p WHERE p.id = auth.uid();

  SELECT COALESCE(p.avatar_config, '{}'::jsonb) INTO avatar_json
  FROM public.profiles p WHERE p.id = auth.uid();

  -- Upsert player (allows rejoin)
  INSERT INTO public.scribble_battle_players (room_id, user_id, name, avatar, team)
  VALUES (target_room.id, auth.uid(), player_name, avatar_json, p_team)
  ON CONFLICT (room_id, name) DO UPDATE
  SET user_id = auth.uid(), is_connected = true, has_guessed = false;

  UPDATE public.scribble_battle_rooms SET last_activity_at = now()
  WHERE id = target_room.id;

  RETURN jsonb_build_object(
    'success', true,
    'roomId', target_room.id,
    'playerId', (SELECT id FROM public.scribble_battle_players
                 WHERE room_id = target_room.id AND user_id = auth.uid())
  );
END;
$$;

-- ── Leave room ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.leave_scribble_battle_room(p_room_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  was_owner BOOLEAN;
  next_owner_id UUID;
BEGIN
  SELECT (owner_id = auth.uid()) INTO was_owner
  FROM public.scribble_battle_rooms WHERE id = p_room_id;

  DELETE FROM public.scribble_battle_players
  WHERE room_id = p_room_id AND user_id = auth.uid();

  IF was_owner THEN
    SELECT user_id INTO next_owner_id
    FROM public.scribble_battle_players
    WHERE room_id = p_room_id AND is_connected = true
    ORDER BY created_at ASC LIMIT 1;

    UPDATE public.scribble_battle_rooms
    SET owner_id = COALESCE(next_owner_id, owner_id)
    WHERE id = p_room_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.scribble_battle_players WHERE room_id = p_room_id
  ) THEN
    UPDATE public.scribble_battle_rooms SET is_game_active = false
    WHERE id = p_room_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── Set ready ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_sb_player_ready(
  room_id UUID,
  is_ready BOOLEAN
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.scribble_battle_players p
  SET is_ready = set_sb_player_ready.is_ready
  WHERE p.room_id = set_sb_player_ready.room_id AND p.user_id = auth.uid();

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── Switch team (lobby only) ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.switch_sb_team(
  room_id UUID,
  new_team INT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  room_row public.scribble_battle_rooms%ROWTYPE;
BEGIN
  SELECT * INTO room_row FROM public.scribble_battle_rooms r
  WHERE r.id = switch_sb_team.room_id;

  IF room_row.is_game_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot switch teams during game');
  END IF;

  UPDATE public.scribble_battle_players p
  SET team = new_team
  WHERE p.room_id = switch_sb_team.room_id AND p.user_id = auth.uid();

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── Start game ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.start_scribble_battle(p_room_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  room_row public.scribble_battle_rooms%ROWTYPE;
  t1_drawer public.scribble_battle_players%ROWTYPE;
  t2_drawer public.scribble_battle_players%ROWTYPE;
  new_word TEXT;
  team1_count INT;
  team2_count INT;
BEGIN
  SELECT * INTO room_row FROM public.scribble_battle_rooms
  WHERE id = p_room_id FOR UPDATE;

  IF room_row IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room not found');
  END IF;

  IF room_row.owner_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the host can start');
  END IF;

  IF room_row.is_game_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game already started');
  END IF;

  SELECT COUNT(*) INTO team1_count FROM public.scribble_battle_players
  WHERE room_id = p_room_id AND team = 1;
  SELECT COUNT(*) INTO team2_count FROM public.scribble_battle_players
  WHERE room_id = p_room_id AND team = 2;

  IF team1_count < 2 OR team2_count < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Each team needs at least 2 players');
  END IF;

  new_word := public.get_random_word(COALESCE(room_row.word_pack, 'classic'));

  -- Pick random drawer from each team
  SELECT * INTO t1_drawer FROM public.scribble_battle_players
  WHERE room_id = p_room_id AND team = 1 ORDER BY random() LIMIT 1;

  SELECT * INTO t2_drawer FROM public.scribble_battle_players
  WHERE room_id = p_room_id AND team = 2 ORDER BY random() LIMIT 1;

  -- Reset guess state, win streaks, and ready state (handles rematch)
  UPDATE public.scribble_battle_players SET has_guessed = false, win_streak = 0, is_ready = false
  WHERE room_id = p_room_id;

  -- Store secret
  INSERT INTO public.scribble_battle_round_secrets (room_id, round_number, word)
  VALUES (p_room_id, 1, new_word);

  UPDATE public.scribble_battle_rooms
  SET is_game_active = true,
      phase = 'regular',
      round_number = 1,
      team1_drawer_id = t1_drawer.id,
      team2_drawer_id = t2_drawer.id,
      round_deadline_at = now() + (room_row.round_time * interval '1 second'),
      word_history = ARRAY[new_word],
      last_activity_at = now()
  WHERE id = p_room_id;

  RETURN jsonb_build_object(
    'success', true,
    'roundNumber', 1,
    'roundTime', room_row.round_time,
    'team1Drawer', jsonb_build_object('id', t1_drawer.id, 'name', t1_drawer.name),
    'team2Drawer', jsonb_build_object('id', t2_drawer.id, 'name', t2_drawer.name),
    'word', new_word,
    'deadlineAt', (now() + (room_row.round_time * interval '1 second'))
  );
END;
$$;

-- ── Submit guess ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_sb_guess(
  p_room_id UUID,
  p_guess TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  room_row public.scribble_battle_rooms%ROWTYPE;
  player_row public.scribble_battle_players%ROWTYPE;
  secret_word TEXT;
  is_correct BOOLEAN := false;
  points INT := 0;
  time_left_seconds INT;
  player_team INT;
  is_team_drawer BOOLEAN;
BEGIN
  SELECT * INTO room_row FROM public.scribble_battle_rooms
  WHERE id = p_room_id;

  IF room_row IS NULL OR NOT room_row.is_game_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game not active');
  END IF;

  SELECT * INTO player_row FROM public.scribble_battle_players
  WHERE room_id = p_room_id AND user_id = auth.uid();

  IF player_row IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not in this room');
  END IF;

  player_team := player_row.team;

  -- Check if player is their team's drawer
  is_team_drawer := (player_team = 1 AND player_row.id = room_row.team1_drawer_id)
                 OR (player_team = 2 AND player_row.id = room_row.team2_drawer_id);

  IF is_team_drawer THEN
    RETURN jsonb_build_object('success', false, 'error', 'Drawer cannot guess for their own team');
  END IF;

  -- In regular phase, check if round already won
  IF room_row.phase = 'regular' AND player_row.has_guessed THEN
    RETURN jsonb_build_object('success', true, 'correct', false, 'already_guessed', true);
  END IF;

  -- Compare with secret word
  SELECT sb_secret.word INTO secret_word
  FROM public.scribble_battle_round_secrets sb_secret
  WHERE sb_secret.room_id = p_room_id
    AND sb_secret.round_number = room_row.round_number;

  IF lower(trim(p_guess)) = lower(trim(secret_word)) THEN
    is_correct := true;

    time_left_seconds := GREATEST(0, EXTRACT(EPOCH FROM (room_row.round_deadline_at - now()))::INT);
    points := GREATEST(1, FLOOR(time_left_seconds / 10) + 10);

    -- Award guesser
    UPDATE public.scribble_battle_players
    SET score = score + points, has_guessed = true
    WHERE id = player_row.id;

    -- Award drawer
    IF player_team = 1 THEN
      UPDATE public.scribble_battle_players
      SET score = score + 5
      WHERE id = room_row.team1_drawer_id;
    ELSE
      UPDATE public.scribble_battle_players
      SET score = score + 5
      WHERE id = room_row.team2_drawer_id;
    END IF;

    -- In regular phase, award round point to team
    IF room_row.phase = 'regular' THEN
      IF player_team = 1 THEN
        UPDATE public.scribble_battle_rooms SET team1_score = team1_score + 1
        WHERE id = p_room_id;
      ELSE
        UPDATE public.scribble_battle_rooms SET team2_score = team2_score + 1
        WHERE id = p_room_id;
      END IF;
    END IF;

    -- In final phase, advance that team's progress
    IF room_row.phase = 'final' THEN
      IF player_team = 1 THEN
        UPDATE public.scribble_battle_rooms
        SET team1_final_progress = team1_final_progress + 1
        WHERE id = p_room_id;
      ELSE
        UPDATE public.scribble_battle_rooms
        SET team2_final_progress = team2_final_progress + 1
        WHERE id = p_room_id;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'correct', is_correct,
    'points', points,
    'team', player_team
  );
END;
$$;

-- ── Check if either team has correctly guessed ──────────────────
CREATE OR REPLACE FUNCTION public.sb_round_resolved(p_room_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.scribble_battle_players
    WHERE room_id = p_room_id AND has_guessed = true
  );
END;
$$;

-- ── Advance round ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.advance_sb_round(p_room_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  room_row public.scribble_battle_rooms%ROWTYPE;
  prev_word TEXT;
  winning_team INT := NULL;
  correct_guesser_id UUID := NULL;
  t1_drawer public.scribble_battle_players%ROWTYPE;
  t2_drawer public.scribble_battle_players%ROWTYPE;
  new_word TEXT;
  player_scores JSONB;
  t1_drawer_id UUID;
  t2_drawer_id UUID;
  final_word_count INT;
  t1_final INT;
  t2_final INT;
BEGIN
  SELECT * INTO room_row FROM public.scribble_battle_rooms
  WHERE id = p_room_id FOR UPDATE;

  IF room_row IS NULL OR NOT room_row.is_game_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game not active');
  END IF;

  -- Regular phase: only advance if deadline passed OR round resolved
  IF room_row.phase = 'regular' THEN
    IF room_row.round_deadline_at > now()
       AND NOT public.sb_round_resolved(p_room_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Round still in progress');
    END IF;

    -- Determine winner
    SELECT p.id, p.team INTO correct_guesser_id, winning_team
    FROM public.scribble_battle_players p
    WHERE p.room_id = p_room_id AND p.has_guessed = true
    LIMIT 1;

    -- Get previous word
    SELECT word INTO prev_word
    FROM public.scribble_battle_round_secrets
    WHERE room_id = p_room_id AND round_number = room_row.round_number;

    -- Record round
    INSERT INTO public.scribble_battle_rounds (
      room_id, round_number, phase, team1_drawer_id, team2_drawer_id,
      word, winning_team, correct_guesser_id, duration_ms,
      finished_by
    ) VALUES (
      p_room_id, room_row.round_number, 'regular',
      room_row.team1_drawer_id, room_row.team2_drawer_id,
      COALESCE(prev_word, 'unknown'),
      winning_team, correct_guesser_id,
      GREATEST(0, EXTRACT(EPOCH FROM (room_row.round_deadline_at - now() + (room_row.round_time * interval '1 second')))::INT * 1000),
      CASE WHEN winning_team IS NOT NULL THEN 'correct_guess' ELSE 'timeout' END
    );

    -- Check if regular rounds are done → transition to final
    IF room_row.round_number >= room_row.max_regular_rounds THEN
      UPDATE public.scribble_battle_rooms
      SET phase = 'final',
          round_number = 1,
          team1_drawer_id = NULL,
          team2_drawer_id = NULL,
          team1_final_progress = 0,
          team2_final_progress = 0,
          round_deadline_at = now() + (room_row.round_time * 2 * interval '1 second'),
          last_activity_at = now()
      WHERE id = p_room_id;

      SELECT jsonb_agg(
        jsonb_build_object(
          'id', p.id, 'name', p.name, 'score', p.score, 'team', p.team
        ) ORDER BY p.score DESC
      ) INTO player_scores
      FROM public.scribble_battle_players p WHERE p.room_id = p_room_id;

      RETURN jsonb_build_object(
        'success', true,
        'gameEnded', false,
        'phase', 'final',
        'finalWords', room_row.word_history,
        'team1Score', room_row.team1_score,
        'team2Score', room_row.team2_score,
        'players', player_scores
      );
    END IF;

    -- Still in regular phase — rotate drawers
    IF winning_team = 1 THEN
      t1_drawer_id := room_row.team1_drawer_id;
      UPDATE public.scribble_battle_players SET win_streak = win_streak + 1
      WHERE id = t1_drawer_id;
      UPDATE public.scribble_battle_players SET win_streak = 0
      WHERE id = room_row.team2_drawer_id;
      SELECT id INTO t2_drawer_id FROM public.scribble_battle_players
      WHERE room_id = p_room_id AND team = 2 AND id != room_row.team2_drawer_id
      ORDER BY created_at ASC, random() LIMIT 1;
      IF t2_drawer_id IS NULL THEN t2_drawer_id := room_row.team2_drawer_id; END IF;
    ELSIF winning_team = 2 THEN
      t2_drawer_id := room_row.team2_drawer_id;
      UPDATE public.scribble_battle_players SET win_streak = win_streak + 1
      WHERE id = t2_drawer_id;
      UPDATE public.scribble_battle_players SET win_streak = 0
      WHERE id = room_row.team1_drawer_id;
      SELECT id INTO t1_drawer_id FROM public.scribble_battle_players
      WHERE room_id = p_room_id AND team = 1 AND id != room_row.team1_drawer_id
      ORDER BY created_at ASC, random() LIMIT 1;
      IF t1_drawer_id IS NULL THEN t1_drawer_id := room_row.team1_drawer_id; END IF;
    ELSE
      -- Timeout: rotate both
      UPDATE public.scribble_battle_players SET win_streak = 0
      WHERE id IN (room_row.team1_drawer_id, room_row.team2_drawer_id);
      SELECT id INTO t1_drawer_id FROM public.scribble_battle_players
      WHERE room_id = p_room_id AND team = 1 AND id != room_row.team1_drawer_id
      ORDER BY created_at ASC, random() LIMIT 1;
      IF t1_drawer_id IS NULL THEN t1_drawer_id := room_row.team1_drawer_id; END IF;
      SELECT id INTO t2_drawer_id FROM public.scribble_battle_players
      WHERE room_id = p_room_id AND team = 2 AND id != room_row.team2_drawer_id
      ORDER BY created_at ASC, random() LIMIT 1;
      IF t2_drawer_id IS NULL THEN t2_drawer_id := room_row.team2_drawer_id; END IF;
    END IF;

    SELECT * INTO t1_drawer FROM public.scribble_battle_players WHERE id = t1_drawer_id;
    SELECT * INTO t2_drawer FROM public.scribble_battle_players WHERE id = t2_drawer_id;

    new_word := public.get_random_word(COALESCE(room_row.word_pack, 'classic'));

    INSERT INTO public.scribble_battle_round_secrets (room_id, round_number, word)
    VALUES (p_room_id, room_row.round_number + 1, new_word);

    UPDATE public.scribble_battle_players SET has_guessed = false
    WHERE room_id = p_room_id;

    UPDATE public.scribble_battle_rooms
    SET round_number = round_number + 1,
        team1_drawer_id = t1_drawer_id,
        team2_drawer_id = t2_drawer_id,
        round_deadline_at = now() + (room_row.round_time * interval '1 second'),
        word_history = array_append(word_history, new_word),
        last_activity_at = now()
    WHERE id = p_room_id;

    RETURN jsonb_build_object(
      'success', true,
      'gameEnded', false,
      'phase', 'regular',
      'roundNumber', room_row.round_number + 1,
      'roundTime', room_row.round_time,
      'team1Drawer', jsonb_build_object('id', t1_drawer.id, 'name', t1_drawer.name),
      'team2Drawer', jsonb_build_object('id', t2_drawer.id, 'name', t2_drawer.name),
      'word', new_word,
      'deadlineAt', (now() + (room_row.round_time * interval '1 second')),
      'previousWord', prev_word,
      'winningTeam', winning_team
    );

  ELSE
    -- Final phase: timer expired → end game
    t1_final := room_row.team1_final_progress;
    t2_final := room_row.team2_final_progress;

    IF t1_final > t2_final THEN
      winning_team := 1;
    ELSIF t2_final > t1_final THEN
      winning_team := 2;
    END IF;

    UPDATE public.scribble_battle_rooms
    SET is_game_active = false, phase = 'game-ended', last_activity_at = now()
    WHERE id = p_room_id;

    SELECT jsonb_agg(
      jsonb_build_object(
        'id', p.id, 'name', p.name, 'score', p.score, 'team', p.team
      ) ORDER BY p.score DESC
    ) INTO player_scores
    FROM public.scribble_battle_players p WHERE p.room_id = p_room_id;

    RETURN jsonb_build_object(
      'success', true,
      'gameEnded', true,
      'winningTeam', winning_team,
      'team1Score', room_row.team1_score,
      'team2Score', room_row.team2_score,
      'team1Final', t1_final,
      'team2Final', t2_final,
      'players', player_scores
    );
  END IF;
END;
$$;

-- ── Handle final-round correct guess (team advances independently) ─
CREATE OR REPLACE FUNCTION public.advance_sb_final_word(
  p_room_id UUID,
  p_team INT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  room_row public.scribble_battle_rooms%ROWTYPE;
  total_words INT;
  t1_final INT;
  t2_final INT;
  new_drawer_id UUID;
  new_drawer public.scribble_battle_players%ROWTYPE;
  next_word TEXT;
  current_word_idx INT;
  word_list TEXT[];
  player_scores JSONB;
BEGIN
  SELECT * INTO room_row FROM public.scribble_battle_rooms
  WHERE id = p_room_id FOR UPDATE;

  IF room_row IS NULL OR room_row.phase != 'final' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not in final phase');
  END IF;

  word_list := room_row.word_history;
  total_words := array_length(word_list, 1);

  t1_final := room_row.team1_final_progress;
  t2_final := room_row.team2_final_progress;

  -- Check if this team already completed
  IF (p_team = 1 AND t1_final >= total_words) OR (p_team = 2 AND t2_final >= total_words) THEN
    RETURN jsonb_build_object('success', true, 'alreadyComplete', true);
  END IF;

  -- Advance progress (already updated in submit_sb_guess)
  IF p_team = 1 THEN
    t1_final := t1_final + 1;
    UPDATE public.scribble_battle_rooms SET team1_final_progress = t1_final WHERE id = p_room_id;
  ELSE
    t2_final := t2_final + 1;
    UPDATE public.scribble_battle_rooms SET team2_final_progress = t2_final WHERE id = p_room_id;
  END IF;

  -- Pick new drawer: the correct guesser becomes the drawer
  SELECT id INTO new_drawer_id FROM public.scribble_battle_players
  WHERE room_id = p_room_id AND team = p_team AND has_guessed = true
  ORDER BY created_at DESC LIMIT 1;

  IF new_drawer_id IS NULL THEN
    SELECT id INTO new_drawer_id FROM public.scribble_battle_players
    WHERE room_id = p_room_id AND team = p_team
    ORDER BY created_at ASC, random() LIMIT 1;
  END IF;

  IF p_team = 1 THEN
    UPDATE public.scribble_battle_rooms SET team1_drawer_id = new_drawer_id
    WHERE id = p_room_id;
  ELSE
    UPDATE public.scribble_battle_rooms SET team2_drawer_id = new_drawer_id
    WHERE id = p_room_id;
  END IF;

  -- Reset guess state for this team
  UPDATE public.scribble_battle_players SET has_guessed = false
  WHERE room_id = p_room_id AND team = p_team;

  -- Pick next word
  current_word_idx := CASE WHEN p_team = 1 THEN t1_final ELSE t2_final END;
  IF current_word_idx <= total_words THEN
    next_word := word_list[current_word_idx];
  END IF;

  -- Check if this team completed
  IF (p_team = 1 AND t1_final >= total_words) OR (p_team = 2 AND t2_final >= total_words) THEN
    UPDATE public.scribble_battle_rooms
    SET is_game_active = false, phase = 'game-ended', last_activity_at = now()
    WHERE id = p_room_id;

    SELECT jsonb_agg(
      jsonb_build_object(
        'id', p.id, 'name', p.name, 'score', p.score, 'team', p.team
      ) ORDER BY p.score DESC
    ) INTO player_scores
    FROM public.scribble_battle_players p WHERE p.room_id = p_room_id;

    RETURN jsonb_build_object(
      'success', true,
      'gameEnded', true,
      'winningTeam', p_team,
      'team1Score', room_row.team1_score,
      'team2Score', room_row.team2_score,
      'team1Final', t1_final,
      'team2Final', t2_final,
      'players', player_scores
    );
  END IF;

  SELECT * INTO new_drawer FROM public.scribble_battle_players
  WHERE id = new_drawer_id;

  RETURN jsonb_build_object(
    'success', true,
    'gameEnded', false,
    'team', p_team,
    'newDrawer', jsonb_build_object('id', new_drawer.id, 'name', new_drawer.name),
    'word', next_word,
    'team1Final', t1_final,
    'team2Final', t2_final,
    'totalWords', total_words
  );
END;
$$;

-- ── Get room state ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_sb_room_state(room_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE
  room_row public.scribble_battle_rooms%ROWTYPE;
  players_json JSONB;
BEGIN
  SELECT * INTO room_row FROM public.scribble_battle_rooms WHERE id = room_id;

  IF room_row IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room not found');
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'team', p.team,
      'score', p.score,
      'isReady', p.is_ready,
      'hasGuessed', p.has_guessed,
      'isConnected', p.is_connected,
      'winStreak', p.win_streak,
      'avatar', p.avatar
    )
  ) INTO players_json
  FROM public.scribble_battle_players p WHERE p.room_id = room_id;

  RETURN jsonb_build_object(
    'success', true,
    'room', jsonb_build_object(
      'id', room_row.id,
      'name', room_row.name,
      'gamePin', room_row.game_pin,
      'isGameActive', room_row.is_game_active,
      'phase', room_row.phase,
      'roundNumber', room_row.round_number,
      'roundTime', room_row.round_time,
      'maxRegularRounds', room_row.max_regular_rounds,
      'ownerId', room_row.owner_id,
      'team1DrawerId', room_row.team1_drawer_id,
      'team2DrawerId', room_row.team2_drawer_id,
      'deadlineAt', round(extract(epoch from room_row.round_deadline_at) * 1000),
      'wordPack', room_row.word_pack,
      'team1Score', room_row.team1_score,
      'team2Score', room_row.team2_score,
      'team1FinalProgress', room_row.team1_final_progress,
      'team2FinalProgress', room_row.team2_final_progress,
      'wordHistory', room_row.word_history
    ),
    'players', players_json
  );
END;
$$;

-- ── Grant execute (idempotent) ──────────────────────────────────
GRANT EXECUTE ON FUNCTION public.create_scribble_battle_room(TEXT, TEXT, INT, INT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.join_scribble_battle_room(TEXT, INT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.leave_scribble_battle_room(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.set_sb_player_ready(UUID, BOOLEAN) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.switch_sb_team(UUID, INT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.start_scribble_battle(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.submit_sb_guess(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.advance_sb_round(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.advance_sb_final_word(UUID, INT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_sb_room_state(UUID) TO authenticated, anon;

-- ── Seed game row ───────────────────────────────────────────────
INSERT INTO public.games (slug, title, description, category, accent_color)
VALUES (
  'scribble-battle',
  'Scribble Battle',
  'Team vs team drawing showdown. Two teams, one word — race to guess first!',
  'party',
  '#43A8EA'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  accent_color = EXCLUDED.accent_color;
