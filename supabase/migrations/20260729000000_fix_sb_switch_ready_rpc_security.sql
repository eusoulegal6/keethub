-- Fix: switch_sb_team and set_sb_player_ready were missing SECURITY DEFINER,
-- causing their UPDATES to hit 0 rows under RLS. Also qualified all column
-- references with table aliases to avoid "room_id is ambiguous" errors.

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

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found in this room');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.switch_sb_team(UUID, INT) TO authenticated, anon;

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

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found in this room');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_sb_player_ready(UUID, BOOLEAN) TO authenticated, anon;
