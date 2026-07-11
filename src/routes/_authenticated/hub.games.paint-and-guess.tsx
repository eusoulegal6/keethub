import { Outlet, createFileRoute } from "@tanstack/react-router";
import { LazyGameProvider } from "@/games/paint-and-guess/loadable";

export const Route = createFileRoute(
  "/_authenticated/hub/games/paint-and-guess",
)({
  ssr: false,
  component: PaintAndGuessLayout,
});

function PaintAndGuessLayout() {
  return (
    <LazyGameProvider>
      <Outlet />
    </LazyGameProvider>
  );
}
