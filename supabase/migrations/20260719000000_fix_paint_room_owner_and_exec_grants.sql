-- Fix: set owner_id in the INSERT itself so it's never NULL.
-- The prior pattern (INSERT without owner_id, then UPDATE owner_id = auth.uid())
-- silently fails when the function owner isn't superuser (RLS UPDATE policy
-- checks auth.uid() = owner_id, but owner_id is NULL at that point).
-- Also add explicit GRANT EXECUTE on all paint-and-guess RPCs.

-- ── create_paint_room: set owner_id atomically ─────────────────
CREATE OR REPLACE FUNCTION public.create_paint_room(
  room_name TEXT,
  word_pack TEXT DEFAULT 'classic',
  round_time INT DEFAULT 60,
  max_rounds INT DEFAULT 6,
  max_players INT DEFAULT 10
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_user_id UUID := auth.uid();
  new_room_id UUID;
  new_pin TEXT;
  player_name TEXT;
  avatar_json JSONB;
BEGIN
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT p.username INTO player_name
  FROM public.profiles p WHERE p.id = current_user_id;

  IF player_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  SELECT COALESCE(p.avatar_config, '{}'::jsonb) INTO avatar_json
  FROM public.profiles p WHERE p.id = current_user_id;

  new_pin := public.generate_game_pin();

  INSERT INTO public.game_rooms (
    game_pin, name, word_pack, round_time, max_rounds, max_players, owner_id
  ) VALUES (
    new_pin, room_name, word_pack, round_time, max_rounds, max_players,
    current_user_id
  )
  RETURNING id INTO new_room_id;

  INSERT INTO public.game_room_players (
    room_id, user_id, name, avatar, score
  ) VALUES (
    new_room_id, current_user_id, player_name, avatar_json, 0
  );

  RETURN jsonb_build_object(
    'roomId', new_room_id,
    'gamePin', new_pin,
    'success', true
  );
END;
$$;

-- ── start_paint_game: guard against null auth ─────────────────
DROP FUNCTION IF EXISTS public.start_paint_game(UUID);
CREATE OR REPLACE FUNCTION public.start_paint_game(p_room_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_user_id UUID := auth.uid();
  room_row public.game_rooms%ROWTYPE;
  drawer_player public.game_room_players%ROWTYPE;
  word_pack TEXT;
  new_word TEXT;
  player_count INT;
BEGIN
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO room_row FROM public.game_rooms
  WHERE id = p_room_id FOR UPDATE;

  IF room_row IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room not found');
  END IF;

  IF room_row.owner_id != current_user_id THEN
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

  SELECT * INTO drawer_player
  FROM public.game_room_players
  WHERE room_id = room_row.id
  ORDER BY random() LIMIT 1;

  INSERT INTO public.game_round_secrets (room_id, round_number, word)
  VALUES (p_room_id, 1, new_word);

  UPDATE public.game_rooms
  SET is_game_active = true,
      round_number = 1,
      current_drawer_id = drawer_player.id,
      round_deadline_at = now() + (room_row.round_time * interval '1 second'),
      word_history = ARRAY[new_word],
      last_activity_at = now()
  WHERE id = p_room_id;

  RETURN jsonb_build_object(
    'success', true,
    'roundNumber', 1,
    'roundTime', room_row.round_time,
    'drawer', jsonb_build_object(
      'id', drawer_player.id,
      'name', drawer_player.name
    ),
    'word', new_word,
    'deadlineAt', (now() + (room_row.round_time * interval '1 second'))
  );
END;
$$;

-- join_paint_room: rename parameter to p_game_pin to avoid ambiguity with
-- the game_rooms.game_pin column. The original used join_paint_room.game_pin
-- but this qualifier is fragile across redeploys.
DROP FUNCTION IF EXISTS public.join_paint_room(TEXT);
CREATE OR REPLACE FUNCTION public.join_paint_room(p_game_pin TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_room public.game_rooms%ROWTYPE;
  player_name TEXT;
  avatar_json JSONB;
  player_count INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO target_room FROM public.game_rooms
  WHERE game_pin = p_game_pin;

  IF target_room.id IS NULL THEN
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

-- ── leave_paint_room: guard against null auth ─────────────────
DROP FUNCTION IF EXISTS public.leave_paint_room(UUID);
CREATE OR REPLACE FUNCTION public.leave_paint_room(p_room_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_user_id UUID := auth.uid();
  was_owner BOOLEAN;
  next_owner_id UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT (owner_id = current_user_id) INTO was_owner
  FROM public.game_rooms WHERE id = p_room_id;

  DELETE FROM public.game_room_players
  WHERE room_id = p_room_id AND user_id = current_user_id;

  IF was_owner THEN
    SELECT user_id INTO next_owner_id
    FROM public.game_room_players
    WHERE room_id = p_room_id AND is_connected = true
    ORDER BY created_at ASC LIMIT 1;

    UPDATE public.game_rooms
    SET owner_id = COALESCE(next_owner_id, owner_id)
    WHERE id = p_room_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.game_room_players WHERE room_id = p_room_id
  ) THEN
    UPDATE public.game_rooms SET is_game_active = false
    WHERE id = p_room_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── advance_paint_round: use local variable for auth.uid() ────
DROP FUNCTION IF EXISTS public.advance_paint_round(UUID);
CREATE OR REPLACE FUNCTION public.advance_paint_round(p_room_id UUID)
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
  WHERE id = p_room_id FOR UPDATE;

  IF room_row IS NULL OR NOT room_row.is_game_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game not active');
  END IF;

  IF room_row.round_deadline_at > now()
     AND NOT public.all_guessers_finished(p_room_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Round still in progress');
  END IF;

  -- Record previous round secret
  SELECT word INTO prev_word
  FROM public.game_round_secrets
  WHERE room_id = p_room_id AND round_number = room_row.round_number;

  INSERT INTO public.game_rounds (
    room_id, round_number, drawer_id, drawer_name, word,
    duration_ms, finished_by
  ) VALUES (
    p_room_id,
    room_row.round_number,
    room_row.current_drawer_id,
    (SELECT name FROM public.game_room_players WHERE id = room_row.current_drawer_id),
    COALESCE(prev_word, 'unknown'),
    EXTRACT(EPOCH FROM (now() - (room_row.round_deadline_at - (room_row.round_time * interval '1 second'))))::INT * 1000,
    CASE WHEN public.all_guessers_finished(p_room_id) THEN 'all_guessed' ELSE 'timeout' END
  );

  -- Check if game should end
  IF room_row.round_number >= room_row.max_rounds THEN
    UPDATE public.game_rooms
    SET is_game_active = false, last_activity_at = now()
    WHERE id = p_room_id;

    SELECT jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'userId', p.user_id,
        'name', p.name,
        'score', p.score
      ) ORDER BY p.score DESC
    ) INTO player_score_json
    FROM public.game_room_players p
    WHERE p.room_id = p_room_id;

    RETURN jsonb_build_object(
      'success', true,
      'gameEnded', true,
      'scores', player_score_json,
      'players', player_score_json,
      'previousWord', prev_word,
      'roundNumber', room_row.round_number
    );
  END IF;

  -- Pick new word and next drawer
  new_word := public.get_random_word(COALESCE(room_row.word_pack, 'classic'));

  SELECT COUNT(*) INTO active_players
  FROM public.game_room_players WHERE room_id = p_room_id;

  SELECT id INTO next_drawer_id
  FROM public.game_room_players
  WHERE room_id = p_room_id AND id != room_row.current_drawer_id
  ORDER BY created_at ASC, random()
  LIMIT 1;

  IF next_drawer_id IS NULL THEN
    next_drawer_id := room_row.current_drawer_id;
  END IF;

  SELECT * INTO drawer_player
  FROM public.game_room_players WHERE id = next_drawer_id;

  INSERT INTO public.game_round_secrets (room_id, round_number, word)
  VALUES (p_room_id, room_row.round_number + 1, new_word);

  UPDATE public.game_room_players SET has_guessed = false
  WHERE room_id = p_room_id;

  UPDATE public.game_rooms
  SET round_number = round_number + 1,
      current_drawer_id = next_drawer_id,
      round_deadline_at = now() + (room_row.round_time * interval '1 second'),
      word_history = array_append(word_history, new_word),
      last_activity_at = now()
  WHERE id = p_room_id;

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
    'previousWord', prev_word,
    'players', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'userId', p.user_id,
          'name', p.name,
          'score', p.score
        )
      )
      FROM public.game_room_players p WHERE p.room_id = p_room_id
    )
  );
