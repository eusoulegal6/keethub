-- Hub-native Balderdash game room support.

CREATE TABLE IF NOT EXISTS public.balderdash_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL CHECK (room_code ~ '^[0-9]{6}$'),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL,
  phase TEXT NOT NULL DEFAULT 'lobby'
    CHECK (phase IN ('lobby', 'deck_selection', 'answer_submission', 'voting', 'round_results', 'finished')),
  deck TEXT,
  round_number INTEGER NOT NULL DEFAULT 0,
  max_rounds INTEGER NOT NULL DEFAULT 5,
  max_players INTEGER NOT NULL DEFAULT 8,
  selector_player_id UUID,
  current_prompt_id UUID,
  used_prompt_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.balderdash_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.balderdash_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  avatar JSONB DEFAULT '{}'::jsonb,
  score INTEGER NOT NULL DEFAULT 0,
  is_ready BOOLEAN NOT NULL DEFAULT false,
  is_connected BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.balderdash_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck TEXT NOT NULL,
  term TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  UNIQUE(deck, term, correct_answer)
);

CREATE TABLE IF NOT EXISTS public.balderdash_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.balderdash_rooms(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  player_id UUID NOT NULL REFERENCES public.balderdash_players(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, round_number, player_id)
);

CREATE TABLE IF NOT EXISTS public.balderdash_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.balderdash_rooms(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  answer TEXT NOT NULL,
  player_id UUID REFERENCES public.balderdash_players(id) ON DELETE CASCADE,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.balderdash_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.balderdash_rooms(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  player_id UUID NOT NULL REFERENCES public.balderdash_players(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.balderdash_options(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, round_number, player_id)
);

CREATE INDEX IF NOT EXISTS balderdash_players_room_idx ON public.balderdash_players(room_id);
CREATE INDEX IF NOT EXISTS balderdash_players_user_idx ON public.balderdash_players(user_id);
CREATE INDEX IF NOT EXISTS balderdash_prompts_deck_idx ON public.balderdash_prompts(deck);
CREATE INDEX IF NOT EXISTS balderdash_submissions_round_idx ON public.balderdash_submissions(room_id, round_number);
CREATE INDEX IF NOT EXISTS balderdash_options_round_idx ON public.balderdash_options(room_id, round_number, sort_order);
CREATE INDEX IF NOT EXISTS balderdash_votes_round_idx ON public.balderdash_votes(room_id, round_number);
CREATE UNIQUE INDEX IF NOT EXISTS balderdash_one_correct_option_idx
  ON public.balderdash_options(room_id, round_number)
  WHERE is_correct;

GRANT ALL ON public.balderdash_rooms TO service_role;
GRANT ALL ON public.balderdash_players TO service_role;
GRANT ALL ON public.balderdash_prompts TO service_role;
GRANT ALL ON public.balderdash_submissions TO service_role;
GRANT ALL ON public.balderdash_options TO service_role;
GRANT ALL ON public.balderdash_votes TO service_role;

GRANT SELECT ON public.balderdash_rooms TO authenticated;
GRANT SELECT ON public.balderdash_players TO authenticated;
REVOKE ALL ON public.balderdash_prompts FROM authenticated, anon;
REVOKE ALL ON public.balderdash_submissions FROM authenticated, anon;
REVOKE ALL ON public.balderdash_options FROM authenticated, anon;
REVOKE ALL ON public.balderdash_votes FROM authenticated, anon;

ALTER TABLE public.balderdash_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balderdash_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balderdash_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balderdash_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balderdash_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balderdash_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Room participants can view balderdash rooms" ON public.balderdash_rooms;
CREATE POLICY "Room participants can view balderdash rooms"
  ON public.balderdash_rooms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.balderdash_players p
      WHERE p.room_id = balderdash_rooms.id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Room participants can view balderdash players" ON public.balderdash_players;
CREATE POLICY "Room participants can view balderdash players"
  ON public.balderdash_players FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.balderdash_players p
      WHERE p.room_id = balderdash_players.room_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Prompts stay server side" ON public.balderdash_prompts;
CREATE POLICY "Prompts stay server side"
  ON public.balderdash_prompts FOR SELECT
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS "Room participants can view balderdash submissions" ON public.balderdash_submissions;
CREATE POLICY "Room participants can view balderdash submissions"
  ON public.balderdash_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.balderdash_players p
      WHERE p.room_id = balderdash_submissions.room_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Room participants can view balderdash options" ON public.balderdash_options;
CREATE POLICY "Room participants can view balderdash options"
  ON public.balderdash_options FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.balderdash_players p
      WHERE p.room_id = balderdash_options.room_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Room participants can view balderdash votes" ON public.balderdash_votes;
CREATE POLICY "Room participants can view balderdash votes"
  ON public.balderdash_votes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.balderdash_players p
      WHERE p.room_id = balderdash_votes.room_id
        AND p.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.tg_balderdash_rooms_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_activity_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS balderdash_rooms_touch_updated_at ON public.balderdash_rooms;
CREATE TRIGGER balderdash_rooms_touch_updated_at
  BEFORE UPDATE ON public.balderdash_rooms
  FOR EACH ROW EXECUTE FUNCTION public.tg_balderdash_rooms_updated_at();

INSERT INTO public.balderdash_prompts (deck, term, correct_answer) VALUES
  ('words', 'absquatulate', 'to leave somewhere abruptly'),
  ('words', 'afreet', 'a powerful spirit in Arabian and Muslim mythology'),
  ('words', 'amphibology', 'a phrase or sentence that is grammatically ambiguous'),
  ('words', 'anfractuous', 'winding or circuitous'),
  ('words', 'bardolatry', 'excessive admiration of Shakespeare'),
  ('words', 'benthos', 'the plants and animals living on the bottom of a sea or lake'),
  ('words', 'bezoar', 'a hard mass that may form in the stomach of an animal'),
  ('words', 'borborygmus', 'a rumbling or gurgling noise in the intestines'),
  ('words', 'bruxism', 'habitual grinding of the teeth'),
  ('words', 'cacoethes', 'an urge to do something inadvisable'),
  ('words', 'callipygian', 'having shapely buttocks'),
  ('words', 'clepsydra', 'an early clock using the flow of water'),
  ('words', 'colporteur', 'a person who peddles books or religious writings'),
  ('words', 'deasil', 'clockwise or in the direction of the sun'),
  ('words', 'deglutition', 'the action or process of swallowing'),
  ('words', 'ecdysiast', 'a striptease performer'),
  ('words', 'effable', 'able to be described in words'),
  ('words', 'funambulist', 'a tightrope walker'),
  ('words', 'haruspex', 'an ancient Roman official who inspected entrails to foretell the future'),
  ('words', 'kenspeckle', 'conspicuous or easily recognizable'),
  ('words', 'logomachy', 'an argument about words'),
  ('words', 'mumpsimus', 'a mistaken belief stubbornly held'),
  ('words', 'noctambulist', 'a sleepwalker'),
  ('words', 'opsimath', 'a person who begins to study late in life'),
  ('words', 'orrery', 'a clockwork model of the solar system'),
  ('acronyms', 'CEO', 'Chief Executive Officer'),
  ('acronyms', 'COGS', 'Cost of Goods Sold'),
  ('acronyms', 'CRM', 'Client Relationship Management'),
  ('acronyms', 'CTO', 'Chief Technology Officer'),
  ('acronyms', 'DBA', 'Doing Business As'),
  ('acronyms', 'FTE', 'Full Time Equivalent'),
  ('acronyms', 'KPI', 'Key Performance Indicator'),
  ('acronyms', 'LLC', 'Limited Liability Company'),
  ('acronyms', 'MSRP', 'Manufacturer''s Suggested Retail Price'),
  ('acronyms', 'NDA', 'Non-Disclosure Agreement'),
  ('acronyms', 'OEM', 'Original Equipment Manufacturer'),
  ('acronyms', 'ROI', 'Return on Investment'),
  ('acronyms', 'SKU', 'Stock Keeping Unit'),
  ('acronyms', 'SWOT', 'Strengths, Weaknesses, Opportunities, and Threats'),
  ('acronyms', 'TBD', 'To Be Determined')
ON CONFLICT (deck, term, correct_answer) DO NOTHING;

INSERT INTO public.games (slug, title, description, category, accent_color)
VALUES (
  'balderdash',
  'Balderdash',
  'Invent convincing fake definitions, spot the real one, and score points when your friends fall for the bluff.',
  'party',
  '#f59e0b'
)
ON CONFLICT (slug) DO NOTHING;

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
    IF NOT EXISTS (SELECT 1 FROM public.balderdash_rooms r WHERE r.room_code = generated_code) THEN
      RETURN generated_code;
    END IF;
  END LOOP;
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

  SELECT p.username, COALESCE(p.avatar_config, '{}'::jsonb)
  INTO player_name, avatar_json
  FROM public.profiles p
  WHERE p.id = current_user_id;

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
  FROM public.balderdash_rooms r
  WHERE r.room_code = cleaned_code;

  IF target_room.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid room code');
  END IF;

  SELECT p.id INTO existing_player_id
  FROM public.balderdash_players p
  WHERE p.room_id = target_room.id
    AND p.user_id = current_user_id;

  IF target_room.phase <> 'lobby' AND existing_player_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'This game has already started');
  END IF;

  SELECT COUNT(*) INTO connected_count
  FROM public.balderdash_players p
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

  INSERT INTO public.balderdash_players (room_id, user_id, name, avatar)
  VALUES (target_room.id, current_user_id, player_name, avatar_json)
  ON CONFLICT (room_id, user_id) DO UPDATE
  SET name = EXCLUDED.name,
      avatar = EXCLUDED.avatar,
      is_connected = true
  RETURNING id INTO joined_player_id;

  UPDATE public.balderdash_rooms r
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

  SELECT r.owner_id = current_user_id INTO was_owner
  FROM public.balderdash_rooms r
  WHERE r.id = p_room_id;

  UPDATE public.balderdash_players p
  SET is_connected = false,
      is_ready = false
  WHERE p.room_id = p_room_id
    AND p.user_id = current_user_id;

  IF was_owner THEN
    SELECT p.user_id INTO next_owner
    FROM public.balderdash_players p
    WHERE p.room_id = p_room_id
      AND p.is_connected = true
    ORDER BY p.joined_at
    LIMIT 1;

    UPDATE public.balderdash_rooms r
    SET owner_id = COALESCE(next_owner, r.owner_id)
    WHERE r.id = p_room_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.balderdash_players p
    WHERE p.room_id = p_room_id AND p.is_connected = true
  ) THEN
    UPDATE public.balderdash_rooms r
    SET phase = 'finished'
    WHERE r.id = p_room_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_balderdash_ready(p_room_id UUID, p_is_ready BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.balderdash_players p
  SET is_ready = COALESCE(p_is_ready, false)
  WHERE p.room_id = p_room_id
    AND p.user_id = auth.uid();

  RETURN jsonb_build_object('success', true);
END;
$$;

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
  FROM public.balderdash_rooms r
  WHERE r.id = p_room_id
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

  SELECT COUNT(*), COUNT(*) FILTER (WHERE p.is_ready)
  INTO player_count, ready_count
  FROM public.balderdash_players p
  WHERE p.room_id = p_room_id
    AND p.is_connected = true;

  IF player_count < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Need at least 2 players');
  END IF;

  IF ready_count <> player_count THEN
    RETURN jsonb_build_object('success', false, 'error', 'Everyone must be ready');
  END IF;

  SELECT p.id INTO first_selector
  FROM public.balderdash_players p
  WHERE p.room_id = p_room_id
    AND p.is_connected = true
  ORDER BY p.joined_at
  LIMIT 1;

  UPDATE public.balderdash_players p
  SET score = 0
  WHERE p.room_id = p_room_id;

  UPDATE public.balderdash_rooms r
  SET phase = 'deck_selection',
      selector_player_id = first_selector,
      round_number = 0,
      deck = NULL,
      current_prompt_id = NULL,
      used_prompt_ids = '{}'
  WHERE r.id = p_room_id;

  DELETE FROM public.balderdash_votes v WHERE v.room_id = p_room_id;
  DELETE FROM public.balderdash_options o WHERE o.room_id = p_room_id;
  DELETE FROM public.balderdash_submissions s WHERE s.room_id = p_room_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.choose_balderdash_deck(p_room_id UUID, p_deck TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  room_row public.balderdash_rooms%ROWTYPE;
  player_id UUID;
  prompt_row public.balderdash_prompts%ROWTYPE;
  selected_deck TEXT;
  next_round INT;
BEGIN
  selected_deck := lower(trim(COALESCE(p_deck, '')));
  IF selected_deck NOT IN ('words', 'acronyms') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid deck');
  END IF;

  SELECT * INTO room_row
  FROM public.balderdash_rooms r
  WHERE r.id = p_room_id
  FOR UPDATE;

  SELECT p.id INTO player_id
  FROM public.balderdash_players p
  WHERE p.room_id = p_room_id
    AND p.user_id = current_user_id
    AND p.is_connected = true;

  IF room_row.phase <> 'deck_selection' THEN
    RETURN jsonb_build_object('success', false, 'error', 'It is not time to choose a deck');
  END IF;

  IF player_id IS NULL OR player_id <> room_row.selector_player_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the selector can choose the deck');
  END IF;

  SELECT * INTO prompt_row
  FROM public.balderdash_prompts p
  WHERE p.deck = selected_deck
    AND NOT (p.id = ANY(room_row.used_prompt_ids))
  ORDER BY random()
  LIMIT 1;

  IF prompt_row.id IS NULL THEN
    SELECT * INTO prompt_row
    FROM public.balderdash_prompts p
    WHERE p.deck = selected_deck
    ORDER BY random()
    LIMIT 1;
  END IF;

  IF prompt_row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No prompts found for this deck');
  END IF;

  next_round := room_row.round_number + 1;

  UPDATE public.balderdash_rooms r
  SET phase = 'answer_submission',
      deck = selected_deck,
      round_number = next_round,
      current_prompt_id = prompt_row.id,
      used_prompt_ids = array_append(r.used_prompt_ids, prompt_row.id)
  WHERE r.id = p_room_id;

  RETURN jsonb_build_object('success', true, 'roundNumber', next_round);
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_balderdash_answer(p_room_id UUID, p_answer TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  room_row public.balderdash_rooms%ROWTYPE;
  prompt_row public.balderdash_prompts%ROWTYPE;
  player_id UUID;
  clean_answer TEXT;
  active_count INT;
  submitted_count INT;
BEGIN
  clean_answer := trim(COALESCE(p_answer, ''));
  IF length(clean_answer) < 3 OR length(clean_answer) > 240 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Answer must be 3 to 240 characters');
  END IF;

  SELECT * INTO room_row
  FROM public.balderdash_rooms r
  WHERE r.id = p_room_id
  FOR UPDATE;

  IF room_row.phase <> 'answer_submission' THEN
    RETURN jsonb_build_object('success', false, 'error', 'It is not time to submit answers');
  END IF;

  SELECT * INTO prompt_row
  FROM public.balderdash_prompts p
  WHERE p.id = room_row.current_prompt_id;

  IF lower(clean_answer) = lower(trim(prompt_row.correct_answer)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Your bluff cannot match the real answer');
  END IF;

  SELECT p.id INTO player_id
  FROM public.balderdash_players p
  WHERE p.room_id = p_room_id
    AND p.user_id = current_user_id
    AND p.is_connected = true;

  IF player_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not in this room');
  END IF;

  INSERT INTO public.balderdash_submissions (room_id, round_number, player_id, answer)
  VALUES (p_room_id, room_row.round_number, player_id, clean_answer)
  ON CONFLICT (room_id, round_number, player_id) DO UPDATE
  SET answer = EXCLUDED.answer,
      created_at = now();

  SELECT COUNT(*) INTO active_count
  FROM public.balderdash_players p
  WHERE p.room_id = p_room_id
    AND p.is_connected = true;

  SELECT COUNT(*) INTO submitted_count
  FROM public.balderdash_submissions s
  JOIN public.balderdash_players p ON p.id = s.player_id
  WHERE s.room_id = p_room_id
    AND s.round_number = room_row.round_number
    AND p.is_connected = true;

  IF submitted_count >= active_count THEN
    DELETE FROM public.balderdash_options o
    WHERE o.room_id = p_room_id
      AND o.round_number = room_row.round_number;

    INSERT INTO public.balderdash_options (room_id, round_number, answer, player_id, is_correct)
    VALUES (p_room_id, room_row.round_number, prompt_row.correct_answer, NULL, true);

    INSERT INTO public.balderdash_options (room_id, round_number, answer, player_id, is_correct)
    SELECT s.room_id, s.round_number, s.answer, s.player_id, false
    FROM public.balderdash_submissions s
    WHERE s.room_id = p_room_id
      AND s.round_number = room_row.round_number;

    WITH ordered AS (
      SELECT o.id, row_number() OVER (ORDER BY random()) AS rn
      FROM public.balderdash_options o
      WHERE o.room_id = p_room_id
        AND o.round_number = room_row.round_number
    )
    UPDATE public.balderdash_options o
    SET sort_order = ordered.rn
    FROM ordered
    WHERE o.id = ordered.id;

    UPDATE public.balderdash_rooms r
    SET phase = 'voting'
    WHERE r.id = p_room_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.vote_balderdash_answer(p_room_id UUID, p_option_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  room_row public.balderdash_rooms%ROWTYPE;
  player_id UUID;
  option_row public.balderdash_options%ROWTYPE;
  active_count INT;
  vote_count INT;
BEGIN
  SELECT * INTO room_row
  FROM public.balderdash_rooms r
  WHERE r.id = p_room_id
  FOR UPDATE;

  IF room_row.phase <> 'voting' THEN
    RETURN jsonb_build_object('success', false, 'error', 'It is not time to vote');
  END IF;

  SELECT p.id INTO player_id
  FROM public.balderdash_players p
  WHERE p.room_id = p_room_id
    AND p.user_id = current_user_id
    AND p.is_connected = true;

  IF player_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not in this room');
  END IF;

  SELECT * INTO option_row
  FROM public.balderdash_options o
  WHERE o.id = p_option_id
    AND o.room_id = p_room_id
    AND o.round_number = room_row.round_number;

  IF option_row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid answer');
  END IF;

  IF option_row.player_id = player_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot vote for your own bluff');
  END IF;

  INSERT INTO public.balderdash_votes (room_id, round_number, player_id, option_id)
  VALUES (p_room_id, room_row.round_number, player_id, p_option_id)
  ON CONFLICT (room_id, round_number, player_id) DO NOTHING;

  SELECT COUNT(*) INTO active_count
  FROM public.balderdash_players p
  WHERE p.room_id = p_room_id
    AND p.is_connected = true;

  SELECT COUNT(*) INTO vote_count
  FROM public.balderdash_votes v
  JOIN public.balderdash_players p ON p.id = v.player_id
  WHERE v.room_id = p_room_id
    AND v.round_number = room_row.round_number
    AND p.is_connected = true;

  IF vote_count >= active_count THEN
    UPDATE public.balderdash_players p
    SET score = p.score + 1
    WHERE p.id IN (
      SELECT v.player_id
      FROM public.balderdash_votes v
      JOIN public.balderdash_options o ON o.id = v.option_id
      WHERE v.room_id = p_room_id
        AND v.round_number = room_row.round_number
        AND o.is_correct = true
    );

    UPDATE public.balderdash_players p
    SET score = p.score + fooled.fooled_count
    FROM (
      SELECT o.player_id, COUNT(*)::int AS fooled_count
      FROM public.balderdash_votes v
      JOIN public.balderdash_options o ON o.id = v.option_id
      WHERE v.room_id = p_room_id
        AND v.round_number = room_row.round_number
        AND o.player_id IS NOT NULL
        AND o.is_correct = false
      GROUP BY o.player_id
    ) fooled
    WHERE p.id = fooled.player_id;

    UPDATE public.balderdash_rooms r
    SET phase = 'round_results'
    WHERE r.id = p_room_id;
  END IF;

  RETURN jsonb_build_object('success', true);
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
  FROM public.balderdash_rooms r
  WHERE r.id = p_room_id
  FOR UPDATE;

  IF room_row.owner_id <> current_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the host can advance the game');
  END IF;

  IF room_row.phase <> 'round_results' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Round results are not ready');
  END IF;

  IF room_row.round_number >= room_row.max_rounds THEN
    UPDATE public.balderdash_rooms r
    SET phase = 'finished'
    WHERE r.id = p_room_id;
    RETURN jsonb_build_object('success', true, 'finished', true);
  END IF;

  SELECT array_agg(p.id ORDER BY p.joined_at) INTO player_ids
  FROM public.balderdash_players p
  WHERE p.room_id = p_room_id
    AND p.is_connected = true;

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

  UPDATE public.balderdash_rooms r
  SET phase = 'deck_selection',
      selector_player_id = next_selector,
      deck = NULL,
      current_prompt_id = NULL
  WHERE r.id = p_room_id;

  RETURN jsonb_build_object('success', true, 'finished', false);
END;
$$;

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
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO room_row
  FROM public.balderdash_rooms r
  WHERE r.id = p_room_id;

  IF room_row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room not found');
  END IF;

  SELECT p.id INTO self_player_id
  FROM public.balderdash_players p
  WHERE p.room_id = p_room_id
    AND p.user_id = current_user_id;

  IF self_player_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not in this room');
  END IF;

  SELECT * INTO prompt_row
  FROM public.balderdash_prompts p
  WHERE p.id = room_row.current_prompt_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'userId', p.user_id,
      'name', p.name,
      'avatar', p.avatar,
      'score', p.score,
      'isReady', p.is_ready,
      'isConnected', p.is_connected,
      'roundPoints',
        CASE WHEN room_row.phase IN ('round_results', 'finished') THEN
          (
            CASE WHEN EXISTS (
              SELECT 1
              FROM public.balderdash_votes v
              JOIN public.balderdash_options o ON o.id = v.option_id
              WHERE v.room_id = p_room_id
                AND v.round_number = room_row.round_number
                AND v.player_id = p.id
                AND o.is_correct = true
            ) THEN 1 ELSE 0 END
          ) + (
            SELECT COUNT(*)::int
            FROM public.balderdash_votes v
            JOIN public.balderdash_options o ON o.id = v.option_id
            WHERE v.room_id = p_room_id
              AND v.round_number = room_row.round_number
              AND o.player_id = p.id
              AND o.is_correct = false
          )
        ELSE 0 END
    ) ORDER BY p.joined_at
  ), '[]'::jsonb) INTO players_json
  FROM public.balderdash_players p
  WHERE p.room_id = p_room_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'playerId', p.id,
      'submitted', s.id IS NOT NULL
    ) ORDER BY p.joined_at
  ), '[]'::jsonb) INTO submissions_json
  FROM public.balderdash_players p
  LEFT JOIN public.balderdash_submissions s
    ON s.player_id = p.id
   AND s.room_id = p_room_id
   AND s.round_number = room_row.round_number
  WHERE p.room_id = p_room_id
    AND p.is_connected = true;

  IF room_row.phase IN ('voting', 'round_results', 'finished') THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'answer', o.answer,
        'isCorrect', CASE WHEN room_row.phase IN ('round_results', 'finished') THEN o.is_correct ELSE NULL END,
        'authorPlayerId', CASE WHEN room_row.phase IN ('round_results', 'finished') THEN o.player_id ELSE NULL END,
        'authorName', CASE WHEN room_row.phase IN ('round_results', 'finished') THEN author.name ELSE NULL END,
        'votes', CASE WHEN room_row.phase IN ('round_results', 'finished') THEN (
          SELECT COALESCE(jsonb_agg(
            jsonb_build_object('playerId', voter.id, 'name', voter.name)
            ORDER BY voter.joined_at
          ), '[]'::jsonb)
          FROM public.balderdash_votes v
          JOIN public.balderdash_players voter ON voter.id = v.player_id
          WHERE v.option_id = o.id
        ) ELSE '[]'::jsonb END
      ) ORDER BY o.sort_order
    ), '[]'::jsonb) INTO options_json
    FROM public.balderdash_options o
    LEFT JOIN public.balderdash_players author ON author.id = o.player_id
    WHERE o.room_id = p_room_id
      AND o.round_number = room_row.round_number;
  END IF;

  SELECT v.option_id INTO self_vote_id
  FROM public.balderdash_votes v
  WHERE v.room_id = p_room_id
    AND v.round_number = room_row.round_number
    AND v.player_id = self_player_id;

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
        SELECT 1 FROM public.balderdash_submissions s
        WHERE s.room_id = p_room_id
          AND s.round_number = room_row.round_number
          AND s.player_id = self_player_id
      ),
      'votedOptionId', self_vote_id
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_balderdash_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_balderdash_room(TEXT, INT, INT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.join_balderdash_room(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.leave_balderdash_room(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_balderdash_ready(UUID, BOOLEAN) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.start_balderdash_room(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.choose_balderdash_deck(UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_balderdash_answer(UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.vote_balderdash_answer(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.next_balderdash_round(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_balderdash_room_state(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_balderdash_room(TEXT, INT, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.join_balderdash_room(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.leave_balderdash_room(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_balderdash_ready(UUID, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.start_balderdash_room(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.choose_balderdash_deck(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_balderdash_answer(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.vote_balderdash_answer(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.next_balderdash_round(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_balderdash_room_state(UUID) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';