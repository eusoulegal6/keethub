import { createFileRoute } from "@tanstack/react-router";
import Room from "@/games/paint-and-guess/pages/Room";

export const Route = createFileRoute(
  "/_authenticated/hub/games/paint-and-guess/room/$roomId",
)({
  ssr: false,
  component: Room,
});
