# AI Monitor — Database Schema

SQLite with WAL mode enabled. Timestamps stored as ISO 8601 text (`datetime('now')`).

---

## Tables

### `projects`

Tracks monitored project directories (auto-created from session `cwd`).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique project ID |
| `name` | TEXT | NOT NULL | Project name (basename of `cwd`) |
| `path` | TEXT | NOT NULL UNIQUE | Full filesystem path |
| `created_at` | TEXT | NOT NULL DEFAULT datetime('now') | Creation timestamp |

---

### `sessions`

Claude Code sessions linked to projects, with token/cost tracking.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique row ID |
| `session_id` | TEXT | NOT NULL UNIQUE | Claude Code session ID |
| `project_id` | INTEGER | REFERENCES projects(id) | Linked project (nullable) |
| `status` | TEXT | NOT NULL DEFAULT 'active' | `active`, `ended`, or `error` |
| `model` | TEXT | — | Model identifier (e.g. `claude-sonnet-4-5-20250929`) |
| `started_at` | TEXT | NOT NULL DEFAULT datetime('now') | Session start timestamp |
| `ended_at` | TEXT | — | Session end timestamp (null if active) |
| `input_tokens` | INTEGER | NOT NULL DEFAULT 0 | Total input tokens consumed |
| `output_tokens` | INTEGER | NOT NULL DEFAULT 0 | Total output tokens generated |
| `cache_read_tokens` | INTEGER | NOT NULL DEFAULT 0 | Cache read tokens |
| `cache_write_tokens` | INTEGER | NOT NULL DEFAULT 0 | Cache write tokens |
| `estimated_cost` | REAL | NOT NULL DEFAULT 0.0 | Estimated USD cost |

**Indexes:**
- `idx_sessions_project_id` on `project_id`
- `idx_sessions_status` on `status`

---

### `tool_calls`

Individual tool invocations within a session. Stores full input/output as JSON text.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique tool call ID |
| `session_id` | TEXT | NOT NULL | Claude Code session ID |
| `tool_name` | TEXT | NOT NULL | Tool name (e.g. `Read`, `Bash`, `Grep`) |
| `tool_input` | TEXT | — | JSON-serialized tool input data |
| `tool_response` | TEXT | — | JSON-serialized tool response data |
| `status` | TEXT | NOT NULL DEFAULT 'pending' | `pending`, `success`, or `error` |
| `error` | TEXT | — | Error message (when status is `error`) |
| `started_at` | TEXT | NOT NULL DEFAULT datetime('now') | Tool call start timestamp |
| `ended_at` | TEXT | — | Tool call end timestamp |
| `duration_ms` | INTEGER | — | Execution duration in milliseconds |

**Indexes:**
- `idx_tool_calls_session_id` on `session_id`

**Lifecycle:** `PreToolUse` creates a row with status `pending` → `PostToolUse` updates to `success` / `PostToolUseFailure` updates to `error`, computing `duration_ms` from the time delta.

---

### `agents`

Subagent instances spawned within a session.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique agent ID |
| `session_id` | TEXT | NOT NULL | Claude Code session ID |
| `agent_name` | TEXT | — | Agent name (e.g. `researcher`, `test-runner`) |
| `agent_type` | TEXT | — | Agent type (e.g. `general`, `explore`) |
| `status` | TEXT | NOT NULL DEFAULT 'active' | `active` or `stopped` |
| `started_at` | TEXT | NOT NULL DEFAULT datetime('now') | Agent start timestamp |
| `ended_at` | TEXT | — | Agent end timestamp |

**Indexes:**
- `idx_agents_session_id` on `session_id`

**Lifecycle:** `SubagentStart` creates a row with status `active` → `SubagentStop` updates to `stopped` with `ended_at`.

---

## Relationships

```
projects 1──── sessions (via project_id FK)
sessions 1────* tool_calls (via session_id, no FK constraint)
sessions 1────* agents (via session_id, no FK constraint)
```

## Pragmas

- `journal_mode=WAL` — Write-Ahead Logging for concurrent read/write
- `busy_timeout=5000` — Wait up to 5s on lock contention
