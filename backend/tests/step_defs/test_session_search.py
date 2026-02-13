"""Step definitions for session_search.feature."""

import time

import pytest
from pytest_bdd import given, when, then, scenarios, parsers

scenarios("../features/session_search.feature")


@when(parsers.parse('I search sessions with query "{query}"'))
def search_sessions(client, query):
    resp = client.get(f"/api/sessions?search={query}")
    assert resp.status_code == 200
    pytest.search_response = resp.json()


@when("I search sessions without a query")
def search_sessions_no_query(client):
    resp = client.get("/api/sessions")
    assert resp.status_code == 200
    pytest.search_response = resp.json()


@then(parsers.parse("the search response should contain {count:d} sessions"))
def search_response_count(count):
    assert pytest.search_response["total"] == count
