import { useNavigate } from "@tanstack/react-router";
import { Trophy, Target, Clock } from "lucide-react";
import { useAcademyStore } from "../store";
import { getTileById } from "../data/curriculum";

export function LessonComplete() {
  const navigate = useNavigate();
  const correctCount = useAcademyStore((s) => s.correctCount);
  const attempts = useAcademyStore((s) => s.attempts);
  const activeTileId = useAcademyStore((s) => s.activeTileId);
  const returnToPath = useAcademyStore((s) => s.returnToPath);
  const totalExercises = attempts.length;
  const accuracy =
    totalExercises > 0 ? Math.round((correctCount / totalExercises) * 100) : 0;
  const tile = activeTileId ? getTileById(activeTileId) : null;

  const handleReturn = () => {
    returnToPath();
    navigate({ to: "/hub/academy" });
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-yellow-100 text-yellow-500">
        <Trophy className="h-10 w-10" />
      </div>

      <h1 className="text-3xl font-black text-[#10204A]">Lesson Complete!</h1>

      {tile && (
        <p className="text-lg font-semibold text-[#667085]">{tile.title}</p>
      )}

      <div className="flex flex-wrap justify-center gap-4">
        <div className="min-w-[100px] rounded-xl border-2 border-[#58cc02] bg-[#58cc02]">
          <p className="py-1 text-center text-xs font-black text-white">XP Earned</p>
          <div className="flex justify-center rounded-xl bg-white py-3">
            <span className="text-xl font-black text-[#58cc02]">{correctCount}</span>
          </div>
        </div>
        <div className="min-w-[100px] rounded-xl border-2 border-[#08AAA7] bg-[#08AAA7]">
          <p className="py-1 text-center text-xs font-black text-white">Accuracy</p>
          <div className="flex justify-center rounded-xl bg-white py-3">
            <span className="text-xl font-black text-[#08AAA7]">{accuracy}%</span>
          </div>
        </div>
        <div className="min-w-[100px] rounded-xl border-2 border-[#FF9418] bg-[#FF9418]">
          <p className="py-1 text-center text-xs font-black text-white">Correct</p>
          <div className="flex justify-center rounded-xl bg-white py-3">
            <span className="text-xl font-black text-[#FF9418]">
              {correctCount}/{totalExercises}
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleReturn}
        className="mt-4 inline-flex h-14 items-center justify-center rounded-full bg-[#58cc02] px-10 text-lg font-black text-white shadow-[0_6px_0_#46a302] transition hover:brightness-110 hover:-translate-y-0.5"
      >
        Return to Academy
      </button>
    </div>
  );
}
