-- Paint & Guess game tables and RPCs for Lovable Cloud
-- Idempotent migration: safe to run once in environments where prior objects are absent.

-- ── Game rooms ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.game_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_pin TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  word_pack TEXT DEFAULT 'classic',
  round_time INTEGER NOT NULL DEFAULT 60,
  max_rounds INTEGER NOT NULL DEFAULT 6,
  max_players INTEGER NOT NULL DEFAULT 10,
  owner_id UUID,
  is_game_active BOOLEAN NOT NULL DEFAULT false,
  round_number INTEGER NOT NULL DEFAULT 0,
  current_drawer_id UUID,
  current_word_id UUID,
  round_deadline_at TIMESTAMPTZ,
  word_history TEXT[] DEFAULT '{}',
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.game_rooms TO authenticated;
GRANT ALL ON public.game_rooms TO service_role;

ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Rooms are viewable by authenticated users" ON public.game_rooms;
CREATE POLICY "Rooms are viewable by authenticated users"
  ON public.game_rooms FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.game_rooms;
CREATE POLICY "Authenticated users can create rooms"
  ON public.game_rooms FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Room owner can update room" ON public.game_rooms;
CREATE POLICY "Room owner can update room"
  ON public.game_rooms FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- ── Game room players ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.game_room_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  user_id UUID,
  name TEXT NOT NULL,
  avatar JSONB DEFAULT '{}'::jsonb,
  score INTEGER NOT NULL DEFAULT 0,
  is_ready BOOLEAN NOT NULL DEFAULT false,
  has_guessed BOOLEAN NOT NULL DEFAULT false,
  is_connected BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, name)
);

CREATE INDEX IF NOT EXISTS game_room_players_room_id_idx ON public.game_room_players (room_id);
CREATE INDEX IF NOT EXISTS game_room_players_user_id_idx ON public.game_room_players (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_room_players TO authenticated;
GRANT ALL ON public.game_room_players TO service_role;

ALTER TABLE public.game_room_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Room players are viewable by authenticated users" ON public.game_room_players;
CREATE POLICY "Room players are viewable by authenticated users"
  ON public.game_room_players FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can join rooms" ON public.game_room_players;
CREATE POLICY "Authenticated users can join rooms"
  ON public.game_room_players FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own player" ON public.game_room_players;
CREATE POLICY "Users can update their own player"
  ON public.game_room_players FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can leave rooms" ON public.game_room_players;
CREATE POLICY "Users can leave rooms"
  ON public.game_room_players FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ── Word packs ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.game_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack TEXT NOT NULL,
  word TEXT NOT NULL,
  UNIQUE(pack, word)
);

CREATE INDEX IF NOT EXISTS game_words_pack_idx ON public.game_words (pack);

GRANT ALL ON public.game_words TO service_role;

ALTER TABLE public.game_words ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Words are service_role only" ON public.game_words;
CREATE POLICY "Words are service_role only"
  ON public.game_words FOR SELECT
  TO authenticated
  USING (false);

-- ── Round secrets ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.game_round_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  word TEXT NOT NULL,
  word_id UUID REFERENCES public.game_words(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, round_number)
);

GRANT ALL ON public.game_round_secrets TO service_role;

ALTER TABLE public.game_round_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Round secrets are service_role only" ON public.game_round_secrets;
CREATE POLICY "Round secrets are service_role only"
  ON public.game_round_secrets FOR SELECT
  TO authenticated
  USING (false);

-- ── Game rounds ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.game_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  drawer_id UUID NOT NULL,
  drawer_name TEXT NOT NULL,
  word TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  finished_by TEXT NOT NULL DEFAULT 'timeout'
    CHECK (finished_by IN ('timeout', 'all_guessed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS game_rounds_room_id_idx ON public.game_rounds (room_id);

GRANT SELECT ON public.game_rounds TO authenticated;
GRANT ALL ON public.game_rounds TO service_role;

ALTER TABLE public.game_rounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Round results are viewable by authenticated users" ON public.game_rounds;
CREATE POLICY "Round results are viewable by authenticated users"
  ON public.game_rounds FOR SELECT
  TO authenticated
  USING (true);

-- ── Canvas checkpoints ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.game_canvas_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  fabric_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, round_number)
);

