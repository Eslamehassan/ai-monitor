# Feature: Tool Detail Split-Pane View & Subagent Enrichment

## Feature Description
Transform the session timeline tool detail display from an inline raw-JSON expansion into a professional split-pane layout with formatted, human-readable tool details. When a tool or agent is clicked in the timeline (left pane), its details appear in a dedicated detail panel (right pane) with structured formatting — labels, key-value pairs, diff views, code blocks, and visual indicators appropriate to each tool type. Subagent (Task tool) entries are enriched to show the prompt sent, configuration, tools used during the subagent's lifetime, and the report returned.

## User Story
As a developer monitoring Claude Code sessions
I want to see tool call details in a formatted split-pane view with subagent context
So that I can quickly understand what each tool did, what instructions subagents received, and what results they returned — without reading raw JSON.

## Problem Statement
Currently, clicking a tool in the session timeline expands raw JSON inline below the tool entry. This has three problems:
1. **Layout disruption** — expanding JSON pushes all subsequent timeline items down, making it hard to browse the timeline while viewing details.
2. **Unreadable data** — raw JSON dumps force users to mentally parse tool inputs/outputs instead of seeing structured, formatted information.
3. **No subagent context** — when the Task tool spawns a subagent, there's no visibility into the prompt, configuration, tools used by the subagent, or the report it returned. Agent entries in the timeline are minimal (name, type, status only).

## Solution Statement
1. **Split-pane layout**: Replace inline expansion with a horizontal split — timeline list on the left, detail panel on the right. Clicking any tool or agent in the timeline populates the right panel without disturbing the timeline scroll position.
2. **Formatted tool renderers**: Create tool-specific formatters that display inputs/outputs as structured UI — file paths as links, commands in code blocks, search patterns highlighted, diffs for Edit operations, and key-value pairs for metadata.
3. **Subagent enrichment**: Link Task tool calls to their corresponding Agent records. Extract the prompt, subagent_type, model, description, and mode from the Task tool_input. Show the subagent's report from the Task tool_response. Identify tool calls that occurred during the subagent's lifetime window and display them as the subagent's activity.

## Relevant Files
Use these files to implement the feature:

**Backend — Data Layer & API**
- `backend/ai_monitor/db.py` — Add `task_tool_call_id` column to agents table for linking agents to their spawning Task tool call
- `backend/ai_monitor/models.py` — Extend Agent model with `task_tool_call_id`; add `AgentDetail` response model with enriched subagent data
- `backend/ai_monitor/services/event_processor.py` — On SubagentStart, find and link the most recent pending Task tool call
- `backend/ai_monitor/routes/sessions.py` — Enrich timeline endpoint to include agent-tool-call linkage data

**Frontend — Layout & Components**
- `frontend/src/components/sessions/SessionDetail.tsx` — Replace current timeline Card with split-pane layout (timeline left, detail right)
- `frontend/src/components/sessions/TimelineItem.tsx` — Change from inline expand to selection-based highlighting; remove inline `ToolCallDetail` render
- `frontend/src/components/sessions/ToolCallDetail.tsx` — Refactor into the right-pane detail view with tool-specific formatters
- `frontend/src/lib/api.ts` — Update Agent interface with `task_tool_call_id`; add `AgentDetail` type
- `frontend/src/lib/utils.ts` — Add helper utilities for parsing tool inputs

### New Files
- `frontend/src/components/sessions/DetailPanel.tsx` — Right-pane container that renders either tool detail or agent detail based on selection
- `frontend/src/components/sessions/toolRenderers.tsx` — Tool-specific formatter components (ReadDetail, WriteDetail, EditDetail, BashDetail, GrepDetail, GlobDetail, WebSearchDetail, TaskDetail, SkillDetail, GenericDetail)
- `frontend/src/components/sessions/AgentDetail.tsx` — Subagent detail view showing prompt, config, tools used, and report

## Implementation Plan

### Phase 1: Foundation — Backend Agent-Tool Linking
Add a foreign-key column `task_tool_call_id` to the agents table that links each subagent to the Task tool call that spawned it. When a `SubagentStart` event arrives, find the most recent pending `Task` tool call for the same session and store its ID. This enables the frontend to retrieve the Task tool call data (which contains the prompt and config) for any agent.

