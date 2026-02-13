"""Session endpoints."""

from fastapi import APIRouter, HTTPException, Query

from ai_monitor.db import get_db
from ai_monitor.models import (
    Agent,
    PaginatedResponse,
    Session,
    SessionDetail,
    TimelineEvent,
    ToolCall,
)

router = APIRouter(prefix="/api", tags=["sessions"])


@router.get("/sessions")
async def list_sessions(
    status: str | None = None,
    project_id: int | None = None,
    search: str | None = None,
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
    if search:
        conditions.append("(s.session_id LIKE ? OR p.name LIKE ?)")
        like = f"%{search}%"
        params.extend([like, like])

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    total = db.execute(
        f"""SELECT COUNT(*) as c FROM sessions s
            LEFT JOIN projects p ON s.project_id = p.id
            {where}""",
        params,
    ).fetchone()["c"]

    offset = (page - 1) * page_size
    rows = db.execute(
        f"""SELECT s.*, p.name as project_name,
                   (SELECT COUNT(*) FROM tool_calls tc WHERE tc.session_id = s.session_id) as tool_call_count,
                   CASE WHEN s.ended_at IS NOT NULL
                        THEN ROUND((julianday(s.ended_at) - julianday(s.started_at)) * 86400, 1)
                        ELSE NULL END as duration_seconds
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
                  (SELECT COUNT(*) FROM tool_calls tc WHERE tc.session_id = s.session_id) as tool_call_count,
                  CASE WHEN s.ended_at IS NOT NULL
                       THEN ROUND((julianday(s.ended_at) - julianday(s.started_at)) * 86400, 1)
                       ELSE NULL END as duration_seconds
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


@router.get("/sessions/{session_id}/timeline")
async def get_session_timeline(session_id: str) -> list[TimelineEvent]:
    """Get chronological timeline of tool calls and agents for a session."""
    db = get_db()

    # Verify session exists
    session = db.execute(
        "SELECT id FROM sessions WHERE session_id = ?", (session_id,)
    ).fetchone()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    tool_rows = db.execute(
        "SELECT * FROM tool_calls WHERE session_id = ? ORDER BY started_at",
        (session_id,),
    ).fetchall()

    agent_rows = db.execute(
        "SELECT * FROM agents WHERE session_id = ? ORDER BY started_at",
        (session_id,),
    ).fetchall()

    events: list[TimelineEvent] = []
    for r in tool_rows:
        tc = ToolCall(**{k: r[k] for k in r.keys()})
        events.append(TimelineEvent(type="tool_call", timestamp=tc.started_at, tool_call=tc))
    for r in agent_rows:
        ag = Agent(**{k: r[k] for k in r.keys()})
        events.append(TimelineEvent(type="agent", timestamp=ag.started_at, agent=ag))

    events.sort(key=lambda e: e.timestamp or "")
    return events
