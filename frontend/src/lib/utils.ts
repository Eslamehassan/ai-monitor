import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0) return "-";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatTokens(count: number | null | undefined): string {
  if (count == null) return "-";
  if (count < 1000) return String(count);
  if (count < 1_000_000) return `${(count / 1000).toFixed(1)}K`;
  return `${(count / 1_000_000).toFixed(2)}M`;
}

export function formatCost(cost: number | null | undefined): string {
  if (cost == null) return "-";
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

export function relativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  // Ensure UTC timestamps are parsed correctly: if no timezone
  // indicator, treat as UTC by appending Z
  let normalized = dateStr;
  if (!normalized.endsWith("Z") && !normalized.includes("+")) {
    normalized = normalized.replace(" ", "T") + "Z";
  }
  const date = new Date(normalized);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return date.toLocaleDateString();
}

export function truncateId(id: string, len = 8): string {
  if (id.length <= len) return id;
  return id.slice(0, len) + "...";
}

/**
 * Format a timestamp as an offset from a session start time.
 * Returns "+0:00", "+1:30", "+1:05:12" etc.
 */
export function formatSessionOffset(
  timestamp: string | null | undefined,
  sessionStart: string | null | undefined
): string {
  if (!timestamp || !sessionStart) return "-";
  const normalize = (s: string) => {
    let n = s;
    if (!n.endsWith("Z") && !n.includes("+")) n = n.replace(" ", "T") + "Z";
    return n;
  };
  const ts = new Date(normalize(timestamp)).getTime();
  const start = new Date(normalize(sessionStart)).getTime();
  const diffSec = Math.max(0, Math.floor((ts - start) / 1000));

  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60);
    const s = diffSec % 60;
    return `+${m}:${String(s).padStart(2, "0")}`;
  }
  const h = Math.floor(diffSec / 3600);
  const m = Math.floor((diffSec % 3600) / 60);
  const s = diffSec % 60;
  return `+${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
