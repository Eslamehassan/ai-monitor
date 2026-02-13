"""Step definitions for project_detail.feature."""

import time

import pytest
from pytest_bdd import given, when, then, scenarios, parsers

from ai_monitor.db import get_db

scenarios("../features/project_detail.feature")


@when(parsers.parse('I request the project detail for session "{session_id}"'))
def request_project_detail_for_session(client, session_id):
    db = get_db()
    row = db.execute(
        "SELECT project_id FROM sessions WHERE session_id = ?",
        (session_id,),
    ).fetchone()
    assert row is not None, f"Session '{session_id}' not found in DB"
    project_id = row["project_id"]
    resp = client.get(f"/api/projects/{project_id}")
    assert resp.status_code == 200
    pytest.project_detail_response = resp.json()


@when(parsers.parse("I request project detail for project id {project_id:d}"))
def request_project_detail_by_id(client, project_id):
    resp = client.get(f"/api/projects/{project_id}")
    pytest.project_detail_status = resp.status_code
    pytest.project_detail_response = resp.json() if resp.status_code == 200 else None


@then("the project detail response should have a name")
def project_detail_has_name():
    assert "name" in pytest.project_detail_response
    assert pytest.project_detail_response["name"]


@then(parsers.parse("the project detail should have session_count of {count:d}"))
def project_detail_session_count(count):
    assert pytest.project_detail_response["session_count"] == count


@then(parsers.parse("the response status should be {status:d}"))
def response_status_code(status):
    assert pytest.project_detail_status == status


@then("the project detail should include tool distribution")
def project_detail_has_tool_distribution():
    assert "tool_distribution" in pytest.project_detail_response
    assert isinstance(pytest.project_detail_response["tool_distribution"], list)
    assert len(pytest.project_detail_response["tool_distribution"]) > 0
