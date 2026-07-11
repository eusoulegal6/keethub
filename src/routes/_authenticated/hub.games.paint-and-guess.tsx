import { Outlet, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const GameProvider = lazy(() =>
  import("@/games/paint-and-guess").then((m) => ({ default: m.GameProvider })),
);

export const Route = createFileRoute(
  "/_authenticated/hub/games/paint-and-guess",
)({
  ssr: false,
  component: PaintAndGuessLayout,
});

function PaintAndGuessLayout() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
          Loading Paint &amp; Guess...
        </div>
      }
    >
      <GameProvider>
        <Outlet />
      </GameProvider>
    </Suspense>
  );
}
