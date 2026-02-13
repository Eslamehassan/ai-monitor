import { Search, List, Layers, AlignJustify } from "lucide-react";
import type { ToolCategory } from "./timelineTypes.ts";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "./timelineTypes.ts";

export type ViewMode = "grouped" | "flat" | "compact";

interface Props {
  filter: string;
  onFilterChange: (val: string) => void;
  activeCategories: Set<ToolCategory>;
  onToggleCategory: (cat: ToolCategory) => void;
  showErrorsOnly: boolean;
  onToggleErrorsOnly: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const ALL_CATEGORIES: ToolCategory[] = ["file", "search", "execution", "agent", "other"];

const VIEW_MODES: { mode: ViewMode; icon: typeof List; label: string }[] = [
  { mode: "grouped", icon: Layers, label: "Grouped" },
  { mode: "flat", icon: List, label: "Flat" },
  { mode: "compact", icon: AlignJustify, label: "Compact" },
];

export function TimelineToolbar({
  filter,
  onFilterChange,
  activeCategories,
  onToggleCategory,
  showErrorsOnly,
  onToggleErrorsOnly,
  viewMode,
  onViewModeChange,
}: Props) {
  return (
    <div className="space-y-2.5">
      {/* Search + view mode */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter tools, paths..."
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            className="h-8 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* View mode toggle */}
        <div className="flex items-center rounded-md border border-border overflow-hidden">
          {VIEW_MODES.map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`flex items-center gap-1 px-2 py-1.5 text-[10px] transition-colors ${
                viewMode === mode
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
              title={label}
            >
              <Icon className="h-3 w-3" />
            </button>
          ))}
        </div>
      </div>

      {/* Category chips + errors filter */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {ALL_CATEGORIES.map((cat) => {
          const colors = CATEGORY_COLORS[cat];
          const active = activeCategories.has(cat);
          return (
            <button
              key={cat}
              onClick={() => onToggleCategory(cat)}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium border transition-all ${
                active
                  ? `${colors.bg} ${colors.text} ${colors.border}`
                  : "border-transparent text-muted-foreground/50 hover:text-muted-foreground"
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${active ? colors.dot : "bg-muted-foreground/30"}`} />
              {CATEGORY_LABELS[cat]}
            </button>
          );
        })}

        <div className="w-px h-4 bg-border mx-1" />

        <button
          onClick={onToggleErrorsOnly}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium border transition-all ${
            showErrorsOnly
              ? "bg-red-500/15 text-red-400 border-red-500/30"
              : "border-transparent text-muted-foreground/50 hover:text-muted-foreground"
          }`}
        >
          Errors only
        </button>
      </div>
    </div>
  );
}
