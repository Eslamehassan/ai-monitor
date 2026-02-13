Feature: Tool Statistics API
  The API provides aggregated tool usage statistics.

  Scenario: Get tool usage statistics
    Given the API is running
    And a session "tool-1" exists
    And a pending tool call for session "tool-1" with tool "Read" exists
    And a pending tool call for session "tool-1" with tool "Read" exists
    And a pending tool call for session "tool-1" with tool "Write" exists
    When I request tool statistics
    Then the tool stats should include "Read" with count 2
    And the tool stats should include "Write" with count 1

  Scenario: Tool stats reflect error counts
    Given the API is running
    And a session "tool-2" exists
    And a pending tool call for session "tool-2" with tool "Bash" exists
    When I post a PostToolUseFailure event for session "tool-2" with tool "Bash" and error "timeout"
    And I request tool statistics
    Then the tool stats should show "Bash" with 1 errors
