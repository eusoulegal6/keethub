-- Paint & Guess game tables for Lovable Cloud migration (Approach A)
-- Replaces the Express + Socket.io backend with Supabase-native primitives

-- ── Game rooms ──────────────────────────────────────────────────
CREATE TABLE public.game_rooms (
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

GRANT SELECT, INSERT ON public.game_rooms TO authenticated;
GRANT UPDATE ON public.game_rooms TO authenticated;
GRANT ALL ON public.game_rooms TO service_role;

ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can see rooms
CREATE POLICY "Rooms are viewable by authenticated users"
  ON public.game_rooms FOR SELECT
  USING (true);

-- Anyone authenticated can create a room
CREATE POLICY "Authenticated users can create rooms"
  ON public.game_rooms FOR INSERT
  WITH CHECK (true);

-- Only room owner can update room settings
CREATE POLICY "Room owner can update room"
  ON public.game_rooms FOR UPDATE
  USING (auth.uid() = owner_id);

-- ── Game room players ───────────────────────────────────────────
CREATE TABLE public.game_room_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  avatar JSONB DEFAULT '{}'::jsonb,
  score INTEGER NOT NULL DEFAULT 0,
  is_ready BOOLEAN NOT NULL DEFAULT false,
  has_guessed BOOLEAN NOT NULL DEFAULT false,
  is_connected BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, name)
);

CREATE INDEX game_room_players_room_id_idx ON public.game_room_players (room_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_room_players TO authenticated;
GRANT ALL ON public.game_room_players TO service_role;

ALTER TABLE public.game_room_players ENABLE ROW LEVEL SECURITY;

-- Players in a room are visible to all authenticated users
CREATE POLICY "Room players are viewable by authenticated users"
  ON public.game_room_players FOR SELECT
  USING (true);

-- Users can join rooms
CREATE POLICY "Authenticated users can join rooms"
  ON public.game_room_players FOR INSERT
  WITH CHECK (true);

-- Users can update their own player row (ready state, avatar)
CREATE POLICY "Users can update their own player"
  ON public.game_room_players FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can leave (delete own row) or room owner can kick
CREATE POLICY "Users can leave rooms"
  ON public.game_room_players FOR DELETE
  USING (auth.uid() = user_id);

-- ── Word packs ──────────────────────────────────────────────────
CREATE TABLE public.game_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack TEXT NOT NULL,
  word TEXT NOT NULL,
  UNIQUE(pack, word)
);

CREATE INDEX game_words_pack_idx ON public.game_words (pack);

GRANT ALL ON public.game_words TO service_role;
-- No grants for anon/authenticated — words are server-only

ALTER TABLE public.game_words ENABLE ROW LEVEL SECURITY;

-- Only service_role can read words
CREATE POLICY "Words are service_role only"
  ON public.game_words FOR SELECT
  USING (false);

-- ── Round secrets (server-only) ─────────────────────────────────
CREATE TABLE public.game_round_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  word TEXT NOT NULL,
  word_id UUID REFERENCES public.game_words(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, round_number)
);

GRANT ALL ON public.game_round_secrets TO service_role;
-- No grants for authenticated — secrets are server-only

ALTER TABLE public.game_round_secrets ENABLE ROW LEVEL SECURITY;

-- No client can read secrets — only Edge Functions with service_role
CREATE POLICY "Round secrets are service_role only"
  ON public.game_round_secrets FOR SELECT
  USING (false);

-- ── Game rounds (results history) ───────────────────────────────
CREATE TABLE public.game_rounds (
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

GRANT SELECT ON public.game_rounds TO authenticated;
GRANT ALL ON public.game_rounds TO service_role;

ALTER TABLE public.game_rounds ENABLE ROW LEVEL SECURITY;

-- Round results visible to all authenticated users
CREATE POLICY "Round results are viewable by authenticated users"
  ON public.game_rounds FOR SELECT
  USING (true);

-- ── Canvas checkpoints (for reconnection) ───────────────────────
CREATE TABLE public.game_canvas_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  fabric_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, round_number)
);

CREATE INDEX game_canvas_checkpoints_room_idx
  ON public.game_canvas_checkpoints (room_id, round_number);

