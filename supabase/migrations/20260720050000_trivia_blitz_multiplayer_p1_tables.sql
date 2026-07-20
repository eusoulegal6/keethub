-- Trivia Blitz multiplayer — Part 1: Tables & seed data
-- Run this FIRST, then run Part 2: Functions & permissions.

-- ── Tables (no policies yet — policies come after all tables exist) ──

CREATE TABLE IF NOT EXISTS public.trivia_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_option_id TEXT NOT NULL,
  time_limit INTEGER NOT NULL DEFAULT 20
);

CREATE TABLE IF NOT EXISTS public.trivia_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL CHECK (room_code ~ '^[0-9]{6}$'),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL,
  phase TEXT NOT NULL DEFAULT 'lobby'
    CHECK (phase IN ('lobby', 'category_select', 'question_intro', 'question', 'answer_reveal', 'scoring', 'finished')),
  category_id TEXT,
  round_number INTEGER NOT NULL DEFAULT 0,
  max_rounds INTEGER NOT NULL DEFAULT 7,
  max_players INTEGER NOT NULL DEFAULT 8,
  round_deadline_at TIMESTAMPTZ,
  current_question_id UUID,
  used_question_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trivia_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  avatar JSONB DEFAULT '{}'::jsonb,
  score INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  is_ready BOOLEAN NOT NULL DEFAULT false,
  is_connected BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.trivia_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL,
  round_number INTEGER NOT NULL,
  player_id UUID NOT NULL,
  question_id UUID NOT NULL,
  selected_option_id TEXT,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  time_ms INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, round_number, player_id)
);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS trivia_questions_quiz_idx ON public.trivia_questions(quiz_id);
CREATE INDEX IF NOT EXISTS trivia_players_room_idx ON public.trivia_players(room_id);
CREATE INDEX IF NOT EXISTS trivia_players_user_idx ON public.trivia_players(user_id);
CREATE INDEX IF NOT EXISTS trivia_answers_round_idx ON public.trivia_answers(room_id, round_number);

-- ── Foreign keys (add after table creation to avoid dependency issues) ──
ALTER TABLE public.trivia_rooms
  ADD CONSTRAINT trivia_rooms_question_fk
  FOREIGN KEY (current_question_id) REFERENCES public.trivia_questions(id);

ALTER TABLE public.trivia_players
  ADD CONSTRAINT trivia_players_room_fk
  FOREIGN KEY (room_id) REFERENCES public.trivia_rooms(id) ON DELETE CASCADE;

ALTER TABLE public.trivia_answers
  ADD CONSTRAINT trivia_answers_room_fk
  FOREIGN KEY (room_id) REFERENCES public.trivia_rooms(id) ON DELETE CASCADE,
  ADD CONSTRAINT trivia_answers_player_fk
  FOREIGN KEY (player_id) REFERENCES public.trivia_players(id) ON DELETE CASCADE,
  ADD CONSTRAINT trivia_answers_question_fk
  FOREIGN KEY (question_id) REFERENCES public.trivia_questions(id);

-- ── RLS (enable first, then create policies) ──
ALTER TABLE public.trivia_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_answers ENABLE ROW LEVEL SECURITY;

-- ── Policies ──
CREATE POLICY "Questions stay server side"
  ON public.trivia_questions FOR SELECT
  TO authenticated
  USING (false);

CREATE POLICY "Room participants can view trivia rooms"
  ON public.trivia_rooms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trivia_players p
      WHERE p.room_id = trivia_rooms.id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated can create trivia rooms"
  ON public.trivia_rooms FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Room participants can view trivia players"
  ON public.trivia_players FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trivia_players p2
      WHERE p2.room_id = trivia_players.room_id
        AND p2.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated can join trivia rooms"
  ON public.trivia_players FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Room participants can view trivia answers"
  ON public.trivia_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trivia_players p
      WHERE p.room_id = trivia_answers.room_id
        AND p.user_id = auth.uid()
    )
  );

-- ── Updated-at trigger ──
CREATE OR REPLACE FUNCTION public.tg_trivia_rooms_updated_at()
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

