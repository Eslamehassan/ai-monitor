First-time setup: install all dependencies, configure Claude Code hooks, build frontend, and deploy AI Monitor as a background service.

## Environment

First, set the project root and read the port from `.env`:
```bash
PROJECT_DIR="$(cd "$(dirname "$(find . -name '.env' -maxdepth 1 2>/dev/null | head -1)")/../" 2>/dev/null && pwd)" || PROJECT_DIR="$PWD"
```

If `$PROJECT_DIR` can't be resolved, use the current working directory. Read the port:
```bash
PORT=$(grep -E '^AI_MONITOR_PORT=' "$PROJECT_DIR/.env" 2>/dev/null | cut -d= -f2 | tr -d '[:space:]')
PORT="${PORT:-6821}"
```

## Steps

1. Install backend dependencies:
```bash
cd "$PROJECT_DIR/backend"
if [ ! -d ".venv" ]; then uv venv --python python3.13; fi
uv pip install -e ".[dev]"
```

2. Install frontend dependencies and build:
```bash
cd "$PROJECT_DIR/frontend"
bun install
bun run build
```

3. Install Claude Code hooks into the user's `~/.claude/settings.json`:
```bash
"$PROJECT_DIR/hooks/install.sh"
```

4. Detect the OS and install as a background service:

**macOS / Linux:**
```bash
"$PROJECT_DIR/services/install-service.sh" install
```

**Windows** (tell the user to run this in PowerShell as Administrator):
```powershell
powershell -ExecutionPolicy Bypass -File services\windows\install-service.ps1 -Action install
```

5. Verify the server is running:
```bash
curl -s "http://localhost:${PORT}/api/health"
```

6. Tell the user:
   - Dashboard is available at `http://localhost:${PORT}`
   - Claude Code hooks have been installed — restart Claude Code for hooks to take effect
