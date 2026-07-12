-- Fix: include user_id in get_paint_room_state player output
-- This is needed so clients can match auth.uid() → player.id (selfId)

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
      'userId', p.user_id,
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
