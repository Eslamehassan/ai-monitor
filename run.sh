#!/usr/bin/env bash
# Start the AI Monitor server
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/backend"

# Ensure dependencies are installed
if [ ! -d ".venv" ]; then
    echo "Setting up virtual environment..."
    uv venv --python python3.13
    uv pip install -e ".[dev]"
fi

# Build frontend if static files are missing
if [ ! -f "static/index.html" ]; then
    echo "Building frontend..."
    cd "$SCRIPT_DIR/frontend"
    bun install
    bun run build
    cd "$SCRIPT_DIR/backend"
fi

echo "Starting AI Monitor on http://localhost:${AI_MONITOR_PORT:-6821}"
exec uv run python -m ai_monitor
