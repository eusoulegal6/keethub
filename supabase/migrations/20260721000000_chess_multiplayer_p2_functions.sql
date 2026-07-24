-- Chess multiplayer — Part 2: RPC functions & permissions
-- Run this AFTER Part 1 succeeds.

-- ── Helper: generate room code ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_chess_code()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  generated_code TEXT;
BEGIN
  LOOP
    generated_code := (floor(random() * 900000)::int + 100000)::text;
    IF NOT EXISTS (SELECT 1 FROM public.chess_rooms r WHERE r.room_code = generated_code) THEN
      RETURN generated_code;
    END IF;
  END LOOP;
END;
$$;

-- ── RPC: Create room ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_chess_room(p_room_name TEXT DEFAULT 'Chess Room')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  new_room_id UUID;
  new_code TEXT;
  player_name TEXT;
  avatar_json JSONB;
BEGIN
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT p.username, COALESCE(p.avatar_config, '{}'::jsonb)
  INTO player_name, avatar_json FROM public.profiles p WHERE p.id = current_user_id;

  IF player_name IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;

  new_code := public.generate_chess_code();

  INSERT INTO public.chess_rooms (room_code, name, owner_id, white_id)
  VALUES (new_code, COALESCE(NULLIF(trim(p_room_name), ''), 'Chess Room'), current_user_id, current_user_id)
  RETURNING id INTO new_room_id;

  INSERT INTO public.chess_players (room_id, user_id, name, avatar, color)
  VALUES (new_room_id, current_user_id, player_name, avatar_json, 'white');

  RETURN jsonb_build_object('success', true, 'roomId', new_room_id, 'roomCode', new_code);
END;
$$;

