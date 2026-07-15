-- Fix balderdash RPC functions: properly qualify all column references,
-- avoid deeply nested correlated subqueries, and return real row counts.

-- 1. Fix set_balderdash_ready: return actual result instead of always success
CREATE OR REPLACE FUNCTION public.set_balderdash_ready(
  p_room_id UUID,
  p_is_ready BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INT;
BEGIN
  UPDATE public.balderdash_players bp
  SET is_ready = COALESCE(p_is_ready, false)
  WHERE bp.room_id = p_room_id
    AND bp.user_id = auth.uid();

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  IF updated_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player record not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 2. Fix start_balderdash_room: use explicit table-qualified references
CREATE OR REPLACE FUNCTION public.start_balderdash_room(p_room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  room_row public.balderdash_rooms%ROWTYPE;
  player_count INT;
  ready_count INT;
  first_selector UUID;
BEGIN
  SELECT * INTO room_row
  FROM public.balderdash_rooms br
  WHERE br.id = p_room_id
  FOR UPDATE;

  IF room_row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room not found');
  END IF;

  IF room_row.owner_id <> current_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the host can start the game');
  END IF;

  IF room_row.phase <> 'lobby' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game already started');
  END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE bp.is_ready)
  INTO player_count, ready_count
  FROM public.balderdash_players bp
  WHERE bp.room_id = p_room_id
    AND bp.is_connected = true;

  IF player_count < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Need at least 2 players');
  END IF;

  IF ready_count <> player_count THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Everyone must be ready (' || ready_count || '/' || player_count || ')'
    );
  END IF;

  SELECT bp.id INTO first_selector
  FROM public.balderdash_players bp
  WHERE bp.room_id = p_room_id
    AND bp.is_connected = true
  ORDER BY bp.joined_at
  LIMIT 1;

  UPDATE public.balderdash_players bp
  SET score = 0
  WHERE bp.room_id = p_room_id;

  UPDATE public.balderdash_rooms br
  SET phase = 'deck_selection',
      selector_player_id = first_selector,
      round_number = 0,
      deck = NULL,
      current_prompt_id = NULL,
      used_prompt_ids = '{}'
  WHERE br.id = p_room_id;

  DELETE FROM public.balderdash_votes bv WHERE bv.room_id = p_room_id;
  DELETE FROM public.balderdash_options bo WHERE bo.room_id = p_room_id;
  DELETE FROM public.balderdash_submissions bs WHERE bs.room_id = p_room_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 3. Fix get_balderdash_room_state: rewrite with simple structure, avoid
