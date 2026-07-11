import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const Room = lazy(() => import("@/games/paint-and-guess/pages/Room"));

export const Route = createFileRoute(
  "/_authenticated/hub/games/paint-and-guess/room/$roomId",
)({
  ssr: false,
  component: () => (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
          Joining room...
        </div>
      }
    >
      <Room />
    </Suspense>
  ),
});
