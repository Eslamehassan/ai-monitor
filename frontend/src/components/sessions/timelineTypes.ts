import type { TimelineEvent } from "@/lib/api.ts";

// ── Tool categories ─────────────────────────────────────────────

export type ToolCategory = "file" | "search" | "execution" | "agent" | "other";

const TOOL_CATEGORIES: Record<string, ToolCategory> = {
  Read: "file",
  Write: "file",
  Edit: "file",
  Glob: "file",
  NotebookEdit: "file",
  Grep: "search",
  WebSearch: "search",
  WebFetch: "search",
  Bash: "execution",
  Task: "execution",
  Skill: "execution",
  EnterPlanMode: "execution",
  ExitPlanMode: "execution",
  TeamCreate: "execution",
  TeamDelete: "execution",
  TaskCreate: "execution",
  TaskUpdate: "execution",
  TaskList: "execution",
  TaskOutput: "execution",
  TaskGet: "execution",
  SendMessage: "execution",
};

export function getToolCategory(toolName: string): ToolCategory {
  return TOOL_CATEGORIES[toolName] ?? "other";
}

export const CATEGORY_COLORS: Record<ToolCategory, { bg: string; text: string; border: string; dot: string }> = {
  file:      { bg: "bg-blue-500/15",   text: "text-blue-400",   border: "border-blue-500/30",   dot: "bg-blue-500" },
  search:    { bg: "bg-purple-500/15",  text: "text-purple-400", border: "border-purple-500/30", dot: "bg-purple-500" },
  execution: { bg: "bg-orange-500/15",  text: "text-orange-400", border: "border-orange-500/30", dot: "bg-orange-500" },
  agent:     { bg: "bg-amber-500/15",   text: "text-amber-400",  border: "border-amber-500/30",  dot: "bg-amber-500" },
  other:     { bg: "bg-gray-500/15",    text: "text-gray-400",   border: "border-gray-500/30",   dot: "bg-gray-500" },
};

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  file: "File Ops",
  search: "Search",
  execution: "Execution",
  agent: "Agents",
  other: "Other",
};

// ── Burst grouping ──────────────────────────────────────────────

export interface TimelineBurst {
  id: string;
  events: TimelineEvent[];
  toolName: string;         // shared tool name (or "mixed" for agents)
  type: "tool_call" | "agent";
  category: ToolCategory;
  count: number;
  successCount: number;
  errorCount: number;
  avgDurationMs: number | null;
  startTimestamp: string | null;
  endTimestamp: string | null;
  isParallel: boolean;      // events share the exact same timestamp
}

/** Gap threshold (ms) for grouping consecutive same-tool calls into a burst. */
const BURST_GAP_MS = 5000;

function parseTs(ts: string | null): number {
  if (!ts) return 0;
  let n = ts;
  if (!n.endsWith("Z") && !n.includes("+")) n = n.replace(" ", "T") + "Z";
  return new Date(n).getTime();
}

export function groupIntoBursts(events: TimelineEvent[]): TimelineBurst[] {
  if (events.length === 0) return [];

  const bursts: TimelineBurst[] = [];
  let current: TimelineEvent[] = [events[0]];
  let currentKey = getBurstKey(events[0]);

  for (let i = 1; i < events.length; i++) {
    const ev = events[i];
    const key = getBurstKey(ev);
    const prevTs = parseTs(current[current.length - 1].timestamp);
    const curTs = parseTs(ev.timestamp);
    const gap = Math.abs(curTs - prevTs);

    if (key === currentKey && gap <= BURST_GAP_MS) {
      current.push(ev);
    } else {
      bursts.push(buildBurst(current));
      current = [ev];
      currentKey = key;
    }
  }
  bursts.push(buildBurst(current));
  return bursts;
}

function getBurstKey(ev: TimelineEvent): string {
  if (ev.type === "agent") return "agent:" + (ev.agent?.agent_name ?? "unknown");
  return "tool:" + (ev.tool_call?.tool_name ?? "unknown");
}

function buildBurst(events: TimelineEvent[]): TimelineBurst {
  const first = events[0];
  const type = first.type;
  const toolName = type === "tool_call"
    ? (first.tool_call?.tool_name ?? "Unknown")
    : (first.agent?.agent_name ?? "Agent");
  const category = type === "agent" ? "agent" : getToolCategory(toolName);

  const timestamps = events.map((e) => parseTs(e.timestamp)).filter(Boolean);
  const uniqueTimestamps = new Set(timestamps);
  const isParallel = events.length > 1 && uniqueTimestamps.size === 1;

  let successCount = 0;
  let errorCount = 0;
  let totalDuration = 0;
  let durationCount = 0;

  for (const ev of events) {
    if (ev.type === "tool_call" && ev.tool_call) {
      if (ev.tool_call.status === "error") errorCount++;
      else successCount++;
      if (ev.tool_call.duration_ms != null) {
        totalDuration += ev.tool_call.duration_ms;
        durationCount++;
      }
    } else if (ev.type === "agent" && ev.agent) {
      if (ev.agent.ended_at) successCount++;
      else successCount++; // running agents are not errors
    }
  }

  return {
    id: `burst-${type}-${first.type === "tool_call" ? first.tool_call?.id : first.agent?.id}-${events.length}`,
    events,
    toolName,
    type,
    category,
    count: events.length,
    successCount,
    errorCount,
    avgDurationMs: durationCount > 0 ? Math.round(totalDuration / durationCount) : null,
    startTimestamp: events[0].timestamp,
    endTimestamp: events[events.length - 1].timestamp,
    isParallel,
  };
}

