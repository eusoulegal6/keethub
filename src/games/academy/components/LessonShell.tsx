import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Heart } from "lucide-react";
import { useAcademyStore } from "../store";
import { getTileById } from "../data/curriculum";
import { LessonIntro } from "./LessonIntro";
import { ExerciseDispatcher } from "./ExerciseDispatcher";
import { ExerciseFeedback } from "./ExerciseFeedback";
import { LessonComplete } from "./LessonComplete";
import { LessonFail } from "./LessonFail";
import { cn } from "@/lib/utils";

export function LessonShell() {
  const navigate = useNavigate();
  const phase = useAcademyStore((s) => s.phase);
  const activeTileId = useAcademyStore((s) => s.activeTileId);
  const hearts = useAcademyStore((s) => s.hearts);
  const correctCount = useAcademyStore((s) => s.correctCount);
  const currentExerciseIndex = useAcademyStore((s) => s.currentExerciseIndex);
  const returnToPath = useAcademyStore((s) => s.returnToPath);
  const [quitOpen, setQuitOpen] = useState(false);

  const tile = activeTileId ? getTileById(activeTileId) : null;
  if (!tile) return null;

  const total = tile.exercises.length;
  const currentExercise = tile.exercises[currentExerciseIndex];
  const isTerminal = phase === "complete" || phase === "fail";

  const handleQuit = () => {
    returnToPath();
    navigate({ to: "/hub/academy" });
  };

  return (
    <div className="flex min-h-[calc(100vh-5.5rem)] flex-col">
      {/* Top bar */}
      {!isTerminal && (
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[#E8ECF4] bg-white/92 px-4 py-3 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setQuitOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-full text-[#667085] transition hover:bg-[#F4F7FB] hover:text-[#E5484D]"
            aria-label="Exit lesson"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          {/* Progress bar */}
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#E8ECF4]">
            <div
              className="h-full rounded-full bg-[#58cc02] transition-all duration-500"
              style={{ width: `${total > 0 ? (correctCount / total) * 100 : 0}%` }}
            />
          </div>

          {/* Hearts */}
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <Heart
                key={i}
                className={cn(
                  "h-5 w-5 transition-colors",
                  i < hearts ? "fill-[#E5484D] text-[#E5484D]" : "text-[#BBC7D8]",
                )}
              />
            ))}
          </div>
        </header>
      )}

      {/* Phase content */}
      <div className="flex-1">
        {phase === "intro" && <LessonIntro />}
        {phase === "exercise" && currentExercise && (
          <ExerciseDispatcher exercise={currentExercise} />
        )}
        {phase === "feedback" && <ExerciseFeedback />}
        {phase === "complete" && <LessonComplete />}
        {phase === "fail" && <LessonFail />}
      </div>

      {/* Quit confirmation overlay */}
      {quitOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setQuitOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
            <h2 className="text-lg font-black text-[#10204A]">Quit lesson?</h2>
            <p className="mt-1 text-sm font-semibold text-[#667085]">
              All progress in this lesson will be lost.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setQuitOpen(false)}
                className="flex-1 rounded-full border-2 border-[#E8ECF4] py-2.5 text-sm font-black text-[#667085] transition hover:bg-[#F4F7FB]"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={handleQuit}
                className="flex-1 rounded-full bg-[#E5484D] py-2.5 text-sm font-black text-white shadow-[0_4px_0_#c53030] transition hover:brightness-110"
              >
                Quit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
