import { lazy, Suspense } from "react";
import type { ReactNode } from "react";

const GameProviderInner = lazy(() =>
  import("@/games/paint-and-guess/state/GameContext").then((m) => ({
    default: m.GameProvider,
  })),
);

const LobbyInner = lazy(() =>
  import("@/games/paint-and-guess/pages/Lobby").then((m) => ({
    default: m.default,
  })),
);

const RoomInner = lazy(() =>
  import("@/games/paint-and-guess/pages/Room").then((m) => ({
    default: m.default,
  })),
);

const fallback = (
  <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
    Loading Paint &amp; Guess...
  </div>
);

export function LazyGameProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={fallback}>
      <GameProviderInner>{children}</GameProviderInner>
    </Suspense>
  );
}

export function LazyLobby() {
  return (
    <Suspense fallback={fallback}>
      <LobbyInner />
    </Suspense>
  );
}

export function LazyRoom() {
  return (
    <Suspense fallback={fallback}>
      <RoomInner />
    </Suspense>
  );
}
