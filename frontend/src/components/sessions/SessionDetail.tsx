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
import { Separator } from "@/components/ui/separator.tsx";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
} from "lucide-react";
import type { Session } from "@/lib/api.ts";
import {
  formatDuration,
  formatTokens,
  formatCost,
  relativeTime,
} from "@/lib/utils.ts";

interface Props {
  session: Session;
  onBack: () => void;
}

export function SessionDetail({ session, onBack }: Props) {
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
            {session.project} &middot; {session.model} &middot;{" "}
            {relativeTime(session.started_at)}
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Duration" value={formatDuration(session.duration_seconds)} />
        <StatCard label="Tokens In" value={formatTokens(session.tokens_in)} />
        <StatCard label="Tokens Out" value={formatTokens(session.tokens_out)} />
        <StatCard label="Cost" value={formatCost(session.total_cost)} />
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
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Tool Calls ({session.tool_calls?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {(!session.tool_calls || session.tool_calls.length === 0) ? (
                  <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                    No tool calls recorded
                  </div>
                ) : (
                  <div className="space-y-1">
                    {session.tool_calls.map((tc, i) => (
                      <div key={tc.id ?? i}>
                        <div className="flex items-center gap-3 py-2 px-2 rounded hover:bg-muted/30">
                          {tc.success ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                          ) : (
                            <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-mono font-medium">
                              {tc.tool_name}
                            </p>
                            {tc.error_message && (
                              <p className="mt-0.5 text-[11px] text-red-400 truncate">
                                {tc.error_message}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {tc.duration_ms != null && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {tc.duration_ms}ms
                              </span>
                            )}
                            <span>{relativeTime(tc.timestamp)}</span>
                          </div>
                        </div>
                        {i < session.tool_calls.length - 1 && (
                          <Separator className="opacity-30" />
                        )}
                      </div>
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
                            {agent.agent_name}
                          </span>
                        </div>
                        <Badge variant={agent.ended_at ? "secondary" : "default"}>
                          {agent.ended_at ? "done" : "running"}
                        </Badge>
                      </div>
                      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                        <span>In: {formatTokens(agent.tokens_in)}</span>
                        <span>Out: {formatTokens(agent.tokens_out)}</span>
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
