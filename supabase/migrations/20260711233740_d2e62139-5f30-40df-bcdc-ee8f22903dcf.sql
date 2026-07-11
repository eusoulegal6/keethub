-- Tighten Paint & Guess room creation policy and RPC execute privileges.

DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.game_rooms;
CREATE POLICY "Authenticated users can create rooms"
  ON public.game_rooms FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Remove default/anonymous execute access from trusted functions.
REVOKE EXECUTE ON FUNCTION public.generate_game_pin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_paint_room(TEXT, TEXT, INT, INT, INT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.join_paint_room(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.leave_paint_room(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_player_ready(UUID, BOOLEAN) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_random_word(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.start_paint_game(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_paint_guess(UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.all_guessers_finished(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.advance_paint_round(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_paint_room_state(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.save_canvas_checkpoint(UUID, INT, JSONB) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_canvas_checkpoint(UUID, INT) FROM PUBLIC, anon;

-- Internal helpers are not part of the browser RPC surface.
REVOKE EXECUTE ON FUNCTION public.generate_game_pin() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_random_word(TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.all_guessers_finished(UUID) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.create_paint_room(TEXT, TEXT, INT, INT, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.join_paint_room(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.leave_paint_room(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_player_ready(UUID, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.start_paint_game(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_paint_guess(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.advance_paint_round(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_paint_room_state(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_canvas_checkpoint(UUID, INT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_canvas_checkpoint(UUID, INT) TO authenticated, service_role;