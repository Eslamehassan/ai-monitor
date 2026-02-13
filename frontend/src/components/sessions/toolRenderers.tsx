import { Badge } from "@/components/ui/badge.tsx";

// ── Helpers ──────────────────────────────────────────────────────

function safeParse(data: unknown): Record<string, unknown> | null {
  if (data == null) return null;
  if (typeof data === "object" && !Array.isArray(data)) return data as Record<string, unknown>;
  if (typeof data === "string") {
    try { return JSON.parse(data); } catch { return null; }
  }
  return null;
}

function safeString(data: unknown): string {
  if (data == null) return "";
  if (typeof data === "string") return data;
  return JSON.stringify(data, null, 2);
}

function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function CodeBlock({ children, className = "" }: { children: string; className?: string }) {
  return (
    <pre className={`rounded-md bg-muted p-3 text-[11px] font-mono leading-relaxed overflow-x-auto max-h-[400px] overflow-y-auto whitespace-pre-wrap break-all ${className}`}>
      {children || "(empty)"}
    </pre>
  );
}

function FieldRow({ items }: { items: { label: string; value: string | undefined | null }[] }) {
  const valid = items.filter(i => i.value != null && i.value !== "");
  if (valid.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-3">
      {valid.map(({ label, value }) => (
        <div key={label} className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">{label}:</span>
          <span className="font-mono">{value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Renderers ────────────────────────────────────────────────────

interface RendererProps {
  input: unknown;
  response: unknown;
}

export function ReadRenderer({ input, response }: RendererProps) {
  const inp = safeParse(input);
  return (
    <div className="space-y-3">
      <FieldRow items={[
        { label: "File", value: inp?.file_path as string },
        { label: "Offset", value: inp?.offset != null ? String(inp.offset) : undefined },
        { label: "Limit", value: inp?.limit != null ? String(inp.limit) : undefined },
      ]} />
      {response != null && (
        <LabeledField label="Content">
          <CodeBlock>{safeString(response)}</CodeBlock>
        </LabeledField>
      )}
    </div>
  );
}

export function WriteRenderer({ input, response }: RendererProps) {
  const inp = safeParse(input);
  return (
    <div className="space-y-3">
      <FieldRow items={[{ label: "File", value: inp?.file_path as string }]} />
      {inp?.content != null && (
        <LabeledField label="Content">
          <CodeBlock>{safeString(inp.content)}</CodeBlock>
        </LabeledField>
      )}
      {response != null && (
        <LabeledField label="Result">
          <CodeBlock>{safeString(response)}</CodeBlock>
        </LabeledField>
      )}
    </div>
  );
}

export function EditRenderer({ input, response }: RendererProps) {
  const inp = safeParse(input);
  return (
    <div className="space-y-3">
      <FieldRow items={[
        { label: "File", value: inp?.file_path as string },
        { label: "Replace All", value: inp?.replace_all ? "yes" : undefined },
      ]} />
      {inp?.old_string != null && (
        <LabeledField label="Old">
          <pre className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-[11px] font-mono leading-relaxed overflow-x-auto max-h-[200px] overflow-y-auto whitespace-pre-wrap break-all text-red-300">
            {safeString(inp.old_string)}
          </pre>
        </LabeledField>
      )}
      {inp?.new_string != null && (
        <LabeledField label="New">
          <pre className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3 text-[11px] font-mono leading-relaxed overflow-x-auto max-h-[200px] overflow-y-auto whitespace-pre-wrap break-all text-emerald-300">
            {safeString(inp.new_string)}
          </pre>
        </LabeledField>
      )}
      {response != null && (
        <LabeledField label="Result">
          <CodeBlock>{safeString(response)}</CodeBlock>
        </LabeledField>
      )}
    </div>
  );
}

export function BashRenderer({ input, response }: RendererProps) {
  const inp = safeParse(input);
  return (
    <div className="space-y-3">
      {inp?.command != null && (
        <LabeledField label="Command">
          <pre className="rounded-md bg-zinc-900 border border-zinc-700 p-3 text-[11px] font-mono leading-relaxed overflow-x-auto max-h-[200px] overflow-y-auto whitespace-pre-wrap break-all text-emerald-400">
            <span className="text-muted-foreground select-none">$ </span>{safeString(inp.command)}
          </pre>
        </LabeledField>
      )}
      <FieldRow items={[
        { label: "Timeout", value: inp?.timeout != null ? `${inp.timeout}ms` : undefined },
        { label: "Description", value: inp?.description as string },
      ]} />
      {response != null && (
        <LabeledField label="Output">
          <CodeBlock>{safeString(response)}</CodeBlock>
        </LabeledField>
      )}
    </div>
  );
}

export function GrepRenderer({ input, response }: RendererProps) {
  const inp = safeParse(input);
  return (
    <div className="space-y-3">
      <FieldRow items={[
        { label: "Pattern", value: inp?.pattern as string },
        { label: "Path", value: inp?.path as string },
        { label: "Glob", value: inp?.glob as string },
        { label: "Mode", value: inp?.output_mode as string },
      ]} />
      {response != null && (
        <LabeledField label="Results">
          <CodeBlock>{safeString(response)}</CodeBlock>
        </LabeledField>
      )}
    </div>
  );
}

export function GlobRenderer({ input, response }: RendererProps) {
  const inp = safeParse(input);
  return (
    <div className="space-y-3">
      <FieldRow items={[
        { label: "Pattern", value: inp?.pattern as string },
        { label: "Path", value: inp?.path as string },
      ]} />
      {response != null && (
        <LabeledField label="Matches">
          <CodeBlock>{safeString(response)}</CodeBlock>
        </LabeledField>
      )}
    </div>
  );
}

export function WebSearchRenderer({ input, response }: RendererProps) {
  const inp = safeParse(input);
  return (
    <div className="space-y-3">
      <FieldRow items={[{ label: "Query", value: inp?.query as string }]} />
      {response != null && (
        <LabeledField label="Results">
          <CodeBlock>{safeString(response)}</CodeBlock>
        </LabeledField>
      )}
    </div>
  );
}

export function WebFetchRenderer({ input, response }: RendererProps) {
  const inp = safeParse(input);
  return (
    <div className="space-y-3">
      <FieldRow items={[
        { label: "URL", value: inp?.url as string },
        { label: "Prompt", value: inp?.prompt as string },
      ]} />
      {response != null && (
        <LabeledField label="Response">
          <CodeBlock>{safeString(response)}</CodeBlock>
        </LabeledField>
      )}
    </div>
  );
}

export function TaskRenderer({ input, response }: RendererProps) {
  const inp = safeParse(input);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {inp?.description && (
          <Badge variant="outline" className="text-[10px]">{String(inp.description)}</Badge>
        )}
        {inp?.subagent_type && (
          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
            {String(inp.subagent_type)}
          </Badge>
        )}
        {inp?.model && (
          <Badge variant="outline" className="text-[10px]">{String(inp.model)}</Badge>
        )}
        {inp?.mode && (
          <Badge variant="outline" className="text-[10px]">{String(inp.mode)}</Badge>
        )}
      </div>
      {inp?.prompt != null && (
        <LabeledField label="Prompt">
          <CodeBlock>{safeString(inp.prompt)}</CodeBlock>
        </LabeledField>
      )}
      {response != null && (
        <LabeledField label="Report">
          <CodeBlock>{safeString(response)}</CodeBlock>
        </LabeledField>
      )}
    </div>
  );
}

export function SkillRenderer({ input, response }: RendererProps) {
  const inp = safeParse(input);
  return (
    <div className="space-y-3">
      <FieldRow items={[
        { label: "Skill", value: inp?.skill as string },
        { label: "Args", value: inp?.args as string },
      ]} />
      {response != null && (
        <LabeledField label="Response">
          <CodeBlock>{safeString(response)}</CodeBlock>
        </LabeledField>
      )}
    </div>
  );
}

export function GenericRenderer({ input, response }: RendererProps) {
  return (
    <div className="space-y-3">
      {input != null && (
        <LabeledField label="Input">
          <CodeBlock>{safeString(input)}</CodeBlock>
        </LabeledField>
      )}
      {response != null && (
        <LabeledField label="Response">
          <CodeBlock>{safeString(response)}</CodeBlock>
        </LabeledField>
      )}
    </div>
  );
}

// ── Registry ─────────────────────────────────────────────────────

const RENDERER_MAP: Record<string, React.ComponentType<RendererProps>> = {
  Read: ReadRenderer,
  Write: WriteRenderer,
  Edit: EditRenderer,
  NotebookEdit: EditRenderer,
  Bash: BashRenderer,
  Grep: GrepRenderer,
  Glob: GlobRenderer,
  WebSearch: WebSearchRenderer,
  WebFetch: WebFetchRenderer,
  Task: TaskRenderer,
  Skill: SkillRenderer,
};

export function getToolRenderer(toolName: string): React.ComponentType<RendererProps> {
  return RENDERER_MAP[toolName] ?? GenericRenderer;
}
