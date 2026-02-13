# Setup AI Monitor

Follow these steps to set up the AI Monitor from scratch:

## Prerequisites
- Python 3.12+ with uv
- Bun (for frontend)
- Claude Code (for hooks)

## Steps

1. **Install backend dependencies:**
   ```bash
   cd backend && uv venv && uv pip install -e ".[dev]"
   ```

2. **Install frontend dependencies:**
   ```bash
   cd frontend && bun install
   ```

3. **Build frontend:**
   ```bash
   cd frontend && bun run build
   ```

4. **Install Claude Code hooks:**
   ```bash
   ./hooks/install.sh
   ```

5. **Start the server:**
   ```bash
   cd backend && uv run python -m ai_monitor.main
   ```

6. **Open dashboard:**
   Navigate to http://localhost:6820

## Development

- Backend: `cd backend && uv run python -m ai_monitor.main` (auto-reloads)
- Frontend: `cd frontend && bun run dev` (Vite dev server with API proxy)
- Tests: `cd backend && uv run pytest -v`
