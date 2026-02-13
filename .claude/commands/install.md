Install all AI Monitor dependencies. Run these commands:

1. Install backend Python dependencies:
```bash
cd /Users/eslamhassan/Documents/GitRepo/ai_monitor/backend && uv venv --python python3.13 && uv pip install -e ".[dev]"
```

2. Install frontend Node dependencies:
```bash
cd /Users/eslamhassan/Documents/GitRepo/ai_monitor/frontend && bun install
```

3. Build frontend for production:
```bash
cd /Users/eslamhassan/Documents/GitRepo/ai_monitor/frontend && bun run build
```

4. Install Claude Code hooks:
```bash
/Users/eslamhassan/Documents/GitRepo/ai_monitor/hooks/install.sh
```

After running all steps, confirm:
- `backend/.venv` exists
- `backend/static/index.html` exists
- Hooks are installed in `~/.claude/settings.json`
