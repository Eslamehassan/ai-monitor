"""Session endpoints."""

from fastapi import APIRouter, HTTPException, Query

from ai_monitor.db import get_db
from ai_monitor.models import Agent, PaginatedResponse, Session, SessionDetail, ToolCall

router = APIRouter(prefix="/api", tags=["sessions"])


@router.get("/sessions")
async def list_sessions(
    status: str | None = None,
    project_id: int | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
) -> PaginatedResponse:
    """List sessions with optional filters and pagination."""
    db = get_db()

    conditions = []
    params: list = []
    if status:
        conditions.append("s.status = ?")
        params.append(status)
    if project_id is not None:
        conditions.append("s.project_id = ?")
        params.append(project_id)

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    total = db.execute(
        f"SELECT COUNT(*) as c FROM sessions s {where}", params
    ).fetchone()["c"]

    offset = (page - 1) * page_size
    rows = db.execute(
        f"""SELECT s.*, p.name as project_name,
                   (SELECT COUNT(*) FROM tool_calls tc WHERE tc.session_id = s.session_id) as tool_call_count
            FROM sessions s
            LEFT JOIN projects p ON s.project_id = p.id
            {where}
            ORDER BY s.started_at DESC
            LIMIT ? OFFSET ?""",
        params + [page_size, offset],
    ).fetchall()

    items = [Session(**{k: r[k] for k in r.keys()}) for r in rows]
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/sessions/{session_id}")
async def get_session(session_id: str) -> SessionDetail:
    """Get session detail with tool calls and agents."""
    db = get_db()

    row = db.execute(
        """SELECT s.*, p.name as project_name,
                  (SELECT COUNT(*) FROM tool_calls tc WHERE tc.session_id = s.session_id) as tool_call_count
           FROM sessions s
           LEFT JOIN projects p ON s.project_id = p.id
           WHERE s.session_id = ?""",
        (session_id,),
    ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Session not found")

    session_data = {k: row[k] for k in row.keys()}

    tool_rows = db.execute(
        "SELECT * FROM tool_calls WHERE session_id = ? ORDER BY started_at",
        (session_id,),
    ).fetchall()
    tool_calls = [ToolCall(**{k: r[k] for k in r.keys()}) for r in tool_rows]

    agent_rows = db.execute(
        "SELECT * FROM agents WHERE session_id = ? ORDER BY started_at",
        (session_id,),
    ).fetchall()
    agents = [Agent(**{k: r[k] for k in r.keys()}) for r in agent_rows]

    return SessionDetail(**session_data, tool_calls=tool_calls, agents=agents)