Also enrich the timeline API response to include the linked `task_tool_call_id` on agent records, and add an endpoint to retrieve tool calls that occurred during an agent's active window (subagent tool activity).

### Phase 2: Core Implementation — Split-Pane Layout & Selection Model
Replace the timeline tab's single-column layout with a horizontal split-pane: scrollable timeline on the left (~45% width), detail panel on the right (~55% width). Introduce a `selectedEvent` state in SessionDetail that tracks which timeline item is selected. Clicking a TimelineItem updates this state instead of toggling inline expansion. The right pane renders `DetailPanel` which delegates to either `ToolCallDetail` or `AgentDetail` based on the selected event type. When nothing is selected, show a placeholder prompting the user to select an item.

### Phase 3: Integration — Formatted Renderers & Subagent Detail
Build tool-specific renderer components that parse the `tool_input` and `tool_response` JSON and present structured UI. For subagents (Task tool / agent events), show: description, subagent_type, model, mode, the full prompt, a list of tools used by the subagent during its lifetime, and the final report. Each renderer uses appropriate UI elements — code blocks for Bash commands, file path breadcrumbs for file operations, highlighted patterns for search tools, and collapsible sections for large content.

## Step by Step Tasks

### Step 1: Add `task_tool_call_id` column to agents table
- In `backend/ai_monitor/db.py`, add a migration block (same pattern as the existing `last_event_at` migration) that runs `ALTER TABLE agents ADD COLUMN task_tool_call_id INTEGER REFERENCES tool_calls(id)`
- Add the column to the agents `CREATE TABLE` statement for fresh installs

### Step 2: Update backend models
- In `backend/ai_monitor/models.py`:
  - Add `task_tool_call_id: int | None = None` to the `Agent` model
  - Add a new `AgentDetail` model extending `Agent` with fields: `task_prompt: str | None`, `task_description: str | None`, `subagent_tools: list[ToolCall]`, `task_response: Any | None`

### Step 3: Link SubagentStart to Task tool calls
- In `backend/ai_monitor/services/event_processor.py`, modify `_handle_subagent_start`:
  - After inserting the agent row, query for the most recent pending `Task` tool call in the same session: `SELECT id FROM tool_calls WHERE session_id = ? AND tool_name = 'Task' AND status = 'pending' ORDER BY id DESC LIMIT 1`
  - If found, update the new agent row: `UPDATE agents SET task_tool_call_id = ? WHERE id = ?`

### Step 4: Enrich the timeline API
- In `backend/ai_monitor/routes/sessions.py`:
  - Modify the agents query in the timeline endpoint to also select `task_tool_call_id`
  - Add a new endpoint `GET /api/sessions/{session_id}/agents/{agent_id}` that returns an `AgentDetail`:
    - Fetch the agent record
    - If `task_tool_call_id` is set, fetch the linked Task tool call to extract `tool_input` (prompt, description, subagent_type, model, mode) and `tool_response` (the report)
    - Query tool_calls that occurred between the agent's `started_at` and `ended_at` timestamps (excluding the Task tool call itself) to find tools the subagent used
    - Return the enriched `AgentDetail`

### Step 5: Update frontend API types and fetchers
- In `frontend/src/lib/api.ts`:
  - Add `task_tool_call_id: number | null` to the `Agent` interface
  - Add `AgentDetail` interface with `task_prompt`, `task_description`, `task_config` (subagent_type, model, mode), `subagent_tools: ToolCall[]`, `task_response: unknown`
  - Add `fetchAgentDetail(sessionId: string, agentId: number): Promise<AgentDetail>` fetcher function

### Step 6: Build the split-pane layout in SessionDetail
- In `frontend/src/components/sessions/SessionDetail.tsx`:
  - Add state: `const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null)`
  - Replace the timeline `<Card>` content with a two-column flex layout:
    ```
    <div className="flex gap-4 h-[600px]">
      <div className="w-[45%] overflow-hidden flex flex-col">
        {/* Timeline list (ScrollArea) */}
      </div>
      <div className="w-[55%] overflow-hidden flex flex-col">
        {/* Detail panel */}
      </div>
    </div>
    ```
  - Pass `selectedEvent` and `onSelect` callback to TimelineItem components
  - Render `<DetailPanel event={selectedEvent} sessionId={session.session_id} />` in the right pane
  - When no event is selected, show a placeholder: "Select a tool call or agent to view details"

