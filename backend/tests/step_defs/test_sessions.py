"""Step definitions for sessions.feature."""

import time

import pytest
from pytest_bdd import given, when, then, scenarios, parsers

scenarios("../features/sessions.feature")


@given(parsers.parse('session "{session_id}" is ended'))
def end_session(client, session_id):
    resp = client.post("/api/events", json={
        "session_id": session_id,
        "hook_event_name": "SessionEnd",
    })
    assert resp.status_code == 200
    time.sleep(0.2)


@when("I request the sessions list")
def request_sessions(client):
    resp = client.get("/api/sessions")
    assert resp.status_code == 200
    pytest.sessions_response = resp.json()


@when(parsers.parse('I request sessions filtered by status "{status}"'))
def request_sessions_by_status(client, status):
    resp = client.get(f"/api/sessions?status={status}")
    assert resp.status_code == 200
    pytest.sessions_response = resp.json()


@then(parsers.parse("the response should contain {count:d} sessions"))
def response_has_count(count):
    assert pytest.sessions_response["total"] == count


@then(parsers.parse('the response should include session "{session_id}"'))
def response_includes_session(session_id):
    items = pytest.sessions_response["items"]
    ids = [s["session_id"] for s in items]
    assert session_id in ids, f"Session '{session_id}' not in {ids}"


@when(parsers.parse('I request the detail for session "{session_id}"'))
def request_session_detail(client, session_id):
    resp = client.get(f"/api/sessions/{session_id}")
    assert resp.status_code == 200
    pytest.session_detail = resp.json()


@then(parsers.parse("the response should include {count:d} tool calls"))
def response_has_tool_calls(count):
    assert len(pytest.session_detail["tool_calls"]) == count


@then(parsers.parse('the response should include tool "{tool}"'))
def response_includes_tool(tool):
    tools = [tc["tool_name"] for tc in pytest.session_detail["tool_calls"]]
    assert tool in tools, f"Tool '{tool}' not in {tools}"