--    correlated subqueries inside jsonb_build_object by computing round
--    points in separate CTEs only when needed.
CREATE OR REPLACE FUNCTION public.get_balderdash_room_state(p_room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  room_row public.balderdash_rooms%ROWTYPE;
  prompt_row public.balderdash_prompts%ROWTYPE;
  self_player_id UUID;
  players_json JSONB := '[]'::jsonb;
  submissions_json JSONB := '[]'::jsonb;
  options_json JSONB := '[]'::jsonb;
  self_vote_id UUID;
  round_points_base JSONB := '{}'::jsonb;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO room_row
  FROM public.balderdash_rooms br
  WHERE br.id = p_room_id;

  IF room_row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room not found');
  END IF;

  SELECT bp.id INTO self_player_id
  FROM public.balderdash_players bp
  WHERE bp.room_id = p_room_id
    AND bp.user_id = current_user_id;

  IF self_player_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not in this room');
  END IF;

  SELECT * INTO prompt_row
  FROM public.balderdash_prompts bpp
  WHERE bpp.id = room_row.current_prompt_id;

  -- Pre-compute round points if we're in results phase
  IF room_row.phase IN ('round_results', 'finished') THEN
    WITH correct_votes AS (
      SELECT bv.player_id, 1 AS pts
      FROM public.balderdash_votes bv
      JOIN public.balderdash_options bo ON bo.id = bv.option_id
      WHERE bv.room_id = p_room_id
        AND bv.round_number = room_row.round_number
        AND bo.is_correct = true
    ),
    fooled_counts AS (
      SELECT bo.player_id, COUNT(*)::int AS pts
      FROM public.balderdash_votes bv
      JOIN public.balderdash_options bo ON bo.id = bv.option_id
      WHERE bv.room_id = p_room_id
        AND bv.round_number = room_row.round_number
        AND bo.player_id IS NOT NULL
        AND bo.is_correct = false
      GROUP BY bo.player_id
    ),
    all_points AS (
      SELECT cv.player_id, cv.pts FROM correct_votes cv
      UNION ALL
      SELECT fc.player_id, fc.pts FROM fooled_counts fc
    )
    SELECT COALESCE(
      jsonb_object_agg(ap.player_id::text, COALESCE(ap_sum.sum_pts, 0)),
      '{}'::jsonb
    ) INTO round_points_base
    FROM (
      SELECT ap.player_id, SUM(ap.pts)::int AS sum_pts
      FROM all_points ap
      GROUP BY ap.player_id
    ) ap_sum;
  END IF;

  -- Build players JSON (always)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', bp.id,
      'userId', bp.user_id,
      'name', bp.name,
      'avatar', bp.avatar,
      'score', bp.score,
      'isReady', bp.is_ready,
      'isConnected', bp.is_connected,
      'roundPoints', COALESCE((round_points_base->>(bp.id::text))::int, 0)
    ) ORDER BY bp.joined_at
  ), '[]'::jsonb) INTO players_json
  FROM public.balderdash_players bp
  WHERE bp.room_id = p_room_id;

  -- Build submissions JSON (always)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'playerId', bp.id,
      'submitted', bs.id IS NOT NULL
    ) ORDER BY bp.joined_at
  ), '[]'::jsonb) INTO submissions_json
  FROM public.balderdash_players bp
  LEFT JOIN public.balderdash_submissions bs
    ON bs.player_id = bp.id
   AND bs.room_id = p_room_id
   AND bs.round_number = room_row.round_number
  WHERE bp.room_id = p_room_id
    AND bp.is_connected = true;

  -- Build options JSON (only for voting/results/finished phases)
  IF room_row.phase IN ('voting', 'round_results', 'finished') THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', bo.id,
        'answer', bo.answer,
        'isCorrect', CASE WHEN room_row.phase IN ('round_results', 'finished') THEN bo.is_correct ELSE NULL END,
        'authorPlayerId', CASE WHEN room_row.phase IN ('round_results', 'finished') THEN bo.player_id ELSE NULL END,
        'authorName', CASE WHEN room_row.phase IN ('round_results', 'finished') THEN bpauth.name ELSE NULL END,
        'votes', CASE WHEN room_row.phase IN ('round_results', 'finished') THEN (
          SELECT COALESCE(jsonb_agg(
            jsonb_build_object('playerId', bpvoter.id, 'name', bpvoter.name)
            ORDER BY bpvoter.joined_at
          ), '[]'::jsonb)
          FROM public.balderdash_votes bv2
          JOIN public.balderdash_players bpvoter ON bpvoter.id = bv2.player_id
          WHERE bv2.option_id = bo.id
        ) ELSE '[]'::jsonb END
      ) ORDER BY bo.sort_order
    ), '[]'::jsonb) INTO options_json
    FROM public.balderdash_options bo
    LEFT JOIN public.balderdash_players bpauth ON bpauth.id = bo.player_id
    WHERE bo.room_id = p_room_id
      AND bo.round_number = room_row.round_number;
  END IF;

  -- Get self vote
  SELECT bv.option_id INTO self_vote_id
  FROM public.balderdash_votes bv
  WHERE bv.room_id = p_room_id
    AND bv.round_number = room_row.round_number
    AND bv.player_id = self_player_id;

  -- Return complete state
  RETURN jsonb_build_object(
    'success', true,
    'room', jsonb_build_object(
      'id', room_row.id,
      'code', room_row.room_code,
      'name', room_row.name,
      'phase', room_row.phase,
      'deck', room_row.deck,
      'roundNumber', room_row.round_number,
      'maxRounds', room_row.max_rounds,
      'maxPlayers', room_row.max_players,
      'ownerId', room_row.owner_id,
      'selectorPlayerId', room_row.selector_player_id,
      'promptWord', CASE WHEN room_row.phase IN ('answer_submission', 'voting', 'round_results', 'finished') THEN prompt_row.term ELSE NULL END,
      'correctAnswer', CASE WHEN room_row.phase IN ('round_results', 'finished') THEN prompt_row.correct_answer ELSE NULL END
    ),
    'selfPlayerId', self_player_id,
    'isOwner', room_row.owner_id = current_user_id,
    'players', players_json,
    'submissions', submissions_json,
    'options', options_json,
    'self', jsonb_build_object(
      'submitted', EXISTS (
        SELECT 1 FROM public.balderdash_submissions bs2
        WHERE bs2.room_id = p_room_id
          AND bs2.round_number = room_row.round_number
          AND bs2.player_id = self_player_id
      ),
      'votedOptionId', self_vote_id
    )
  );
