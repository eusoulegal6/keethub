import { GraduationCap } from "lucide-react";
import { UNITS } from "../data/curriculum";
import { useAcademyStore } from "../store";
import { UnitSection } from "./UnitSection";

export function UnitPath() {
  const completedTiles = useAcademyStore((s) => s.completedTiles);
  const totalLessonsCompleted = useAcademyStore((s) => s.totalLessonsCompleted);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-10">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[#ECFBFA] text-[#08AAA7]">
            <GraduationCap className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-3xl font-black text-[#10204A] sm:text-4xl">Academy</h1>
            <p className="text-sm font-semibold text-[#667085]">
              Build skills with structured lessons
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-6">
          <div className="rounded-xl border border-[#E8ECF4] bg-white px-5 py-3 text-center">
            <p className="text-2xl font-black text-[#10204A]">{totalLessonsCompleted}</p>
            <p className="text-xs font-bold uppercase text-[#667085]">Lessons done</p>
          </div>
          <div className="rounded-xl border border-[#E8ECF4] bg-white px-5 py-3 text-center">
            <p className="text-2xl font-black text-[#10204A]">{completedTiles.length}</p>
            <p className="text-xs font-bold uppercase text-[#667085]">Tiles complete</p>
          </div>
          <div className="rounded-xl border border-[#E8ECF4] bg-white px-5 py-3 text-center">
            <p className="text-2xl font-black text-[#10204A]">{UNITS.length}</p>
            <p className="text-xs font-bold uppercase text-[#667085]">Units</p>
          </div>
        </div>
      </div>

      {UNITS.map((unit) => (
        <UnitSection key={unit.id} unit={unit} />
      ))}

      {completedTiles.length === 0 && (
        <p className="mt-4 text-center text-sm font-semibold text-[#667085]">
          Tap the first tile to start your first lesson!
        </p>
      )}
    </div>
  );
}
