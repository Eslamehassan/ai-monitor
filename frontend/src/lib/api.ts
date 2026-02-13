const API_BASE = "/api";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ── Models (aligned to backend Pydantic models) ─────────────────

export interface Session {
  id: number | null;
  session_id: string;
  project_id: number | null;
  project_name: string | null;
  status: string;
  model: string | null;
  started_at: string | null;
  ended_at: string | null;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  estimated_cost: number;
  tool_call_count: number;
}

export interface SessionDetail extends Session {
  tool_calls: ToolCall[];
  agents: Agent[];
}

export interface ToolCall {
  id: number | null;
  session_id: string;
  tool_name: string;
  tool_input: unknown;
  tool_response: unknown;
  status: string;
  error: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_ms: number | null;
}

export interface Agent {
  id: number | null;
  session_id: string;
  agent_name: string | null;
  agent_type: string | null;
  status: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface Project {
  id: number | null;
  name: string;
  path: string;
  created_at: string | null;
  session_count: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost: number;
  last_active: string | null;
}

export interface ToolStats {
  tool_name: string;
  count: number;
  error_count: number;
  error_rate: number;
  avg_duration_ms: number | null;
}

export interface DashboardStats {
  total_sessions: number;
  active_sessions: number;
  total_tool_calls: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost: number;
  tool_distribution: ToolStats[];
  recent_sessions: Session[];
  sessions_over_time: { date: string; count: number }[];
  tokens_over_time: { date: string; tokens_in: number; tokens_out: number }[];
  recent_errors: ToolCall[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// ── Fetchers ────────────────────────────────────────────────────

export async function fetchSessions(): Promise<Session[]> {
  const res = await fetchJson<PaginatedResponse<Session>>("/sessions");
  return res.items;
}

export async function fetchSession(id: string): Promise<SessionDetail> {
  return fetchJson<SessionDetail>(`/sessions/${id}`);
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
