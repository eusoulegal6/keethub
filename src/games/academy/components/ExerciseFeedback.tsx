import { useEffect } from "react";
import { Check, X } from "lucide-react";
import { useAcademyStore } from "../store";
import { getTileById } from "../data/curriculum";

export function ExerciseFeedback() {
  const attempts = useAcademyStore((s) => s.attempts);
  const activeTileId = useAcademyStore((s) => s.activeTileId);
  const advanceFromFeedback = useAcademyStore((s) => s.advanceFromFeedback);
  const phase = useAcademyStore((s) => s.phase);

  const tile = activeTileId ? getTileById(activeTileId) : null;
  const lastAttempt = attempts[attempts.length - 1];
  const currentExercise = tile?.exercises[attempts.length - 1];
  const isCorrect = lastAttempt?.isCorrect ?? false;

  useEffect(() => {
    if (phase !== "feedback") return;
    const timer = setTimeout(() => {
      advanceFromFeedback();
    }, 1800);
    return () => clearTimeout(timer);
  }, [phase, advanceFromFeedback]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div
        className={`grid h-20 w-20 place-items-center rounded-full ${
          isCorrect ? "bg-[#e8f8e0] text-[#58cc02]" : "bg-[#ffeaea] text-[#E5484D]"
        }`}
      >
        {isCorrect ? <Check className="h-10 w-10" /> : <X className="h-10 w-10" />}
      </div>

      <h2
        className={`text-2xl font-black ${
          isCorrect ? "text-[#58cc02]" : "text-[#E5484D]"
        }`}
      >
        {isCorrect ? "Correct!" : "Not quite"}
      </h2>

      {!isCorrect && currentExercise && (
        <p className="max-w-md text-lg font-semibold text-[#667085]">
          Answer: <span className="font-black text-[#10204A]">{currentExercise.correctAnswer}</span>
        </p>
      )}

      <p className="text-sm font-medium text-[#BBC7D8]">Continuing...</p>
    </div>
  );
}
