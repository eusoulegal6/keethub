-- Seed Semantic game entry (idempotent)
INSERT INTO public.games (slug, title, description, category, accent_color)
VALUES (
  'semantic',
  'Semantic',
  'Guess the secret word by entering semantically similar words. Each guess gets a rank — the closer to #1, the hotter you are!',
  'puzzle',
  '#22c55e'
)
ON CONFLICT (slug) DO NOTHING;
