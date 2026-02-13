import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { FolderKanban } from "lucide-react";
import { usePollingData } from "@/hooks/useAutoRefresh.ts";
import { fetchProjects } from "@/lib/api.ts";
import type { Project } from "@/lib/api.ts";
import { formatCost, formatTokens, relativeTime } from "@/lib/utils.ts";

export default function Projects() {
  const navigate = useNavigate();
  const { data: projects, loading } = usePollingData<Project[]>(
    fetchProjects,
    []
  );

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Loading projects...
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        No projects found
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id ?? project.name}
          project={project}
          onClick={() => project.id != null && navigate(`/projects/${project.id}`)}
        />
      ))}
    </div>
  );
}

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  return (
    <Card
      className="cursor-pointer transition-colors hover:border-primary/30"
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <FolderKanban className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-sm">{project.name}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {relativeTime(project.last_active)}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-y-3 text-xs">
          <div>
            <p className="text-muted-foreground">Sessions</p>
            <p className="mt-0.5 font-medium">{project.session_count}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Cost</p>
            <p className="mt-0.5 font-medium">{formatCost(project.total_cost)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Tokens In</p>
            <p className="mt-0.5 font-medium">
              {formatTokens(project.total_input_tokens)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Tokens Out</p>
            <p className="mt-0.5 font-medium">
              {formatTokens(project.total_output_tokens)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
