import { CheckCircle2, XCircle, Clock, Layers } from "lucide-react";
import type { TimelineStats } from "./timelineTypes.ts";
import { CATEGORY_COLORS } from "./timelineTypes.ts";

interface Props {
  stats: TimelineStats;
  wallClockSeconds: number | null;
}

export function TimelineSummary({ stats, wallClockSeconds }: Props) {
  const activeSeconds = Math.round(stats.totalDurationMs / 1000);
  const top4 = stats.toolDistribution.slice(0, 4);
  const maxCount = top4.length > 0 ? top4[0].count : 1;
  const remaining = stats.toolDistribution.length - 4;

  return (
    <div className="space-y-3 px-1">
      {/* Top line stats */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground tabular-nums">{stats.totalCalls}</span> calls
        </span>
        <span>
          <span className="font-semibold text-foreground tabular-nums">{stats.uniqueTools}</span> tools
        </span>
        <span>
          <span className="font-semibold text-foreground tabular-nums">{stats.phaseCount}</span> phase{stats.phaseCount !== 1 ? "s" : ""}
        </span>
        {wallClockSeconds != null && wallClockSeconds > 0 && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTime(activeSeconds)} active / {formatTime(wallClockSeconds)} total
          </span>
        )}

        {/* Success rate */}
        <span className="flex items-center gap-1 ml-auto">
          {stats.errorCount > 0 ? (
            <>
              <XCircle className="h-3 w-3 text-red-500" />
              <span className="text-red-400">
                {stats.errorCount} error{stats.errorCount !== 1 ? "s" : ""}
              </span>
              <span className="text-muted-foreground/60">
                ({(stats.successRate * 100).toFixed(0)}% success)
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-400">100% success</span>
            </>
          )}
        </span>
      </div>

      {/* Tool distribution bars */}
      <div className="flex items-end gap-1.5 h-8">
        {top4.map((tool) => {
          const colors = CATEGORY_COLORS[tool.category];
          const heightPct = Math.max(15, (tool.count / maxCount) * 100);
          return (
            <div key={tool.name} className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
              <span className="text-[9px] font-mono tabular-nums text-muted-foreground">
                {tool.count}
              </span>
              <div
                className={`w-full rounded-sm ${colors.dot} opacity-40 transition-all`}
                style={{ height: `${heightPct}%`, minHeight: "4px" }}
              />
              <span className="text-[8px] font-mono text-muted-foreground truncate w-full text-center">
                {tool.name}
              </span>
            </div>
          );
        })}
        {remaining > 0 && (
          <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
            <span className="text-[9px] text-muted-foreground/50">
              +{remaining}
            </span>
            <div className="w-full h-2 rounded-sm bg-muted" />
            <span className="text-[8px] text-muted-foreground/50">more</span>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
