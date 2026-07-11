-- Seed Trivia Blitz game entry (idempotent)
INSERT INTO public.games (slug, title, description, category, accent_color)
VALUES (
  'trivia-blitz',
  'Trivia Blitz',
  'Fast-paced quiz game — pick a category, answer quickly, and climb the leaderboard. Speed and accuracy win!',
  'trivia',
  '#a78bfa'
)
ON CONFLICT (slug) DO NOTHING;
