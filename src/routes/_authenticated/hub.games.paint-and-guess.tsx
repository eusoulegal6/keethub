import { Outlet, createFileRoute } from "@tanstack/react-router";
import { GameProvider } from "@/games/paint-and-guess";

export const Route = createFileRoute(
  "/_authenticated/hub/games/paint-and-guess",
)({
  ssr: false,
  component: PaintAndGuessLayout,
});

function PaintAndGuessLayout() {
  return (
    <GameProvider>
      <Outlet />
    </GameProvider>
  );
}
