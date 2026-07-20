import type { Exercise } from "../types";
import { ExerciseMultipleChoice } from "./ExerciseMultipleChoice";
import { ExerciseWordBuilder } from "./ExerciseWordBuilder";

export function ExerciseDispatcher({ exercise }: { exercise: Exercise }) {
  switch (exercise.type) {
    case "SELECT_1_OF_3":
      return <ExerciseMultipleChoice exercise={exercise} />;
    case "WRITE_IN_ENGLISH":
      return <ExerciseWordBuilder exercise={exercise} />;
    default:
      return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm font-semibold text-[#667085]">
            Unknown exercise type.
          </p>
        </div>
      );
  }
}
