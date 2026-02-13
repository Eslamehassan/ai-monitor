"""Application configuration from environment variables."""

import os
from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ai_monitor_port: int = 6821
    ai_monitor_host: str = "0.0.0.0"
    ai_monitor_db_path: str = "./data/ai_monitor.db"
    claude_projects_dir: str = os.path.expanduser("~/.claude/projects")
    session_stale_timeout_minutes: int = 5

    model_config = {"env_file": str(Path(__file__).resolve().parents[2] / ".env")}


settings = Settings()
