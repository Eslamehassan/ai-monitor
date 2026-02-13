Feature: Hook Events
  The API receives hook events from Claude Code and persists them.

  Scenario: SessionStart creates a project and session
    Given the API is running
    When I post a SessionStart event for session "s1" with cwd "/tmp/my-project"
    Then a project named "my-project" should exist
    And a session "s1" with status "active" should exist

  Scenario: PreToolUse creates a pending tool call
    Given the API is running
    And a session "s2" exists
    When I post a PreToolUse event for session "s2" with tool "Read"
    Then a tool call for session "s2" with tool "Read" and status "pending" should exist

  Scenario: PostToolUse updates the tool call to success
    Given the API is running
    And a session "s3" exists
    And a pending tool call for session "s3" with tool "Write" exists
    When I post a PostToolUse event for session "s3" with tool "Write"
    Then the tool call for session "s3" with tool "Write" should have status "success"

  Scenario: PostToolUseFailure records an error
    Given the API is running
    And a session "s4" exists
    And a pending tool call for session "s4" with tool "Bash" exists
    When I post a PostToolUseFailure event for session "s4" with tool "Bash" and error "permission denied"
    Then the tool call for session "s4" with tool "Bash" should have status "error"

  Scenario: SessionEnd marks session as ended
    Given the API is running
    And a session "s5" exists
    When I post a SessionEnd event for session "s5"
    Then a session "s5" with status "ended" should exist

  Scenario: SubagentStart and SubagentStop track agents
    Given the API is running
    And a session "s6" exists
    When I post a SubagentStart event for session "s6" with agent "researcher"
    Then an agent "researcher" with status "active" should exist for session "s6"
    When I post a SubagentStop event for session "s6" with agent "researcher"
    Then an agent "researcher" with status "stopped" should exist for session "s6"
