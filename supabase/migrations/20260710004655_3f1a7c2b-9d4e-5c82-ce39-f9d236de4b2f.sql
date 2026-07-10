-- Seed Chess game entry (idempotent)
INSERT INTO public.games (slug, title, description, category, accent_color)
VALUES (
  'chess',
  'Chess',
  'Play chess locally, challenge the AI, or solve tactical puzzles. Classic strategy with a modern interface.',
  'strategy',
  '#a78bfa'
)
ON CONFLICT (slug) DO NOTHING;
