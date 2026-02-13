Start the AI Monitor server. Install dependencies if missing, then deploy as a background service.

## Steps

1. Install backend dependencies if missing:
```bash
cd /Users/eslamhassan/Documents/GitRepo/ai_monitor/backend
if [ ! -d ".venv" ]; then uv venv --python python3.13 && uv pip install -e ".[dev]"; fi
```

2. Install frontend dependencies and build if missing:
```bash
cd /Users/eslamhassan/Documents/GitRepo/ai_monitor/frontend
if [ ! -d "node_modules" ]; then bun install; fi
if [ ! -f "/Users/eslamhassan/Documents/GitRepo/ai_monitor/backend/static/index.html" ]; then bun run build; fi
```

3. Install Claude Code hooks:
```bash
/Users/eslamhassan/Documents/GitRepo/ai_monitor/hooks/install.sh
```

4. Detect the OS and install as a background service:

**macOS / Linux:**
```bash
/Users/eslamhassan/Documents/GitRepo/ai_monitor/services/install-service.sh install
```

**Windows** (tell the user to run this in PowerShell as Administrator):
```powershell
powershell -ExecutionPolicy Bypass -File services\windows\install-service.ps1 -Action install
```

5. Verify the server is running:
```bash
curl -s http://localhost:6821/api/health
```

6. Tell the user the dashboard is available at http://localhost:6821