### Step 7: Update TimelineItem for selection mode
- In `frontend/src/components/sessions/TimelineItem.tsx`:
  - Remove the `expanded` state and inline `<ToolCallDetail>` render
  - Add `selected: boolean` and `onSelect: () => void` props
  - Apply a selected style (e.g., `ring-1 ring-primary bg-muted/30`) when `selected` is true
  - Make the entire tool_call row and agent row clickable via `onSelect` instead of toggling expand
  - Keep the visual timeline connector, category badges, status icons, and duration display

### Step 8: Create the DetailPanel container
- Create `frontend/src/components/sessions/DetailPanel.tsx`:
  - Accept `event: TimelineEvent | null` and `sessionId: string`
  - If `event` is null, render a centered placeholder message
  - If `event.type === "tool_call"`, render `<ToolCallDetail toolCall={event.tool_call!} />`
  - If `event.type === "agent"`, render `<AgentDetail agent={event.agent!} sessionId={sessionId} />`
  - Wrap content in a `<ScrollArea>` with appropriate height

### Step 9: Build tool-specific renderers
- Create `frontend/src/components/sessions/toolRenderers.tsx` with these components:
  - **ReadRenderer**: Shows file_path, offset, limit as labeled fields. Response: file content in a scrollable code block with line numbers.
  - **WriteRenderer**: Shows file_path. Content in a code block.
  - **EditRenderer**: Shows file_path, old_string and new_string as a side-by-side or inline diff view using red/green highlighting.
  - **BashRenderer**: Shows command in a terminal-styled code block. Output in a scrollable pre block. Shows timeout, exit code if present.
  - **GrepRenderer**: Shows pattern, path, glob, output_mode as labeled fields. Results as a list of file paths or matched lines.
  - **GlobRenderer**: Shows pattern, path as labeled fields. Results as a file list.
  - **WebSearchRenderer**: Shows query. Results as a list with titles and URLs.
  - **WebFetchRenderer**: Shows url, prompt. Response as formatted text.
  - **TaskRenderer**: Shows description, subagent_type, model, mode as labeled badges/chips. Prompt in a collapsible text block. Response (report) in a formatted block.
  - **SkillRenderer**: Shows skill name, args. Response in formatted block.
  - **GenericRenderer**: Fallback — shows structured key-value pairs from tool_input, and formatted tool_response (attempt JSON pretty-print with syntax highlighting, or plain text).
  - Each renderer receives `input: unknown` and `response: unknown`, parses them safely with type guards, and renders structured UI.

### Step 10: Refactor ToolCallDetail to use renderers
- In `frontend/src/components/sessions/ToolCallDetail.tsx`:
  - Keep the metadata row (status badge, duration, timestamp) and error section at the top
  - Replace the two `<JsonBlock>` sections with a tool-specific renderer:
    - Map `tc.tool_name` to the appropriate renderer component from `toolRenderers.tsx`
    - Pass `tc.tool_input` and `tc.tool_response` to the renderer
    - Remove or keep the raw JSON toggle as a fallback "View Raw" button

