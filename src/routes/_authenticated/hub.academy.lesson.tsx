import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LessonShell } from "@/games/academy/components/LessonShell";
import { useAcademyStore } from "@/games/academy/store";

export const Route = createFileRoute("/_authenticated/hub/academy/lesson")({
  ssr: false,
  component: AcademyLessonPage,
});

function AcademyLessonPage() {
  const activeTileId = useAcademyStore((s) => s.activeTileId);
  const navigate = useNavigate();

  useEffect(() => {
    if (!activeTileId) {
      navigate({ to: "/hub/academy", replace: true });
    }
  }, [activeTileId, navigate]);

  if (!activeTileId) return null;

  return <LessonShell />;
}
