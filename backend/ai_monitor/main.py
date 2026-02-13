"""FastAPI application entry point."""

import asyncio
import logging
import os
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from ai_monitor.config import settings
from ai_monitor.db import close_db, get_db
from ai_monitor.routes import agents, dashboard, events, projects, sessions, tools
from ai_monitor.services.session_reaper import reap_stale_sessions
from ai_monitor.services.transcript_parser import scan_transcripts_dir
from ai_monitor.watcher import start_watcher, stop_watcher

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


async def _reaper_loop() -> None:
    """Run the stale session reaper every 30 seconds."""
    try:
        while True:
            await asyncio.sleep(30)
            reap_stale_sessions()
    except asyncio.CancelledError:
        pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    # Startup
    logger.info("Starting AI Monitor on %s:%s", settings.ai_monitor_host, settings.ai_monitor_port)
    get_db()
    start_watcher()
    scan_transcripts_dir(settings.claude_projects_dir)
    reaper_task = asyncio.create_task(_reaper_loop())
    logger.info("AI Monitor ready")
    yield
    # Shutdown
    reaper_task.cancel()
    await reaper_task
    stop_watcher()
    close_db()
    logger.info("AI Monitor stopped")


app = FastAPI(title="AI Monitor", version="0.1.0", lifespan=lifespan)

# CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# API routes - registered before static mount so they take priority
app.include_router(events.router)
app.include_router(sessions.router)
app.include_router(projects.router)
app.include_router(tools.router)
app.include_router(agents.router)
app.include_router(dashboard.router)

# Static files (frontend build) - mount LAST so API routes take priority
static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
static_dir = os.path.abspath(static_dir)
if os.path.isdir(static_dir):
    # Serve static assets (JS, CSS, etc.)
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")

    # SPA fallback: serve index.html for all non-API routes
    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        return FileResponse(os.path.join(static_dir, "index.html"))


if __name__ == "__main__":
    uvicorn.run(
        "ai_monitor.main:app",
        host=settings.ai_monitor_host,
        port=settings.ai_monitor_port,
        reload=False,
    )
