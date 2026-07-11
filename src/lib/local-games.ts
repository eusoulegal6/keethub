import type { Game } from "@/lib/games.functions";

// Games registered here appear in the library even before
// they exist in the Supabase games table. When Supabase has
// a matching slug, the DB row takes precedence.
//
// The PORTED_GAMES map below controls which games get
// dedicated routes instead of the placeholder $slug catch-all.

export interface LocalGame {
  slug: string;
  route: string | null; // null = use $slug catch-all placeholder
  data: Game;
}

// Deterministic UUID v5-style — same input always gives same id,
// but collisions with real DB rows are astronomically unlikely.
function localId(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = ((h << 5) - h + slug.charCodeAt(i)) | 0;
  }
  const hex = (h >>> 0).toString(16).padStart(8, "0");
  return `00000000-0000-0000-0000-${hex}`;
}

export const LOCAL_GAMES: LocalGame[] = [
  {
    slug: "ping-pong",
    route: "/hub/games/ping-pong",
    data: {
      id: localId("ping-pong"),
      slug: "ping-pong",
      title: "Ping Pong",
      description: "Classic table tennis arcade. Challenge a friend or face the AI in a fast-paced paddle battle!",
      category: "arcade",
      thumbnail_url: null,
      accent_color: "#06b6d4",
      is_active: true,
      created_at: new Date().toISOString(),
    },
  },
  {
    slug: "semantic",
    route: "/hub/games/semantic",
    data: {
      id: localId("semantic"),
      slug: "semantic",
      title: "Semantic",
      description: "Guess the secret word by entering semantically similar words. Each guess gets a rank — the closer to #1, the hotter you are!",
      category: "puzzle",
      thumbnail_url: null,
      accent_color: "#22c55e",
      is_active: true,
      created_at: new Date().toISOString(),
    },
  },
  {
    slug: "chess",
    route: "/hub/games/chess",
    data: {
      id: localId("chess"),
      slug: "chess",
      title: "Chess",
      description: "Play chess locally, challenge the AI, or solve tactical puzzles. Classic strategy with a modern interface.",
      category: "strategy",
      thumbnail_url: null,
      accent_color: "#a78bfa",
      is_active: true,
      created_at: new Date().toISOString(),
    },
  },
  {
    slug: "paint-and-guess",
    route: "/hub/games/paint-and-guess",
    data: {
      id: localId("paint-and-guess"),
      slug: "paint-and-guess",
      title: "Paint & Guess",
      description: "Draw prompts, guess sketches, and keep the points flowing. Real-time multiplayer party game.",
      category: "party",
      thumbnail_url: null,
      accent_color: "#a78bfa",
      is_active: true,
      created_at: new Date().toISOString(),
    },
  },
  {
    slug: "trivia-blitz",
    route: "/hub/games/trivia-blitz",
    data: {
      id: localId("trivia-blitz"),
      slug: "trivia-blitz",
      title: "Trivia Blitz",
      description: "Fast-paced quiz game — pick a category, answer quickly, and climb the leaderboard. Speed and accuracy win!",
      category: "trivia",
      thumbnail_url: null,
      accent_color: "#a78bfa",
      is_active: true,
      created_at: new Date().toISOString(),
    },
  },
];

// Quick lookup: slug → dedicated route (null = placeholder)
export const PORTED_ROUTES: Record<string, string | null> = Object.fromEntries(
  LOCAL_GAMES.map((g) => [g.slug, g.route]),
);