GRANT SELECT, INSERT, UPDATE ON public.game_canvas_checkpoints TO authenticated;
GRANT ALL ON public.game_canvas_checkpoints TO service_role;

ALTER TABLE public.game_canvas_checkpoints ENABLE ROW LEVEL SECURITY;

-- Room participants can view checkpoints
CREATE POLICY "Room participants can view checkpoints"
  ON public.game_canvas_checkpoints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.game_room_players
      WHERE room_id = game_canvas_checkpoints.room_id
      AND user_id = auth.uid()
    )
  );

-- Current drawer can save checkpoints
CREATE POLICY "Drawer can save checkpoint"
  ON public.game_canvas_checkpoints FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.game_rooms
      WHERE id = game_canvas_checkpoints.room_id
      AND current_drawer_id = (
        SELECT id FROM public.game_room_players
        WHERE room_id = game_canvas_checkpoints.room_id
        AND user_id = auth.uid()
      )
    )
  );

-- ── updated_at trigger for game_rooms ───────────────────────────
CREATE OR REPLACE FUNCTION public.tg_game_rooms_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_activity_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER game_rooms_touch_updated_at
  BEFORE UPDATE ON public.game_rooms
  FOR EACH ROW EXECUTE FUNCTION public.tg_game_rooms_updated_at();

-- ── Seed some words ─────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────────
-- PostgreSQL RPC functions — game authority
-- These replace the Express + Socket.io server logic.
-- SECURITY DEFINER functions run with the privileges of the owner
-- (typically postgres), allowing access to server-only tables like
-- game_words and game_round_secrets that have RLS denying clients.
-- ────────────────────────────────────────────────────────────────

-- ── Generate a 6-char game PIN ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_game_pin()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  pin TEXT;
BEGIN
  LOOP
    pin := upper(substring(md5(gen_random_uuid()::text) from 1 for 6));
    IF NOT EXISTS (SELECT 1 FROM public.game_rooms WHERE game_pin = pin) THEN
      RETURN pin;
    END IF;
  END LOOP;
END;
$$;

