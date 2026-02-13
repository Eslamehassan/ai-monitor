# Bug: Timestamps displayed 3 hours earlier than actual time

## Bug Description
All timestamps displayed in the dashboard (session start times, tool call times, agent times, project last-active times) are shown approximately 3 hours earlier than the actual time. For example, a session started at 5:00 PM local time shows as "3h ago" instead of "just now." This affects every timestamp across the entire application — hooks, sessions, tool calls, agents, and projects.

## Problem Statement
The backend stores all timestamps in UTC via `datetime.now(timezone.utc)` and SQLite's `datetime('now')`, producing strings like `"2024-01-15 14:30:00"` — **without any timezone indicator**. The frontend's `relativeTime()` function parses these with `new Date(dateStr)`, which treats a string without timezone info as **local time**. Since the value is actually UTC but interpreted as local, the displayed time is offset by the user's timezone (UTC+3 = 3 hours earlier).

## Solution Statement
1. **Backend**: Mark all UTC timestamps with the ISO 8601 `Z` suffix (e.g., `"2024-01-15T14:30:00Z"`) so the frontend can correctly identify them as UTC.
2. **Frontend**: Update `relativeTime()` to normalize any timestamp string to UTC before parsing, ensuring both old-format (`"2024-01-15 14:30:00"`) and new-format (`"2024-01-15T14:30:00Z"`) timestamps are handled correctly. JavaScript's `new Date()` natively converts UTC to local time for display.
3. **Database**: Migrate existing timestamp data to include the `Z` suffix. Update schema defaults to produce ISO 8601 UTC format.

This keeps UTC as the storage standard and dynamically converts to the user's system timezone on the frontend — no hardcoded offsets.

## Steps to Reproduce
1. Start the AI Monitor server.
2. Trigger any Claude Code hook event (e.g., run a tool call).
3. Open the dashboard at `http://localhost:6821`.
4. Observe session/tool call timestamps — they show ~3 hours earlier than actual time.
5. Compare: run `date` in terminal vs the "started" time shown in the dashboard for the current session.

## Root Cause Analysis
Two compounding issues:

1. **Backend `_now()` function** (`event_processor.py:12`): Returns `datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")` — a UTC timestamp formatted **without** timezone marker. The space-separated format `"YYYY-MM-DD HH:MM:SS"` has no `Z` or `+00:00` suffix.

2. **Frontend `relativeTime()` function** (`utils.ts:37`): Calls `new Date(dateStr)` on the bare string. JavaScript's Date constructor treats date-time strings without timezone info as **local time**. So a UTC value of `14:30:00` is interpreted as `14:30:00` local time, when the actual local time is `17:30:00` (UTC+3). The diff `now - date` = 3 hours instead of ~0.

3. **SQLite schema defaults** (`db.py`): Use `datetime('now')` which also returns UTC without timezone markers, consistent with `_now()` but equally problematic.

## Relevant Files
Use these files to fix the bug:

- `backend/ai_monitor/services/event_processor.py` — Contains `_now()` function that generates all event timestamps in UTC without timezone marker. The core source of the bug.
- `backend/ai_monitor/db.py` — SQLite schema with `DEFAULT (datetime('now'))` on `created_at` / `started_at` columns. Defaults also produce UTC without marker.
- `backend/ai_monitor/services/stats.py` — Stats queries use `DATE('now', '-30 days')` for time-range filters. These must remain consistent with the new timestamp format.
- `frontend/src/lib/utils.ts` — Contains `relativeTime()` which parses timestamps for display. Must be updated to treat incoming timestamps as UTC.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Fix `_now()` to produce ISO 8601 UTC timestamps

- In `backend/ai_monitor/services/event_processor.py`, change the `_now()` function from:
  ```python
  def _now() -> str:
      return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
  ```
  to:
  ```python
  def _now() -> str:
      return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
  ```
- This produces `"2024-01-15T14:30:00Z"` — a proper ISO 8601 UTC string that JavaScript's `new Date()` correctly parses as UTC.

### Step 2: Update SQLite schema defaults