DROP TRIGGER IF EXISTS trivia_rooms_touch_updated_at ON public.trivia_rooms;
CREATE TRIGGER trivia_rooms_touch_updated_at
  BEFORE UPDATE ON public.trivia_rooms
  FOR EACH ROW EXECUTE FUNCTION public.tg_trivia_rooms_updated_at();

-- ── Table permissions ──
GRANT ALL ON public.trivia_questions TO service_role;
REVOKE ALL ON public.trivia_questions FROM authenticated, anon;

GRANT SELECT, INSERT ON public.trivia_rooms TO authenticated, service_role;

GRANT SELECT, INSERT ON public.trivia_players TO authenticated;
GRANT ALL ON public.trivia_players TO service_role;

GRANT ALL ON public.trivia_answers TO service_role;
REVOKE ALL ON public.trivia_answers FROM authenticated, anon;

-- ── Seed questions ──
INSERT INTO public.trivia_questions (quiz_id, question_text, options, correct_option_id, time_limit) VALUES
  ('general', 'What is the capital of France?',
   '[{"id":"a","text":"London","color":"#ef4444"},{"id":"b","text":"Berlin","color":"#3b82f6"},{"id":"c","text":"Paris","color":"#eab308"},{"id":"d","text":"Madrid","color":"#22c55e"}]',
   'c', 20),
  ('general', 'Which planet is known as the Red Planet?',
   '[{"id":"a","text":"Venus","color":"#ef4444"},{"id":"b","text":"Mars","color":"#3b82f6"},{"id":"c","text":"Jupiter","color":"#eab308"},{"id":"d","text":"Saturn","color":"#22c55e"}]',
   'b', 20),
  ('general', 'What is 2 + 2?',
   '[{"id":"a","text":"3","color":"#ef4444"},{"id":"b","text":"4","color":"#3b82f6"},{"id":"c","text":"5","color":"#eab308"},{"id":"d","text":"6","color":"#22c55e"}]',
   'b', 15),
  ('general', 'Who painted the Mona Lisa?',
   '[{"id":"a","text":"Van Gogh","color":"#ef4444"},{"id":"b","text":"Picasso","color":"#3b82f6"},{"id":"c","text":"Leonardo da Vinci","color":"#eab308"},{"id":"d","text":"Michelangelo","color":"#22c55e"}]',
   'c', 20),
  ('general', 'What is the largest ocean on Earth?',
   '[{"id":"a","text":"Atlantic","color":"#ef4444"},{"id":"b","text":"Indian","color":"#3b82f6"},{"id":"c","text":"Arctic","color":"#eab308"},{"id":"d","text":"Pacific","color":"#22c55e"}]',
   'd', 20),
  ('science', 'What is the chemical symbol for water?',
   '[{"id":"a","text":"H₂O","color":"#ef4444"},{"id":"b","text":"CO₂","color":"#3b82f6"},{"id":"c","text":"O₂","color":"#eab308"},{"id":"d","text":"NaCl","color":"#22c55e"}]',
   'a', 20),
  ('science', 'What is the speed of light in vacuum (approximately)?',
   '[{"id":"a","text":"300,000 km/s","color":"#ef4444"},{"id":"b","text":"150,000 km/s","color":"#3b82f6"},{"id":"c","text":"450,000 km/s","color":"#eab308"},{"id":"d","text":"200,000 km/s","color":"#22c55e"}]',
   'a', 25),
  ('science', 'What is the smallest unit of matter?',
   '[{"id":"a","text":"Molecule","color":"#ef4444"},{"id":"b","text":"Atom","color":"#3b82f6"},{"id":"c","text":"Electron","color":"#eab308"},{"id":"d","text":"Proton","color":"#22c55e"}]',
   'b', 20),
  ('science', 'How many bones does an adult human have?',
   '[{"id":"a","text":"196","color":"#ef4444"},{"id":"b","text":"206","color":"#3b82f6"},{"id":"c","text":"216","color":"#eab308"},{"id":"d","text":"226","color":"#22c55e"}]',
   'b', 20),
  ('science', 'What planet is closest to the Sun?',
   '[{"id":"a","text":"Venus","color":"#ef4444"},{"id":"b","text":"Earth","color":"#3b82f6"},{"id":"c","text":"Mercury","color":"#eab308"},{"id":"d","text":"Mars","color":"#22c55e"}]',
   'c', 20),
  ('science', 'What is the hardest natural substance on Earth?',
   '[{"id":"a","text":"Gold","color":"#ef4444"},{"id":"b","text":"Iron","color":"#3b82f6"},{"id":"c","text":"Diamond","color":"#eab308"},{"id":"d","text":"Platinum","color":"#22c55e"}]',
   'c', 20),
  ('science', 'What gas do plants absorb from the atmosphere?',
   '[{"id":"a","text":"Oxygen","color":"#ef4444"},{"id":"b","text":"Nitrogen","color":"#3b82f6"},{"id":"c","text":"Carbon Dioxide","color":"#eab308"},{"id":"d","text":"Hydrogen","color":"#22c55e"}]',
   'c', 20),
  ('history', 'In which year did World War II end?',
   '[{"id":"a","text":"1943","color":"#ef4444"},{"id":"b","text":"1945","color":"#3b82f6"},{"id":"c","text":"1947","color":"#eab308"},{"id":"d","text":"1949","color":"#22c55e"}]',
   'b', 20),
  ('history', 'Who was the first person to walk on the Moon?',
   '[{"id":"a","text":"Buzz Aldrin","color":"#ef4444"},{"id":"b","text":"Neil Armstrong","color":"#3b82f6"},{"id":"c","text":"Michael Collins","color":"#eab308"},{"id":"d","text":"Yuri Gagarin","color":"#22c55e"}]',
   'b', 20),
  ('history', 'In which year did the Berlin Wall fall?',
   '[{"id":"a","text":"1987","color":"#ef4444"},{"id":"b","text":"1989","color":"#3b82f6"},{"id":"c","text":"1991","color":"#eab308"},{"id":"d","text":"1993","color":"#22c55e"}]',
   'b', 20),
  ('history', 'Which ancient civilization built the Great Pyramid of Giza?',
   '[{"id":"a","text":"Greeks","color":"#ef4444"},{"id":"b","text":"Romans","color":"#3b82f6"},{"id":"c","text":"Egyptians","color":"#eab308"},{"id":"d","text":"Babylonians","color":"#22c55e"}]',
   'c', 20),
  ('history', 'Who painted the ceiling of the Sistine Chapel?',
   '[{"id":"a","text":"Leonardo da Vinci","color":"#ef4444"},{"id":"b","text":"Raphael","color":"#3b82f6"},{"id":"c","text":"Michelangelo","color":"#eab308"},{"id":"d","text":"Donatello","color":"#22c55e"}]',
   'c', 20),
  ('history', 'In which year did the Titanic sink?',
   '[{"id":"a","text":"1910","color":"#ef4444"},{"id":"b","text":"1912","color":"#3b82f6"},{"id":"c","text":"1914","color":"#eab308"},{"id":"d","text":"1916","color":"#22c55e"}]',
   'b', 20),
  ('pop-culture', 'Which movie won the Academy Award for Best Picture in 2020?',
   '[{"id":"a","text":"1917","color":"#ef4444"},{"id":"b","text":"Parasite","color":"#3b82f6"},{"id":"c","text":"Joker","color":"#eab308"},{"id":"d","text":"Once Upon a Time in Hollywood","color":"#22c55e"}]',
   'b', 25),
  ('pop-culture', 'What is the highest-grossing movie of all time?',
   '[{"id":"a","text":"Avatar","color":"#ef4444"},{"id":"b","text":"Avengers: Endgame","color":"#3b82f6"},{"id":"c","text":"Titanic","color":"#eab308"},{"id":"d","text":"Star Wars: The Force Awakens","color":"#22c55e"}]',
   'a', 20),
  ('pop-culture', 'Which artist has won the most Grammy Awards?',
   '[{"id":"a","text":"Beyoncé","color":"#ef4444"},{"id":"b","text":"Georg Solti","color":"#3b82f6"},{"id":"c","text":"Quincy Jones","color":"#eab308"},{"id":"d","text":"Taylor Swift","color":"#22c55e"}]',
   'b', 25),
  ('pop-culture', 'What is the name of the main character in "The Matrix"?',
   '[{"id":"a","text":"Neo","color":"#ef4444"},{"id":"b","text":"Morpheus","color":"#3b82f6"},{"id":"c","text":"Trinity","color":"#eab308"},{"id":"d","text":"Agent Smith","color":"#22c55e"}]',
   'a', 20),
  ('pop-culture', 'Which streaming service originally produced "Stranger Things"?',
   '[{"id":"a","text":"Hulu","color":"#ef4444"},{"id":"b","text":"Netflix","color":"#3b82f6"},{"id":"c","text":"Amazon Prime","color":"#eab308"},{"id":"d","text":"Disney+","color":"#22c55e"}]',
   'b', 20),
  ('pop-culture', 'What year did the first iPhone launch?',
   '[{"id":"a","text":"2005","color":"#ef4444"},{"id":"b","text":"2007","color":"#3b82f6"},{"id":"c","text":"2009","color":"#eab308"},{"id":"d","text":"2011","color":"#22c55e"}]',
   'b', 20),
  ('sports', 'How many players are on a soccer team on the field at one time?',
   '[{"id":"a","text":"9","color":"#ef4444"},{"id":"b","text":"10","color":"#3b82f6"},{"id":"c","text":"11","color":"#eab308"},{"id":"d","text":"12","color":"#22c55e"}]',
   'c', 20),
  ('sports', 'Which country has won the most FIFA World Cups?',
   '[{"id":"a","text":"Germany","color":"#ef4444"},{"id":"b","text":"Argentina","color":"#3b82f6"},{"id":"c","text":"Brazil","color":"#eab308"},{"id":"d","text":"Italy","color":"#22c55e"}]',
   'c', 20),
  ('sports', 'In basketball, how many points is a three-point shot worth?',
   '[{"id":"a","text":"2","color":"#ef4444"},{"id":"b","text":"3","color":"#3b82f6"},{"id":"c","text":"4","color":"#eab308"},{"id":"d","text":"5","color":"#22c55e"}]',
   'b', 15),
  ('sports', 'Which sport is played at Wimbledon?',
   '[{"id":"a","text":"Golf","color":"#ef4444"},{"id":"b","text":"Tennis","color":"#3b82f6"},{"id":"c","text":"Cricket","color":"#eab308"},{"id":"d","text":"Rugby","color":"#22c55e"}]',
   'b', 20),
  ('sports', 'How many Olympic rings are there?',
   '[{"id":"a","text":"4","color":"#ef4444"},{"id":"b","text":"5","color":"#3b82f6"},{"id":"c","text":"6","color":"#eab308"},{"id":"d","text":"7","color":"#22c55e"}]',
   'b', 20),
  ('sports', 'What is the national sport of Canada?',
   '[{"id":"a","text":"Hockey","color":"#ef4444"},{"id":"b","text":"Basketball","color":"#3b82f6"},{"id":"c","text":"Baseball","color":"#eab308"},{"id":"d","text":"Soccer","color":"#22c55e"}]',
   'a', 20),
  ('geography', 'What is the smallest country in the world?',
   '[{"id":"a","text":"Monaco","color":"#ef4444"},{"id":"b","text":"Vatican City","color":"#3b82f6"},{"id":"c","text":"San Marino","color":"#eab308"},{"id":"d","text":"Liechtenstein","color":"#22c55e"}]',
   'b', 20),
  ('geography', 'Which river is the longest in the world?',
   '[{"id":"a","text":"Amazon","color":"#ef4444"},{"id":"b","text":"Nile","color":"#3b82f6"},{"id":"c","text":"Yangtze","color":"#eab308"},{"id":"d","text":"Mississippi","color":"#22c55e"}]',
   'b', 20),
  ('geography', 'What is the capital of Australia?',
   '[{"id":"a","text":"Sydney","color":"#ef4444"},{"id":"b","text":"Melbourne","color":"#3b82f6"},{"id":"c","text":"Canberra","color":"#eab308"},{"id":"d","text":"Brisbane","color":"#22c55e"}]',
   'c', 20),
  ('geography', 'How many continents are there?',
   '[{"id":"a","text":"5","color":"#ef4444"},{"id":"b","text":"6","color":"#3b82f6"},{"id":"c","text":"7","color":"#eab308"},{"id":"d","text":"8","color":"#22c55e"}]',
   'c', 20),
  ('geography', 'What is the highest mountain in the world?',
   '[{"id":"a","text":"K2","color":"#ef4444"},{"id":"b","text":"Mount Everest","color":"#3b82f6"},{"id":"c","text":"Kilimanjaro","color":"#eab308"},{"id":"d","text":"Mount Fuji","color":"#22c55e"}]',
   'b', 20),
  ('geography', 'Which country is known as the Land of the Rising Sun?',
   '[{"id":"a","text":"China","color":"#ef4444"},{"id":"b","text":"Korea","color":"#3b82f6"},{"id":"c","text":"Japan","color":"#eab308"},{"id":"d","text":"Thailand","color":"#22c55e"}]',
   'c', 20),
  ('geography', 'What is the largest desert in the world?',
   '[{"id":"a","text":"Gobi Desert","color":"#ef4444"},{"id":"b","text":"Sahara Desert","color":"#3b82f6"},{"id":"c","text":"Arabian Desert","color":"#eab308"},{"id":"d","text":"Antarctic Desert","color":"#22c55e"}]',
   'd', 25),
  ('technology', 'What does "CPU" stand for?',
   '[{"id":"a","text":"Central Processing Unit","color":"#ef4444"},{"id":"b","text":"Computer Personal Unit","color":"#3b82f6"},{"id":"c","text":"Central Program Utility","color":"#eab308"},{"id":"d","text":"Computer Processing Utility","color":"#22c55e"}]',
   'a', 20),
  ('technology', 'Which programming language was created by Guido van Rossum?',
   '[{"id":"a","text":"Java","color":"#ef4444"},{"id":"b","text":"JavaScript","color":"#3b82f6"},{"id":"c","text":"Python","color":"#eab308"},{"id":"d","text":"C++","color":"#22c55e"}]',
   'c', 20),
  ('technology', 'What does "HTML" stand for?',
   '[{"id":"a","text":"HyperText Markup Language","color":"#ef4444"},{"id":"b","text":"High Tech Modern Language","color":"#3b82f6"},{"id":"c","text":"Home Tool Markup Language","color":"#eab308"},{"id":"d","text":"HyperText Modern Language","color":"#22c55e"}]',
   'a', 20),
  ('technology', 'What was the first widely used web browser?',
   '[{"id":"a","text":"Internet Explorer","color":"#ef4444"},{"id":"b","text":"Netscape Navigator","color":"#3b82f6"},{"id":"c","text":"Mosaic","color":"#eab308"},{"id":"d","text":"Safari","color":"#22c55e"}]',
   'c', 25),
  ('technology', 'What does "AI" stand for in technology?',
   '[{"id":"a","text":"Advanced Internet","color":"#ef4444"},{"id":"b","text":"Artificial Intelligence","color":"#3b82f6"},{"id":"c","text":"Automated Interface","color":"#eab308"},{"id":"d","text":"Application Integration","color":"#22c55e"}]',
   'b', 20),
  ('technology', 'Which company created the Android operating system?',
   '[{"id":"a","text":"Apple","color":"#ef4444"},{"id":"b","text":"Microsoft","color":"#3b82f6"},{"id":"c","text":"Google","color":"#eab308"},{"id":"d","text":"Samsung","color":"#22c55e"}]',
   'c', 20)
ON CONFLICT DO NOTHING;
