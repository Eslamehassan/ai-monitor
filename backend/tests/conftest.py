"""Test fixtures and shared BDD step definitions for AI Monitor backend tests."""

import time

import pytest
from fastapi.testclient import TestClient
from pytest_bdd import given, when, then, parsers

import ai_monitor.db as db_module
from ai_monitor.db import get_db
from ai_monitor.main import app


@pytest.fixture(autouse=True)
def clean_db(tmp_path):
    """Use a fresh temp database for every test."""
    db_file = str(tmp_path / "test.db")
    db_module._connection = None
    original_path = db_module.settings.ai_monitor_db_path
    db_module.settings.ai_monitor_db_path = db_file
    yield
    db_module.close_db()
    db_module.settings.ai_monitor_db_path = original_path


@pytest.fixture
def client():
    """Provide a synchronous TestClient for the FastAPI app."""
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


# ── Shared BDD steps (available to all test modules) ─────────────


@given("the API is running")
def api_running(client):
    return client


@given(parsers.parse('a session "{session_id}" exists'))
def session_exists(client, session_id):
    resp = client.post("/api/events", json={
        "session_id": session_id,
        "hook_event_name": "SessionStart",
        "cwd": f"/tmp/{session_id}",
    })
    assert resp.status_code == 200
    time.sleep(0.2)


@given(parsers.parse('a pending tool call for session "{session_id}" with tool "{tool}" exists'))
def pending_tool_call(client, session_id, tool):
    resp = client.post("/api/events", json={
        "session_id": session_id,
        "hook_event_name": "PreToolUse",
        "tool_name": tool,
    })
    assert resp.status_code == 200
    time.sleep(0.2)


@when(parsers.parse('I post a PostToolUseFailure event for session "{session_id}" with tool "{tool}" and error "{error}"'))
def post_tool_failure(client, session_id, tool, error):
    resp = client.post("/api/events", json={
        "session_id": session_id,
        "hook_event_name": "PostToolUseFailure",
        "tool_name": tool,
        "error": error,
    })
    assert resp.status_code == 200
    time.sleep(0.2)