### Step 11: Build the AgentDetail component
- Create `frontend/src/components/sessions/AgentDetail.tsx`:
  - Accept `agent: Agent` and `sessionId: string`
  - Fetch enriched data via `fetchAgentDetail(sessionId, agent.id!)` using a `useEffect`
  - Display sections:
    1. **Header**: Agent name, type badge, status badge, duration
    2. **Configuration**: subagent_type, model, mode as labeled chips/badges
    3. **Prompt**: The instruction sent by the parent agent, in a styled text block with a "Copy" button. Collapsible if very long.
    4. **Tools Used**: A mini-timeline or list of tool calls made by the subagent during its lifetime, each clickable to view its detail
    5. **Report**: The response/result returned by the subagent to the parent agent, in a formatted text block with a "Copy" button
  - Show loading skeleton while fetching enriched data
  - Gracefully handle missing data (e.g., if task_tool_call_id is null, show what's available)

### Step 12: Add "View Raw JSON" toggle
- In `ToolCallDetail.tsx`, add a small toggle button at the bottom of the detail panel
- When toggled, show the original raw JSON view (current JsonBlock components) as a fallback
- Default to the formatted view

### Step 13: Build and validate
- Run `cd frontend && bun run build` to verify no TypeScript/build errors
- Run `cd backend && uv run pytest -v` to verify no backend regressions
- Manually verify the split-pane layout renders correctly at various viewport sizes

## Testing Strategy

### Unit Tests
- **Backend**: Test that `_handle_subagent_start` correctly links agents to Task tool calls by inserting a pending Task tool call, then triggering a SubagentStart event, and verifying the `task_tool_call_id` is set
- **Backend**: Test the new `GET /api/sessions/{session_id}/agents/{agent_id}` endpoint returns enriched data with prompt and subagent tools
- **Backend**: Test the migration adds the column without errors on existing databases

### Integration Tests
- **Frontend**: Verify the split-pane layout renders — timeline on left, detail on right
- **Frontend**: Verify clicking a tool call in the timeline populates the right panel with formatted detail
- **Frontend**: Verify clicking an agent in the timeline fetches and displays enriched subagent data
- **Frontend**: Verify each tool renderer correctly parses and displays its specific tool type

### Edge Cases
- Agent with no linked Task tool call (e.g., data from before the migration) — should gracefully show available data
- Tool call with null/empty tool_input or tool_response — renderers should handle gracefully
- Very long tool inputs/responses (e.g., large file reads) — should truncate with "show more" or scroll
- Multiple concurrent subagents — each should link to its own Task tool call
- Tool names not in the renderer map — should fall back to GenericRenderer
- Malformed JSON in tool_input/tool_response — should fall back to raw text display
- No timeline events — right pane should show placeholder, not crash
- Responsive behavior: on narrow viewports the split-pane should stack vertically or the left pane should collapse

## Acceptance Criteria
- Clicking a tool call in the timeline shows its detail in the right pane, NOT inline below
- The timeline does not shift/reflow when a tool is selected
- Tool details are formatted with structured UI (labels, code blocks, badges) — not raw JSON by default
- A "View Raw" toggle is available for power users who want the JSON
- Read/Write/Edit/Bash/Grep/Glob/WebSearch/Task/Skill tools each have a specific renderer
- Clicking a subagent (agent event) shows: the prompt, configuration, tools used, and report
- Agents are linked to their spawning Task tool call in the database
- The feature works with existing data (graceful degradation for old records without `task_tool_call_id`)
- No regressions in existing backend tests
- Frontend builds without errors

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- `cd /Users/eslamhassan/Documents/GitRepo/ai_monitor/backend && uv run pytest -v` — Run backend tests to validate no regressions
- `cd /Users/eslamhassan/Documents/GitRepo/ai_monitor/frontend && bun run build` — Verify frontend compiles with zero TypeScript errors
- `cd /Users/eslamhassan/Documents/GitRepo/ai_monitor/backend && uv run python -c "from ai_monitor.db import get_db; db = get_db(); print([col[1] for col in db.execute('PRAGMA table_info(agents)').fetchall()])"` — Verify the agents table has the new task_tool_call_id column
- `cd /Users/eslamhassan/Documents/GitRepo/ai_monitor/backend && uv run python -c "from ai_monitor.models import Agent, AgentDetail; print('Models OK')"` — Verify models import correctly

## Notes
- **System prompts are NOT available** via Claude Code hook events. The `HookEvent` model does not include system prompts. However, the Task tool's `tool_input.prompt` field contains the user instruction sent to the subagent, which is the most valuable piece of context. The plan does NOT add system prompt capture as it would require changes to Claude Code itself.
- **Subagent tool attribution is heuristic**: Tool calls between an agent's `started_at` and `ended_at` in the same session are attributed to that agent. This works well for sequential subagent execution but may be imprecise with concurrent subagents. A future improvement could add an `agent_id` column to `tool_calls` for explicit attribution.
- **No new libraries needed**: All UI is built with existing shadcn/ui components, Tailwind CSS, and lucide-react icons. No additional packages required.
- **Migration safety**: The `ALTER TABLE` migration follows the same safe pattern already used for `last_event_at` — wrapped in a try/except to handle databases where the column already exists.