-- ── RPC: Join room ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.join_chess_room(p_room_code TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  target_room public.chess_rooms%ROWTYPE;
  player_name TEXT;
  avatar_json JSONB;
  player_count INT;
  joined_player_id UUID;
  cleaned_code TEXT;
  assigned_color TEXT;
BEGIN
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  cleaned_code := regexp_replace(COALESCE(p_room_code, ''), '[^0-9]', '', 'g');

  SELECT * INTO target_room FROM public.chess_rooms r WHERE r.room_code = cleaned_code;

  IF target_room.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid room code');
  END IF;

  -- Check if already in this room
  IF EXISTS (SELECT 1 FROM public.chess_players p
    WHERE p.room_id = target_room.id AND p.user_id = current_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already in this room');
  END IF;

  SELECT COUNT(*) INTO player_count FROM public.chess_players p
  WHERE p.room_id = target_room.id AND p.is_connected = true;

  IF player_count >= 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room is full (2 players max)');
  END IF;

  IF target_room.status <> 'waiting' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game already started');
  END IF;

  SELECT p.username, COALESCE(p.avatar_config, '{}'::jsonb)
  INTO player_name, avatar_json FROM public.profiles p WHERE p.id = current_user_id;
  IF player_name IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;

  -- Assign opposite color to host
  assigned_color := 'black';

  INSERT INTO public.chess_players (room_id, user_id, name, avatar, color)
  VALUES (target_room.id, current_user_id, player_name, avatar_json, assigned_color)
  RETURNING id INTO joined_player_id;

  -- Assign black_id on the room
  UPDATE public.chess_rooms r SET black_id = current_user_id, last_activity_at = now()
  WHERE r.id = target_room.id;

  RETURN jsonb_build_object(
    'success', true, 'roomId', target_room.id,
    'roomCode', target_room.room_code, 'playerId', joined_player_id
  );
END;
$$;

-- ── RPC: Leave room ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.leave_chess_room(p_room_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  UPDATE public.chess_players p
  SET is_connected = false WHERE p.room_id = p_room_id AND p.user_id = current_user_id;

  -- If no connected players remain, mark finished
  IF NOT EXISTS (SELECT 1 FROM public.chess_players p
    WHERE p.room_id = p_room_id AND p.is_connected = true) THEN
    UPDATE public.chess_rooms r SET status = 'finished' WHERE r.id = p_room_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── RPC: Start game ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.start_chess_game(p_room_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  room_row public.chess_rooms%ROWTYPE;
  player_count INT;
BEGIN
  SELECT * INTO room_row FROM public.chess_rooms r WHERE r.id = p_room_id FOR UPDATE;

  IF room_row.owner_id <> current_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the host can start');
  END IF;

  IF room_row.status <> 'waiting' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game already started');
  END IF;

  SELECT COUNT(*) INTO player_count FROM public.chess_players p
  WHERE p.room_id = p_room_id AND p.is_connected = true;

  IF player_count < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Need 2 players');
  END IF;

  UPDATE public.chess_rooms r SET status = 'playing' WHERE r.id = p_room_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── RPC: Make move ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.make_chess_move(
  p_room_id UUID,
  p_move_uci TEXT,
  p_move_san TEXT,
  p_result_fen TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  room_row public.chess_rooms%ROWTYPE;
  player_row public.chess_players%ROWTYPE;
  move_count INT;
  current_turn CHAR;
  player_color TEXT;
  next_turn CHAR;
BEGIN
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT * INTO room_row FROM public.chess_rooms r WHERE r.id = p_room_id FOR UPDATE;

  IF room_row.status <> 'playing' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game is not in progress');
  END IF;

  SELECT * INTO player_row FROM public.chess_players p
  WHERE p.room_id = p_room_id AND p.user_id = current_user_id AND p.is_connected = true;

  IF player_row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not in this room');
  END IF;

  -- Verify it's this player's turn
  current_turn := split_part(room_row.current_fen, ' ', 2);
  IF (player_row.color = 'white' AND current_turn <> 'w')
     OR (player_row.color = 'black' AND current_turn <> 'b') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not your turn');
  END IF;

  -- Count moves to assign move number
  SELECT COUNT(*) + 1 INTO move_count FROM public.chess_moves m WHERE m.room_id = p_room_id;

  -- Record the move
  INSERT INTO public.chess_moves (room_id, player_id, uci, san, fen, move_number)
  VALUES (p_room_id, player_row.id, p_move_uci, p_move_san, p_result_fen, move_count);

  -- Update room FEN and PGN
  UPDATE public.chess_rooms r
  SET current_fen = p_result_fen,
      pgn = r.pgn || CASE WHEN r.pgn = '' THEN '' ELSE ' ' END || move_count || '. ' || p_move_san
  WHERE r.id = p_room_id;

  -- Check for checkmate / stalemate / draw from FEN
  -- FEN positions: fullmove number at the end. Checkmate: no legal moves + king in check.
  -- We rely on the client to detect game-end conditions and call a separate finish RPC if needed.
  -- But we also do a basic check: if the FEN indicates no moving side, mark finished.
  -- For simplicity, client handles game-end detection and will stop sending moves.

  -- Simple check: if the client sent a FEN where it's no longer playable (checkmate/stalemate/draw
  -- are detected by chess.js on the client side), we just accept the move.
  RETURN jsonb_build_object('success', true, 'moveNumber', move_count);
END;
$$;

-- ── RPC: Finish game ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.finish_chess_game(
  p_room_id UUID,
  p_result TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  room_row public.chess_rooms%ROWTYPE;
BEGIN
  UPDATE public.chess_rooms r
  SET status = 'finished', result = p_result WHERE r.id = p_room_id
    AND EXISTS (SELECT 1 FROM public.chess_players p
      WHERE p.room_id = p_room_id AND p.user_id = auth.uid());

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── RPC: Get room state ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_chess_room_state(p_room_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  room_row public.chess_rooms%ROWTYPE;
  self_player_id UUID;
  players_json JSONB := '[]'::jsonb;
  moves_json JSONB := '[]'::jsonb;
  my_color TEXT;
BEGIN
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT * INTO room_row FROM public.chess_rooms r WHERE r.id = p_room_id;

  IF room_row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room not found');
  END IF;

  SELECT p.id, p.color INTO self_player_id, my_color
  FROM public.chess_players p WHERE p.room_id = p_room_id AND p.user_id = current_user_id;

  IF self_player_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not in this room');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p.id, 'userId', p.user_id, 'name', p.name,
      'avatar', p.avatar, 'color', p.color,
      'isConnected', p.is_connected
    ) ORDER BY p.joined_at
  ), '[]'::jsonb) INTO players_json
  FROM public.chess_players p WHERE p.room_id = p_room_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', m.id, 'playerId', m.player_id,
      'uci', m.uci, 'san', m.san, 'fen', m.fen,
      'moveNumber', m.move_number, 'createdAt', m.created_at
    ) ORDER BY m.move_number
  ), '[]'::jsonb) INTO moves_json
  FROM public.chess_moves m WHERE m.room_id = p_room_id;

  RETURN jsonb_build_object(
    'success', true,
    'room', jsonb_build_object(
      'id', room_row.id, 'code', room_row.room_code,
      'name', room_row.name, 'status', room_row.status,
      'result', room_row.result,
      'currentFen', room_row.current_fen,
      'pgn', room_row.pgn,
      'ownerId', room_row.owner_id
    ),
    'selfPlayerId', self_player_id,
    'isOwner', room_row.owner_id = current_user_id,
    'myColor', my_color,
    'players', players_json,
    'moves', moves_json
  );
END;
$$;

-- ── Permissions ──────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.generate_chess_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_chess_room(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.join_chess_room(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.leave_chess_room(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.start_chess_game(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.make_chess_move(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.finish_chess_game(UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_chess_room_state(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_chess_room(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.join_chess_room(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.leave_chess_room(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.start_chess_game(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.make_chess_move(UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finish_chess_game(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_chess_room_state(UUID) TO authenticated, service_role;
