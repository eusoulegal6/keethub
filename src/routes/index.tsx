import { createFileRoute } from "@tanstack/react-router";

import { PrimKeetLanding } from "@/components/landing/PrimKeetLanding";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PrimKeet - Learn English through play" },
      {
        name: "description",
        content:
          "PrimKeet helps ESL students practice vocabulary, speaking, reading, and grammar through playful browser games.",
      },
      { property: "og:title", content: "PrimKeet - Learn English through play" },
      {
        property: "og:description",
        content:
          "Practice English with fun ESL games, progress tracking, points, and classroom-friendly leaderboards.",
      },
    ],
  }),
  component: PrimKeetLanding,
});
