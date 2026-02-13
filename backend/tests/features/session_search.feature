Feature: Session Search
  The sessions endpoint supports searching by session ID and project name.

  Scenario: Search sessions by session ID
    Given the API is running
    And a session "search-abc-123" exists
    And a session "search-def-456" exists
    When I search sessions with query "abc"
    Then the search response should contain 1 sessions

  Scenario: Search sessions by project name
    Given the API is running
    And a session "proj-search-1" exists
    When I search sessions with query "proj-search-1"
    Then the search response should contain 1 sessions

  Scenario: Empty search returns all sessions
    Given the API is running
    And a session "all-1" exists
    And a session "all-2" exists
    When I search sessions without a query
    Then the search response should contain 2 sessions
