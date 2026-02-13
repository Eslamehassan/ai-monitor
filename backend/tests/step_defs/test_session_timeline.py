"""Step definitions for session_timeline.feature."""

import json
import time

import pytest
from pytest_bdd import given, when, then, scenarios, parsers

scenarios("../features/session_timeline.feature")


@given(parsers.parse("a tool call with input for session \"{session_id}\" with tool \"{tool}\" and input '{tool_input}'"))
def tool_call_with_input(client, session_id, tool, tool_input):
    input_data = json.loads(tool_input)
    resp = client.post("/api/events", json={
        "session_id": session_id,
        "hook_event_name": "PreToolUse",
        "tool_name": tool,
        "tool_input": input_data,
    })
    assert resp.status_code == 200
    time.sleep(0.2)
    resp = client.post("/api/events", json={
        "session_id": session_id,
        "hook_event_name": "PostToolUse",
        "tool_name": tool,
        "tool_response": "ok",
    })
    assert resp.status_code == 200
    time.sleep(0.2)


@given(parsers.parse('an agent "{agent}" is started for session "{session_id}"'))
def agent_started(client, session_id, agent):
    resp = client.post("/api/events", json={
        "session_id": session_id,
        "hook_event_name": "SubagentStart",
        "agent_name": agent,
        "agent_type": "general",
    })
    assert resp.status_code == 200
    time.sleep(0.2)


@when(parsers.parse('I request the timeline for session "{session_id}"'))
def request_timeline(client, session_id):
    resp = client.get(f"/api/sessions/{session_id}/timeline")
    assert resp.status_code == 200
    pytest.timeline_response = resp.json()


@then(parsers.parse("the timeline should contain {count:d} events"))
def timeline_event_count(count):
    assert len(pytest.timeline_response) == count


@then(parsers.parse('the first timeline event should be type "{event_type}"'))
def first_event_type(event_type):
    assert pytest.timeline_response[0]["type"] == event_type


@then("the first timeline event should have tool_input data")
def first_event_has_tool_input():
    event = pytest.timeline_response[0]
    assert event["tool_call"] is not None
    assert event["tool_call"]["tool_input"] is not None


@then(parsers.parse('the first timeline event should have error "{error}"'))
def first_event_has_error(error):
    event = pytest.timeline_response[0]
    assert event["tool_call"] is not None
    assert event["tool_call"]["error"] == error
