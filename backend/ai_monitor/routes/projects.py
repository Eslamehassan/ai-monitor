"""Project endpoints."""

from fastapi import APIRouter

from ai_monitor.db import get_db
from ai_monitor.models import Project

router = APIRouter(prefix="/api", tags=["projects"])


@router.get("/projects")
async def list_projects() -> list[dict]:
    """List all projects with session counts, cost, and token totals."""
    db = get_db()
    rows = db.execute(
        """SELECT p.*,
                  COALESCE((SELECT COUNT(*) FROM sessions s WHERE s.project_id = p.id), 0) as session_count,
                  COALESCE((SELECT SUM(s.input_tokens) FROM sessions s WHERE s.project_id = p.id), 0) as total_input_tokens,
                  COALESCE((SELECT SUM(s.output_tokens) FROM sessions s WHERE s.project_id = p.id), 0) as total_output_tokens,
                  COALESCE((SELECT SUM(s.estimated_cost) FROM sessions s WHERE s.project_id = p.id), 0) as total_cost,
                  (SELECT MAX(s.started_at) FROM sessions s WHERE s.project_id = p.id) as last_active
           FROM projects p
           ORDER BY p.name"""
    ).fetchall()
    return [
        {
            "id": r["id"],
            "name": r["name"],
            "path": r["path"],
            "created_at": r["created_at"],
            "session_count": r["session_count"],
            "total_input_tokens": r["total_input_tokens"],
            "total_output_tokens": r["total_output_tokens"],
            "total_cost": round(r["total_cost"], 4),
            "last_active": r["last_active"],
        }
        for r in rows
    ]