-- ── Create a game room ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_paint_room(
  room_name TEXT,
  word_pack TEXT DEFAULT 'classic',
  round_time INT DEFAULT 60,
  max_rounds INT DEFAULT 6,
  max_players INT DEFAULT 10
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_room_id UUID;
  new_pin TEXT;
  player_name TEXT;
  avatar_json JSONB;
BEGIN
  -- Get player name from profiles
  SELECT p.username INTO player_name
  FROM public.profiles p WHERE p.id = auth.uid();

  IF player_name IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  SELECT COALESCE(p.avatar_config, '{}'::jsonb) INTO avatar_json
  FROM public.profiles p WHERE p.id = auth.uid();

  new_pin := public.generate_game_pin();

  INSERT INTO public.game_rooms (
    game_pin, name, word_pack, round_time, max_rounds, max_players
  ) VALUES (
    new_pin, room_name, word_pack, round_time, max_rounds, max_players
  )
  RETURNING id INTO new_room_id;

  -- Set creator as owner
  UPDATE public.game_rooms SET owner_id = auth.uid()
  WHERE id = new_room_id;

  -- Add creator as first player with score 0
  INSERT INTO public.game_room_players (
    room_id, user_id, name, avatar, score
  ) VALUES (
    new_room_id, auth.uid(), player_name, avatar_json, 0
  );

  RETURN jsonb_build_object(
    'roomId', new_room_id,
    'gamePin', new_pin,
    'success', true
  );
END;
$$;

-- ── Join a game room by PIN ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.join_paint_room(game_pin TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_room public.game_rooms%ROWTYPE;
  player_name TEXT;
  avatar_json JSONB;
  player_count INT;
BEGIN
  SELECT * INTO target_room FROM public.game_rooms
  WHERE game_pin = join_paint_room.game_pin;

  IF target_room IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid game PIN');
  END IF;

  SELECT COUNT(*) INTO player_count
  FROM public.game_room_players
  WHERE room_id = target_room.id;

  IF player_count >= target_room.max_players THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room is full');
  END IF;

  SELECT p.username INTO player_name
  FROM public.profiles p WHERE p.id = auth.uid();

  SELECT COALESCE(p.avatar_config, '{}'::jsonb) INTO avatar_json
  FROM public.profiles p WHERE p.id = auth.uid();

  -- Upsert player (allows rejoin)
  INSERT INTO public.game_room_players (room_id, user_id, name, avatar)
  VALUES (target_room.id, auth.uid(), player_name, avatar_json)
  ON CONFLICT (room_id, name) DO UPDATE
  SET user_id = auth.uid(), is_connected = true, has_guessed = false;

  UPDATE public.game_rooms SET last_activity_at = now()
  WHERE id = target_room.id;

  RETURN jsonb_build_object(
    'success', true,
    'roomId', target_room.id,
    'playerId', (SELECT id FROM public.game_room_players
                 WHERE room_id = target_room.id AND user_id = auth.uid())
  );
END;
$$;

-- ── Leave a game room ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.leave_paint_room(room_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  was_owner BOOLEAN;
  next_owner_id UUID;
BEGIN
  -- Check if leaving player is the owner
  SELECT (owner_id = auth.uid()) INTO was_owner
  FROM public.game_rooms WHERE id = room_id;

  -- Remove player
  DELETE FROM public.game_room_players
  WHERE room_id = room_id AND user_id = auth.uid();

  -- If was owner, transfer ownership
  IF was_owner THEN
    SELECT user_id INTO next_owner_id
    FROM public.game_room_players
    WHERE room_id = room_id AND is_connected = true
    ORDER BY created_at ASC LIMIT 1;

    UPDATE public.game_rooms
    SET owner_id = COALESCE(next_owner_id, owner_id)
    WHERE id = room_id;
  END IF;

  -- If no players left, mark room
  IF NOT EXISTS (
    SELECT 1 FROM public.game_room_players WHERE room_id = room_id
  ) THEN
    -- Room will be cleaned up by a future cron/sweep
    UPDATE public.game_rooms SET is_game_active = false
    WHERE id = room_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── Set player ready state ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_player_ready(
  room_id UUID,
  is_ready BOOLEAN
)
RETURNS JSONB LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.game_room_players
  SET is_ready = set_player_ready.is_ready
  WHERE room_id = set_player_ready.room_id AND user_id = auth.uid();

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── Get a random word from a pack (server-only table) ─────────────
CREATE OR REPLACE FUNCTION public.get_random_word(pack TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result TEXT;
BEGIN
  SELECT word INTO result
  FROM public.game_words
  WHERE game_words.pack = get_random_word.pack
  ORDER BY random() LIMIT 1;

  RETURN result;
END;
$$;

-- ── Start the game ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.start_paint_game(room_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  room_row public.game_rooms%ROWTYPE;
  drawer_player public.game_room_players%ROWTYPE;
  word_pack TEXT;
  new_word TEXT;
  player_count INT;
BEGIN
  SELECT * INTO room_row FROM public.game_rooms
  WHERE id = room_id FOR UPDATE;

  IF room_row IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room not found');
  END IF;

  IF room_row.owner_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the host can start the game');
  END IF;

  IF room_row.is_game_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game already started');
  END IF;

  SELECT COUNT(*) INTO player_count
  FROM public.game_room_players
  WHERE room_id = room_row.id;

  IF player_count < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Need at least 2 players');
  END IF;

  word_pack := COALESCE(room_row.word_pack, 'classic');
  new_word := public.get_random_word(word_pack);

  -- Pick random drawer
  SELECT * INTO drawer_player
  FROM public.game_room_players
  WHERE room_id = room_row.id
  ORDER BY random() LIMIT 1;

  -- Store secret word
  INSERT INTO public.game_round_secrets (room_id, round_number, word)
  VALUES (room_id, 1, new_word);

  -- Update room state
  UPDATE public.game_rooms
  SET is_game_active = true,
      round_number = 1,
      current_drawer_id = drawer_player.id,
      round_deadline_at = now() + (room_row.round_time * interval '1 second'),
      word_history = ARRAY[new_word],
      last_activity_at = now()
  WHERE id = room_id;

  RETURN jsonb_build_object(
    'success', true,
    'roundNumber', 1,
    'roundTime', room_row.round_time,
    'drawer', jsonb_build_object(
      'id', drawer_player.id,
      'name', drawer_player.name
    ),
    'word', new_word,         -- caller must only show to drawer
    'deadlineAt', (now() + (room_row.round_time * interval '1 second'))
  );
END;
$$;

-- ── Submit a guess ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_paint_guess(
  room_id UUID,
  guess TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  room_row public.game_rooms%ROWTYPE;
  player_row public.game_room_players%ROWTYPE;
  secret_word TEXT;
  player_has_guessed BOOLEAN;
  is_correct BOOLEAN := false;
  points INT := 0;
  time_left_seconds INT;
  player_score INT;
BEGIN
  SELECT * INTO room_row FROM public.game_rooms
  WHERE id = room_id;

  IF room_row IS NULL OR NOT room_row.is_game_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game not active');
  END IF;

  -- Get player check
  SELECT * INTO player_row FROM public.game_room_players
  WHERE room_id = room_id AND user_id = auth.uid();

  IF player_row IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not in this room');
  END IF;

  IF player_row.id = room_row.current_drawer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Drawer cannot guess');
  END IF;

  -- Check if already guessed
  SELECT has_guessed INTO player_has_guessed FROM public.game_room_players
  WHERE id = player_row.id;

  IF player_has_guessed THEN
    RETURN jsonb_build_object('success', true, 'correct', false, 'already_guessed', true);
  END IF;

  -- Compare with secret word (server-only access to game_round_secrets)
  SELECT round_secret.word INTO secret_word
  FROM public.game_round_secrets round_secret
  WHERE round_secret.room_id = room_id
    AND round_secret.round_number = room_row.round_number;

  IF lower(trim(guess)) = lower(trim(secret_word)) THEN
    is_correct := true;

    -- Calculate points based on time remaining
    time_left_seconds := GREATEST(0, EXTRACT(EPOCH FROM (room_row.round_deadline_at - now()))::INT);
    points := GREATEST(1, FLOOR(time_left_seconds / 10) + 10);

    -- Update player score
    UPDATE public.game_room_players
    SET score = score + points, has_guessed = true
    WHERE id = player_row.id
    RETURNING score INTO player_score;

    -- Reward drawer
    UPDATE public.game_room_players
    SET score = score + 5
    WHERE id = room_row.current_drawer_id;
  ELSE
    -- Wrong guess
    UPDATE public.game_room_players SET has_guessed = false
    WHERE id = player_row.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'correct', is_correct,
    'points', points,
    'newScore', COALESCE(player_score, player_row.score)
  );
END;
$$;

-- ── Check if all guessers finished ─────────────────────────────
CREATE OR REPLACE FUNCTION public.all_guessers_finished(room_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.game_room_players
    WHERE room_id = all_guessers_finished.room_id
      AND has_guessed = false
      AND id != (
        SELECT current_drawer_id FROM public.game_rooms
        WHERE id = all_guessers_finished.room_id
      )
  );
END;
$$;

-- ── Advance to next round ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.advance_paint_round(room_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  room_row public.game_rooms%ROWTYPE;
  prev_word TEXT;
  drawer_player public.game_room_players%ROWTYPE;
  next_drawer_id UUID;
  new_word TEXT;
  active_players INT;
  player_score_json JSONB;
BEGIN
  SELECT * INTO room_row FROM public.game_rooms
  WHERE id = room_id FOR UPDATE;

  IF room_row IS NULL OR NOT room_row.is_game_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game not active');
  END IF;

  -- Only advance if deadline passed OR all guessers finished
  IF room_row.round_deadline_at > now()
     AND NOT public.all_guessers_finished(room_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Round still in progress');
  END IF;

  -- Record round result
  SELECT word INTO prev_word
  FROM public.game_round_secrets
  WHERE room_id = room_id AND round_number = room_row.round_number;

  INSERT INTO public.game_rounds (
    room_id, round_number, drawer_id, drawer_name, word,
    duration_ms, finished_by
  ) VALUES (
    room_id,
    room_row.round_number,
    room_row.current_drawer_id,
    (SELECT name FROM public.game_room_players WHERE id = room_row.current_drawer_id),
    COALESCE(prev_word, 'unknown'),
    EXTRACT(EPOCH FROM (room_row.round_deadline_at - (room_row.round_deadline_at - (room_row.round_time * interval '1 second'))))::INT * 1000,
    CASE WHEN public.all_guessers_finished(room_id) THEN 'all_guessed' ELSE 'timeout' END
  );

  -- Check if game should end
  IF room_row.round_number >= room_row.max_rounds THEN
    UPDATE public.game_rooms
    SET is_game_active = false, last_activity_at = now()
    WHERE id = room_id;

    SELECT jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'score', p.score
      ) ORDER BY p.score DESC
    ) INTO player_score_json
    FROM public.game_room_players p
    WHERE p.room_id = room_id;

    RETURN jsonb_build_object(
      'success', true,
      'gameEnded', true,
      'scores', player_score_json
    );
  END IF;

  -- Pick new word and next drawer
  new_word := public.get_random_word(COALESCE(room_row.word_pack, 'classic'));

  SELECT COUNT(*) INTO active_players
  FROM public.game_room_players WHERE room_id = room_id;

  SELECT id INTO next_drawer_id
  FROM public.game_room_players
  WHERE room_id = room_id AND id != room_row.current_drawer_id
  ORDER BY created_at ASC, random()
  LIMIT 1;

  IF next_drawer_id IS NULL THEN
    next_drawer_id := room_row.current_drawer_id;
  END IF;

  SELECT * INTO drawer_player
  FROM public.game_room_players WHERE id = next_drawer_id;

  -- Store new secret
  INSERT INTO public.game_round_secrets (room_id, round_number, word)
  VALUES (room_id, room_row.round_number + 1, new_word);

  -- Reset guess state
  UPDATE public.game_room_players SET has_guessed = false
  WHERE room_id = room_id;

  -- Update room
  UPDATE public.game_rooms
  SET round_number = round_number + 1,
      current_drawer_id = next_drawer_id,
      round_deadline_at = now() + (room_row.round_time * interval '1 second'),
      word_history = array_append(word_history, new_word),
      last_activity_at = now()
  WHERE id = room_id;

  RETURN jsonb_build_object(
    'success', true,
    'gameEnded', false,
    'roundNumber', room_row.round_number + 1,
    'roundTime', room_row.round_time,
    'drawer', jsonb_build_object(
      'id', drawer_player.id,
      'name', drawer_player.name
    ),
    'word', new_word,
    'deadlineAt', (now() + (room_row.round_time * interval '1 second')),
    'previousWord', prev_word
  );
END;
$$;

-- ── Get room state (full snapshot for reconnection) ────────────
CREATE OR REPLACE FUNCTION public.get_paint_room_state(room_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE
  room_row public.game_rooms%ROWTYPE;
  players_json JSONB;
BEGIN
  SELECT * INTO room_row FROM public.game_rooms WHERE id = room_id;

  IF room_row IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room not found');
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'score', p.score,
      'isReady', p.is_ready,
      'hasGuessed', p.has_guessed,
      'isConnected', p.is_connected,
      'avatar', p.avatar
    )
  ) INTO players_json
  FROM public.game_room_players p WHERE p.room_id = room_id;

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
      'deadlineAt', round(extract(epoch from room_row.round_deadline_at) * 1000),
      'wordPack', room_row.word_pack
    ),
    'players', players_json
  );
END;
$$;

-- ── Save canvas checkpoint ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.save_canvas_checkpoint(
  room_id UUID,
  round_number INT,
  fabric_json JSONB
)
RETURNS JSONB LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.game_canvas_checkpoints (room_id, round_number, fabric_json)
  VALUES (room_id, round_number, fabric_json)
  ON CONFLICT (room_id, round_number)
  DO UPDATE SET fabric_json = EXCLUDED.fabric_json, created_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── Get canvas checkpoint ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_canvas_checkpoint(
  room_id UUID,
  round_number INT
)
RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE
  checkpoint_json JSONB;
BEGIN
  SELECT fabric_json INTO checkpoint_json
  FROM public.game_canvas_checkpoints
  WHERE game_canvas_checkpoints.room_id = get_canvas_checkpoint.room_id
    AND game_canvas_checkpoints.round_number = get_canvas_checkpoint.round_number
  ORDER BY created_at DESC LIMIT 1;

  IF checkpoint_json IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object('found', true, 'fabricJson', checkpoint_json);
END;
$$;