- In `backend/ai_monitor/db.py`, update all four `DEFAULT (datetime('now'))` clauses to use ISO 8601 format with Z suffix:
  ```sql
  DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  ```
- This applies to:
  - `projects.created_at`
  - `sessions.started_at`
  - `tool_calls.started_at`
  - `agents.started_at`

### Step 3: Add data migration for existing timestamps

- In `backend/ai_monitor/db.py`, after schema creation in `get_db()`, add migration queries to convert existing bare timestamps to ISO 8601 with Z suffix:
  ```python
  # Migrate existing timestamps to ISO 8601 UTC format
  for table, cols in [
      ("projects", ["created_at"]),
      ("sessions", ["started_at", "ended_at"]),
      ("tool_calls", ["started_at", "ended_at"]),
      ("agents", ["started_at", "ended_at"]),
  ]:
      for col in cols:
          _connection.execute(
              f"UPDATE {table} SET {col} = REPLACE({col}, ' ', 'T') || 'Z' "
              f"WHERE {col} IS NOT NULL AND {col} NOT LIKE '%Z'"
          )
  _connection.commit()
  ```
- This converts `"2024-01-15 14:30:00"` → `"2024-01-15T14:30:00Z"` for all existing rows, and is idempotent (skips rows already ending with `Z`).

### Step 4: Update frontend `relativeTime()` to parse UTC correctly

- In `frontend/src/lib/utils.ts`, update `relativeTime()` to normalize timestamps as UTC before parsing:
  ```typescript
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
  ```
- The normalization handles both old-format and new-format timestamps, ensuring backward compatibility.

### Step 5: Verify SQLite date functions still work with new format

- Confirm that the stats queries in `backend/ai_monitor/services/stats.py` work correctly with the new ISO format. SQLite's `DATE()`, `julianday()`, and string comparisons all handle `"2024-01-15T14:30:00Z"` correctly:
  - `DATE('2024-01-15T14:30:00Z')` → `"2024-01-15"` ✓
  - `julianday('2024-01-15T14:30:00Z')` → correct Julian day ✓
  - `started_at >= DATE('now', '-30 days')` → string comparison works because ISO 8601 sorts lexicographically ✓
- No changes needed in `stats.py`.

### Step 6: Run tests and validate

- Run `cd backend && uv run pytest -v` to ensure all existing BDD tests pass.
- Build frontend with `cd frontend && bun run build` to ensure no TypeScript errors.

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `cd /Users/eslamhassan/Documents/GitRepo/ai_monitor/backend && uv run pytest -v` — Run all BDD tests to validate no regressions
- `cd /Users/eslamhassan/Documents/GitRepo/ai_monitor/frontend && bun run build` — Build frontend to validate no TypeScript errors
- `cd /Users/eslamhassan/Documents/GitRepo/ai_monitor/backend && uv run python -c "from ai_monitor.services.event_processor import _now; ts = _now(); print(ts); assert ts.endswith('Z'), 'Missing Z suffix'; assert 'T' in ts, 'Missing T separator'"` — Verify `_now()` produces correct ISO 8601 UTC format
- `cd /Users/eslamhassan/Documents/GitRepo/ai_monitor/backend && uv run python -c "from ai_monitor.db import get_db; db = get_db(); row = db.execute(\"SELECT started_at FROM sessions LIMIT 1\").fetchone(); print(row['started_at'] if row else 'no data'); assert row is None or row['started_at'].endswith('Z'), 'Existing data not migrated'"` — Verify existing DB timestamps are migrated

## Notes
- The user's timezone is UTC+3 (confirmed via `date +%z` → `+0300`), which exactly matches the reported 3-hour offset.
- SQLite's `datetime('now')` and Python's `datetime.now(timezone.utc)` both produce UTC — the data was always correct, just missing the timezone marker for the frontend to interpret it properly.
- The data migration is idempotent: running it multiple times won't corrupt data (the `NOT LIKE '%Z'` guard prevents double-appending).
- No new libraries are needed.
- The fix dynamically uses the browser's local timezone for display, so it will work correctly for any timezone without hardcoding.
