Feature: Project Detail API
  The API provides a project detail endpoint with aggregated statistics.

  Scenario: Get project detail with aggregated stats
    Given the API is running
    And a session "proj-detail-1" exists
    When I request the project detail for session "proj-detail-1"
    Then the project detail response should have a name
    And the project detail should have session_count of 1

  Scenario: Project detail returns 404 for unknown project
    Given the API is running
    When I request project detail for project id 99999
    Then the response status should be 404

  Scenario: Project detail includes tool distribution
    Given the API is running
    And a session "proj-tool-1" exists
    And a pending tool call for session "proj-tool-1" with tool "Read" exists
    When I request the project detail for session "proj-tool-1"
    Then the project detail should include tool distribution
