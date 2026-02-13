# AI Monitor

## CLI Commands

### Backend (uv)

```bash
cd backend
uv venv --python python3.13          # Create virtualenv
uv pip install -e ".[dev]"           # Install deps (including dev)
uv run python -m ai_monitor          # Start server
uv run pytest -v                     # Run tests
```

### Frontend (bun)

```bash
cd frontend
bun install                          # Install deps
bun run dev                          # Vite dev server (proxies /api to :6820)
bun run build                        # Build to ../backend/static/
```

### Hooks & Services

```bash
./hooks/install.sh                   # Install Claude Code hooks
./run.sh                             # Start server (auto-installs deps)
./services/install-service.sh install   # Install as background service
./services/install-service.sh uninstall # Remove background service
```

## Directory Structure

```
ai_monitor/
├── backend/
│   ├── ai_monitor/
│   │   ├── __init__.py
│   │   ├── __main__.py              # Entry: uv run python -m ai_monitor
│   │   ├── config.py                # Pydantic settings from .env
│   │   ├── db.py                    # SQLite + WAL mode + schema
│   │   ├── main.py                  # FastAPI app, lifespan, static mount
│   │   ├── models.py                # Pydantic models (events, records, responses)
│   │   ├── watcher.py               # Watchdog transcript file watcher
│   │   ├── routes/
│   │   │   ├── agents.py            # GET /api/agents
│   │   │   ├── dashboard.py         # GET /api/dashboard/stats
│   │   │   ├── events.py            # POST /api/events
│   │   │   ├── projects.py          # GET /api/projects
│   │   │   ├── sessions.py          # GET /api/sessions, /api/sessions/:id
│   │   │   └── tools.py             # GET /api/tools/stats
│   │   └── services/
│   │       ├── event_processor.py   # Hook event routing and DB writes
│   │       ├── stats.py             # Dashboard aggregation queries
│   │       └── transcript_parser.py # JSONL token/cost parsing
│   ├── static/                      # Frontend build output (gitignored)
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── features/                # BDD .feature files
│   │   └── step_defs/               # pytest-bdd step definitions
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  # Router: /, /sessions, /projects
│   │   ├── main.tsx                 # React entry point
│   │   ├── lib/
│   │   │   ├── api.ts               # Fetch wrappers for all endpoints
│   │   │   └── utils.ts             # cn(), formatCost, formatTokens
│   │   ├── hooks/
│   │   │   └── useAutoRefresh.ts    # Polling hook
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn/ui components
│   │   │   ├── layout/              # Sidebar, Header
│   │   │   ├── dashboard/           # TrafficChart, TokensChart, etc.
│   │   │   └── sessions/            # SessionList, SessionDetail
│   │   └── pages/
│   │       ├── Dashboard.tsx        # KPI cards + charts
│   │       ├── Sessions.tsx         # List + detail view
│   │       └── Projects.tsx         # Project cards
│   ├── index.html
│   └── vite.config.ts
├── hooks/
│   ├── monitor-hook.sh              # POSTs stdin JSON to /api/events
│   └── install.sh                   # Adds hooks to ~/.claude/settings.json
├── services/
│   ├── install-service.sh           # Cross-platform service installer
│   ├── macos/com.ai-monitor.plist   # macOS LaunchAgent
│   ├── linux/ai-monitor.service     # Linux systemd unit
│   └── windows/install-service.ps1  # Windows service/task installer
├── run.sh                           # One-command server start
├── .env                             # Local config (gitignored)
└── .env.example
```