END;
$$;

-- 4. Rename table aliases in other functions to avoid any possible
--    confusion between alias prefixes and parameter names
CREATE OR REPLACE FUNCTION public.submit_balderdash_answer(
  p_room_id UUID,
  p_answer TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  room_row public.balderdash_rooms%ROWTYPE;
  prompt_row public.balderdash_prompts%ROWTYPE;
  v_player_id UUID;
  clean_answer TEXT;
  active_count INT;
  submitted_count INT;
BEGIN
  clean_answer := trim(COALESCE(p_answer, ''));
  IF length(clean_answer) < 3 OR length(clean_answer) > 240 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Answer must be 3 to 240 characters');
  END IF;

  SELECT * INTO room_row
  FROM public.balderdash_rooms br
  WHERE br.id = p_room_id
  FOR UPDATE;

  IF room_row.phase <> 'answer_submission' THEN
    RETURN jsonb_build_object('success', false, 'error', 'It is not time to submit answers');
  END IF;

  SELECT * INTO prompt_row
  FROM public.balderdash_prompts bpp
  WHERE bpp.id = room_row.current_prompt_id;

  IF lower(clean_answer) = lower(trim(prompt_row.correct_answer)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Your bluff cannot match the real answer');
  END IF;

  SELECT bp.id INTO v_player_id
  FROM public.balderdash_players bp
  WHERE bp.room_id = p_room_id
    AND bp.user_id = current_user_id
    AND bp.is_connected = true;

  IF v_player_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not in this room');
  END IF;

  INSERT INTO public.balderdash_submissions (room_id, round_number, player_id, answer)
  VALUES (p_room_id, room_row.round_number, v_player_id, clean_answer)
  ON CONFLICT (room_id, round_number, player_id) DO UPDATE
  SET answer = EXCLUDED.answer,
      created_at = now();

  SELECT COUNT(*) INTO active_count
  FROM public.balderdash_players bp
  WHERE bp.room_id = p_room_id
    AND bp.is_connected = true;

  SELECT COUNT(*) INTO submitted_count
  FROM public.balderdash_submissions bs
  JOIN public.balderdash_players bp ON bp.id = bs.player_id
  WHERE bs.room_id = p_room_id
    AND bs.round_number = room_row.round_number
    AND bp.is_connected = true;

  IF submitted_count >= active_count THEN
    DELETE FROM public.balderdash_options bo
    WHERE bo.room_id = p_room_id
      AND bo.round_number = room_row.round_number;

    INSERT INTO public.balderdash_options (room_id, round_number, answer, player_id, is_correct)
    VALUES (p_room_id, room_row.round_number, prompt_row.correct_answer, NULL, true);

    INSERT INTO public.balderdash_options (room_id, round_number, answer, player_id, is_correct)
    SELECT bs.room_id, bs.round_number, bs.answer, bs.player_id, false
    FROM public.balderdash_submissions bs
    WHERE bs.room_id = p_room_id
      AND bs.round_number = room_row.round_number;

    WITH ordered AS (
      SELECT bo.id, row_number() OVER (ORDER BY random()) AS rn
      FROM public.balderdash_options bo
      WHERE bo.room_id = p_room_id
        AND bo.round_number = room_row.round_number
    )
    UPDATE public.balderdash_options bo
    SET sort_order = ord.rn
    FROM ordered ord
    WHERE bo.id = ord.id;

    UPDATE public.balderdash_rooms br
    SET phase = 'voting'
    WHERE br.id = p_room_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 5. Same alias rename for remaining functions
CREATE OR REPLACE FUNCTION public.vote_balderdash_answer(
  p_room_id UUID,
  p_option_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  room_row public.balderdash_rooms%ROWTYPE;
  v_player_id UUID;
  option_row public.balderdash_options%ROWTYPE;
  active_count INT;
  vote_count INT;
BEGIN
  SELECT * INTO room_row
  FROM public.balderdash_rooms br
  WHERE br.id = p_room_id
  FOR UPDATE;

  IF room_row.phase <> 'voting' THEN
    RETURN jsonb_build_object('success', false, 'error', 'It is not time to vote');
  END IF;

  SELECT bp.id INTO v_player_id
  FROM public.balderdash_players bp
  WHERE bp.room_id = p_room_id
    AND bp.user_id = current_user_id
    AND bp.is_connected = true;

  IF v_player_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not in this room');
  END IF;

  SELECT * INTO option_row
  FROM public.balderdash_options bo
  WHERE bo.id = p_option_id
    AND bo.room_id = p_room_id
    AND bo.round_number = room_row.round_number;

  IF option_row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid answer');
  END IF;

  IF option_row.player_id = v_player_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot vote for your own bluff');
  END IF;

  INSERT INTO public.balderdash_votes (room_id, round_number, player_id, option_id)
  VALUES (p_room_id, room_row.round_number, v_player_id, p_option_id)
  ON CONFLICT (room_id, round_number, player_id) DO NOTHING;

  SELECT COUNT(*) INTO active_count
  FROM public.balderdash_players bp
  WHERE bp.room_id = p_room_id
    AND bp.is_connected = true;

  SELECT COUNT(*) INTO vote_count
  FROM public.balderdash_votes bv
  JOIN public.balderdash_players bp ON bp.id = bv.player_id
  WHERE bv.room_id = p_room_id
    AND bv.round_number = room_row.round_number
    AND bp.is_connected = true;

  IF vote_count >= active_count THEN
    UPDATE public.balderdash_players bp
    SET score = bp.score + 1
    WHERE bp.id IN (
      SELECT bv.player_id
      FROM public.balderdash_votes bv
      JOIN public.balderdash_options bo ON bo.id = bv.option_id
      WHERE bv.room_id = p_room_id
        AND bv.round_number = room_row.round_number
        AND bo.is_correct = true
    );

    UPDATE public.balderdash_players bp
    SET score = bp.score + fooled.fooled_count
    FROM (
      SELECT bo.player_id, COUNT(*)::int AS fooled_count
      FROM public.balderdash_votes bv
      JOIN public.balderdash_options bo ON bo.id = bv.option_id
      WHERE bv.room_id = p_room_id
        AND bv.round_number = room_row.round_number
        AND bo.player_id IS NOT NULL
        AND bo.is_correct = false
      GROUP BY bo.player_id
    ) fooled
    WHERE bp.id = fooled.player_id;

    UPDATE public.balderdash_rooms br
    SET phase = 'round_results'
    WHERE br.id = p_room_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Also fix remaining functions that use 'p' alias with 'p_' prefixed parameters
CREATE OR REPLACE FUNCTION public.choose_balderdash_deck(p_room_id UUID, p_deck TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  room_row public.balderdash_rooms%ROWTYPE;
  v_player_id UUID;
  prompt_row public.balderdash_prompts%ROWTYPE;
  selected_deck TEXT;
  next_round INT;
BEGIN
  selected_deck := lower(trim(COALESCE(p_deck, '')));
  IF selected_deck NOT IN ('words', 'acronyms') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid deck');
  END IF;

  SELECT * INTO room_row
  FROM public.balderdash_rooms br
  WHERE br.id = p_room_id
  FOR UPDATE;

  SELECT bp.id INTO v_player_id
  FROM public.balderdash_players bp
  WHERE bp.room_id = p_room_id
    AND bp.user_id = current_user_id
    AND bp.is_connected = true;

  IF room_row.phase <> 'deck_selection' THEN
    RETURN jsonb_build_object('success', false, 'error', 'It is not time to choose a deck');
  END IF;

  IF v_player_id IS NULL OR v_player_id <> room_row.selector_player_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the selector can choose the deck');
  END IF;

  SELECT * INTO prompt_row
  FROM public.balderdash_prompts bpp
  WHERE bpp.deck = selected_deck
    AND NOT (bpp.id = ANY(room_row.used_prompt_ids))
  ORDER BY random()
  LIMIT 1;

  IF prompt_row.id IS NULL THEN
    SELECT * INTO prompt_row
    FROM public.balderdash_prompts bpp
    WHERE bpp.deck = selected_deck
    ORDER BY random()
    LIMIT 1;
  END IF;

  IF prompt_row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No prompts found for this deck');
  END IF;

  next_round := room_row.round_number + 1;

  UPDATE public.balderdash_rooms br
  SET phase = 'answer_submission',
      deck = selected_deck,
      round_number = next_round,
      current_prompt_id = prompt_row.id,
      used_prompt_ids = array_append(br.used_prompt_ids, prompt_row.id)
  WHERE br.id = p_room_id;

  RETURN jsonb_build_object('success', true, 'roundNumber', next_round);
END;
$$;

CREATE OR REPLACE FUNCTION public.next_balderdash_round(p_room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  room_row public.balderdash_rooms%ROWTYPE;
  player_ids UUID[];
  current_idx INT;
  next_idx INT;
  next_selector UUID;
BEGIN
  SELECT * INTO room_row
  FROM public.balderdash_rooms br
  WHERE br.id = p_room_id
  FOR UPDATE;

  IF room_row.owner_id <> current_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the host can advance the game');
  END IF;

  IF room_row.phase <> 'round_results' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Round results are not ready');
  END IF;

  IF room_row.round_number >= room_row.max_rounds THEN
    UPDATE public.balderdash_rooms br
    SET phase = 'finished'
    WHERE br.id = p_room_id;
    RETURN jsonb_build_object('success', true, 'finished', true);
  END IF;

  SELECT array_agg(bp.id ORDER BY bp.joined_at) INTO player_ids
  FROM public.balderdash_players bp
  WHERE bp.room_id = p_room_id
    AND bp.is_connected = true;

  IF array_length(player_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No connected players');
  END IF;

  current_idx := array_position(player_ids, room_row.selector_player_id);
  IF current_idx IS NULL THEN
    current_idx := 0;
  END IF;

  next_idx := current_idx + 1;
  IF next_idx > array_length(player_ids, 1) THEN
    next_idx := 1;
  END IF;

  next_selector := player_ids[next_idx];

  UPDATE public.balderdash_rooms br
  SET phase = 'deck_selection',
      selector_player_id = next_selector,
      deck = NULL,
      current_prompt_id = NULL
  WHERE br.id = p_room_id;

  RETURN jsonb_build_object('success', true, 'finished', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.join_balderdash_room(p_room_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  target_room public.balderdash_rooms%ROWTYPE;
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
  FROM public.balderdash_rooms br
  WHERE br.room_code = cleaned_code;

  IF target_room.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid room code');
  END IF;

  SELECT bp.id INTO existing_player_id
  FROM public.balderdash_players bp
  WHERE bp.room_id = target_room.id
    AND bp.user_id = current_user_id;

  IF target_room.phase <> 'lobby' AND existing_player_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'This game has already started');
  END IF;

  SELECT COUNT(*) INTO connected_count
  FROM public.balderdash_players bp
  WHERE bp.room_id = target_room.id
    AND bp.is_connected = true;

  IF connected_count >= target_room.max_players AND existing_player_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room is full');
  END IF;

  SELECT prof.username, COALESCE(prof.avatar_config, '{}'::jsonb)
  INTO player_name, avatar_json
  FROM public.profiles prof
  WHERE prof.id = current_user_id;

  IF player_name IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  INSERT INTO public.balderdash_players (room_id, user_id, name, avatar)
  VALUES (target_room.id, current_user_id, player_name, avatar_json)
  ON CONFLICT (room_id, user_id) DO UPDATE
  SET name = EXCLUDED.name,
      avatar = EXCLUDED.avatar,
      is_connected = true
  RETURNING id INTO joined_player_id;

  UPDATE public.balderdash_rooms br
  SET last_activity_at = now()
  WHERE br.id = target_room.id;

  RETURN jsonb_build_object(
    'success', true,
    'roomId', target_room.id,
    'roomCode', target_room.room_code,
    'playerId', joined_player_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_balderdash_room(
  p_room_name TEXT DEFAULT 'Balderdash Room',
  p_max_rounds INT DEFAULT 5,
  p_max_players INT DEFAULT 8
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

  SELECT prof.username, COALESCE(prof.avatar_config, '{}'::jsonb)
  INTO player_name, avatar_json
  FROM public.profiles prof
  WHERE prof.id = current_user_id;

  IF player_name IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  new_code := public.generate_balderdash_code();

  INSERT INTO public.balderdash_rooms (
    room_code, name, owner_id, max_rounds, max_players
  ) VALUES (
    new_code,
    COALESCE(NULLIF(trim(p_room_name), ''), 'Balderdash Room'),
    current_user_id,
    LEAST(GREATEST(COALESCE(p_max_rounds, 5), 1), 10),
    LEAST(GREATEST(COALESCE(p_max_players, 8), 2), 12)
  )
  RETURNING id INTO new_room_id;

  INSERT INTO public.balderdash_players (room_id, user_id, name, avatar)
  VALUES (new_room_id, current_user_id, player_name, avatar_json);

  RETURN jsonb_build_object('success', true, 'roomId', new_room_id, 'roomCode', new_code);
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_balderdash_room(p_room_id UUID)
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

  SELECT br.owner_id = current_user_id INTO was_owner
  FROM public.balderdash_rooms br
  WHERE br.id = p_room_id;

  UPDATE public.balderdash_players bp
  SET is_connected = false,
      is_ready = false
  WHERE bp.room_id = p_room_id
    AND bp.user_id = current_user_id;

  IF was_owner THEN
    SELECT bp.user_id INTO next_owner
    FROM public.balderdash_players bp
    WHERE bp.room_id = p_room_id
      AND bp.is_connected = true
    ORDER BY bp.joined_at
    LIMIT 1;

    UPDATE public.balderdash_rooms br
    SET owner_id = COALESCE(next_owner, br.owner_id)
    WHERE br.id = p_room_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.balderdash_players bp
    WHERE bp.room_id = p_room_id AND bp.is_connected = true
  ) THEN
    UPDATE public.balderdash_rooms br
    SET phase = 'finished'
    WHERE br.id = p_room_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_balderdash_code()
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
    IF NOT EXISTS (SELECT 1 FROM public.balderdash_rooms br WHERE br.room_code = generated_code) THEN
      RETURN generated_code;
    END IF;
  END LOOP;
END;
$$;
