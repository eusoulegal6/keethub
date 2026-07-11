import { createFileRoute } from "@tanstack/react-router";
import Lobby from "@/games/paint-and-guess/pages/Lobby";

export const Route = createFileRoute(
  "/_authenticated/hub/games/paint-and-guess/",
)({
  ssr: false,
  component: Lobby,
});
