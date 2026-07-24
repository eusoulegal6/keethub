-- Chess multiplayer game room support.

-- ── Rooms ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chess_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL CHECK (room_code ~ '^[0-9]{6}$'),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL,
  white_id UUID,
  black_id UUID,
  current_fen TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  pgn TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'playing', 'finished')),
  result TEXT CHECK (result IN ('white_win', 'black_win', 'draw', 'resign_white', 'resign_black')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Players ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chess_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chess_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  avatar JSONB DEFAULT '{}'::jsonb,
  color TEXT NOT NULL CHECK (color IN ('white', 'black')),
  is_connected BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id),
  UNIQUE(room_id, color)
);

-- ── Moves ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chess_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chess_rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.chess_players(id) ON DELETE CASCADE,
  uci TEXT NOT NULL,
  san TEXT NOT NULL,
  fen TEXT NOT NULL,
  move_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS chess_players_room_idx ON public.chess_players(room_id);
CREATE INDEX IF NOT EXISTS chess_players_user_idx ON public.chess_players(user_id);
CREATE INDEX IF NOT EXISTS chess_moves_room_idx ON public.chess_moves(room_id, move_number);

-- ── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE public.chess_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chess_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chess_moves ENABLE ROW LEVEL SECURITY;

-- Room policies
CREATE POLICY "Participants can view chess rooms"
  ON public.chess_rooms FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chess_players p
    WHERE p.room_id = chess_rooms.id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Authenticated can create chess rooms"
  ON public.chess_rooms FOR INSERT TO authenticated
  WITH CHECK (true);

-- Player policies
CREATE POLICY "Participants can view chess players"
  ON public.chess_players FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chess_players p2
    WHERE p2.room_id = chess_players.room_id AND p2.user_id = auth.uid()
  ));

CREATE POLICY "Authenticated can join chess rooms"
  ON public.chess_players FOR INSERT TO authenticated
  WITH CHECK (true);

-- Move policies
CREATE POLICY "Participants can view chess moves"
  ON public.chess_moves FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chess_players p
    WHERE p.room_id = chess_moves.room_id AND p.user_id = auth.uid()
  ));

-- ── Grants ───────────────────────────────────────────────────────────
GRANT SELECT, INSERT ON public.chess_rooms TO authenticated;
GRANT ALL ON public.chess_rooms TO service_role;

GRANT SELECT, INSERT ON public.chess_players TO authenticated;
GRANT ALL ON public.chess_players TO service_role;

GRANT SELECT ON public.chess_moves TO authenticated;
GRANT ALL ON public.chess_moves TO service_role;

-- ── Updated-at trigger ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_chess_rooms_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_activity_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chess_rooms_touch_updated_at ON public.chess_rooms;
CREATE TRIGGER chess_rooms_touch_updated_at
  BEFORE UPDATE ON public.chess_rooms
  FOR EACH ROW EXECUTE FUNCTION public.tg_chess_rooms_updated_at();
