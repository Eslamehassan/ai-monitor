import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { MousePointerClick } from "lucide-react";
import type { TimelineEvent, ToolCall } from "@/lib/api.ts";
import { ToolCallDetail } from "./ToolCallDetail.tsx";
import { AgentDetailView } from "./AgentDetail.tsx";

interface Props {
  event: TimelineEvent | null;
  sessionId: string;
  onToolSelect?: (tc: ToolCall) => void;
}

export function DetailPanel({ event, sessionId, onToolSelect }: Props) {
  if (!event) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <MousePointerClick className="h-8 w-8 opacity-40" />
        <p className="text-sm">Select a tool call or agent to view details</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        {event.type === "tool_call" && event.tool_call && (
          <ToolCallDetail toolCall={event.tool_call} />
        )}
        {event.type === "agent" && event.agent && (
          <AgentDetailView
            agent={event.agent}
            sessionId={sessionId}
            onToolSelect={onToolSelect}
          />
        )}
      </div>
    </ScrollArea>
  );
}
