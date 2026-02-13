import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import type { TimelineEvent } from "@/lib/api.ts";
import type { TimelinePhaseData } from "./timelineTypes.ts";
import { CATEGORY_COLORS } from "./timelineTypes.ts";
import { TimelineBurstGroup } from "./TimelineBurstGroup.tsx";
import { formatSessionOffset } from "@/lib/utils.ts";

interface Props {
  phase: TimelinePhaseData;
  index: number;
  sessionStart: string | null;
  selectedEventId: string | null;
  onSelectEvent: (ev: TimelineEvent) => void;
  defaultExpanded?: boolean;
}

export function TimelinePhase({
  phase,
  index,
  sessionStart,
  selectedEventId,
  onSelectEvent,
  defaultExpanded = true,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const colors = CATEGORY_COLORS[phase.dominantCategory];

  const startOffset = formatSessionOffset(phase.startTimestamp, sessionStart);
  const endOffset = formatSessionOffset(phase.endTimestamp, sessionStart);
  const timeRange = startOffset === endOffset ? startOffset : `${startOffset} \u2192 ${endOffset}`;

  // Top 3 tools as summary chips
  const topTools = phase.toolSummary.slice(0, 3);
  const remaining = phase.toolSummary.length - 3;

  return (
    <div className="relative">
      {/* Phase header */}
      <div
        className="sticky top-0 z-10 flex items-center gap-2 px-2 py-2 cursor-pointer select-none backdrop-blur-sm bg-background/80"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Phase indicator line */}
        <div className={`h-px flex-1 max-w-4 ${colors.dot} opacity-40`} />
        <div className={`w-1.5 h-1.5 rounded-full ${colors.dot} opacity-60`} />

        {expanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
        )}

        <span className={`text-[10px] font-semibold uppercase tracking-widest ${colors.text}`}>
          {phase.label}
        </span>

        <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
          {timeRange}
        </span>

        <span className="text-[10px] text-muted-foreground">
          &middot; {phase.totalCalls} call{phase.totalCalls !== 1 ? "s" : ""}
        </span>

        {/* Tool chips (collapsed view) */}
        {!expanded && (
          <div className="flex items-center gap-1 ml-1">
            {topTools.map((t) => (
              <span
                key={t.name}
                className="text-[9px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded"
              >
                {t.name} {t.count > 1 ? `\u00d7${t.count}` : ""}
              </span>
            ))}
            {remaining > 0 && (
              <span className="text-[9px] text-muted-foreground">+{remaining}</span>
            )}
          </div>
        )}

        <div className={`h-px flex-1 ${colors.dot} opacity-20`} />
      </div>

      {/* Phase content */}
      {expanded && (
        <div className="space-y-0.5 pb-2">
          {phase.bursts.map((burst) => (
            <TimelineBurstGroup
              key={burst.id}
              burst={burst}
              sessionStart={sessionStart}
              selectedEventId={selectedEventId}
              onSelectEvent={onSelectEvent}
            />
          ))}
        </div>
      )}
    </div>
  );
}
