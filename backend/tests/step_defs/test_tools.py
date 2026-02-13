"""Step definitions for tools.feature."""

import time

import pytest
from pytest_bdd import given, when, then, scenarios, parsers

scenarios("../features/tools.feature")


@when("I request tool statistics")
def request_tool_stats(client):
    resp = client.get("/api/tools/stats")
    assert resp.status_code == 200
    pytest.tool_stats_response = resp.json()


@then(parsers.parse('the tool stats should include "{tool}" with count {count:d}'))
def tool_stats_count(tool, count):
    stats = {s["tool_name"]: s for s in pytest.tool_stats_response}
    assert tool in stats, f"Tool '{tool}' not in stats: {list(stats.keys())}"
    assert stats[tool]["count"] == count, f"Expected count {count}, got {stats[tool]['count']}"


@then(parsers.parse('the tool stats should show "{tool}" with {count:d} errors'))
def tool_stats_errors(tool, count):
    stats = {s["tool_name"]: s for s in pytest.tool_stats_response}
    assert tool in stats, f"Tool '{tool}' not in stats"
    assert stats[tool]["error_count"] == count, f"Expected {count} errors, got {stats[tool]['error_count']}"
