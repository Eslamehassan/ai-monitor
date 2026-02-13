const API_BASE = "/api";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export interface Session {
  session_id: string;
  project: string;
  model: string;
  status: "active" | "completed" | "error";
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  tokens_in: number;
  tokens_out: number;
  total_cost: number;
  tool_calls: ToolCall[];
  agents: Agent[];
}

export interface ToolCall {
  id: number;
  session_id: string;
  tool_name: string;
  timestamp: string;
  duration_ms: number | null;
  success: boolean;
  error_message: string | null;
}

export interface Agent {
  id: number;
  session_id: string;
  agent_name: string;
  started_at: string;
  ended_at: string | null;
  tokens_in: number;
  tokens_out: number;
}

export interface Project {
  project: string;
  session_count: number;
  total_cost: number;
  total_tokens_in: number;
  total_tokens_out: number;
  last_active: string;
}

export interface ToolStats {
  tool_name: string;
  call_count: number;
  avg_duration_ms: number;
  success_rate: number;
  error_count: number;
}

export interface DashboardStats {
  total_sessions: number;
  active_sessions: number;
  total_cost: number;
  total_tokens: number;
  sessions_over_time: { date: string; count: number }[];
  tokens_over_time: { date: string; tokens_in: number; tokens_out: number }[];
  cost_trend: { date: string; cost: number }[];
  recent_errors: ToolCall[];
}

export async function fetchSessions(): Promise<Session[]> {
  return fetchJson<Session[]>("/sessions");
}

export async function fetchSession(id: string): Promise<Session> {
  return fetchJson<Session>(`/sessions/${id}`);
}

export async function fetchProjects(): Promise<Project[]> {
  return fetchJson<Project[]>("/projects");
}

export async function fetchToolStats(): Promise<ToolStats[]> {
  return fetchJson<ToolStats[]>("/tools/stats");
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return fetchJson<DashboardStats>("/dashboard/stats");
}
