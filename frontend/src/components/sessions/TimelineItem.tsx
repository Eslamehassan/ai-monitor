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
} from "lucide-react";
import type { TimelineEvent } from "@/lib/api.ts";
import { relativeTime } from "@/lib/utils.ts";

type ToolCategory = "file" | "search" | "execution" | "other";

const TOOL_CATEGORIES: Record<string, ToolCategory> = {
  Read: "file",
  Write: "file",
  Edit: "file",
  Glob: "file",
  Grep: "search",
  WebSearch: "search",
  WebFetch: "search",
  Bash: "execution",
  Task: "execution",
};

const CATEGORY_DOT_CLASSES: Record<ToolCategory, string> = {
  file: "bg-blue-500/20",
  search: "bg-purple-500/20",
  execution: "bg-orange-500/20",
  other: "bg-gray-500/20",
};

const CATEGORY_ICON_CLASSES: Record<ToolCategory, string> = {
  file: "text-blue-400",
  search: "text-purple-400",
  execution: "text-orange-400",
  other: "text-gray-400",
};

const CATEGORY_BADGE_CLASSES: Record<ToolCategory, string> = {
  file: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  search: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  execution: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  other: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

const CATEGORY_LABELS: Record<ToolCategory, string> = {
  file: "File Ops",
  search: "Search",
  execution: "Execution",
  other: "Other",
};

const CATEGORY_ICONS: Record<ToolCategory, typeof FileText> = {
  file: FileText,
  search: Search,
  execution: Terminal,
  other: HelpCircle,
};

function getCategory(toolName: string): ToolCategory {
  return TOOL_CATEGORIES[toolName] ?? "other";
}

interface Props {
  event: TimelineEvent;
  isLast: boolean;
  selected: boolean;
  onSelect: () => void;
}

export function TimelineItem({ event, isLast, selected, onSelect }: Props) {
  if (event.type === "agent" && event.agent) {
    const agent = event.agent;
    return (
      <div
        className={`flex gap-3 cursor-pointer rounded-md px-1 transition-colors ${selected ? "ring-1 ring-primary bg-muted/30" : "hover:bg-muted/20"}`}
        onClick={onSelect}
      >
        {/* Timeline connector */}
        <div className="flex flex-col items-center">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
            <Zap className="h-3 w-3 text-amber-400" />
          </div>
          {!isLast && <div className="w-px flex-1 bg-border" />}
        </div>
        {/* Content */}
        <div className="flex-1 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">
              {agent.agent_name ?? "Agent"}
            </span>
            {agent.agent_type && (
              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                {agent.agent_type}
              </Badge>
            )}
            <Badge variant={agent.ended_at ? "secondary" : "default"} className="text-[10px]">
              {agent.ended_at ? "done" : "running"}
            </Badge>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {relativeTime(agent.started_at)}
          </p>
        </div>
      </div>
    );
  }

  if (event.type === "tool_call" && event.tool_call) {
    const tc = event.tool_call;
    const category = getCategory(tc.tool_name);
    const CategoryIcon = CATEGORY_ICONS[category];

    return (
      <div className="flex gap-3">
        {/* Timeline connector */}
        <div className="flex flex-col items-center">
          <div
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${CATEGORY_DOT_CLASSES[category]}`}
          >
            <CategoryIcon className={`h-3 w-3 ${CATEGORY_ICON_CLASSES[category]}`} />
          </div>
          {!isLast && <div className="w-px flex-1 bg-border" />}
        </div>
        {/* Content */}
        <div className="flex-1 pb-4">
          <div
            className={`flex items-center gap-2 cursor-pointer rounded-md px-2 py-1 -ml-2 transition-colors ${selected ? "ring-1 ring-primary bg-muted/30" : "hover:bg-muted/50"}`}
            onClick={onSelect}
          >
            <span className="font-mono text-xs font-medium">{tc.tool_name}</span>
            <Badge
              variant="outline"
              className={`text-[10px] ${CATEGORY_BADGE_CLASSES[category]}`}
            >
              {CATEGORY_LABELS[category]}
            </Badge>
            {tc.status === "error" ? (
              <XCircle className="h-3.5 w-3.5 text-red-500" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            )}
            <div className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
              {tc.duration_ms != null && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {tc.duration_ms}ms
                </span>
              )}
              <span>{relativeTime(tc.started_at)}</span>
            </div>
          </div>
          {tc.error && (
            <p className="mt-0.5 text-[11px] text-red-400 truncate pl-2">
              {tc.error}
            </p>
          )}
        </div>
      </div>
    );
  }

  return null;
}
