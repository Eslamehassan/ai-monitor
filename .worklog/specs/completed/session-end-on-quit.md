# Bug: Sessions stay active after quit/exit/clear

## Bug Description
When a user runs `/quit`, `/exit`, or `/clear` in Claude Code, the AI Monitor dashboard continues showing the session as "active". The session only transitions to "ended" after the stale session timeout expires (currently 100 minutes). Users expect sessions to show as "ended" within a minute or two of quitting, not nearly two hours later.

## Problem Statement
Claude Code does not emit a dedicated `SessionEnd` hook event when the user runs `/quit`, `/exit`, or `/clear`. The hook system listens for `PreToolUse`, `PostToolUse`, `Notification`, `SubagentStop`, `SubagentStart`, and `Stop` — none of which fire on session termination. The only mechanism to mark sessions as ended is the stale session reaper, which runs every 2 minutes with a 100-minute inactivity threshold. This means sessions remain "active" for up to 102 minutes after the user has left.

## Solution Statement
Reduce the stale session timeout from 100 minutes to 5 minutes and increase the reaper frequency from every 120 seconds to every 30 seconds. This brings session end detection down to ~5.5 minutes worst-case. Additionally, update `_ensure_session` to re-activate sessions that were prematurely reaped — if a new event arrives for a session marked "ended" by the reaper, the session should flip back to "active". This safety net prevents false "ended" states during long pauses between turns.

## Steps to Reproduce
1. Start the AI Monitor server (`uv run python -m ai_monitor`)
2. Open a Claude Code session in a project with hooks installed
3. Interact with Claude (send a message, observe session shows as "active" in dashboard)
4. Type `/quit` or `/exit` in Claude Code to end the session
5. Check the AI Monitor dashboard — session still shows "active"
6. Wait 100+ minutes — session finally transitions to "ended"

**Expected:** Session shows as "ended" within a few minutes of quitting.
**Actual:** Session stays "active" for ~100 minutes after quitting.

## Root Cause Analysis
Three factors combine to cause this bug:

1. **No session-end hook event from Claude Code.** When a user runs `/quit`, `/exit`, or `/clear`, Claude Code terminates without firing a hook event. The `Stop` event fires at the end of each model turn (not on session exit). There is no `SessionEnd` event emitted by Claude Code's hook system.

2. **Stale timeout is too long.** The `session_stale_timeout_minutes` config defaults to 100 minutes (`backend/ai_monitor/config.py:14`). This means a session must be inactive for 100 minutes before the reaper marks it as ended. For a quit/exit scenario, this is far too long.

3. **Reaper runs infrequently.** The reaper loop in `main.py:29` sleeps for 120 seconds between runs. Combined with the 100-minute timeout, worst-case detection is 102 minutes.

Additionally, `_ensure_session` (`event_processor.py:30-54`) only updates `last_event_at` for existing sessions — it does not re-activate sessions that were marked "ended" by the reaper. If the timeout is reduced aggressively, a session could be prematurely reaped during a long user pause, and subsequent events would not restore it to "active".

## Relevant Files
Use these files to fix the bug:

- **`backend/ai_monitor/config.py`** — Contains the `session_stale_timeout_minutes` default (line 14). Must reduce from 100 to 5.
- **`backend/ai_monitor/main.py`** — Contains the `_reaper_loop` with 120-second sleep interval (line 29). Must reduce to 30 seconds.
- **`backend/ai_monitor/services/event_processor.py`** — Contains `_ensure_session` (lines 30-54). Must add re-activation logic to flip ended sessions back to active when new events arrive.
- **`backend/tests/features/events.feature`** — BDD feature file for hook events. Must add scenario for session re-activation.
- **`backend/tests/step_defs/test_events.py`** — Step definitions. Must add steps for the re-activation scenario and update the stale session test if needed.

## Step by Step Tasks

### Step 1: Reduce stale session timeout in config
- In `backend/ai_monitor/config.py`, change `session_stale_timeout_minutes: int = 100` to `session_stale_timeout_minutes: int = 5`.
- This makes the reaper mark sessions as ended after just 5 minutes of inactivity instead of 100.

### Step 2: Increase reaper frequency in main.py
- In `backend/ai_monitor/main.py`, change `await asyncio.sleep(120)` (line 29) to `await asyncio.sleep(30)`.
- Update the docstring from "every 2 minutes" to "every 30 seconds".
- This ensures sessions are detected as stale within 30 seconds of crossing the threshold.

### Step 3: Add session re-activation in _ensure_session
- In `backend/ai_monitor/services/event_processor.py`, update the `_ensure_session` function.
- When an existing session is found (the `if row:` branch at line 37), change the UPDATE statement to also set `status = 'active'` and `ended_at = NULL` in addition to updating `last_event_at`.
- This ensures that if the reaper prematurely ends a session (e.g., user paused for 6 minutes but is still working), the next event from that session will re-activate it.
- Updated SQL:
  ```sql
  UPDATE sessions SET last_event_at = ?, status = 'active', ended_at = NULL
  WHERE session_id = ?
  ```

### Step 4: Add BDD test for session re-activation
- In `backend/tests/features/events.feature`, add a new scenario:
  ```gherkin
  Scenario: Reaped session is re-activated by new event
    Given the API is running
    And a session "s9" exists
    And session "s9" has last_event_at set to 15 minutes ago
    When I run the stale session reaper
    Then a session "s9" with status "ended" should exist
    When I post a Stop event for session "s9"
    Then a session "s9" with status "active" should exist
  ```
- This validates the end-to-end flow: session is reaped, then re-activated by a subsequent event.

### Step 5: Run validation commands
- Run the full test suite to confirm all scenarios pass with zero regressions.
- Verify the stale session test still passes (15 minutes > 5 minute timeout, so it should be reaped).

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `cd backend && uv run pytest -v` — Run all backend tests including the new re-activation scenario and existing stale session tests. Every scenario must pass.

## Notes
- The 5-minute timeout is a conservative choice. Most Claude Code interactions have events every few seconds. A 5-minute gap with zero events strongly signals the session has ended. The re-activation logic provides a safety net for edge cases (user reading for 6+ minutes).
- The `Notification` event is hooked in `install.sh` but is NOT in the `HookEvent` model's `Literal` type. This means any `Notification` events from Claude Code are silently rejected with 422 errors. This is a separate issue and should be addressed in a follow-up.
- No new libraries are needed for this fix.
