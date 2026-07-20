import type { Unit } from "../types";
import { useAcademyStore } from "../store";
import { TileNode } from "./TileNode";

export function UnitSection({ unit }: { unit: Unit }) {
  const completedTiles = useAcademyStore((s) => s.completedTiles);
  const totalTiles = unit.tiles.length;
  const done = unit.tiles.filter((tile) => completedTiles.includes(tile.id)).length;

  return (
    <section className="mb-12 last:mb-0">
      <header
        className="relative overflow-hidden rounded-[27px] px-7 py-8 text-white shadow-[0_10px_18px_rgba(16,32,74,0.18)] sm:px-10 sm:py-9"
        style={{
          background: `linear-gradient(135deg, ${unit.color}, color-mix(in srgb, ${unit.color} 78%, #10204A))`,
        }}
      >
        <div
          aria-hidden
          className="absolute -bottom-10 -left-3 h-24 w-32 rounded-[100%] bg-[#A9EB43]/30"
        />
        <div
          aria-hidden
          className="absolute -right-8 -top-12 h-44 w-44 rounded-full bg-[#B3ED4B]/20"
        />
        <div className="relative flex items-center justify-between gap-5">
          <div>
            <p className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-black uppercase tracking-wide text-white/90">
              Unit {unit.order}
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-[42px]">{unit.title}</h2>
            <p className="mt-2 text-base font-bold text-white/95 sm:text-lg">{unit.description}</p>
          </div>
          <div className="min-w-[125px] self-center text-center">
            <p className="text-xl font-black">
              {done} / {totalTiles}
            </p>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/35">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${totalTiles ? (done / totalTiles) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="relative mx-auto mt-7 flex max-w-[950px] flex-col items-center justify-between gap-5 md:flex-row md:gap-9">
        <div
          aria-hidden
          className="absolute left-[17%] right-[17%] top-1/2 hidden border-t-2 border-dashed border-[#D4DBE7] md:block"
        />
        {unit.tiles.map((tile) => (
          <TileNode key={tile.id} tile={tile} />
        ))}
      </div>
    </section>
  );
}