CREATE INDEX IF NOT EXISTS game_canvas_checkpoints_room_idx
  ON public.game_canvas_checkpoints (room_id, round_number);

GRANT SELECT, INSERT, UPDATE ON public.game_canvas_checkpoints TO authenticated;
GRANT ALL ON public.game_canvas_checkpoints TO service_role;

ALTER TABLE public.game_canvas_checkpoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Room participants can view checkpoints" ON public.game_canvas_checkpoints;
CREATE POLICY "Room participants can view checkpoints"
  ON public.game_canvas_checkpoints FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.game_room_players p
      WHERE p.room_id = game_canvas_checkpoints.room_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Drawer can save checkpoint" ON public.game_canvas_checkpoints;
CREATE POLICY "Drawer can save checkpoint"
  ON public.game_canvas_checkpoints FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.game_rooms r
      JOIN public.game_room_players p
        ON p.room_id = r.id
       AND p.id = r.current_drawer_id
      WHERE r.id = game_canvas_checkpoints.room_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Drawer can update checkpoint" ON public.game_canvas_checkpoints;
CREATE POLICY "Drawer can update checkpoint"
  ON public.game_canvas_checkpoints FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.game_rooms r
      JOIN public.game_room_players p
        ON p.room_id = r.id
       AND p.id = r.current_drawer_id
      WHERE r.id = game_canvas_checkpoints.room_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.game_rooms r
      JOIN public.game_room_players p
        ON p.room_id = r.id
       AND p.id = r.current_drawer_id
      WHERE r.id = game_canvas_checkpoints.room_id
        AND p.user_id = auth.uid()
    )
  );

-- ── updated_at trigger for game_rooms ───────────────────────────
CREATE OR REPLACE FUNCTION public.tg_game_rooms_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_activity_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS game_rooms_touch_updated_at ON public.game_rooms;
CREATE TRIGGER game_rooms_touch_updated_at
  BEFORE UPDATE ON public.game_rooms
  FOR EACH ROW EXECUTE FUNCTION public.tg_game_rooms_updated_at();

-- ── Seed classic words ──────────────────────────────────────────
INSERT INTO public.game_words (pack, word) VALUES
  ('classic', 'apple'),
  ('classic', 'banana'),
  ('classic', 'castle'),
  ('classic', 'dragon'),
  ('classic', 'elephant'),
  ('classic', 'flamingo'),
  ('classic', 'guitar'),
  ('classic', 'helicopter'),
  ('classic', 'island'),
  ('classic', 'jungle'),
  ('classic', 'kangaroo'),
  ('classic', 'lighthouse'),
  ('classic', 'mountain'),
  ('classic', 'ninja'),
  ('classic', 'octopus'),
  ('classic', 'penguin'),
  ('classic', 'rainbow'),
  ('classic', 'spaceship'),
  ('classic', 'tornado'),
  ('classic', 'volcano'),
  ('classic', 'waterfall'),
  ('classic', 'zombie'),
  ('classic', 'bicycle'),
  ('classic', 'cactus'),
  ('classic', 'dolphin'),
  ('classic', 'fireworks'),
  ('classic', 'giraffe'),
  ('classic', 'hammock'),
  ('classic', 'igloo'),
  ('classic', 'jellyfish'),
  ('classic', 'koala'),
  ('classic', 'lemonade'),
  ('classic', 'mermaid'),
  ('classic', 'nest'),
  ('classic', 'pirate'),
  ('classic', 'robot'),
  ('classic', 'sunflower'),
  ('classic', 'treasure'),
  ('classic', 'unicorn'),
  ('classic', 'vampire'),
  ('classic', 'wizard'),
  ('classic', 'yo-yo'),
  ('classic', 'airplane'),
  ('classic', 'butterfly'),
  ('classic', 'clown'),
  ('classic', 'desert'),
  ('classic', 'eagle'),
  ('classic', 'forest'),
  ('classic', 'galaxy'),
  ('classic', 'hospital')
ON CONFLICT (pack, word) DO NOTHING;

-- ── Generate a 6-character game PIN ─────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_game_pin()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  generated_pin TEXT;
BEGIN
  LOOP
    generated_pin := upper(substring(md5(gen_random_uuid()::text) from 1 for 6));
    IF NOT EXISTS (SELECT 1 FROM public.game_rooms r WHERE r.game_pin = generated_pin) THEN
      RETURN generated_pin;
    END IF;
  END LOOP;
