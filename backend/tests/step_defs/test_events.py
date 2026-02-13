"""Step definitions for events.feature."""

import time
from datetime import datetime, timedelta, timezone

import pytest
from pytest_bdd import given, when, then, scenarios, parsers

from ai_monitor.db import get_db
from ai_monitor.services.session_reaper import reap_stale_sessions

scenarios("../features/events.feature")


@when(parsers.parse('I post a SessionStart event for session "{session_id}" with cwd "{cwd}"'))
def post_session_start(client, session_id, cwd):
    resp = client.post("/api/events", json={
        "session_id": session_id,
        "hook_event_name": "SessionStart",
        "cwd": cwd,
    })
    assert resp.status_code == 200


@then(parsers.parse('a project named "{name}" should exist'))
def project_exists(name):
    time.sleep(0.2)
    db = get_db()
    row = db.execute("SELECT * FROM projects WHERE name = ?", (name,)).fetchone()
    assert row is not None, f"Project '{name}' not found"


@then(parsers.parse('a session "{session_id}" with status "{status}" should exist'))
def session_with_status(session_id, status):
    time.sleep(0.2)
    db = get_db()
    row = db.execute(
        "SELECT * FROM sessions WHERE session_id = ? AND status = ?",
        (session_id, status),
    ).fetchone()
    assert row is not None, f"Session '{session_id}' with status '{status}' not found"


@when(parsers.parse('I post a PreToolUse event for session "{session_id}" with tool "{tool}"'))
def post_pre_tool_use(client, session_id, tool):
    resp = client.post("/api/events", json={
        "session_id": session_id,
        "hook_event_name": "PreToolUse",
        "tool_name": tool,
    })
    assert resp.status_code == 200


@then(parsers.parse('a tool call for session "{session_id}" with tool "{tool}" and status "{status}" should exist'))
def tool_call_exists(session_id, tool, status):
    time.sleep(0.2)
    db = get_db()
    row = db.execute(
        "SELECT * FROM tool_calls WHERE session_id = ? AND tool_name = ? AND status = ?",
        (session_id, tool, status),
    ).fetchone()
    assert row is not None, f"Tool call '{tool}' with status '{status}' not found for session '{session_id}'"


@when(parsers.parse('I post a PostToolUse event for session "{session_id}" with tool "{tool}"'))
def post_post_tool_use(client, session_id, tool):
    resp = client.post("/api/events", json={
        "session_id": session_id,
        "hook_event_name": "PostToolUse",
        "tool_name": tool,
        "tool_response": "ok",
    })
    assert resp.status_code == 200


@then(parsers.parse('the tool call for session "{session_id}" with tool "{tool}" should have status "{status}"'))
def tool_call_status(session_id, tool, status):
    time.sleep(0.2)
    db = get_db()
    row = db.execute(
        "SELECT * FROM tool_calls WHERE session_id = ? AND tool_name = ? ORDER BY id DESC LIMIT 1",
        (session_id, tool),
    ).fetchone()
    assert row is not None, f"Tool call '{tool}' not found for session '{session_id}'"
    assert row["status"] == status, f"Expected status '{status}', got '{row['status']}'"


@when(parsers.parse('I post a SessionEnd event for session "{session_id}"'))
def post_session_end(client, session_id):
    resp = client.post("/api/events", json={
        "session_id": session_id,
        "hook_event_name": "SessionEnd",
    })
    assert resp.status_code == 200


@when(parsers.parse('I post a SubagentStart event for session "{session_id}" with agent "{agent}"'))
def post_subagent_start(client, session_id, agent):
    resp = client.post("/api/events", json={
        "session_id": session_id,
        "hook_event_name": "SubagentStart",
        "agent_name": agent,
        "agent_type": "general",
    })
    assert resp.status_code == 200


@then(parsers.parse('an agent "{agent}" with status "{status}" should exist for session "{session_id}"'))
def agent_with_status(agent, status, session_id):
    time.sleep(0.2)
    db = get_db()
    row = db.execute(
        "SELECT * FROM agents WHERE session_id = ? AND agent_name = ? AND status = ?",
        (session_id, agent, status),
    ).fetchone()
    assert row is not None, f"Agent '{agent}' with status '{status}' not found for session '{session_id}'"


@when(parsers.parse('I post a SubagentStop event for session "{session_id}" with agent "{agent}"'))
def post_subagent_stop(client, session_id, agent):
    resp = client.post("/api/events", json={
        "session_id": session_id,
        "hook_event_name": "SubagentStop",
        "agent_name": agent,
    })
    assert resp.status_code == 200


@when(parsers.parse('I post a Stop event for session "{session_id}"'))
def post_stop(client, session_id):
    resp = client.post("/api/events", json={
        "session_id": session_id,
        "hook_event_name": "Stop",
    })
    assert resp.status_code == 200


@then(parsers.parse('session "{session_id}" should have last_event_at set'))
def session_has_last_event_at(session_id):
    time.sleep(0.2)
    db = get_db()
    row = db.execute(
        "SELECT last_event_at FROM sessions WHERE session_id = ?",
        (session_id,),
    ).fetchone()
    assert row is not None, f"Session '{session_id}' not found"
    assert row["last_event_at"] is not None, "last_event_at should be set"


@given(parsers.parse('session "{session_id}" has last_event_at set to 15 minutes ago'))
def session_last_event_stale(session_id):
    db = get_db()
    past = (datetime.now(timezone.utc) - timedelta(minutes=15)).strftime("%Y-%m-%dT%H:%M:%SZ")
    db.execute(
        "UPDATE sessions SET last_event_at = ? WHERE session_id = ?",
        (past, session_id),
    )
    db.commit()


@when("I run the stale session reaper")
def run_reaper():
    reap_stale_sessions()


@then(parsers.parse('session "{session_id}" should have ended_at set'))
def session_has_ended_at(session_id):
    time.sleep(0.2)
    db = get_db()
    row = db.execute(
        "SELECT ended_at FROM sessions WHERE session_id = ?",
        (session_id,),
    ).fetchone()
    assert row is not None, f"Session '{session_id}' not found"
    assert row["ended_at"] is not None, "ended_at should be set"
