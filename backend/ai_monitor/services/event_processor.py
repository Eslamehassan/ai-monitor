"""Process hook events from Claude Code."""

import json
import os
from datetime import datetime, timezone

from ai_monitor.db import get_db
from ai_monitor.models import HookEvent


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def _get_or_create_project(cwd: str) -> int:
    """Find or create a project based on the working directory."""
    db = get_db()
    row = db.execute("SELECT id FROM projects WHERE path = ?", (cwd,)).fetchone()
    if row:
        return row["id"]
    name = os.path.basename(cwd) or cwd
    cur = db.execute(
        "INSERT INTO projects (name, path, created_at) VALUES (?, ?, ?)",
        (name, cwd, _now()),
    )
    db.commit()
    return cur.lastrowid


def _ensure_session(event: HookEvent) -> None:
    """Auto-create a session row if one doesn't exist for this session_id."""
    db = get_db()
    row = db.execute(
        "SELECT id FROM sessions WHERE session_id = ?", (event.session_id,)
    ).fetchone()
    if row:
        return

    project_id = None
    if event.cwd:
        project_id = _get_or_create_project(event.cwd)

    db.execute(
        """INSERT OR IGNORE INTO sessions (session_id, project_id, status, model, started_at)
           VALUES (?, ?, 'active', ?, ?)""",
        (event.session_id, project_id, event.model, _now()),
    )
    db.commit()


def process_event(event: HookEvent) -> None:
    """Route a hook event to the appropriate handler."""
    # Always ensure the session exists before processing any event
    _ensure_session(event)

    handlers = {
        "SessionStart": _handle_session_start,
        "SessionEnd": _handle_session_end,
        "PreToolUse": _handle_pre_tool_use,
        "PostToolUse": _handle_post_tool_use,
        "PostToolUseFailure": _handle_post_tool_use_failure,
        "SubagentStart": _handle_subagent_start,
        "SubagentStop": _handle_subagent_stop,
        "Stop": _handle_stop,
    }
    handler = handlers.get(event.hook_event_name)
    if handler:
        handler(event)


def _handle_session_start(event: HookEvent) -> None:
    db = get_db()
    project_id = None
    if event.cwd:
        project_id = _get_or_create_project(event.cwd)

    db.execute(
        """INSERT INTO sessions (session_id, project_id, status, model, started_at)
           VALUES (?, ?, 'active', ?, ?)
           ON CONFLICT(session_id) DO UPDATE SET
               project_id = COALESCE(excluded.project_id, sessions.project_id),
               status = 'active',
               model = COALESCE(excluded.model, sessions.model)""",
        (event.session_id, project_id, event.model, _now()),
    )
    db.commit()


def _handle_session_end(event: HookEvent) -> None:
    db = get_db()
    db.execute(
        "UPDATE sessions SET status = 'ended', ended_at = ? WHERE session_id = ?",
        (_now(), event.session_id),
    )
    db.commit()


def _handle_pre_tool_use(event: HookEvent) -> None:
    db = get_db()
    tool_input = None
    if event.tool_input is not None:
        tool_input = json.dumps(event.tool_input) if not isinstance(event.tool_input, str) else event.tool_input
    db.execute(
        """INSERT INTO tool_calls (session_id, tool_name, tool_input, status, started_at)
           VALUES (?, ?, ?, 'pending', ?)""",
        (event.session_id, event.tool_name or "unknown", tool_input, _now()),
    )
    db.commit()


def _handle_post_tool_use(event: HookEvent) -> None:
    db = get_db()
    tool_response = None
    if event.tool_response is not None:
        tool_response = json.dumps(event.tool_response) if not isinstance(event.tool_response, str) else event.tool_response

    # Find the most recent pending tool call for this session+tool
    row = db.execute(
        """SELECT id, started_at FROM tool_calls
           WHERE session_id = ? AND tool_name = ? AND status = 'pending'
           ORDER BY id DESC LIMIT 1""",
        (event.session_id, event.tool_name or "unknown"),
    ).fetchone()

    if row:
        started = datetime.fromisoformat(row["started_at"])
        duration_ms = int((datetime.fromisoformat(_now()) - started).total_seconds() * 1000)
        db.execute(
            """UPDATE tool_calls SET tool_response = ?, status = 'success',
               ended_at = ?, duration_ms = ? WHERE id = ?""",
            (tool_response, _now(), duration_ms, row["id"]),
        )
    else:
        db.execute(
            """INSERT INTO tool_calls (session_id, tool_name, tool_response, status, ended_at)
               VALUES (?, ?, ?, 'success', ?)""",
            (event.session_id, event.tool_name or "unknown", tool_response, _now()),
        )
    db.commit()


def _handle_post_tool_use_failure(event: HookEvent) -> None:
    db = get_db()
    row = db.execute(
        """SELECT id, started_at FROM tool_calls
           WHERE session_id = ? AND tool_name = ? AND status = 'pending'
           ORDER BY id DESC LIMIT 1""",
        (event.session_id, event.tool_name or "unknown"),
    ).fetchone()

    if row:
        started = datetime.fromisoformat(row["started_at"])
        duration_ms = int((datetime.fromisoformat(_now()) - started).total_seconds() * 1000)
        db.execute(
            """UPDATE tool_calls SET status = 'error', error = ?,
               ended_at = ?, duration_ms = ? WHERE id = ?""",
            (event.error, _now(), duration_ms, row["id"]),
        )
    else:
        db.execute(
            """INSERT INTO tool_calls (session_id, tool_name, status, error, ended_at)
               VALUES (?, ?, 'error', ?, ?)""",
            (event.session_id, event.tool_name or "unknown", event.error, _now()),
        )
    db.commit()


def _handle_stop(event: HookEvent) -> None:
    """Handle a Stop event — the model finished a turn, NOT session end."""
    # Just touch the session to keep it marked active; don't end it.
    db = get_db()
    db.execute(
        "UPDATE sessions SET status = 'active' WHERE session_id = ?",
        (event.session_id,),
    )
    db.commit()


def _handle_subagent_start(event: HookEvent) -> None:
    db = get_db()
    db.execute(
        """INSERT INTO agents (session_id, agent_name, agent_type, status, started_at)
           VALUES (?, ?, ?, 'active', ?)""",
        (event.session_id, event.agent_name, event.agent_type, _now()),
    )
    db.commit()


def _handle_subagent_stop(event: HookEvent) -> None:
    db = get_db()
    row = db.execute(
        """SELECT id FROM agents
           WHERE session_id = ? AND agent_name = ? AND status = 'active'
           ORDER BY id DESC LIMIT 1""",
        (event.session_id, event.agent_name),
    ).fetchone()

    if row:
        db.execute(
            "UPDATE agents SET status = 'stopped', ended_at = ? WHERE id = ?",
            (_now(), row["id"]),
        )
    db.commit()
