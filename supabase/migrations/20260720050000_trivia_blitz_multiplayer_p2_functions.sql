-- Trivia Blitz multiplayer — Part 2: Functions & permissions
-- Run this AFTER Part 1 succeeds (tables must already exist).

-- ── RPC: Generate room code ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_trivia_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  generated_code TEXT;
BEGIN
  LOOP
    generated_code := (floor(random() * 900000)::int + 100000)::text;
    IF NOT EXISTS (SELECT 1 FROM public.trivia_rooms r WHERE r.room_code = generated_code) THEN
      RETURN generated_code;
    END IF;
  END LOOP;
END;
$$;

-- ── RPC: Create room ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_trivia_room(
  p_room_name TEXT DEFAULT 'Trivia Room',
  p_max_rounds INT DEFAULT 7
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  new_room_id UUID;
  new_code TEXT;
  player_name TEXT;
  avatar_json JSONB;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT p.username, COALESCE(p.avatar_config, '{}'::jsonb)
  INTO player_name, avatar_json
  FROM public.profiles p
  WHERE p.id = current_user_id;

  IF player_name IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  new_code := public.generate_trivia_code();

  INSERT INTO public.trivia_rooms (
    room_code, name, owner_id, max_rounds
  ) VALUES (
    new_code,
    COALESCE(NULLIF(trim(p_room_name), ''), 'Trivia Room'),
    current_user_id,
    LEAST(GREATEST(COALESCE(p_max_rounds, 7), 3), 20)
  )
  RETURNING id INTO new_room_id;

  INSERT INTO public.trivia_players (room_id, user_id, name, avatar)
  VALUES (new_room_id, current_user_id, player_name, avatar_json);

  RETURN jsonb_build_object('success', true, 'roomId', new_room_id, 'roomCode', new_code);
END;
$$;

-- ── RPC: Join room ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.join_trivia_room(p_room_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  target_room public.trivia_rooms%ROWTYPE;
  existing_player_id UUID;
  player_name TEXT;
  avatar_json JSONB;
  connected_count INT;
  joined_player_id UUID;
  cleaned_code TEXT;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  cleaned_code := regexp_replace(COALESCE(p_room_code, ''), '[^0-9]', '', 'g');

  SELECT * INTO target_room
  FROM public.trivia_rooms r
  WHERE r.room_code = cleaned_code;

  IF target_room.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid room code');
  END IF;

  SELECT p.id INTO existing_player_id
  FROM public.trivia_players p
  WHERE p.room_id = target_room.id
    AND p.user_id = current_user_id;

  IF target_room.phase NOT IN ('lobby', 'category_select') AND existing_player_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'This game has already started');
  END IF;

  SELECT COUNT(*) INTO connected_count
  FROM public.trivia_players p
  WHERE p.room_id = target_room.id
    AND p.is_connected = true;

  IF connected_count >= target_room.max_players AND existing_player_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room is full');
  END IF;

  SELECT p.username, COALESCE(p.avatar_config, '{}'::jsonb)
  INTO player_name, avatar_json
  FROM public.profiles p
  WHERE p.id = current_user_id;

  IF player_name IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  INSERT INTO public.trivia_players (room_id, user_id, name, avatar)
  VALUES (target_room.id, current_user_id, player_name, avatar_json)
  ON CONFLICT (room_id, user_id) DO UPDATE
  SET name = EXCLUDED.name,
      avatar = EXCLUDED.avatar,
      is_connected = true
  RETURNING id INTO joined_player_id;

  UPDATE public.trivia_rooms r
  SET last_activity_at = now()
  WHERE r.id = target_room.id;

  RETURN jsonb_build_object(
    'success', true,
    'roomId', target_room.id,
    'roomCode', target_room.room_code,
    'playerId', joined_player_id
  );
END;
$$;

-- ── RPC: Leave room ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.leave_trivia_room(p_room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  was_owner BOOLEAN := false;
  next_owner UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT r.owner_id = current_user_id INTO was_owner
  FROM public.trivia_rooms r
  WHERE r.id = p_room_id;

  UPDATE public.trivia_players p
  SET is_connected = false,
      is_ready = false
  WHERE p.room_id = p_room_id
    AND p.user_id = current_user_id;

  IF was_owner THEN
    SELECT p.user_id INTO next_owner
    FROM public.trivia_players p
    WHERE p.room_id = p_room_id
      AND p.is_connected = true
    ORDER BY p.joined_at
    LIMIT 1;

    UPDATE public.trivia_rooms r
    SET owner_id = COALESCE(next_owner, r.owner_id)
    WHERE r.id = p_room_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.trivia_players p
    WHERE p.room_id = p_room_id AND p.is_connected = true
  ) THEN
    UPDATE public.trivia_rooms r
    SET phase = 'finished'
    WHERE r.id = p_room_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── RPC: Set ready ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_trivia_ready(p_room_id UUID, p_is_ready BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.trivia_players p
  SET is_ready = COALESCE(p_is_ready, false)
  WHERE p.room_id = p_room_id
    AND p.user_id = auth.uid();

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── RPC: Select category ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.select_trivia_category(p_room_id UUID, p_category_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  room_row public.trivia_rooms%ROWTYPE;
  question_ids UUID[];
  question_count INT;
BEGIN
  SELECT * INTO room_row
  FROM public.trivia_rooms r
  WHERE r.id = p_room_id
  FOR UPDATE;

  IF room_row.owner_id <> current_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the host can select a category');
  END IF;

  IF room_row.phase NOT IN ('lobby', 'category_select') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Category selection is not available');
  END IF;

  SELECT COUNT(*) INTO question_count
  FROM public.trivia_questions q
  WHERE q.quiz_id = p_category_id;

  IF question_count < room_row.max_rounds THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enough questions in this category');
  END IF;

  SELECT array_agg(q.id ORDER BY random())
  INTO question_ids
  FROM public.trivia_questions q
  WHERE q.quiz_id = p_category_id;

  UPDATE public.trivia_rooms r
  SET phase = 'category_select',
      category_id = p_category_id,
      used_question_ids = question_ids
  WHERE r.id = p_room_id;

  RETURN jsonb_build_object('success', true, 'categoryId', p_category_id);
END;
$$;

-- ── RPC: Start game ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.start_trivia_game(p_room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  room_row public.trivia_rooms%ROWTYPE;
  player_count INT;
  ready_count INT;
  first_question_id UUID;
  first_question_time_limit INT;
  deadline TIMESTAMPTZ;
BEGIN
  SELECT * INTO room_row
  FROM public.trivia_rooms r
  WHERE r.id = p_room_id
  FOR UPDATE;

  IF room_row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room not found');
  END IF;

  IF room_row.owner_id <> current_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the host can start the game');
  END IF;

  IF room_row.phase NOT IN ('lobby', 'category_select') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game already started');
  END IF;

  IF room_row.category_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Select a category first');
  END IF;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE p.is_ready)
  INTO player_count, ready_count
  FROM public.trivia_players p
  WHERE p.room_id = p_room_id
    AND p.is_connected = true;

  IF player_count < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Need at least 2 players');
  END IF;

  IF ready_count <> player_count THEN
    RETURN jsonb_build_object('success', false, 'error', 'Everyone must be ready');
  END IF;

  -- Reset scores and streaks
  UPDATE public.trivia_players p
  SET score = 0, streak = 0
  WHERE p.room_id = p_room_id;

  -- Pick first question
  first_question_id := room_row.used_question_ids[1];

  SELECT q.time_limit INTO first_question_time_limit
  FROM public.trivia_questions q
  WHERE q.id = first_question_id;

  -- Set deadline: intro (2.5s) + question time
  deadline := now() + make_interval(secs => 2.5 + COALESCE(first_question_time_limit, 20));

  -- Clean previous answers
  DELETE FROM public.trivia_answers a WHERE a.room_id = p_room_id;

  UPDATE public.trivia_rooms r
  SET phase = 'question_intro',
      round_number = 1,
      current_question_id = first_question_id,
      round_deadline_at = deadline
  WHERE r.id = p_room_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── Helper: Compute trivia points ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.compute_trivia_points(
  p_time_left INT,
  p_time_limit INT,
  p_streak INT
)
RETURNS INT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  speed_multiplier FLOAT;
  streak_bonus INT;
BEGIN
  speed_multiplier := 0.5 + 1.5 * (p_time_left::FLOAT / NULLIF(p_time_limit, 0)::FLOAT);
  streak_bonus := LEAST(p_streak * 50, 500);
  RETURN ROUND(1000 * speed_multiplier + streak_bonus);
END;
$$;

-- ── RPC: Submit answer ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_trivia_answer(
  p_room_id UUID,
  p_question_id UUID,
  p_selected_option_id TEXT,
  p_time_ms INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  room_row public.trivia_rooms%ROWTYPE;
  question_row public.trivia_questions%ROWTYPE;
  player_row public.trivia_players%ROWTYPE;
  is_answer_correct BOOLEAN;
  answer_points INT;
  time_left INT;
  new_streak INT;
  active_count INT;
  answer_count INT;
  existing_answer_id UUID;
BEGIN
  SELECT * INTO room_row
  FROM public.trivia_rooms r
  WHERE r.id = p_room_id
  FOR UPDATE;

  IF room_row.phase <> 'question' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not accepting answers right now');
  END IF;

  IF room_row.current_question_id IS NULL OR room_row.current_question_id <> p_question_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wrong question');
  END IF;

  SELECT * INTO player_row
  FROM public.trivia_players p
  WHERE p.room_id = p_room_id
    AND p.user_id = current_user_id
    AND p.is_connected = true;

  IF player_row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not in this room');
  END IF;

  -- Check if already answered this round
  SELECT a.id INTO existing_answer_id
  FROM public.trivia_answers a
  WHERE a.room_id = p_room_id
    AND a.round_number = room_row.round_number
    AND a.player_id = player_row.id;

  IF existing_answer_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already answered this round');
  END IF;

  -- Get question data (server-side, has correct answer)
  SELECT * INTO question_row
  FROM public.trivia_questions q
  WHERE q.id = p_question_id;

  is_answer_correct := p_selected_option_id = question_row.correct_option_id;

  -- Compute time left in seconds (clamped)
  time_left := GREATEST(0, question_row.time_limit - (p_time_ms / 1000)::INT);

  IF is_answer_correct THEN
    new_streak := player_row.streak + 1;
    answer_points := public.compute_trivia_points(time_left, question_row.time_limit, new_streak);
  ELSE
    new_streak := 0;
    answer_points := 0;
  END IF;

  INSERT INTO public.trivia_answers (room_id, round_number, player_id, question_id, selected_option_id, is_correct, time_ms, points)
  VALUES (p_room_id, room_row.round_number, player_row.id, p_question_id, p_selected_option_id, is_answer_correct, p_time_ms, answer_points);

  UPDATE public.trivia_players p
  SET score = p.score + answer_points,
      streak = new_streak
  WHERE p.id = player_row.id;

  -- Check if all players answered
  SELECT COUNT(*) INTO active_count
  FROM public.trivia_players p
  WHERE p.room_id = p_room_id
    AND p.is_connected = true;

  SELECT COUNT(*) INTO answer_count
  FROM public.trivia_answers a
  JOIN public.trivia_players p ON p.id = a.player_id
  WHERE a.room_id = p_room_id
    AND a.round_number = room_row.round_number
    AND p.is_connected = true;

  IF answer_count >= active_count THEN
    UPDATE public.trivia_rooms r
    SET phase = 'answer_reveal'
    WHERE r.id = p_room_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'correct', is_answer_correct,
    'points', answer_points
  );
END;
$$;

-- ── RPC: Advance question ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.advance_trivia_question(p_room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  room_row public.trivia_rooms%ROWTYPE;
  next_question_id UUID;
  next_question_time_limit INT;
  next_deadline TIMESTAMPTZ;
  next_round INT;
BEGIN
  SELECT * INTO room_row
  FROM public.trivia_rooms r
  WHERE r.id = p_room_id
  FOR UPDATE;

  IF room_row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room not found');
  END IF;

  -- Phase: question_intro → question (start the timer)
  IF room_row.phase = 'question_intro' THEN
    UPDATE public.trivia_rooms r
    SET phase = 'question'
    WHERE r.id = p_room_id;
    RETURN jsonb_build_object('success', true, 'phase', 'question');
  END IF;

  -- Phase: question → answer_reveal (timeout)
  IF room_row.phase = 'question' THEN
    INSERT INTO public.trivia_answers (room_id, round_number, player_id, question_id, selected_option_id, is_correct, time_ms, points)
    SELECT
      p_room_id,
      room_row.round_number,
      p.id,
      room_row.current_question_id,
      NULL,
      false,
      (SELECT q.time_limit * 1000 FROM public.trivia_questions q WHERE q.id = room_row.current_question_id),
      0
    FROM public.trivia_players p
    WHERE p.room_id = p_room_id
      AND p.is_connected = true
      AND NOT EXISTS (
        SELECT 1 FROM public.trivia_answers a
        WHERE a.room_id = p_room_id
          AND a.round_number = room_row.round_number
          AND a.player_id = p.id
      );

    UPDATE public.trivia_players p
    SET streak = 0
    WHERE p.room_id = p_room_id
      AND p.is_connected = true
      AND NOT EXISTS (
        SELECT 1 FROM public.trivia_answers a
        WHERE a.room_id = p_room_id
          AND a.round_number = room_row.round_number
          AND a.player_id = p.id
          AND a.is_correct = true
      );

    UPDATE public.trivia_rooms r
    SET phase = 'answer_reveal'
    WHERE r.id = p_room_id;
    RETURN jsonb_build_object('success', true, 'phase', 'answer_reveal');
  END IF;

  -- Phase: answer_reveal → scoring
  IF room_row.phase = 'answer_reveal' THEN
    UPDATE public.trivia_rooms r
    SET phase = 'scoring'
    WHERE r.id = p_room_id;
    RETURN jsonb_build_object('success', true, 'phase', 'scoring');
  END IF;

  -- Phase: scoring → question_intro (next question) or finished
  IF room_row.phase = 'scoring' THEN
    next_round := room_row.round_number + 1;

    IF next_round > room_row.max_rounds OR next_round > array_length(room_row.used_question_ids, 1) THEN
      UPDATE public.trivia_rooms r
      SET phase = 'finished'
      WHERE r.id = p_room_id;
      RETURN jsonb_build_object('success', true, 'phase', 'finished', 'gameEnded', true);
    END IF;

    next_question_id := room_row.used_question_ids[next_round];

    SELECT q.time_limit INTO next_question_time_limit
    FROM public.trivia_questions q
    WHERE q.id = next_question_id;

    next_deadline := now() + make_interval(secs => 2.5 + COALESCE(next_question_time_limit, 20));

    UPDATE public.trivia_rooms r
    SET phase = 'question_intro',
        round_number = next_round,
        current_question_id = next_question_id,
        round_deadline_at = next_deadline
    WHERE r.id = p_room_id;

    RETURN jsonb_build_object(
      'success', true,
      'phase', 'question_intro',
      'roundNumber', next_round,
      'gameEnded', false
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'phase', room_row.phase);
END;
$$;

-- ── RPC: Get room state ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_trivia_room_state(p_room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  room_row public.trivia_rooms%ROWTYPE;
  question_row public.trivia_questions%ROWTYPE;
  self_player_id UUID;
  players_json JSONB := '[]'::jsonb;
  answers_json JSONB := '[]'::jsonb;
  current_question_json JSONB := NULL;
  self_json JSONB;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO room_row
  FROM public.trivia_rooms r
  WHERE r.id = p_room_id;

  IF room_row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room not found');
  END IF;

  SELECT p.id INTO self_player_id
  FROM public.trivia_players p
  WHERE p.room_id = p_room_id
    AND p.user_id = current_user_id;

  IF self_player_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not in this room');
  END IF;

  -- Players
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'userId', p.user_id,
      'name', p.name,
      'avatar', p.avatar,
      'score', p.score,
      'streak', p.streak,
      'isReady', p.is_ready,
      'isConnected', p.is_connected
    ) ORDER BY p.joined_at
  ), '[]'::jsonb) INTO players_json
  FROM public.trivia_players p
  WHERE p.room_id = p_room_id;

  -- Current question (strip correct answer from client response)
  IF room_row.current_question_id IS NOT NULL AND room_row.phase NOT IN ('lobby', 'category_select') THEN
    SELECT * INTO question_row
    FROM public.trivia_questions q
    WHERE q.id = room_row.current_question_id;

    current_question_json := jsonb_build_object(
      'id', question_row.id,
      'text', question_row.question_text,
      'options', question_row.options,
      'timeLimit', question_row.time_limit
    );

    -- Include correct answer only during/after reveal phases
    IF room_row.phase IN ('answer_reveal', 'scoring', 'finished') THEN
      current_question_json := current_question_json || jsonb_build_object(
        'correctOptionId', question_row.correct_option_id
      );
    END IF;
  END IF;

  -- Answers for current round (only during/after reveal)
  IF room_row.phase IN ('answer_reveal', 'scoring', 'finished') THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'playerId', a.player_id,
        'playerName', p.name,
        'selectedOptionId', a.selected_option_id,
        'isCorrect', a.is_correct,
        'timeMs', a.time_ms,
        'points', a.points
      ) ORDER BY p.joined_at
    ), '[]'::jsonb) INTO answers_json
    FROM public.trivia_answers a
    JOIN public.trivia_players p ON p.id = a.player_id
    WHERE a.room_id = p_room_id
      AND a.round_number = room_row.round_number;
  END IF;

  -- Self info
  self_json := jsonb_build_object(
    'hasAnswered', EXISTS (
      SELECT 1 FROM public.trivia_answers a
      WHERE a.room_id = p_room_id
        AND a.round_number = room_row.round_number
        AND a.player_id = self_player_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'room', jsonb_build_object(
      'id', room_row.id,
      'code', room_row.room_code,
      'name', room_row.name,
      'phase', room_row.phase,
      'categoryId', room_row.category_id,
      'roundNumber', room_row.round_number,
      'maxRounds', room_row.max_rounds,
      'maxPlayers', room_row.max_players,
      'ownerId', room_row.owner_id,
      'roundDeadlineAt', round(extract(epoch FROM room_row.round_deadline_at) * 1000)::BIGINT
    ),
    'selfPlayerId', self_player_id,
    'isOwner', room_row.owner_id = current_user_id,
    'players', players_json,
    'currentQuestion', current_question_json,
    'answers', answers_json,
    'self', self_json
  );
END;
$$;

-- ── Permissions ───────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.generate_trivia_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_trivia_room(TEXT, INT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.join_trivia_room(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.leave_trivia_room(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_trivia_ready(UUID, BOOLEAN) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.select_trivia_category(UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.start_trivia_game(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_trivia_answer(UUID, UUID, TEXT, INT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.advance_trivia_question(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_trivia_room_state(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.compute_trivia_points(INT, INT, INT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_trivia_room(TEXT, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.join_trivia_room(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.leave_trivia_room(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_trivia_ready(UUID, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.select_trivia_category(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.start_trivia_game(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_trivia_answer(UUID, UUID, TEXT, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.advance_trivia_question(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_trivia_room_state(UUID) TO authenticated, service_role;
