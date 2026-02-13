Feature: Session Timeline API
  The API provides a timeline endpoint showing tool calls and agents chronologically.

  Scenario: Get session timeline with tool calls
    Given the API is running
    And a session "timeline-1" exists
    And a tool call with input for session "timeline-1" with tool "Read" and input '{"file_path": "/tmp/test.txt"}'
    When I request the timeline for session "timeline-1"
    Then the timeline should contain 1 events
    And the first timeline event should be type "tool_call"
    And the first timeline event should have tool_input data

  Scenario: Timeline interleaves agents and tool calls
    Given the API is running
    And a session "timeline-2" exists
    And a tool call with input for session "timeline-2" with tool "Bash" and input '{"command": "ls"}'
    And an agent "researcher" is started for session "timeline-2"
    When I request the timeline for session "timeline-2"
    Then the timeline should contain 2 events

  Scenario: Timeline shows error details
    Given the API is running
    And a session "timeline-3" exists
    And a pending tool call for session "timeline-3" with tool "Bash" exists
    When I post a PostToolUseFailure event for session "timeline-3" with tool "Bash" and error "command failed"
    And I request the timeline for session "timeline-3"
    Then the first timeline event should have error "command failed"
