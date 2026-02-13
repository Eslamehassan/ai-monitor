Install all AI Monitor dependencies.

## Environment

First, set the project root:
```bash
PROJECT_DIR="$(cd "$(dirname "$(find . -name '.env' -maxdepth 1 2>/dev/null | head -1)")/../" 2>/dev/null && pwd)" || PROJECT_DIR="$PWD"
```

## Steps

1. Install backend Python dependencies:
```bash
cd "$PROJECT_DIR/backend" && uv venv --python python3.13 && uv pip install -e ".[dev]"
```

2. Install frontend Node dependencies:
```bash
cd "$PROJECT_DIR/frontend" && bun install
```

3. Build frontend for production:
```bash
cd "$PROJECT_DIR/frontend" && bun run build
```

4. Install Claude Code hooks:
```bash
"$PROJECT_DIR/hooks/install.sh"
```

After running all steps, confirm:
- `$PROJECT_DIR/backend/.venv` exists
- `$PROJECT_DIR/backend/static/index.html` exists
- Hooks are installed in `~/.claude/settings.json`
