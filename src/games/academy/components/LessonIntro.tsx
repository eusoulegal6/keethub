import { useAcademyStore } from "../store";
import { getTileById } from "../data/curriculum";

export function LessonIntro() {
  const activeTileId = useAcademyStore((s) => s.activeTileId);
  const advanceToExercise = useAcademyStore((s) => s.advanceToExercise);
  const tile = activeTileId ? getTileById(activeTileId) : null;

  if (!tile) return null;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-3xl font-black text-[#10204A] sm:text-4xl">{tile.title}</h1>
      <p className="max-w-md text-lg font-semibold text-[#667085]">
        {tile.description}
      </p>
      <p className="text-sm font-bold text-[#667085]">
        {tile.exercises.length} {tile.exercises.length === 1 ? "exercise" : "exercises"} in this lesson
      </p>
      <button
        type="button"
        onClick={advanceToExercise}
        className="mt-4 inline-flex h-14 items-center justify-center rounded-full bg-[#58cc02] px-10 text-lg font-black text-white shadow-[0_6px_0_#46a302] transition hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
      >
        Start
      </button>
    </div>
  );
}
