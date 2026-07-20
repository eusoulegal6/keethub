import { useNavigate } from "@tanstack/react-router";
import { BookOpen, Dumbbell, Star, Trophy, Zap, Lock, Check } from "lucide-react";
import type { Tile, TileType } from "../types";
import { useAcademyStore } from "../store";
import { getTileStatus } from "../data/curriculum";
import { cn } from "@/lib/utils";

const tileIcons: Record<TileType, typeof Star> = {
  star: Star,
  book: BookOpen,
  dumbbell: Dumbbell,
  trophy: Trophy,
  treasure: Star,
  "fast-forward": Zap,
};

export function TileNode({ tile }: { tile: Tile }) {
  const completedTiles = useAcademyStore((s) => s.completedTiles);
  const startLesson = useAcademyStore((s) => s.startLesson);
  const unitId = useAcademyStore((s) => s.activeUnitId);
  const navigate = useNavigate();
  const status = getTileStatus(tile.id, completedTiles);

  const Icon = tileIcons[tile.type];

  const colors = {
    LOCKED: "border-[#b7b7b7] bg-[#e5e5e5] text-[#9ca3af]",
    ACTIVE: "border-[#58cc02] bg-[#58cc02] text-white shadow-[0_6px_0_#46a302]",
    COMPLETE: "border-yellow-500 bg-yellow-400 text-white shadow-[0_6px_0_#ca8a04]",
  };

  const handleClick = () => {
    if (status === "LOCKED") return;
    const allUnits = [
      ...new Set(completedTiles.map((id) => id.split("-").slice(0, 2).join("-"))),
    ];
    const parentUnitId = allUnits.length > 0 ? `unit-1` : "unit-1";
    startLesson(parentUnitId, tile.id);
    navigate({ to: "/hub/academy/lesson" });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === "LOCKED"}
      className={cn(
        "relative flex h-[80px] w-[80px] flex-col items-center justify-center gap-1 rounded-full border-b-4 transition-all",
        colors[status],
        status === "ACTIVE" && "hover:brightness-110 hover:-translate-y-0.5",
        status === "COMPLETE" && "hover:brightness-105",
        status === "LOCKED" && "cursor-not-allowed",
      )}
    >
      {status === "COMPLETE" ? (
        <Check className="h-6 w-6" />
      ) : status === "LOCKED" ? (
        <Lock className="h-5 w-5" />
      ) : (
        <Icon className="h-6 w-6" />
      )}
      <span className="text-[10px] font-extrabold leading-none">{tile.title}</span>
      {status === "ACTIVE" && (
        <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white animate-pulse">
          !
        </span>
      )}
    </button>
  );
}
