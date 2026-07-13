-- Seed Paint & Guess game entry for shared leaderboard submissions.
INSERT INTO public.games (slug, title, description, category, accent_color)
VALUES (
  'paint-and-guess',
  'Paint & Guess',
  'Draw prompts, guess sketches, and keep the points flowing. Real-time multiplayer party game.',
  'party',
  '#a78bfa'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  accent_color = EXCLUDED.accent_color;
