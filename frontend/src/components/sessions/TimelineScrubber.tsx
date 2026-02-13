import { useMemo, useRef } from "react";
import type { TimelineEvent } from "@/lib/api.ts";
import { getToolCategory, CATEGORY_COLORS } from "./timelineTypes.ts";

interface Props {
  events: TimelineEvent[];
  sessionStart: string | null;
  sessionEnd: string | null;
  onScrub: (timestamp: string) => void;
}

function parseTs(ts: string | null): number {
  if (!ts) return 0;
  let n = ts;
  if (!n.endsWith("Z") && !n.includes("+")) n = n.replace(" ", "T") + "Z";
  return new Date(n).getTime();
}

export function TimelineScrubber({ events, sessionStart, sessionEnd, onScrub }: Props) {
  const barRef = useRef<HTMLDivElement>(null);

  const { segments, startMs, durationMs } = useMemo(() => {
    if (events.length === 0 || !sessionStart) {
      return { segments: [], startMs: 0, durationMs: 0 };
    }

    const startMs = parseTs(sessionStart);
    const endMs = sessionEnd
      ? parseTs(sessionEnd)
      : parseTs(events[events.length - 1].timestamp) || startMs;
    const durationMs = Math.max(endMs - startMs, 1);

    // Bucket events into time bins (each bin is ~1% of the scrubber width)
    const binCount = 100;
    const bins: { category: string; count: number; timestamp: string }[] = [];

    for (let i = 0; i < binCount; i++) {
      bins.push({ category: "", count: 0, timestamp: "" });
    }

    for (const ev of events) {
      const ts = parseTs(ev.timestamp);
      const offset = ts - startMs;
      const binIdx = Math.min(binCount - 1, Math.max(0, Math.floor((offset / durationMs) * binCount)));

      bins[binIdx].count++;
      if (!bins[binIdx].timestamp) bins[binIdx].timestamp = ev.timestamp ?? "";

      // Assign category by most recent event in the bin
      if (ev.type === "agent") {
        bins[binIdx].category = "agent";
      } else if (ev.tool_call) {
        bins[binIdx].category = getToolCategory(ev.tool_call.tool_name);
      }
    }

    // Build segments: consecutive bins with same category
    const segments: {
      startPct: number;
      widthPct: number;
      category: string;
      density: number;
      timestamp: string;
    }[] = [];

    const maxCount = Math.max(1, ...bins.map((b) => b.count));

    for (let i = 0; i < binCount; i++) {
      const bin = bins[i];
      if (bin.count === 0) continue;
      segments.push({
        startPct: (i / binCount) * 100,
        widthPct: (1 / binCount) * 100,
        category: bin.category || "other",
        density: bin.count / maxCount,
        timestamp: bin.timestamp,
      });
    }

    return { segments, startMs, durationMs };
  }, [events, sessionStart, sessionEnd]);

  const handleClick = (e: React.MouseEvent) => {
    if (!barRef.current || durationMs <= 0) return;
    const rect = barRef.current.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const targetMs = startMs + pct * durationMs;
    const targetDate = new Date(targetMs).toISOString();

    // Find nearest event
    let nearest = events[0]?.timestamp;
    let minDist = Infinity;
    for (const ev of events) {
      const d = Math.abs(parseTs(ev.timestamp) - targetMs);
      if (d < minDist) {
        minDist = d;
        nearest = ev.timestamp;
      }
    }
    if (nearest) onScrub(nearest);
  };

  if (events.length === 0) return null;

  return (
    <div
      ref={barRef}
      className="relative h-3 w-full rounded-full bg-muted/50 cursor-pointer overflow-hidden group"
      onClick={handleClick}
      title="Click to jump to a point in time"
    >
      {segments.map((seg, i) => {
        const colors = CATEGORY_COLORS[seg.category as keyof typeof CATEGORY_COLORS] ?? CATEGORY_COLORS.other;
        return (
          <div
            key={i}
            className={`absolute top-0 bottom-0 ${colors.dot} transition-opacity group-hover:opacity-100`}
            style={{
              left: `${seg.startPct}%`,
              width: `${Math.max(seg.widthPct, 0.5)}%`,
              opacity: 0.2 + seg.density * 0.6,
            }}
          />
        );
      })}
    </div>
  );
}