// ── Phase detection ─────────────────────────────────────────────

export interface TimelinePhaseData {
  id: string;
  label: string;
  bursts: TimelineBurst[];
  startTimestamp: string | null;
  endTimestamp: string | null;
  totalCalls: number;
  dominantCategory: ToolCategory;
  toolSummary: { name: string; count: number }[];
}

/** Gap threshold (ms) for splitting into phases. */
const PHASE_GAP_MS = 10000;

const PHASE_LABELS: Record<ToolCategory, string> = {
  file: "Research",
  search: "Search",
  execution: "Execution",
  agent: "Agent Activity",
  other: "Activity",
};

export function groupIntoPhases(bursts: TimelineBurst[]): TimelinePhaseData[] {
  if (bursts.length === 0) return [];

  const phases: TimelinePhaseData[] = [];
  let current: TimelineBurst[] = [bursts[0]];

  for (let i = 1; i < bursts.length; i++) {
    const prevEnd = parseTs(current[current.length - 1].endTimestamp);
    const curStart = parseTs(bursts[i].startTimestamp);
    const gap = Math.abs(curStart - prevEnd);

    if (gap > PHASE_GAP_MS) {
      phases.push(buildPhase(current, phases.length));
      current = [bursts[i]];
    } else {
      current.push(bursts[i]);
    }
  }
  phases.push(buildPhase(current, phases.length));
  return phases;
}

function buildPhase(bursts: TimelineBurst[], index: number): TimelinePhaseData {
  // Count tools
  const toolCounts = new Map<string, number>();
  const categoryCounts = new Map<ToolCategory, number>();
  let totalCalls = 0;

  for (const b of bursts) {
    totalCalls += b.count;
    toolCounts.set(b.toolName, (toolCounts.get(b.toolName) ?? 0) + b.count);
    categoryCounts.set(b.category, (categoryCounts.get(b.category) ?? 0) + b.count);
  }

  // Dominant category
  let dominant: ToolCategory = "other";
  let maxCount = 0;
  for (const [cat, count] of categoryCounts) {
    if (count > maxCount) {
      dominant = cat;
      maxCount = count;
    }
  }

  // Tool summary sorted by count
  const toolSummary = Array.from(toolCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const label = PHASE_LABELS[dominant] ?? "Activity";

  return {
    id: `phase-${index}`,
    label: `${label} Phase`,
    bursts,
    startTimestamp: bursts[0].startTimestamp,
    endTimestamp: bursts[bursts.length - 1].endTimestamp,
    totalCalls,
    dominantCategory: dominant,
    toolSummary,
  };
}

// ── Summary stats ───────────────────────────────────────────────

export interface TimelineStats {
  totalCalls: number;
  uniqueTools: number;
  successCount: number;
  errorCount: number;
  successRate: number;
  totalDurationMs: number;
  phaseCount: number;
  toolDistribution: { name: string; count: number; category: ToolCategory }[];
}

export function computeTimelineStats(
  events: TimelineEvent[],
  phaseCount: number
): TimelineStats {
  const toolCounts = new Map<string, number>();
  let successCount = 0;
  let errorCount = 0;
  let totalDurationMs = 0;

  for (const ev of events) {
    if (ev.type === "tool_call" && ev.tool_call) {
      const name = ev.tool_call.tool_name;
      toolCounts.set(name, (toolCounts.get(name) ?? 0) + 1);
      if (ev.tool_call.status === "error") errorCount++;
      else successCount++;
      if (ev.tool_call.duration_ms != null) totalDurationMs += ev.tool_call.duration_ms;
    } else if (ev.type === "agent") {
      toolCounts.set("Agent", (toolCounts.get("Agent") ?? 0) + 1);
      successCount++;
    }
  }

  const distribution = Array.from(toolCounts.entries())
    .map(([name, count]) => ({
      name,
      count,
      category: name === "Agent" ? "agent" as ToolCategory : getToolCategory(name),
    }))
    .sort((a, b) => b.count - a.count);

  const total = successCount + errorCount;
  return {
    totalCalls: total,
    uniqueTools: toolCounts.size,
    successCount,
    errorCount,
    successRate: total > 0 ? successCount / total : 1,
    totalDurationMs,
    phaseCount,
    toolDistribution: distribution,
  };
}
