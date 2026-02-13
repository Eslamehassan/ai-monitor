import { useState } from "react";
import { Badge } from "@/components/ui/badge.tsx";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  FileText,
  Search,
  Terminal,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  Layers,
} from "lucide-react";
import type { TimelineEvent } from "@/lib/api.ts";
import type { TimelineBurst } from "./timelineTypes.ts";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "./timelineTypes.ts";
import { formatSessionOffset } from "@/lib/utils.ts";

const CATEGORY_ICONS = {
  file: FileText,
  search: Search,
  execution: Terminal,
  agent: Zap,
  other: HelpCircle,
} as const;

interface Props {
  burst: TimelineBurst;
  sessionStart: string | null;
  selectedEventId: string | null;
  onSelectEvent: (ev: TimelineEvent) => void;
}

export function TimelineBurstGroup({ burst, sessionStart, selectedEventId, onSelectEvent }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isSingle = burst.count === 1;
  const colors = CATEGORY_COLORS[burst.category];
  const Icon = CATEGORY_ICONS[burst.category];

  const offset = formatSessionOffset(burst.startTimestamp, sessionStart);
  const endOffset = burst.count > 1
    ? formatSessionOffset(burst.endTimestamp, sessionStart)
    : null;

  // For single events, check if this is the selected one
  const singleEvent = isSingle ? burst.events[0] : null;
  const singleSelected = singleEvent
    ? getEventId(singleEvent) === selectedEventId
    : false;

  if (isSingle) {
    // Render as a simple single row
    return (
      <div
        className={`group flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-all duration-150 ${
          singleSelected
            ? "ring-1 ring-primary/50 bg-muted/40"
            : "hover:bg-muted/25"
        }`}
        onClick={() => singleEvent && onSelectEvent(singleEvent)}
      >
        {/* Category dot */}
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${colors.bg}`}>
          <Icon className={`h-3.5 w-3.5 ${colors.text}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="font-mono text-xs font-semibold truncate">{burst.toolName}</span>
          {burst.type === "tool_call" && (
            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${colors.bg} ${colors.text} ${colors.border}`}>
              {CATEGORY_LABELS[burst.category]}
            </Badge>
          )}
          {burst.type === "agent" && burst.events[0]?.agent?.agent_type && (
            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${colors.bg} ${colors.text} ${colors.border}`}>
              {burst.events[0].agent.agent_type}
            </Badge>
          )}
          {burst.errorCount > 0 ? (
            <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500/70 shrink-0" />
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground shrink-0">
          {burst.avgDurationMs != null && burst.avgDurationMs > 0 && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {formatDuration(burst.avgDurationMs)}
            </span>
          )}
          <span className="font-mono tabular-nums">{offset}</span>
        </div>
      </div>
    );
  }

  // Multi-event burst: collapsible group
  return (
    <div className="rounded-lg transition-colors">
      {/* Burst header */}
      <div
        className={`group flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-all duration-150 ${
          expanded ? "bg-muted/20" : "hover:bg-muted/25"
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Category dot with count */}
        <div className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${colors.bg}`}>
          <Icon className={`h-3.5 w-3.5 ${colors.text}`} />
        </div>

        {/* Expand/collapse chevron */}
        <div className="text-muted-foreground">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="font-mono text-xs font-semibold">{burst.toolName}</span>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono tabular-nums">
            &times;{burst.count}
          </Badge>
          {burst.isParallel && (
            <Layers className="h-3 w-3 text-muted-foreground" title="Parallel calls" />
          )}

          {/* Success/error mini bar */}
          {burst.count > 1 && (
            <div className="flex items-center gap-1">
              <div className="flex h-1.5 w-12 rounded-full overflow-hidden bg-muted">
                {burst.successCount > 0 && (
                  <div
                    className="h-full bg-emerald-500/70"
                    style={{ width: `${(burst.successCount / burst.count) * 100}%` }}
                  />
                )}
                {burst.errorCount > 0 && (
                  <div
                    className="h-full bg-red-500/70"
                    style={{ width: `${(burst.errorCount / burst.count) * 100}%` }}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground shrink-0">
          {burst.avgDurationMs != null && burst.avgDurationMs > 0 && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              avg {formatDuration(burst.avgDurationMs)}
            </span>
          )}
          <span className="font-mono tabular-nums">
            {offset}{endOffset && offset !== endOffset ? ` \u2192 ${endOffset}` : ""}
          </span>
        </div>
      </div>

      {/* Expanded individual events */}
      {expanded && (
        <div className="ml-6 border-l border-border/50 pl-4 py-1 space-y-0.5">
          {burst.events.map((ev, i) => {
            const evId = getEventId(ev);
            const isSelected = evId === selectedEventId;
            const tc = ev.tool_call;
            const ag = ev.agent;

            return (
              <div
                key={evId ?? i}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs cursor-pointer transition-colors ${
                  isSelected
                    ? "ring-1 ring-primary/50 bg-muted/40"
                    : "hover:bg-muted/30"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectEvent(ev);
                }}
              >
                <span className="font-mono text-[11px] text-muted-foreground w-12 shrink-0 tabular-nums">
                  {formatSessionOffset(ev.timestamp, sessionStart)}
                </span>
                <span className="font-mono text-[11px]">
                  {tc?.tool_name ?? ag?.agent_name ?? "Unknown"}
                </span>
                {tc?.status === "error" && (
                  <XCircle className="h-3 w-3 text-red-500" />
                )}
                {tc?.duration_ms != null && tc.duration_ms > 0 && (
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {formatDuration(tc.duration_ms)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getEventId(ev: TimelineEvent): string | null {
  if (ev.type === "tool_call" && ev.tool_call?.id != null) return `tc-${ev.tool_call.id}`;
  if (ev.type === "agent" && ev.agent?.id != null) return `ag-${ev.agent.id}`;
  return null;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}
