import { useState } from "react";
import type { Exercise } from "../types";
import { useAcademyStore } from "../store";
import { cn } from "@/lib/utils";

export function ExerciseWordBuilder({ exercise }: { exercise: Exercise }) {
  const submitAnswer = useAcademyStore((s) => s.submitAnswer);
  const isTransitioning = useAcademyStore((s) => s.isTransitioning);
  const [selected, setSelected] = useState<string[]>([]);
  const wordBank = exercise.wordBank ?? [];

  const addWord = (word: string) => {
    if (isTransitioning) return;
    setSelected((prev) => [...prev, word]);
  };

  const removeWord = (index: number) => {
    if (isTransitioning) return;
    setSelected((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (selected.length === 0 || isTransitioning) return;
    submitAnswer(selected.join(" "));
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 px-4">
      <h1 className="max-w-lg text-center text-2xl font-black text-[#10204A] sm:text-3xl">
        {exercise.question}
      </h1>

      <div className="flex min-h-[56px] w-full max-w-lg flex-wrap items-center gap-2 rounded-2xl border-2 border-[#E8ECF4] bg-[#FBFDFF] p-4">
        {selected.length === 0 && (
          <span className="text-sm font-medium text-[#BBC7D8]">Tap words to build your answer...</span>
        )}
        {selected.map((word, i) => (
          <button
            key={`${word}-${i}`}
            type="button"
            onClick={() => removeWord(i)}
            disabled={isTransitioning}
            className="rounded-xl border-2 border-b-4 border-[#58cc02] bg-[#e8f8e0] px-3 py-1.5 text-sm font-bold text-[#10204A] transition hover:brightness-105"
          >
            {word}
          </button>
        ))}
      </div>

      <div className="flex w-full max-w-lg flex-wrap justify-center gap-2">
        {wordBank.map((word, i) => {
          const used = selected.filter((w) => w === word).length;
          const available = wordBank.filter((w) => w === word).length;
          const isExhausted = used >= available;
          return (
            <button
              key={`${word}-${i}`}
              type="button"
              onClick={() => addWord(word)}
              disabled={isExhausted || isTransitioning}
              className={cn(
                "rounded-xl border-2 border-b-4 px-3 py-1.5 text-sm font-bold transition",
                isExhausted
                  ? "border-[#E8ECF4] bg-[#F4F7FB] text-[#BBC7D8] cursor-not-allowed"
                  : "border-[#E8ECF4] bg-white text-[#10204A] hover:border-[#BBC7D8]",
              )}
            >
              {word}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={selected.length === 0 || isTransitioning}
        className={cn(
          "h-12 rounded-full px-10 text-sm font-black text-white transition",
          selected.length > 0 && !isTransitioning
            ? "bg-[#58cc02] shadow-[0_4px_0_#46a302] hover:brightness-110"
            : "cursor-not-allowed bg-[#BBC7D8]",
        )}
      >
        Check
      </button>
    </div>
  );
}
