import { AssetOption } from "@/lib/avatar/categories/assets";
import { cn } from "@/lib/utils";

interface OptionGridProps {
  options: AssetOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  columns?: number;
  showLabels?: boolean;
  category: string; // Category identifier (for future use)
}

export function OptionGrid({
  options,
  selectedId,
  onSelect,
  columns = 2,
  showLabels,
  category,
}: OptionGridProps) {

  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((option) => (
        <button
          key={option.id}
          onClick={() => onSelect(option.id)}
          className={cn(
            "px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
            "border-2 hover:scale-105 active:scale-95",
            selectedId === option.id
              ? "bg-primary text-primary-foreground border-primary shadow-soft"
              : "bg-card text-card-foreground border-border hover:border-primary/50"
          )}
          aria-pressed={selectedId === option.id}
        >
          {option.name}
        </button>
      ))}
    </div>
  );
}

