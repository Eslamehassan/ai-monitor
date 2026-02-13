Read these files to understand the AI Monitor project:

1. `CLAUDE.md` — directory structure and CLI commands
2. `backend/ai_monitor/main.py` — FastAPI app, lifespan, route registration, static file serving
3. `backend/ai_monitor/db.py` — SQLite schema (projects, sessions, tool_calls, agents) with WAL mode
4. `backend/ai_monitor/models.py` — Pydantic models: HookEvent, Session, ToolCall, Agent, DashboardStats
5. `backend/ai_monitor/services/event_processor.py` — Processes all hook events (SessionStart/End, PreToolUse, PostToolUse, PostToolUseFailure, SubagentStart/Stop)
6. `backend/ai_monitor/services/transcript_parser.py` — Parses .jsonl transcripts for token/cost data with model pricing
7. `backend/ai_monitor/watcher.py` — Watchdog file watcher with debouncing for transcript changes
8. `backend/ai_monitor/routes/events.py` — POST /api/events hook ingestion
9. `backend/ai_monitor/routes/sessions.py` — GET /api/sessions (list + filter) and /api/sessions/:id (detail)
10. `backend/ai_monitor/routes/dashboard.py` — GET /api/dashboard/stats
11. `frontend/src/App.tsx` — React router: Dashboard (/), Sessions (/sessions), Projects (/projects)
12. `frontend/src/lib/api.ts` — TypeScript API client with typed interfaces
13. `frontend/src/pages/Dashboard.tsx` — KPI cards + Recharts (traffic, tokens, tool calls, errors)
14. `hooks/monitor-hook.sh` — Bash hook that reads JSON from stdin and POSTs to localhost:6821

## Architecture

Local AI monitoring dashboard for Claude Code sessions. Inspired by Sentry AI.

**Data flow:** Claude Code hooks → `monitor-hook.sh` (stdin JSON) → POST /api/events → event_processor → SQLite (WAL) → REST API → React dashboard

**Stack:**
- Backend: FastAPI + SQLite (WAL) + Watchdog + APScheduler
- Frontend: React + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui + Recharts
- Hooks: Bash scripts installed into ~/.claude/settings.json

**API endpoints:**
- `POST /api/events` — hook event ingestion
- `GET /api/health` — health check
- `GET /api/sessions` — list (query: status, project_id, page, page_size)
- `GET /api/sessions/:id` — detail with tool_calls and agents
- `GET /api/projects` — list with session counts
- `GET /api/tools/stats` — usage distribution and error rates
- `GET /api/agents` — list agents
- `GET /api/dashboard/stats` — aggregate stats for dashboard

**Database tables:** projects, sessions (with token counts + cost), tool_calls (pending/success/error), agents

**Environment:** `.env` with AI_MONITOR_PORT (6821), AI_MONITOR_HOST, AI_MONITOR_DB_PATH, CLAUDE_PROJECTS_DIR