END;
$$;

-- ── submit_paint_guess: fix room_id ambiguity ─────────────────
DROP FUNCTION IF EXISTS public.submit_paint_guess(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.submit_paint_guess(
  p_room_id UUID,
  p_guess TEXT
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
  WHERE id = p_room_id;

  IF room_row IS NULL OR NOT room_row.is_game_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game not active');
  END IF;

  SELECT * INTO player_row FROM public.game_room_players
  WHERE room_id = p_room_id AND user_id = auth.uid();

  IF player_row IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not in this room');
  END IF;

  IF player_row.id = room_row.current_drawer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Drawer cannot guess');
  END IF;

  SELECT has_guessed INTO player_has_guessed FROM public.game_room_players
  WHERE id = player_row.id;

  IF player_has_guessed THEN
    RETURN jsonb_build_object('success', true, 'correct', false, 'already_guessed', true);
  END IF;

  SELECT round_secret.word INTO secret_word
  FROM public.game_round_secrets round_secret
  WHERE round_secret.room_id = p_room_id
    AND round_secret.round_number = room_row.round_number;

  IF lower(trim(p_guess)) = lower(trim(secret_word)) THEN
    is_correct := true;

    time_left_seconds := GREATEST(0, EXTRACT(EPOCH FROM (room_row.round_deadline_at - now()))::INT);
    points := GREATEST(1, FLOOR(time_left_seconds / 10) + 10);

    UPDATE public.game_room_players
    SET score = score + points, has_guessed = true
    WHERE id = player_row.id
    RETURNING score INTO player_score;

    UPDATE public.game_room_players
    SET score = score + 5
    WHERE id = room_row.current_drawer_id;
  ELSE
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

-- ── all_guessers_finished: fix room_id ambiguity ───────────────
DROP FUNCTION IF EXISTS public.all_guessers_finished(UUID);
CREATE OR REPLACE FUNCTION public.all_guessers_finished(p_room_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.game_room_players
    WHERE room_id = p_room_id
      AND has_guessed = false
      AND id != (
        SELECT current_drawer_id FROM public.game_rooms
        WHERE id = p_room_id
      )
  );
END;
$$;

-- ── Explicit GRANT EXECUTE for all paint-and-guess RPCs ───────
GRANT EXECUTE ON FUNCTION public.generate_game_pin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_paint_room(TEXT, TEXT, INT, INT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.join_paint_room(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.leave_paint_room(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_player_ready(UUID, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_random_word(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_paint_game(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_paint_guess(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.all_guessers_finished(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.advance_paint_round(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_paint_room_state(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_canvas_checkpoint(UUID, INT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_canvas_checkpoint(UUID, INT) TO anon, authenticated;

-- Notify PostgREST of the schema change
NOTIFY pgrst, 'reload schema';
