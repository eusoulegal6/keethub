import { useState } from "react";
import type { Exercise } from "../types";
import { useAcademyStore } from "../store";
import { cn } from "@/lib/utils";

export function ExerciseMultipleChoice({ exercise }: { exercise: Exercise }) {
  const submitAnswer = useAcademyStore((s) => s.submitAnswer);
  const isTransitioning = useAcademyStore((s) => s.isTransitioning);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    if (isTransitioning) return;
    setSelectedId(id);
  };

  const handleSubmit = () => {
    if (!selectedId || isTransitioning) return;
    const choice = exercise.choices?.find((c) => c.id === selectedId);
    submitAnswer(choice?.text ?? "");
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 px-4">
      <h1 className="max-w-lg text-center text-2xl font-black text-[#10204A] sm:text-3xl">
        {exercise.question}
      </h1>

      <div className="grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-3">
        {(exercise.choices ?? []).map((choice) => (
          <button
            key={choice.id}
            type="button"
            onClick={() => handleSelect(choice.id)}
            disabled={isTransitioning}
            className={cn(
              "flex flex-col items-center gap-2 rounded-2xl border-2 border-b-4 p-5 transition-all",
              selectedId === choice.id
                ? "border-[#58cc02] bg-[#e8f8e0] text-[#10204A] shadow-sm"
                : "border-[#E8ECF4] bg-white text-[#10204A] hover:border-[#BBC7D8] hover:bg-[#FBFDFF]",
              isTransitioning && "pointer-events-none",
            )}
          >
            {choice.icon && <span className="text-3xl">{choice.icon}</span>}
            <span className="text-sm font-bold">{choice.text}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!selectedId || isTransitioning}
        className={cn(
          "h-12 rounded-full px-10 text-sm font-black text-white transition",
          selectedId && !isTransitioning
            ? "bg-[#58cc02] shadow-[0_4px_0_#46a302] hover:brightness-110"
            : "cursor-not-allowed bg-[#BBC7D8]",
        )}
      >
        Check
      </button>
    </div>
  );
}
