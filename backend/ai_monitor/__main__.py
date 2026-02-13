"""Allow running as: uv run python -m ai_monitor"""

import uvicorn

from ai_monitor.config import settings

uvicorn.run(
    "ai_monitor.main:app",
    host=settings.ai_monitor_host,
    port=settings.ai_monitor_port,
    reload=False,
)
