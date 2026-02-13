import { useState, useMemo } from "react";
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
  Search,
} from "lucide-react";
import type { SessionDetail as SessionDetailType, TimelineEvent } from "@/lib/api.ts";
import { fetchTimeline } from "@/lib/api.ts";
import {
  formatTokens,
  formatCost,
  relativeTime,
  formatDuration,
} from "@/lib/utils.ts";
import { usePollingData } from "@/hooks/useAutoRefresh.ts";
import { TimelineItem } from "./TimelineItem.tsx";

interface Props {
  session: SessionDetailType;
  onBack: () => void;
}

export function SessionDetail({ session, onBack }: Props) {
  const [timelineFilter, setTimelineFilter] = useState("");

  const { data: timeline } = usePollingData<TimelineEvent[]>(
    () => fetchTimeline(session.session_id),
    [session.session_id]
  );

  const filteredTimeline = useMemo(() => {
    if (!timeline) return [];
    if (!timelineFilter) return timeline;
    const q = timelineFilter.toLowerCase();
    return timeline.filter((ev) => {
      if (ev.type === "tool_call" && ev.tool_call) {
        return ev.tool_call.tool_name.toLowerCase().includes(q);
      }
      if (ev.type === "agent" && ev.agent) {
        return (
          (ev.agent.agent_name ?? "").toLowerCase().includes(q) ||
          (ev.agent.agent_type ?? "").toLowerCase().includes(q)
        );
      }
      return false;
    });
  }, [timeline, timelineFilter]);

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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Timeline ({filteredTimeline.length})
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter tools..."
                  value={timelineFilter}
                  onChange={(e) => setTimelineFilter(e.target.value)}
                  className="h-8 w-[180px] rounded-md border border-input bg-transparent pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {filteredTimeline.length === 0 ? (
                  <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                    {timeline && timeline.length > 0
                      ? "No matching events"
                      : "No timeline events recorded"}
                  </div>
                ) : (
                  <div className="space-y-0">
                    {filteredTimeline.map((ev, i) => (
                      <TimelineItem
                        key={i}
                        event={ev}
                        isLast={i === filteredTimeline.length - 1}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
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
