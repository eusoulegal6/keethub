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
];

// Quick lookup: slug → dedicated route (null = placeholder)
export const PORTED_ROUTES: Record<string, string | null> = Object.fromEntries(
  LOCAL_GAMES.map((g) => [g.slug, g.route]),
);
