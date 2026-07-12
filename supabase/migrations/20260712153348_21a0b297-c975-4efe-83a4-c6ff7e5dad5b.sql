CREATE INDEX IF NOT EXISTS game_scores_user_id_idx ON public.game_scores(user_id);

INSERT INTO public.profiles (id, username)
SELECT DISTINCT gs.user_id, 'Player ' || substring(gs.user_id::text from 1 for 8)
FROM public.game_scores gs
LEFT JOIN public.profiles p ON p.id = gs.user_id
WHERE p.id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'game_scores_user_id_profiles_id_fkey'
  ) THEN
    ALTER TABLE public.game_scores
      ADD CONSTRAINT game_scores_user_id_profiles_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';