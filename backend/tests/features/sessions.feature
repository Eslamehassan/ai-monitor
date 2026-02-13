Feature: Sessions API
  The API provides endpoints to list and inspect sessions.

  Scenario: List all sessions
    Given the API is running
    And a session "list-1" exists
    And a session "list-2" exists
    When I request the sessions list
    Then the response should contain 2 sessions

  Scenario: Filter sessions by status
    Given the API is running
    And a session "active-1" exists
    And session "active-1" is ended
    And a session "active-2" exists
    When I request sessions filtered by status "active"
    Then the response should contain 1 sessions
    And the response should include session "active-2"

  Scenario: Get session detail with tool calls
    Given the API is running
    And a session "detail-1" exists
    And a pending tool call for session "detail-1" with tool "Grep" exists
    When I request the detail for session "detail-1"
    Then the response should include 1 tool calls
    And the response should include tool "Grep"
