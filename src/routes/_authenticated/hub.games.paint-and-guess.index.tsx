import { createFileRoute } from "@tanstack/react-router";
import { LazyLobby } from "@/games/paint-and-guess/loadable";

export const Route = createFileRoute(
  "/_authenticated/hub/games/paint-and-guess/",
)({
  ssr: false,
  component: LazyLobby,
});
