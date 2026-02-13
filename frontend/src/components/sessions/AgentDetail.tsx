import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import {
  Zap,
  Copy,
  Check,
  Clock,
  ChevronDown,
  ChevronRight,
  FileText,
  Search,
  Terminal,
  HelpCircle,
} from "lucide-react";
import type { Agent, AgentDetail as AgentDetailType, ToolCall } from "@/lib/api.ts";
import { fetchAgentDetail } from "@/lib/api.ts";
import { relativeTime } from "@/lib/utils.ts";

interface Props {
  agent: Agent;
  sessionId: string;
  onToolSelect?: (tc: ToolCall) => void;
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-5 w-5"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

function CollapsibleBlock({ label, text, defaultOpen = false }: { label: string; text: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const isLong = text.length > 500;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        {isLong && (
          <button onClick={() => setOpen(!open)} className="text-muted-foreground hover:text-foreground">
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        )}
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <CopyBtn text={text} />
      </div>
      {(!isLong || open) && (
        <pre className="rounded-md bg-muted p-3 text-[11px] font-mono leading-relaxed overflow-x-auto max-h-[400px] overflow-y-auto whitespace-pre-wrap break-all">
          {text}
        </pre>
      )}
      {isLong && !open && (
        <pre className="rounded-md bg-muted p-3 text-[11px] font-mono leading-relaxed overflow-hidden whitespace-pre-wrap break-all max-h-[80px]">
          {text.slice(0, 300)}...
        </pre>
      )}
    </div>
  );
}

const TOOL_ICONS: Record<string, typeof FileText> = {
  Read: FileText, Write: FileText, Edit: FileText, Glob: FileText,
  Grep: Search, WebSearch: Search, WebFetch: Search,
  Bash: Terminal, Task: Zap,
};

export function AgentDetailView({ agent, sessionId, onToolSelect }: Props) {
  const [detail, setDetail] = useState<AgentDetailType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (agent.id == null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchAgentDetail(sessionId, agent.id)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [sessionId, agent.id]);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-6 w-48 rounded bg-muted" />
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-24 rounded bg-muted" />
        <div className="h-16 rounded bg-muted" />
      </div>
    );
  }

  const d = detail ?? agent;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-400" />
          <span className="font-medium text-sm">{d.agent_name ?? "Agent"}</span>
          <Badge variant={d.ended_at ? "secondary" : "default"} className="text-[10px]">
            {d.ended_at ? "done" : "running"}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {relativeTime(d.started_at)}
          {d.ended_at && d.started_at && (
            <> &middot; {Math.round((new Date(d.ended_at).getTime() - new Date(d.started_at).getTime()) / 1000)}s</>
          )}
        </p>
      </div>

      {/* Config badges */}
      {detail?.task_config && (
        <div className="flex flex-wrap gap-2">
          {detail.task_config.subagent_type && (
            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
              {detail.task_config.subagent_type}
            </Badge>
          )}
          {detail.task_config.model && (
            <Badge variant="outline" className="text-[10px]">{detail.task_config.model}</Badge>
          )}
          {detail.task_config.mode && (
            <Badge variant="outline" className="text-[10px]">{detail.task_config.mode}</Badge>
          )}
          {detail.task_config.name && (
            <Badge variant="outline" className="text-[10px]">{detail.task_config.name}</Badge>
          )}
          {d.agent_type && !detail.task_config.subagent_type && (
            <Badge variant="outline" className="text-[10px]">{d.agent_type}</Badge>
          )}
        </div>
      )}
      {!detail?.task_config && d.agent_type && (
        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
          {d.agent_type}
        </Badge>
      )}

      {/* Description */}
      {detail?.task_description && (
        <div className="text-xs text-muted-foreground italic">{detail.task_description}</div>
      )}

      {/* Prompt */}
      {detail?.task_prompt && (
        <CollapsibleBlock label="Prompt" text={detail.task_prompt} defaultOpen={detail.task_prompt.length < 1000} />
      )}

      {/* Subagent Tools */}
      {detail?.subagent_tools && detail.subagent_tools.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Tools Used ({detail.subagent_tools.length})
          </span>
          <ScrollArea className="max-h-[250px]">
            <div className="space-y-1">
              {detail.subagent_tools.map((tc) => {
                const Icon = TOOL_ICONS[tc.tool_name] ?? HelpCircle;
                return (
                  <div
                    key={tc.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-muted/50 cursor-pointer"
                    onClick={() => onToolSelect?.(tc)}
                  >
                    <Icon className="h-3 w-3 text-muted-foreground" />
                    <span className="font-mono text-[11px]">{tc.tool_name}</span>
                    {tc.status === "error" && <Badge variant="destructive" className="text-[9px] h-4">error</Badge>}
                    {tc.duration_ms != null && (
                      <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />
                        {tc.duration_ms}ms
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Report */}
      {detail?.task_response != null && (
        <CollapsibleBlock
          label="Report"
          text={typeof detail.task_response === "string" ? detail.task_response : JSON.stringify(detail.task_response, null, 2)}
          defaultOpen
        />
      )}

      {/* Fallback when no enrichment available */}
      {!detail?.task_prompt && !detail?.task_response && detail?.subagent_tools?.length === 0 && (
        <div className="text-xs text-muted-foreground italic">
          No enriched data available for this agent.
        </div>
      )}
    </div>
  );
}
