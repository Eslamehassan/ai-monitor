Read these files to understand the AI Monitor project:

1. `CLAUDE.md` — directory structure and CLI commands
2. `API.md` — full API endpoint reference with request/response schemas
3. `DATABASE.md` — database schema, tables, indexes, and relationships
4. `backend/ai_monitor/main.py` — FastAPI app, lifespan, route registration, static file serving
5. `backend/ai_monitor/models.py` — Pydantic models: HookEvent, Session, ToolCall, Agent, DashboardStats, TimelineEvent, ProjectDetail
6. `backend/ai_monitor/services/event_processor.py` — Processes all hook events (SessionStart/End, PreToolUse, PostToolUse, PostToolUseFailure, SubagentStart/Stop)
7. `backend/ai_monitor/services/transcript_parser.py` — Parses .jsonl transcripts for token/cost data with model pricing
8. `backend/ai_monitor/watcher.py` — Watchdog file watcher with debouncing for transcript changes
9. `backend/ai_monitor/routes/sessions.py` — Sessions list, detail, and timeline endpoints
10. `backend/ai_monitor/routes/projects.py` — Projects list and detail endpoints
11. `frontend/src/App.tsx` — React router: Dashboard (/), Sessions (/sessions), Projects (/projects, /projects/:id)
12. `frontend/src/lib/api.ts` — TypeScript API client with typed interfaces
13. `frontend/src/pages/Dashboard.tsx` — KPI cards + Recharts (traffic, tokens, tool calls, errors)
14. `hooks/monitor-hook.sh` — Bash hook that reads JSON from stdin and POSTs to /api/events
