# AI Monitor

Local monitoring dashboard for Claude Code sessions. Tracks sessions, tool calls, agents, token usage, and estimated costs. Inspired by [Sentry's AI agent monitoring](https://sentry.io).

Runs entirely on your machine — no external services required.

## Claude Commands

| Command | Description |
|---|---|
| `/prime` | Load full project context into Claude (architecture, files, APIs) |
| `/install` | Install all dependencies (backend, frontend, hooks) |
| `/deploy` | Install deps if missing, deploy as background service, verify health |

## Quick Start

```bash
# One command — installs deps, builds frontend, starts server
./run.sh
```

Dashboard: **http://localhost:6820**

## Install as Background Service

### macOS (LaunchAgent)

```bash
./services/install-service.sh install
```

Starts at login, auto-restarts on failure. Manage with:

```bash
launchctl kickstart gui/$(id -u)/com.ai-monitor     # start
launchctl kill SIGTERM gui/$(id -u)/com.ai-monitor   # stop
launchctl print gui/$(id -u)/com.ai-monitor          # status
tail -f logs/ai-monitor.log                          # logs
```

Uninstall: `./services/install-service.sh uninstall`

### Linux (systemd)

```bash
./services/install-service.sh install
```

Manage with:

```bash
systemctl --user status ai-monitor      # status
systemctl --user restart ai-monitor     # restart
systemctl --user stop ai-monitor        # stop
journalctl --user -u ai-monitor -f      # logs
```

Uninstall: `./services/install-service.sh uninstall`

### Windows (NSSM / Scheduled Task)

Run PowerShell as Administrator:

```powershell
powershell -ExecutionPolicy Bypass -File services\windows\install-service.ps1 -Action install
```

Uninstall: same command with `-Action uninstall`

## Architecture

```
Claude Code hooks ──POST JSON──▶ FastAPI (:6820) ──▶ SQLite (WAL)
                                      │                    │
Transcript .jsonl ──watchdog──────────┘                    │
                                                           ▼
                                              React Dashboard
                                           (served from /static)
```

- **Backend**: Python, FastAPI, SQLite (WAL mode), Watchdog, APScheduler
- **Frontend**: React, TypeScript, Vite, Tailwind CSS v4, shadcn/ui, Recharts
- **Hooks**: Bash scripts that POST JSON to `localhost:6820/api/events`

## API

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/events` | Receive hook events from Claude Code |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/sessions` | List sessions (query: `status`, `project_id`, `page`) |
| `GET` | `/api/sessions/:id` | Session detail with tool calls and agents |
| `GET` | `/api/projects` | List projects with session counts |
| `GET` | `/api/tools/stats` | Tool usage distribution and error rates |
| `GET` | `/api/agents` | List agents |
| `GET` | `/api/dashboard/stats` | Aggregate stats for dashboard charts |

## Hook Events

The monitor captures these Claude Code hook events:

| Event | What it records |
|---|---|
| `PreToolUse` | Creates a pending tool call |
| `PostToolUse` | Marks tool call as success with response |
| `PostToolUseFailure` | Marks tool call as error |
| `Notification` | Session start/end signals |
| `SubagentStart` | Creates agent record |
| `SubagentStop` | Marks agent as stopped |
| `Stop` | Marks session as ended |

Install hooks into Claude Code:

```bash
./hooks/install.sh
```

## Development

```bash
# Backend (auto-reloads not enabled by default)
cd backend && uv run python -m ai_monitor

# Frontend dev server (Vite with API proxy to :6820)
cd frontend && bun run dev

# Build frontend for production
cd frontend && bun run build

# Run tests (11 BDD scenarios)
cd backend && uv run pytest -v
```

## Configuration

Copy `.env.example` to `.env` and edit:

| Variable | Default | Description |
|---|---|---|
| `AI_MONITOR_PORT` | `6820` | Server port |
| `AI_MONITOR_HOST` | `0.0.0.0` | Bind address |
| `AI_MONITOR_DB_PATH` | `./data/ai_monitor.db` | SQLite database path |
| `CLAUDE_PROJECTS_DIR` | `~/.claude/projects` | Transcript directory to watch |

## Prerequisites

- Python 3.12+ with [uv](https://docs.astral.sh/uv/)
- [Bun](https://bun.sh/) (for frontend)
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (for hooks)
