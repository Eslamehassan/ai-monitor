# Bug: Sessions remain active after ending

## Bug Description
After a Claude Code session ends (user closes the conversation or stops interacting), the session continues to show as "active" in the AI Monitor dashboard. The green pulsing indicator stays visible, the active session count never decreases, and the session never gets a duration value. Expected behavior: sessions should transition to `status='ended'` within a reasonable time after the user stops interacting.

## Problem Statement
Sessions are created with `status='active'` in the database but **no mechanism ever transitions them to `status='ended'`**. The `_handle_session_end()` handler exists in `event_processor.py` but is dead code — it is never triggered in production because Claude Code does not fire a `SessionEnd` hook event. The `_handle_stop()` handler (which fires on every model turn completion) explicitly forces `status='active'`, preventing any future reaper from correcting stale sessions. There is no timeout-based detection of stale sessions.

## Solution Statement
Add a **stale session reaper** — a periodic background task that detects sessions stuck in `active` status with no recent events and marks them as `ended`. This requires:
1. Adding a `last_event_at` column to track when a session last received any event
2. Updating `last_event_at` on every incoming event via `_ensure_session()`
3. Changing `_handle_stop()` to update `last_event_at` instead of forcing `status='active'`
4. Adding a configurable stale timeout setting (default: 10 minutes)
5. Running a reaper task every 2 minutes in the FastAPI lifespan via `asyncio`

## Steps to Reproduce
1. Start the AI Monitor server (`./run.sh`)
2. Open a Claude Code session in a terminal (triggers `SessionStart`/tool events via hooks)
3. Send a prompt, wait for Claude to respond (triggers `PreToolUse`, `PostToolUse`, `Stop` events)
4. Close the Claude Code session (Ctrl+C or `/exit`)
5. Open the dashboard at `http://localhost:6821`
6. Observe the session still shows a green pulsing "active" indicator
7. Observe the "Active Sessions" KPI count never decreases
8. Observe the session has no duration value

## Root Cause Analysis
Three compounding issues prevent sessions from ever being marked as ended:

1. **`SessionEnd` is never received from Claude Code**: The `hooks/install.sh` script registers hooks for `PreToolUse`, `PostToolUse`, `Notification`, `SubagentStop`, `SubagentStart`, and `Stop`. Claude Code does not have a `SessionEnd` hook event type — the `_handle_session_end()` handler in `event_processor.py:89-95` is dead code that never executes.

2. **`Stop` handler forces sessions active**: The `_handle_stop()` handler at `event_processor.py:168-176` runs `UPDATE sessions SET status = 'active'` on every `Stop` event. This means even if a reaper existed, `Stop` events would undo its work by re-activating sessions.

3. **No stale session detection**: There is no timeout mechanism, background task, or periodic check to detect sessions that have been `active` for an unreasonable amount of time without receiving new events.

The net effect: sessions are created as `active` by `_ensure_session()` or `_handle_session_start()`, kept `active` by `_handle_stop()`, and never transitioned to `ended` by anything.

## Relevant Files
Use these files to fix the bug:

- `backend/ai_monitor/db.py` — Add `last_event_at` column to the sessions table schema. Add migration logic for existing databases.
- `backend/ai_monitor/config.py` — Add `session_stale_timeout_minutes` setting (default: 10).
- `backend/ai_monitor/services/event_processor.py` — Update `_ensure_session()` to set `last_event_at` on every event. Change `_handle_stop()` to stop forcing `status='active'`.
- `backend/ai_monitor/services/session_reaper.py` — New file. Contains the `reap_stale_sessions()` function that marks stale active sessions as ended.
- `backend/ai_monitor/main.py` — Start the reaper background task in the FastAPI lifespan.
- `backend/tests/features/events.feature` — Add BDD scenario for Stop event behavior and stale session reaping.
- `backend/tests/step_defs/test_events.py` — Add step definitions for new scenarios.

### New Files
- `backend/ai_monitor/services/session_reaper.py` — Periodic stale session reaper function.

## Step by Step Tasks

### Step 1: Add `last_event_at` column to database schema
- In `backend/ai_monitor/db.py`, add `last_event_at TEXT` to the `sessions` CREATE TABLE statement, after the `ended_at` column.
- Add a migration block after `_connection.executescript(SCHEMA)` that uses `ALTER TABLE sessions ADD COLUMN last_event_at TEXT` wrapped in a try/except to handle the case where the column already exists (for existing databases).
- Add an index: `CREATE INDEX IF NOT EXISTS idx_sessions_last_event_at ON sessions(last_event_at)`.

### Step 2: Add stale timeout config setting
- In `backend/ai_monitor/config.py`, add `session_stale_timeout_minutes: int = 10` to the `Settings` class.

