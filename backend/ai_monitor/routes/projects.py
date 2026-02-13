"""Project endpoints."""

from fastapi import APIRouter

from ai_monitor.db import get_db
from ai_monitor.models import Project

router = APIRouter(prefix="/api", tags=["projects"])


@router.get("/projects")
async def list_projects() -> list[Project]:
    """List all projects with session counts."""
    db = get_db()
    rows = db.execute(
        """SELECT p.*,
                  (SELECT COUNT(*) FROM sessions s WHERE s.project_id = p.id) as session_count
           FROM projects p
           ORDER BY p.name"""
    ).fetchall()
    return [Project(**{k: r[k] for k in r.keys()}) for r in rows]
