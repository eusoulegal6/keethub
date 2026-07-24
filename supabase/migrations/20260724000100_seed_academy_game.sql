-- Seed Academy game entry (idempotent)
INSERT INTO public.games (slug, title, description, category, accent_color)
VALUES (
  'academy',
  'Academy',
  'Interactive English lessons — build vocabulary and grammar through bite-sized exercises.',
  'learning',
  '#58cc02'
)
ON CONFLICT (slug) DO NOTHING;
