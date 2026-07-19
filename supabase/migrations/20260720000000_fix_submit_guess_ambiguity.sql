-- Fix submit_paint_guess: keep original parameter names (room_id, guess)
-- because PostgREST schema cache doesn't handle param renames well.
-- Fix the body to use function-qualified names to avoid column ambiguity.

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
  WHERE id = submit_paint_guess.room_id;

  IF room_row IS NULL OR NOT room_row.is_game_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game not active');
  END IF;

  SELECT * INTO player_row FROM public.game_room_players
  WHERE room_id = submit_paint_guess.room_id AND user_id = auth.uid();

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
  WHERE round_secret.room_id = submit_paint_guess.room_id
    AND round_secret.round_number = room_row.round_number;

  IF lower(trim(submit_paint_guess.guess)) = lower(trim(secret_word)) THEN
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

NOTIFY pgrst, 'reload schema';
