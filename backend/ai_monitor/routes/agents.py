"""Agent endpoints."""

from fastapi import APIRouter, Query

from ai_monitor.db import get_db
from ai_monitor.models import Agent

router = APIRouter(prefix="/api", tags=["agents"])


@router.get("/agents")
async def list_agents(
    session_id: str | None = None,
    status: str | None = None,
) -> list[Agent]:
    """List agents with optional filters."""
    db = get_db()

    conditions = []
    params: list = []
    if session_id:
        conditions.append("session_id = ?")
        params.append(session_id)
    if status:
        conditions.append("status = ?")
        params.append(status)

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    rows = db.execute(
        f"SELECT * FROM agents {where} ORDER BY started_at DESC",
        params,
    ).fetchall()
    return [Agent(**{k: r[k] for k in r.keys()}) for r in rows]
