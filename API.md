# AI Monitor — API Reference

Local AI monitoring dashboard for Claude Code sessions. Inspired by Sentry AI.

**Data flow:** Claude Code hooks → `monitor-hook.sh` (stdin JSON) → POST /api/events → event_processor → SQLite (WAL) → REST API → React dashboard

**Stack:**
- Backend: FastAPI + SQLite (WAL) + Watchdog + APScheduler
- Frontend: React + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui + Recharts
- Hooks: Bash scripts installed into ~/.claude/settings.json

---

## Endpoints

### Health

#### `GET /api/health`

Health check endpoint.

**Response:**
```json
{ "status": "ok" }
```

---

### Events

#### `POST /api/events`

Ingest a hook event from Claude Code. Processes asynchronously in background.

**Request body** (`HookEvent`):

| Field | Type | Required | Description |
|---|---|---|---|
| `session_id` | string | yes | Claude Code session ID |
| `hook_event_name` | string | yes | One of: `SessionStart`, `SessionEnd`, `Stop`, `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `SubagentStart`, `SubagentStop` |
| `cwd` | string | no | Working directory (used to create/link project) |
| `tool_name` | string | no | Tool name (for tool events) |
| `tool_input` | any | no | Tool input data (JSON-serialized to DB) |
| `tool_response` | any | no | Tool response data (JSON-serialized to DB) |
| `error` | string | no | Error message (for `PostToolUseFailure`) |
| `agent_name` | string | no | Agent name (for subagent events) |
| `agent_type` | string | no | Agent type (for subagent events) |
| `model` | string | no | Model identifier (e.g. `claude-sonnet-4-5-20250929`) |
| `timestamp` | string | no | ISO timestamp |

**Response:**
```json
{ "status": "ok" }
```

**Event processing behavior:**
- `SessionStart` — Creates project from `cwd` if new; creates or updates session as `active`
- `SessionEnd` — Sets session status to `ended`, records `ended_at`
- `Stop` — Marks session as `active` (model finished a turn, not session end)
- `PreToolUse` — Creates a `pending` tool call record
- `PostToolUse` — Updates most recent pending tool call to `success`, records `tool_response` and `duration_ms`
- `PostToolUseFailure` — Updates most recent pending tool call to `error`, records error and `duration_ms`
- `SubagentStart` — Creates an `active` agent record
- `SubagentStop` — Updates most recent active agent to `stopped`

---

### Sessions

#### `GET /api/sessions`

List sessions with filtering, search, and pagination.

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `status` | string | — | Filter by status (`active`, `ended`, `error`) |
| `project_id` | integer | — | Filter by project ID |
| `search` | string | — | Search by session ID or project name (LIKE match) |
| `page` | integer | `1` | Page number (min: 1) |
| `page_size` | integer | `50` | Items per page (min: 1, max: 200) |

**Response** (`PaginatedResponse`):
```json
{
  "items": [
    {
      "id": 1,
      "session_id": "abc-123",
      "project_id": 1,
      "project_name": "my-project",
      "status": "active",
      "model": "claude-sonnet-4-5-20250929",
      "started_at": "2025-01-15 10:30:00",
      "ended_at": null,
      "input_tokens": 15000,
      "output_tokens": 3200,
      "cache_read_tokens": 5000,
      "cache_write_tokens": 2000,
      "estimated_cost": 0.0842,
      "tool_call_count": 12,
      "duration_seconds": null
    }
  ],
  "total": 42,
  "page": 1,
  "page_size": 50
}
```

**Notes:**
- `duration_seconds` is computed as `(ended_at - started_at)` in seconds. `null` for active sessions.
- `tool_call_count` is a computed subquery count.
- Results ordered by `started_at DESC`.

---

#### `GET /api/sessions/{session_id}`

Get full session detail including all tool calls and agents.

**Path parameters:**

| Param | Type | Description |
|---|---|---|
| `session_id` | string | The Claude Code session ID |

**Response** (`SessionDetail`):
```json
{
  "id": 1,
  "session_id": "abc-123",
  "project_id": 1,
  "project_name": "my-project",
  "status": "ended",
  "model": "claude-sonnet-4-5-20250929",
  "started_at": "2025-01-15 10:30:00",
  "ended_at": "2025-01-15 10:45:00",
  "input_tokens": 15000,
  "output_tokens": 3200,
  "cache_read_tokens": 5000,
  "cache_write_tokens": 2000,
  "estimated_cost": 0.0842,
  "tool_call_count": 2,
  "duration_seconds": 900.0,
  "tool_calls": [
    {
      "id": 1,
      "session_id": "abc-123",
      "tool_name": "Read",
      "tool_input": "{\"file_path\": \"/src/main.py\"}",
      "tool_response": "\"file contents...\"",
      "status": "success",
      "error": null,
      "started_at": "2025-01-15 10:31:00",
      "ended_at": "2025-01-15 10:31:00",
      "duration_ms": 45
    }
  ],
  "agents": [
    {
      "id": 1,
      "session_id": "abc-123",
      "agent_name": "researcher",
      "agent_type": "general",
      "status": "stopped",
      "started_at": "2025-01-15 10:32:00",
      "ended_at": "2025-01-15 10:35:00"
    }
  ]
}
```

**Errors:** `404` if session not found.

---

#### `GET /api/sessions/{session_id}/timeline`

Get chronological timeline of tool calls and agents interleaved by timestamp.

**Path parameters:**

| Param | Type | Description |
|---|---|---|
| `session_id` | string | The Claude Code session ID |

**Response** (`TimelineEvent[]`):
```json
[
  {
    "type": "tool_call",
    "timestamp": "2025-01-15 10:31:00",
    "tool_call": {
      "id": 1,
      "session_id": "abc-123",
      "tool_name": "Read",
      "tool_input": "{\"file_path\": \"/src/main.py\"}",
      "tool_response": "\"file contents...\"",
      "status": "success",
      "error": null,
      "started_at": "2025-01-15 10:31:00",
      "ended_at": "2025-01-15 10:31:00",
      "duration_ms": 45
    },
    "agent": null
  },
  {
    "type": "agent",
    "timestamp": "2025-01-15 10:32:00",
    "tool_call": null,
    "agent": {
      "id": 1,
      "session_id": "abc-123",
      "agent_name": "researcher",
      "agent_type": "general",
      "status": "stopped",
      "started_at": "2025-01-15 10:32:00",
      "ended_at": "2025-01-15 10:35:00"
    }
  }
]
```

**Notes:**
- Events sorted by `timestamp` ascending.
- `type` is either `"tool_call"` or `"agent"` — the corresponding field is populated, the other is `null`.

**Errors:** `404` if session not found.

---

### Projects

#### `GET /api/projects`

List all projects with aggregated session stats.

**Response** (`Project[]`):
```json
[
  {
    "id": 1,
    "name": "my-project",
    "path": "/Users/dev/my-project",
    "created_at": "2025-01-10 09:00:00",
    "session_count": 15,
    "total_input_tokens": 250000,
    "total_output_tokens": 48000,
    "total_cost": 1.2345,
    "last_active": "2025-01-15 10:30:00"
  }
]
```

**Notes:** Ordered by project name ascending.

---

#### `GET /api/projects/{project_id}`

Get project detail with aggregated stats, tool distribution, and time series.

**Path parameters:**

| Param | Type | Description |
|---|---|---|
| `project_id` | integer | The project ID |

**Response** (`ProjectDetail`):
```json
{
  "id": 1,
  "name": "my-project",
  "path": "/Users/dev/my-project",
  "created_at": "2025-01-10 09:00:00",
  "session_count": 15,
  "total_input_tokens": 250000,
  "total_output_tokens": 48000,
  "total_cost": 1.2345,
  "last_active": "2025-01-15 10:30:00",
  "tool_distribution": [
    {
      "tool_name": "Read",
      "count": 120,
      "error_count": 2,
      "error_rate": 0.0167,
      "avg_duration_ms": 35.2
    }
  ],
  "sessions_over_time": [
    { "date": "2025-01-14", "count": 3 },
    { "date": "2025-01-15", "count": 5 }
  ],
  "tokens_over_time": [
    { "date": "2025-01-14", "tokens_in": 80000, "tokens_out": 15000 },
    { "date": "2025-01-15", "tokens_in": 120000, "tokens_out": 22000 }
  ]
}
```

**Notes:**
- `tool_distribution` is scoped to this project's sessions only (top 20 by count).
- `sessions_over_time` and `tokens_over_time` cover the last 30 days.

**Errors:** `404` if project not found.

---

### Tools

#### `GET /api/tools/stats`

Get tool usage distribution and error rates across all sessions.

**Response** (`ToolStats[]`):
```json
[
  {
    "tool_name": "Read",
    "count": 450,
    "error_count": 5,
    "error_rate": 0.0111,
    "avg_duration_ms": 32.5
  },
  {
    "tool_name": "Bash",
    "count": 210,
    "error_count": 18,
    "error_rate": 0.0857,
    "avg_duration_ms": 1250.3
  }
]
```

**Notes:** Ordered by `count` descending.

---

### Agents

#### `GET /api/agents`

List agents with optional filters.

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `session_id` | string | — | Filter by session ID |
| `status` | string | — | Filter by status (`active`, `stopped`) |

**Response** (`Agent[]`):
```json
[
  {
    "id": 1,
    "session_id": "abc-123",
    "agent_name": "researcher",
    "agent_type": "general",
    "status": "stopped",
    "started_at": "2025-01-15 10:32:00",
    "ended_at": "2025-01-15 10:35:00"
  }
]
```

**Notes:** Ordered by `started_at` descending.

---

### Dashboard

#### `GET /api/dashboard/stats`

Get aggregate statistics for the dashboard view.

**Response** (`DashboardStats`):
```json
{
  "total_sessions": 42,
  "active_sessions": 3,
  "total_tool_calls": 1250,
  "total_input_tokens": 5000000,
  "total_output_tokens": 980000,
  "total_cost": 24.5678,
  "tool_distribution": [
    { "tool_name": "Read", "count": 450, "error_count": 5, "error_rate": 0.0111, "avg_duration_ms": 32.5 }
  ],
  "recent_sessions": [
    { "session_id": "abc-123", "status": "active", "...": "..." }
  ],
  "sessions_over_time": [
    { "date": "2025-01-14", "count": 3 }
  ],
  "tokens_over_time": [
    { "date": "2025-01-14", "tokens_in": 80000, "tokens_out": 15000 }
  ],
  "recent_errors": [
    { "id": 5, "tool_name": "Bash", "error": "command failed", "...": "..." }
  ]
}
```

**Notes:**
- `tool_distribution`: top 20 tools by usage count.
- `recent_sessions`: last 10 sessions.
- `sessions_over_time` / `tokens_over_time`: last 30 days.
- `recent_errors`: last 20 tool call errors.
