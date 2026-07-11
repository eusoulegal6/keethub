import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const Lobby = lazy(() => import("@/games/paint-and-guess/pages/Lobby"));

export const Route = createFileRoute(
  "/_authenticated/hub/games/paint-and-guess/",
)({
  ssr: false,
  component: () => (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
          Loading lobby...
        </div>
      }
    >
      <Lobby />
    </Suspense>
  ),
});
