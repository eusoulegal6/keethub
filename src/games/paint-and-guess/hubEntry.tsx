import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { NormalizedGameEntry } from "@/games/registry/schema";

export function getPaintPreviewEntry(): NormalizedGameEntry {
  return {
    id: "paint-and-guess",
    version: "1.1.0",
    name: { default: "Paint & Guess" },
    description: {
      default: "Draw prompts, guess sketches, and keep the points flowing.",
    },
    status: "stable",
    supportedPlayers: { min: 2, max: 12, recommended: 6 },
    monetization: "free",
    category: ["party", "drawing"],
    badges: ["hot"],
    assets: {
      thumbnail: "/placeholder.svg",
      patchNotesUrl: "https://example.com/paint-and-guess/patch-notes",
    },
    navigation: {
      category: "featured",
      priority: 100,
    },
    visibleIf: ["public"],
    route: { slug: "paint-and-guess" },
    featureFlags: [],
    metrics: {
      concurrentUsers: 1200,
      uptimePercentage: 99.9,
    },
    plugin: {
      previewComponent: "paintPreview",
      moduleId: "@/games/paint-and-guess",
    },
  };
}

export function PaintPreviewCard() {
  return (
    <Card className="border-dashed bg-muted/40">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge variant="default">Featured</Badge>
          <CardTitle>Paint &amp; Guess</CardTitle>
        </div>
        <CardDescription>Party-friendly drawing and guessing.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Real-time rooms, chatty avatars, and prompt packs make this a staple for teams.
      </CardContent>
    </Card>
  );
}

export function getPaintPreviewComponent() {
  return PaintPreviewCard;
}

