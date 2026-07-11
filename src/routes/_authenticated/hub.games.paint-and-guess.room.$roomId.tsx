import { createFileRoute } from "@tanstack/react-router";
import { LazyRoom } from "@/games/paint-and-guess/loadable";

export const Route = createFileRoute(
  "/_authenticated/hub/games/paint-and-guess/room/$roomId",
)({
  ssr: false,
  component: LazyRoom,
});
