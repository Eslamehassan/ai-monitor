import { useState } from "react";
import { Badge } from "@/components/ui/badge.tsx";
import { CheckCircle2, XCircle, Clock, Copy, Check, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import type { ToolCall } from "@/lib/api.ts";
import { relativeTime } from "@/lib/utils.ts";
import { getToolRenderer } from "./toolRenderers.tsx";

interface Props {
  toolCall: ToolCall;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6"
      onClick={(e) => {
        e.stopPropagation();
        handleCopy();
      }}
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  );
}

function JsonBlock({ label, data }: { label: string; data: unknown }) {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <CopyButton text={text} />
      </div>
      <pre className="rounded-md bg-muted p-3 text-[11px] font-mono leading-relaxed overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre-wrap break-all">
        {text || "(empty)"}
      </pre>
    </div>
  );
}

export function ToolCallDetail({ toolCall: tc }: Props) {
  const [showRaw, setShowRaw] = useState(false);
  const Renderer = getToolRenderer(tc.tool_name);

  return (
    <div className="space-y-3">
      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="font-mono font-medium text-foreground">{tc.tool_name}</span>
        {tc.status !== "error" ? (
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            success
          </Badge>
        ) : (
          <Badge variant="destructive" className="gap-1 text-[10px]">
            <XCircle className="h-3 w-3" />
            error
          </Badge>
        )}
        {tc.duration_ms != null && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {tc.duration_ms}ms
          </span>
        )}
        <span>{relativeTime(tc.started_at)}</span>
      </div>

      {/* Error */}
      {tc.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-red-400">
          {tc.error}
        </div>
      )}

      {/* Formatted or Raw view */}
      {showRaw ? (
        <div className="space-y-3">
          {tc.tool_input != null && <JsonBlock label="Input" data={tc.tool_input} />}
          {tc.tool_response != null && <JsonBlock label="Response" data={tc.tool_response} />}
        </div>
      ) : (
        <Renderer input={tc.tool_input} response={tc.tool_response} />
      )}

      {/* View Raw toggle */}
      <div className="pt-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1.5 text-[10px] text-muted-foreground"
          onClick={() => setShowRaw(!showRaw)}
        >
          <Code2 className="h-3 w-3" />
          {showRaw ? "Formatted View" : "View Raw JSON"}
        </Button>
      </div>
    </div>
  );
}
