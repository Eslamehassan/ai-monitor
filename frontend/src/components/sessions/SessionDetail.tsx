import { useState, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import {
  ArrowLeft,
  Zap,
  XCircle,
} from "lucide-react";
import type { SessionDetail as SessionDetailType, TimelineEvent, ToolCall } from "@/lib/api.ts";
import { fetchTimeline } from "@/lib/api.ts";
import {
  formatTokens,
  formatCost,
  relativeTime,
  formatDuration,
  formatSessionOffset,
} from "@/lib/utils.ts";
import { usePollingData } from "@/hooks/useAutoRefresh.ts";
import { DetailPanel } from "./DetailPanel.tsx";
import { TimelineBurstGroup } from "./TimelineBurstGroup.tsx";
import { TimelinePhase } from "./TimelinePhase.tsx";
import { TimelineSummary } from "./TimelineSummary.tsx";
import { TimelineToolbar, type ViewMode } from "./TimelineToolbar.tsx";
import { TimelineScrubber } from "./TimelineScrubber.tsx";
import { TimelineItem } from "./TimelineItem.tsx";
import {
  groupIntoBursts,
  groupIntoPhases,
  computeTimelineStats,
  getToolCategory,
  type ToolCategory,
} from "./timelineTypes.ts";

interface Props {
  session: SessionDetailType;
  onBack: () => void;
}

export function SessionDetail({ session, onBack }: Props) {
  const [timelineFilter, setTimelineFilter] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grouped");
  const [activeCategories, setActiveCategories] = useState<Set<ToolCategory>>(
    () => new Set(["file", "search", "execution", "agent", "other"])
  );
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: timeline } = usePollingData<TimelineEvent[]>(
    () => fetchTimeline(session.session_id),
    [session.session_id]
  );

  // Reverse the timeline so newest events come first
  const reversedTimeline = useMemo(() => {
    if (!timeline) return [];
    return [...timeline].reverse();
  }, [timeline]);

  // Apply filters
  const filteredTimeline = useMemo(() => {
    let events = reversedTimeline;

    // Category filter
    events = events.filter((ev) => {
      if (ev.type === "agent") return activeCategories.has("agent");
      if (ev.type === "tool_call" && ev.tool_call) {
        const cat = getToolCategory(ev.tool_call.tool_name);
        return activeCategories.has(cat);
      }
      return activeCategories.has("other");
    });

    // Errors only
    if (showErrorsOnly) {
      events = events.filter((ev) =>
        ev.type === "tool_call" && ev.tool_call?.status === "error"
      );
    }

    // Text filter
    if (timelineFilter) {
      const q = timelineFilter.toLowerCase();
      events = events.filter((ev) => {
        if (ev.type === "tool_call" && ev.tool_call) {
          const tc = ev.tool_call;
          if (tc.tool_name.toLowerCase().includes(q)) return true;
          // Also search tool_input for file paths etc.
          const inputStr = typeof tc.tool_input === "string"
            ? tc.tool_input
            : JSON.stringify(tc.tool_input ?? "");
          return inputStr.toLowerCase().includes(q);
        }
        if (ev.type === "agent" && ev.agent) {
          return (
            (ev.agent.agent_name ?? "").toLowerCase().includes(q) ||
            (ev.agent.agent_type ?? "").toLowerCase().includes(q)
          );
        }
        return false;
      });
    }

    return events;
  }, [reversedTimeline, activeCategories, showErrorsOnly, timelineFilter]);

  // Group into bursts and phases (for grouped view)
  const { bursts, phases, stats } = useMemo(() => {
    const bursts = groupIntoBursts(filteredTimeline);
    const phases = groupIntoPhases(bursts);
    const stats = computeTimelineStats(
      timeline ?? [], // Use full timeline for stats, not filtered
      phases.length
    );
    return { bursts, phases, stats };
  }, [filteredTimeline, timeline]);

  // Wall-clock duration
  const wallClockSeconds = useMemo(() => {
    if (!session.started_at) return null;
    const endStr = session.ended_at ?? timeline?.[timeline.length - 1]?.timestamp;
    if (!endStr) return null;
    const start = new Date(session.started_at).getTime();
    const end = new Date(endStr).getTime();
    return Math.round((end - start) / 1000);
  }, [session, timeline]);

  const handleToolSelect = useCallback((tc: ToolCall) => {
    const ev = timeline?.find(
      (e) => e.type === "tool_call" && e.tool_call?.id === tc.id
    );
    if (ev) {
      setSelectedEvent(ev);
    } else {
      setSelectedEvent({ type: "tool_call", timestamp: tc.started_at, tool_call: tc, agent: null });
    }
  }, [timeline]);

  const handleToggleCategory = useCallback((cat: ToolCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const selectedEventId = useMemo(() => {
    if (!selectedEvent) return null;
    if (selectedEvent.type === "tool_call" && selectedEvent.tool_call?.id != null)
      return `tc-${selectedEvent.tool_call.id}`;
    if (selectedEvent.type === "agent" && selectedEvent.agent?.id != null)
      return `ag-${selectedEvent.agent.id}`;
    return null;
  }, [selectedEvent]);

  const handleScrub = useCallback((_timestamp: string) => {
    // Scroll to top for now — could be enhanced to scroll to the specific event
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const isSelected = (ev: TimelineEvent) => {
    if (!selectedEvent) return false;
    if (ev.type !== selectedEvent.type) return false;
    if (ev.type === "tool_call") return ev.tool_call?.id === selectedEvent.tool_call?.id;
    if (ev.type === "agent") return ev.agent?.id === selectedEvent.agent?.id;
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-mono text-sm">{session.session_id}</h2>
            <Badge
              variant={
                session.status === "active"
                  ? "default"
                  : session.status === "error"
                    ? "destructive"
                    : "secondary"
              }
            >
              {session.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {session.project_name ?? "Unknown"} &middot; {session.model ?? "-"} &middot;{" "}
            {relativeTime(session.started_at)}
            {session.duration_seconds != null && (
              <> &middot; {formatDuration(session.duration_seconds)}</>
            )}
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Tokens In" value={formatTokens(session.input_tokens)} />
        <StatCard label="Tokens Out" value={formatTokens(session.output_tokens)} />
        <StatCard label="Cost" value={formatCost(session.estimated_cost)} />
        <StatCard label="Tool Calls" value={String(session.tool_call_count)} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline" className="text-xs">
            Timeline
          </TabsTrigger>
          <TabsTrigger value="agents" className="text-xs">
            Agents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <Card>
            <CardHeader className="space-y-3 pb-3">
              {/* Summary stats */}
              {stats.totalCalls > 0 && (
                <TimelineSummary stats={stats} wallClockSeconds={wallClockSeconds} />
              )}

              {/* Scrubber bar */}
              {(timeline?.length ?? 0) > 0 && (
                <TimelineScrubber
                  events={timeline ?? []}
                  sessionStart={session.started_at}
                  sessionEnd={session.ended_at}
                  onScrub={handleScrub}
                />
              )}

              {/* Toolbar: filters + view mode */}
              <TimelineToolbar
                filter={timelineFilter}
                onFilterChange={setTimelineFilter}
                activeCategories={activeCategories}
                onToggleCategory={handleToggleCategory}
                showErrorsOnly={showErrorsOnly}
                onToggleErrorsOnly={() => setShowErrorsOnly((v) => !v)}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 h-[600px]">
                {/* Timeline list (left pane) */}
                <div className="w-[45%] overflow-hidden flex flex-col border-r border-border pr-2">
                  <ScrollArea className="h-full" ref={scrollRef}>
                    {filteredTimeline.length === 0 ? (
                      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                        {timeline && timeline.length > 0
                          ? "No matching events"
                          : "No timeline events recorded"}
                      </div>
                    ) : viewMode === "grouped" ? (
                      /* Grouped view: phases with burst groups */
                      <div className="space-y-1">
                        {phases.length > 1 ? (
                          phases.map((phase, i) => (
                            <TimelinePhase
                              key={phase.id}
                              phase={phase}
                              index={i}
                              sessionStart={session.started_at}
                              selectedEventId={selectedEventId}
                              onSelectEvent={setSelectedEvent}
                              defaultExpanded={i === 0}
                            />
                          ))
                        ) : (
                          /* Single phase: skip the phase wrapper, just show bursts */
                          bursts.map((burst) => (
                            <TimelineBurstGroup
                              key={burst.id}
                              burst={burst}
                              sessionStart={session.started_at}
                              selectedEventId={selectedEventId}
                              onSelectEvent={setSelectedEvent}
                            />
                          ))
                        )}
                      </div>
                    ) : viewMode === "flat" ? (
                      /* Flat view: original TimelineItem for each event */
                      <div className="space-y-0">
                        {filteredTimeline.map((ev, i) => (
                          <TimelineItem
                            key={ev.type === "tool_call" ? `tc-${ev.tool_call?.id ?? i}` : `ag-${ev.agent?.id ?? i}`}
                            event={ev}
                            isLast={i === filteredTimeline.length - 1}
                            selected={isSelected(ev)}
                            onSelect={() => setSelectedEvent(ev)}
                          />
                        ))}
                      </div>
                    ) : (
                      /* Compact view: dense one-liner per event */
                      <div className="space-y-0">
                        {filteredTimeline.map((ev, i) => (
                          <CompactTimelineRow
                            key={ev.type === "tool_call" ? `tc-${ev.tool_call?.id ?? i}` : `ag-${ev.agent?.id ?? i}`}
                            event={ev}
                            sessionStart={session.started_at}
                            selected={isSelected(ev)}
                            onSelect={() => setSelectedEvent(ev)}
                          />
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* Detail panel (right pane) */}
                <div className="w-[55%] overflow-hidden flex flex-col">
                  <DetailPanel
                    event={selectedEvent}
                    sessionId={session.session_id}
                    onToolSelect={handleToolSelect}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Agents ({session.agents?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(!session.agents || session.agents.length === 0) ? (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                  No agents recorded
                </div>
              ) : (
                <div className="space-y-3">
                  {session.agents.map((agent, i) => (
                    <div
                      key={agent.id ?? i}
                      className="rounded-lg border border-border p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-chart-1" />
                          <span className="text-sm font-medium">
                            {agent.agent_name ?? "Unknown Agent"}
                          </span>
                        </div>
                        <Badge variant={agent.ended_at ? "secondary" : "default"}>
                          {agent.ended_at ? "done" : "running"}
                        </Badge>
                      </div>
                      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                        {agent.agent_type && <span>Type: {agent.agent_type}</span>}
                        <span>{relativeTime(agent.started_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Compact view row ────────────────────────────────────────────

function CompactTimelineRow({
  event,
  sessionStart,
  selected,
  onSelect,
}: {
  event: TimelineEvent;
  sessionStart: string | null;
  selected: boolean;
  onSelect: () => void;
}) {
  const tc = event.tool_call;
  const ag = event.agent;
  const name = tc?.tool_name ?? ag?.agent_name ?? "Unknown";
  const isError = tc?.status === "error";
  const offset = formatSessionOffset(event.timestamp, sessionStart);

  return (
    <div
      className={`flex items-center gap-2 px-2 py-0.5 text-[11px] font-mono cursor-pointer transition-colors ${
        selected
          ? "bg-muted/40 ring-1 ring-primary/50"
          : "hover:bg-muted/20"
      }`}
      onClick={onSelect}
    >
      <span className="w-12 shrink-0 tabular-nums text-muted-foreground">{offset}</span>
      <span className={`truncate ${isError ? "text-red-400" : ""}`}>{name}</span>
      {isError && <XCircle className="h-3 w-3 text-red-500 shrink-0" />}
      {tc?.duration_ms != null && tc.duration_ms > 0 && (
        <span className="ml-auto text-[10px] text-muted-foreground shrink-0 tabular-nums">
          {tc.duration_ms < 1000 ? `${tc.duration_ms}ms` : `${(tc.duration_ms / 1000).toFixed(1)}s`}
        </span>
      )}
    </div>
  );
}

// ── Stat card ───────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