END;
$$;

-- ── Create a game room ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_paint_room(
  room_name TEXT,
  word_pack TEXT DEFAULT 'classic',
  round_time INT DEFAULT 60,
  max_rounds INT DEFAULT 6,
  max_players INT DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_room_id UUID;
  new_pin TEXT;
  player_name TEXT;
  avatar_json JSONB;
BEGIN
  SELECT p.username, COALESCE(p.avatar_config, '{}'::jsonb)
  INTO player_name, avatar_json
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF player_name IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  new_pin := public.generate_game_pin();

  INSERT INTO public.game_rooms (
    game_pin, name, word_pack, round_time, max_rounds, max_players, owner_id
  ) VALUES (
    new_pin, room_name, COALESCE(word_pack, 'classic'), COALESCE(round_time, 60), COALESCE(max_rounds, 6), COALESCE(max_players, 10), auth.uid()
  )
  RETURNING id INTO new_room_id;

  INSERT INTO public.game_room_players (
    room_id, user_id, name, avatar, score
  ) VALUES (
    new_room_id, auth.uid(), player_name, avatar_json, 0
  )
  ON CONFLICT (room_id, name) DO UPDATE
  SET user_id = auth.uid(), avatar = EXCLUDED.avatar, is_connected = true;

  RETURN jsonb_build_object(
    'roomId', new_room_id,
    'gamePin', new_pin,
    'success', true
  );
END;
$$;

-- ── Join a game room by PIN ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.join_paint_room(game_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_room public.game_rooms%ROWTYPE;
  player_name TEXT;
  avatar_json JSONB;
  player_count INT;
  joined_player_id UUID;
BEGIN
  SELECT * INTO target_room
  FROM public.game_rooms r
  WHERE r.game_pin = upper(trim(join_paint_room.game_pin));

  IF target_room.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid game PIN');
  END IF;

  SELECT COUNT(*) INTO player_count
  FROM public.game_room_players p
  WHERE p.room_id = target_room.id
    AND p.is_connected = true;

  SELECT p.username, COALESCE(p.avatar_config, '{}'::jsonb)
  INTO player_name, avatar_json
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF player_name IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF player_count >= target_room.max_players
     AND NOT EXISTS (
       SELECT 1 FROM public.game_room_players existing
       WHERE existing.room_id = target_room.id
         AND existing.user_id = auth.uid()
     ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room is full');
  END IF;

  INSERT INTO public.game_room_players (room_id, user_id, name, avatar)
  VALUES (target_room.id, auth.uid(), player_name, avatar_json)
  ON CONFLICT (room_id, name) DO UPDATE
  SET user_id = auth.uid(), avatar = EXCLUDED.avatar, is_connected = true, has_guessed = false
  RETURNING id INTO joined_player_id;

  UPDATE public.game_rooms r
  SET last_activity_at = now()
  WHERE r.id = target_room.id;

  RETURN jsonb_build_object(
    'success', true,
    'roomId', target_room.id,
    'playerId', joined_player_id
  );
END;
$$;

-- ── Leave a game room ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.leave_paint_room(room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_room_id UUID := leave_paint_room.room_id;
  was_owner BOOLEAN := false;
  next_owner_id UUID;
BEGIN
  SELECT (r.owner_id = auth.uid()) INTO was_owner
  FROM public.game_rooms r
  WHERE r.id = target_room_id;

  DELETE FROM public.game_room_players p
  WHERE p.room_id = target_room_id
    AND p.user_id = auth.uid();

  IF was_owner THEN
    SELECT p.user_id INTO next_owner_id
    FROM public.game_room_players p
    WHERE p.room_id = target_room_id
      AND p.is_connected = true
      AND p.user_id IS NOT NULL
    ORDER BY p.created_at ASC
    LIMIT 1;

    UPDATE public.game_rooms r
    SET owner_id = COALESCE(next_owner_id, r.owner_id)
    WHERE r.id = target_room_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.game_room_players p WHERE p.room_id = target_room_id
  ) THEN
    UPDATE public.game_rooms r
    SET is_game_active = false
    WHERE r.id = target_room_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── Set player ready state ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_player_ready(
  room_id UUID,
  is_ready BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.game_room_players p
  SET is_ready = set_player_ready.is_ready
  WHERE p.room_id = set_player_ready.room_id
    AND p.user_id = auth.uid();

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── Get a random word from a pack ───────────────────────────────
CREATE OR REPLACE FUNCTION public.get_random_word(pack TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_word TEXT;
BEGIN
  SELECT w.word INTO result_word
  FROM public.game_words w
  WHERE w.pack = COALESCE(get_random_word.pack, 'classic')
  ORDER BY random()
  LIMIT 1;

  RETURN result_word;
END;
$$;

-- ── Start the game ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.start_paint_game(room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  room_row public.game_rooms%ROWTYPE;
  drawer_player public.game_room_players%ROWTYPE;
  new_word TEXT;
  player_count INT;
  target_room_id UUID := start_paint_game.room_id;
BEGIN
  SELECT * INTO room_row
  FROM public.game_rooms r
  WHERE r.id = target_room_id
  FOR UPDATE;

  IF room_row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room not found');
  END IF;

  IF room_row.owner_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the host can start the game');
  END IF;

  IF room_row.is_game_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game already started');
  END IF;

  SELECT COUNT(*) INTO player_count
  FROM public.game_room_players p
  WHERE p.room_id = room_row.id
    AND p.is_connected = true;

  IF player_count < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Need at least 2 players');
  END IF;

  new_word := public.get_random_word(COALESCE(room_row.word_pack, 'classic'));

  IF new_word IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No words found for this pack');
  END IF;

  SELECT * INTO drawer_player
  FROM public.game_room_players p
  WHERE p.room_id = room_row.id
    AND p.is_connected = true
  ORDER BY random()
  LIMIT 1;

  INSERT INTO public.game_round_secrets (room_id, round_number, word)
  VALUES (target_room_id, 1, new_word)
  ON CONFLICT (room_id, round_number) DO UPDATE
  SET word = EXCLUDED.word;

  UPDATE public.game_room_players p
  SET has_guessed = false, is_ready = false
  WHERE p.room_id = target_room_id;

  UPDATE public.game_rooms r
  SET is_game_active = true,
      round_number = 1,
      current_drawer_id = drawer_player.id,
      round_deadline_at = now() + (room_row.round_time * interval '1 second'),
      word_history = ARRAY[new_word],
      last_activity_at = now()
  WHERE r.id = target_room_id;

  RETURN jsonb_build_object(
    'success', true,
    'roundNumber', 1,
    'roundTime', room_row.round_time,
    'drawer', jsonb_build_object('id', drawer_player.id, 'name', drawer_player.name),
    'word', new_word,
    'deadlineAt', round(extract(epoch from (now() + (room_row.round_time * interval '1 second'))) * 1000)
  );
END;
$$;

-- ── Submit a guess ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_paint_guess(
  room_id UUID,
  guess TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  room_row public.game_rooms%ROWTYPE;
  player_row public.game_room_players%ROWTYPE;
  secret_word TEXT;
  is_correct BOOLEAN := false;
  points INT := 0;
  time_left_seconds INT;
  player_score INT;
  target_room_id UUID := submit_paint_guess.room_id;
BEGIN
  SELECT * INTO room_row
  FROM public.game_rooms r
  WHERE r.id = target_room_id;

  IF room_row.id IS NULL OR NOT room_row.is_game_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game not active');
  END IF;

  SELECT * INTO player_row
  FROM public.game_room_players p
  WHERE p.room_id = target_room_id
    AND p.user_id = auth.uid();

  IF player_row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not in this room');
  END IF;

  IF player_row.id = room_row.current_drawer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Drawer cannot guess');
  END IF;

  IF player_row.has_guessed THEN
    RETURN jsonb_build_object('success', true, 'correct', false, 'already_guessed', true);
  END IF;

  SELECT s.word INTO secret_word
  FROM public.game_round_secrets s
  WHERE s.room_id = target_room_id
    AND s.round_number = room_row.round_number;

  IF lower(trim(COALESCE(guess, ''))) = lower(trim(COALESCE(secret_word, ''))) THEN
    is_correct := true;
    time_left_seconds := GREATEST(0, EXTRACT(EPOCH FROM (room_row.round_deadline_at - now()))::INT);
    points := GREATEST(1, FLOOR(time_left_seconds / 10) + 10);

    UPDATE public.game_room_players p
    SET score = p.score + points, has_guessed = true
    WHERE p.id = player_row.id
    RETURNING p.score INTO player_score;

    UPDATE public.game_room_players p
    SET score = p.score + 5
    WHERE p.id = room_row.current_drawer_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'correct', is_correct,
    'points', points,
    'newScore', COALESCE(player_score, player_row.score)
  );
END;
$$;

-- ── Check if all guessers finished ──────────────────────────────
CREATE OR REPLACE FUNCTION public.all_guessers_finished(room_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_room_id UUID := all_guessers_finished.room_id;
BEGIN
  RETURN NOT EXISTS (
    SELECT 1
    FROM public.game_room_players p
    WHERE p.room_id = target_room_id
      AND p.has_guessed = false
      AND p.is_connected = true
      AND p.id != (
        SELECT r.current_drawer_id
        FROM public.game_rooms r
        WHERE r.id = target_room_id
      )
  );
END;
$$;

-- ── Advance to next round ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.advance_paint_round(room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  room_row public.game_rooms%ROWTYPE;
  prev_word TEXT;
  drawer_player public.game_room_players%ROWTYPE;
  next_drawer_id UUID;
  new_word TEXT;
  player_score_json JSONB;
  target_room_id UUID := advance_paint_round.room_id;
BEGIN
  SELECT * INTO room_row
  FROM public.game_rooms r
  WHERE r.id = target_room_id
  FOR UPDATE;

  IF room_row.id IS NULL OR NOT room_row.is_game_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game not active');
  END IF;

  IF room_row.round_deadline_at > now()
     AND NOT public.all_guessers_finished(target_room_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Round still in progress');
  END IF;

  SELECT s.word INTO prev_word
  FROM public.game_round_secrets s
  WHERE s.room_id = target_room_id
    AND s.round_number = room_row.round_number;

  INSERT INTO public.game_rounds (
    room_id, round_number, drawer_id, drawer_name, word, duration_ms, finished_by
  ) VALUES (
    target_room_id,
    room_row.round_number,
    room_row.current_drawer_id,
    COALESCE((SELECT p.name FROM public.game_room_players p WHERE p.id = room_row.current_drawer_id), 'Unknown'),
    COALESCE(prev_word, 'unknown'),
    room_row.round_time * 1000,
    CASE WHEN public.all_guessers_finished(target_room_id) THEN 'all_guessed' ELSE 'timeout' END
  );

  IF room_row.round_number >= room_row.max_rounds THEN
    UPDATE public.game_rooms r
    SET is_game_active = false, last_activity_at = now()
    WHERE r.id = target_room_id;

    SELECT COALESCE(jsonb_agg(
      jsonb_build_object('id', p.id, 'name', p.name, 'score', p.score)
      ORDER BY p.score DESC
    ), '[]'::jsonb) INTO player_score_json
    FROM public.game_room_players p
    WHERE p.room_id = target_room_id;

    RETURN jsonb_build_object(
      'success', true,
      'gameEnded', true,
      'scores', player_score_json,
      'previousWord', prev_word
    );
  END IF;

  new_word := public.get_random_word(COALESCE(room_row.word_pack, 'classic'));

  SELECT p.id INTO next_drawer_id
  FROM public.game_room_players p
  WHERE p.room_id = target_room_id
    AND p.is_connected = true
    AND p.id != room_row.current_drawer_id
  ORDER BY p.created_at ASC, random()
  LIMIT 1;

  IF next_drawer_id IS NULL THEN
    next_drawer_id := room_row.current_drawer_id;
  END IF;

  SELECT * INTO drawer_player
  FROM public.game_room_players p
  WHERE p.id = next_drawer_id;

  INSERT INTO public.game_round_secrets (room_id, round_number, word)
  VALUES (target_room_id, room_row.round_number + 1, new_word)
  ON CONFLICT (room_id, round_number) DO UPDATE
  SET word = EXCLUDED.word;

  UPDATE public.game_room_players p
  SET has_guessed = false
  WHERE p.room_id = target_room_id;

  UPDATE public.game_rooms r
  SET round_number = r.round_number + 1,
      current_drawer_id = next_drawer_id,
      round_deadline_at = now() + (room_row.round_time * interval '1 second'),
      word_history = array_append(r.word_history, new_word),
      last_activity_at = now()
  WHERE r.id = target_room_id;

  RETURN jsonb_build_object(
    'success', true,
    'gameEnded', false,
    'roundNumber', room_row.round_number + 1,
    'roundTime', room_row.round_time,
    'drawer', jsonb_build_object('id', drawer_player.id, 'name', drawer_player.name),
    'word', new_word,
    'deadlineAt', round(extract(epoch from (now() + (room_row.round_time * interval '1 second'))) * 1000),
    'previousWord', prev_word
  );
END;
$$;

-- ── Get room state ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_paint_room_state(room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  room_row public.game_rooms%ROWTYPE;
  players_json JSONB;
  target_room_id UUID := get_paint_room_state.room_id;
BEGIN
  SELECT * INTO room_row
  FROM public.game_rooms r
  WHERE r.id = target_room_id;

  IF room_row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room not found');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'score', p.score,
      'isReady', p.is_ready,
      'hasGuessed', p.has_guessed,
      'isConnected', p.is_connected,
      'avatar', p.avatar
    ) ORDER BY p.created_at ASC
  ), '[]'::jsonb) INTO players_json
  FROM public.game_room_players p
  WHERE p.room_id = target_room_id;

  RETURN jsonb_build_object(
    'success', true,
    'room', jsonb_build_object(
      'id', room_row.id,
      'name', room_row.name,
      'gamePin', room_row.game_pin,
      'isGameActive', room_row.is_game_active,
      'roundNumber', room_row.round_number,
      'roundTime', room_row.round_time,
      'maxRounds', room_row.max_rounds,
      'ownerId', room_row.owner_id,
      'drawerId', room_row.current_drawer_id,
      'deadlineAt', CASE WHEN room_row.round_deadline_at IS NULL THEN NULL ELSE round(extract(epoch from room_row.round_deadline_at) * 1000) END,
      'wordPack', room_row.word_pack
    ),
    'players', players_json
  );
END;
$$;

-- ── Save canvas checkpoint ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.save_canvas_checkpoint(
  room_id UUID,
  round_number INT,
  fabric_json JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_room_id UUID := save_canvas_checkpoint.room_id;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.game_rooms r
    JOIN public.game_room_players p
      ON p.room_id = r.id
     AND p.id = r.current_drawer_id
    WHERE r.id = target_room_id
      AND p.user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the current drawer can save the canvas');
  END IF;

  INSERT INTO public.game_canvas_checkpoints (room_id, round_number, fabric_json)
  VALUES (target_room_id, save_canvas_checkpoint.round_number, save_canvas_checkpoint.fabric_json)
  ON CONFLICT (room_id, round_number)
  DO UPDATE SET fabric_json = EXCLUDED.fabric_json, created_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── Get canvas checkpoint ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_canvas_checkpoint(
  room_id UUID,
  round_number INT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  checkpoint_json JSONB;
  target_room_id UUID := get_canvas_checkpoint.room_id;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.game_room_players p
    WHERE p.room_id = target_room_id
      AND p.user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('found', false, 'error', 'Not in this room');
  END IF;

  SELECT c.fabric_json INTO checkpoint_json
  FROM public.game_canvas_checkpoints c
  WHERE c.room_id = target_room_id
    AND c.round_number = get_canvas_checkpoint.round_number
  ORDER BY c.created_at DESC
  LIMIT 1;

  IF checkpoint_json IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object('found', true, 'fabricJson', checkpoint_json);
END;
$$;

-- Limit direct function execution to signed-in users where relevant.
GRANT EXECUTE ON FUNCTION public.generate_game_pin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_paint_room(TEXT, TEXT, INT, INT, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.join_paint_room(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.leave_paint_room(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_player_ready(UUID, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_random_word(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.start_paint_game(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_paint_guess(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.all_guessers_finished(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.advance_paint_round(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_paint_room_state(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_canvas_checkpoint(UUID, INT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_canvas_checkpoint(UUID, INT) TO authenticated, service_role;

-- Enable realtime changes for game tables if not already enabled.
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'game_rooms',
    'game_room_players',
    'game_rounds',
    'game_canvas_checkpoints'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = table_name
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
    END IF;
  END LOOP;
END;
$$;