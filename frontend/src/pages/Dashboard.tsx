import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Activity, DollarSign, Zap, Clock } from "lucide-react";
import { usePollingData } from "@/hooks/useAutoRefresh.ts";
import { fetchDashboardStats, fetchToolStats, fetchSessions } from "@/lib/api.ts";
import type { DashboardStats, ToolStats, Session } from "@/lib/api.ts";
import { formatCost, formatTokens, relativeTime } from "@/lib/utils.ts";
import { TrafficChart } from "@/components/dashboard/TrafficChart.tsx";
import { TokensChart } from "@/components/dashboard/TokensChart.tsx";
import { ToolCallsChart } from "@/components/dashboard/ToolCallsChart.tsx";
import { IssuesTable } from "@/components/dashboard/IssuesTable.tsx";

const emptyStats: DashboardStats = {
  total_sessions: 0,
  active_sessions: 0,
  total_tool_calls: 0,
  total_input_tokens: 0,
  total_output_tokens: 0,
  total_cost: 0,
  tool_distribution: [],
  recent_sessions: [],
  sessions_over_time: [],
  tokens_over_time: [],
  recent_errors: [],
};

export default function Dashboard() {
  const { data: stats } = usePollingData<DashboardStats>(
    fetchDashboardStats,
    []
  );
  const { data: toolStats } = usePollingData<ToolStats[]>(
    fetchToolStats,
    []
  );
  const { data: sessions } = usePollingData<Session[]>(fetchSessions, []);

  const s = stats ?? emptyStats;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Sessions"
          value={String(s.total_sessions)}
          sub={`${s.active_sessions} active`}
          icon={<Activity className="h-4 w-4" />}
        />
        <KpiCard
          title="Total Tokens"
          value={formatTokens(s.total_input_tokens + s.total_output_tokens)}
          sub="input + output"
          icon={<Zap className="h-4 w-4" />}
        />
        <KpiCard
          title="Estimated Cost"
          value={formatCost(s.total_cost)}
          sub="all sessions"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KpiCard
          title="Recent Sessions"
          value={String(sessions?.length ?? 0)}
          sub={sessions?.[0] ? `latest ${relativeTime(sessions[0].started_at)}` : "none"}
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TrafficChart data={s.sessions_over_time ?? []} />
        <TokensChart data={s.tokens_over_time ?? []} />
      </div>

      {/* Tool Usage + Recent Errors */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ToolCallsChart data={toolStats ?? []} />
        <IssuesTable data={s.recent_errors ?? []} />
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  sub,
  icon,
}: {
  title: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}