### Step 3: Update `_ensure_session()` to track `last_event_at`
- In `backend/ai_monitor/services/event_processor.py`, modify `_ensure_session()`:
  - For new sessions (INSERT): include `last_event_at` set to `_now()`.
  - For existing sessions: add an `UPDATE sessions SET last_event_at = ? WHERE session_id = ?` query after the existence check, so every event updates the timestamp.

### Step 4: Fix `_handle_stop()` to stop forcing active status
- In `backend/ai_monitor/services/event_processor.py`, change `_handle_stop()`:
  - Remove the `UPDATE sessions SET status = 'active'` query.
  - Replace with: `UPDATE sessions SET last_event_at = ? WHERE session_id = ?` using `_now()`.
  - Update the docstring to reflect the new behavior.

### Step 5: Create the stale session reaper
- Create `backend/ai_monitor/services/session_reaper.py` with a function `reap_stale_sessions()`:
  - Import `get_db` from `ai_monitor.db`, `settings` from `ai_monitor.config`, and `datetime`/`timezone` from stdlib.
  - Calculate the cutoff timestamp: `now - session_stale_timeout_minutes`.
  - Execute: `UPDATE sessions SET status = 'ended', ended_at = last_event_at WHERE status = 'active' AND last_event_at IS NOT NULL AND last_event_at < ?` with the cutoff as parameter.
  - Also handle sessions with NULL `last_event_at`: `UPDATE sessions SET status = 'ended', ended_at = started_at WHERE status = 'active' AND last_event_at IS NULL AND started_at < ?` with the cutoff.
  - Commit the transaction.
  - Log how many sessions were reaped.

### Step 6: Start the reaper in the FastAPI lifespan
- In `backend/ai_monitor/main.py`:
  - Import `asyncio` and `reap_stale_sessions` from `ai_monitor.services.session_reaper`.
  - Add an async function `_reaper_loop()` that runs `reap_stale_sessions()` every 120 seconds (2 minutes) in a `while True` loop with `await asyncio.sleep(120)` and a try/except for `asyncio.CancelledError`.
  - In the `lifespan()` context manager, start the reaper task with `asyncio.create_task(_reaper_loop())` after startup, and cancel it during shutdown (before `stop_watcher()`).

### Step 7: Add BDD tests for stale session reaping
- In `backend/tests/features/events.feature`, add two new scenarios:
  - **"Stop event updates last activity"**: Given a session exists, when a Stop event is posted, then the session should still have status "active" (not forced, just preserved) and `last_event_at` should be set.
  - **"Stale sessions are reaped"**: Given a session exists with `last_event_at` set to 15 minutes ago, when `reap_stale_sessions()` is called, then the session should have status "ended" and `ended_at` should be set.
- In `backend/tests/step_defs/test_events.py`, add step definitions:
  - Step to post a Stop event for a session.
  - Step to verify `last_event_at` is set on a session.
  - Step to set a session's `last_event_at` to a past timestamp (directly in DB for test setup).
  - Step to call `reap_stale_sessions()` and verify session status changed to "ended".

### Step 8: Run validation commands
- Run all existing and new tests to confirm zero regressions.
- Manually verify with the running server that active sessions are reaped after the timeout.

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `cd /Users/eslamhassan/Documents/GitRepo/ai_monitor/backend && uv run pytest -v` — Run all BDD tests (existing + new) to validate session reaping works and no regressions in event handling, sessions API, tools, project detail, timeline, or search.
- `cd /Users/eslamhassan/Documents/GitRepo/ai_monitor/backend && uv run python -c "from ai_monitor.db import get_db; db = get_db(); print([col[1] for col in db.execute('PRAGMA table_info(sessions)').fetchall()])"` — Verify the `last_event_at` column exists in the sessions table schema.
- `cd /Users/eslamhassan/Documents/GitRepo/ai_monitor/backend && uv run python -c "from ai_monitor.services.session_reaper import reap_stale_sessions; print('reaper importable')"` — Verify the reaper module is importable without errors.

## Notes
- **No new dependencies required** — uses `asyncio` (stdlib) for the background loop. APScheduler is already a dependency but not needed for this simple periodic task.
- The 10-minute stale timeout is configurable via the `SESSION_STALE_TIMEOUT_MINUTES` env var (mapped by pydantic-settings).
- The `SessionEnd` handler in `event_processor.py` is kept as-is — it's harmless dead code and might become useful if Claude Code adds a `SessionEnd` hook type in the future.
- The reaper sets `ended_at = last_event_at` (not `now()`) so the session duration accurately reflects when the session was actually last active, rather than when the reaper ran.
- Existing sessions in the database (with `last_event_at IS NULL`) are also handled by the reaper with a fallback to `started_at`.
