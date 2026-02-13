import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { ArrowLeft, FolderKanban } from "lucide-react";
import { usePollingData } from "@/hooks/useAutoRefresh.ts";
import { fetchProject } from "@/lib/api.ts";
import type { ProjectDetail as ProjectDetailType } from "@/lib/api.ts";
import { formatCost, formatTokens, relativeTime } from "@/lib/utils.ts";
import { TrafficChart } from "@/components/dashboard/TrafficChart.tsx";
import { TokensChart } from "@/components/dashboard/TokensChart.tsx";
import { ToolCallsChart } from "@/components/dashboard/ToolCallsChart.tsx";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: project, loading } = usePollingData<ProjectDetailType>(
    () => fetchProject(Number(id)),
    [id]
  );

  if (loading || !project) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Loading project...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FolderKanban className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">{project.name}</h2>
            <p className="text-xs text-muted-foreground">
              {project.path} &middot; Last active {relativeTime(project.last_active)}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Sessions" value={String(project.session_count)} />
        <StatCard label="Tokens In" value={formatTokens(project.total_input_tokens)} />
        <StatCard label="Tokens Out" value={formatTokens(project.total_output_tokens)} />
        <StatCard label="Total Cost" value={formatCost(project.total_cost)} />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TrafficChart data={project.sessions_over_time ?? []} />
        <TokensChart data={project.tokens_over_time ?? []} />
      </div>

      {/* Tool Distribution */}
      <ToolCallsChart data={project.tool_distribution ?? []} />
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
