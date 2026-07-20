import type { Unit } from "../types";
import { useAcademyStore } from "../store";
import { TileNode } from "./TileNode";

export function UnitSection({ unit }: { unit: Unit }) {
  const completedTiles = useAcademyStore((s) => s.completedTiles);
  const totalTiles = unit.tiles.length;
  const done = unit.tiles.filter((t) => completedTiles.includes(t.id)).length;

  return (
    <section className="mb-10">
      <header
        className="rounded-2xl px-6 py-5 text-white"
        style={{ backgroundColor: unit.color }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-white/70">
              Unit {unit.order}
            </p>
            <h2 className="text-2xl font-black">{unit.title}</h2>
            <p className="mt-1 text-sm font-semibold text-white/80">
              {unit.description}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-white/70">
              {done} / {totalTiles}
            </p>
            <div className="mt-2 h-2 w-24 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${totalTiles > 0 ? (done / totalTiles) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap justify-center gap-4">
        {unit.tiles.map((tile) => (
          <TileNode key={tile.id} tile={tile} />
        ))}
      </div>
    </section>
  );
}
