"""Aggregation queries for dashboard statistics."""

from ai_monitor.db import get_db
from ai_monitor.models import (
    DashboardStats,
    ProjectDetail,
    Session,
    SessionsOverTime,
    TokensOverTime,
    ToolCall,
    ToolStats,
)


def get_dashboard_stats() -> DashboardStats:
    """Compute aggregate statistics for the dashboard."""
    db = get_db()

    # Session counts
    total = db.execute("SELECT COUNT(*) as c FROM sessions").fetchone()["c"]
    active = db.execute(
        "SELECT COUNT(*) as c FROM sessions WHERE status = 'active'"
    ).fetchone()["c"]

    # Token/cost totals
    totals = db.execute(
        """SELECT
               COALESCE(SUM(input_tokens), 0) as input_tokens,
               COALESCE(SUM(output_tokens), 0) as output_tokens,
               COALESCE(SUM(estimated_cost), 0) as cost
           FROM sessions"""
    ).fetchone()

    # Tool call count
    tool_count = db.execute("SELECT COUNT(*) as c FROM tool_calls").fetchone()["c"]

    # Tool distribution
    tool_rows = db.execute(
        """SELECT
               tool_name,
               COUNT(*) as count,
               SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count,
               AVG(duration_ms) as avg_duration_ms
           FROM tool_calls
           GROUP BY tool_name
           ORDER BY count DESC
           LIMIT 20"""
    ).fetchall()

    tool_distribution = []
    for r in tool_rows:
        count = r["count"]
        error_count = r["error_count"]
        tool_distribution.append(
            ToolStats(
                tool_name=r["tool_name"],
                count=count,
                error_count=error_count,
                error_rate=round(error_count / count, 4) if count > 0 else 0.0,
                avg_duration_ms=round(r["avg_duration_ms"], 1) if r["avg_duration_ms"] else None,
            )
        )

    # Recent sessions
    recent_rows = db.execute(
        """SELECT s.*, p.name as project_name,
                  (SELECT COUNT(*) FROM tool_calls tc WHERE tc.session_id = s.session_id) as tool_call_count
           FROM sessions s
           LEFT JOIN projects p ON s.project_id = p.id
           ORDER BY s.started_at DESC
           LIMIT 10"""
    ).fetchall()

    recent_sessions = [
        Session(**{k: r[k] for k in r.keys()}) for r in recent_rows
    ]

    # Sessions over time (last 30 days)
    sessions_time_rows = db.execute(
        """SELECT DATE(started_at) as date, COUNT(*) as count
           FROM sessions
           WHERE started_at >= DATE('now', '-30 days')
           GROUP BY DATE(started_at)
           ORDER BY date"""
    ).fetchall()
    sessions_over_time = [
        SessionsOverTime(date=r["date"], count=r["count"])
        for r in sessions_time_rows
    ]

    # Tokens over time (last 30 days)
    tokens_time_rows = db.execute(
        """SELECT DATE(started_at) as date,
                  COALESCE(SUM(input_tokens), 0) as tokens_in,
                  COALESCE(SUM(output_tokens), 0) as tokens_out
           FROM sessions
           WHERE started_at >= DATE('now', '-30 days')
           GROUP BY DATE(started_at)
           ORDER BY date"""
    ).fetchall()
    tokens_over_time = [
        TokensOverTime(date=r["date"], tokens_in=r["tokens_in"], tokens_out=r["tokens_out"])
        for r in tokens_time_rows
    ]

    # Recent errors (last 20 tool call errors)
    error_rows = db.execute(
        """SELECT * FROM tool_calls
           WHERE status = 'error'
           ORDER BY started_at DESC
           LIMIT 20"""
    ).fetchall()
    recent_errors = [
        ToolCall(**{k: r[k] for k in r.keys()}) for r in error_rows
    ]

    return DashboardStats(
        total_sessions=total,
        active_sessions=active,
        total_tool_calls=tool_count,
        total_input_tokens=totals["input_tokens"],
        total_output_tokens=totals["output_tokens"],
        total_cost=round(totals["cost"], 4),
        tool_distribution=tool_distribution,
        recent_sessions=recent_sessions,
        sessions_over_time=sessions_over_time,
        tokens_over_time=tokens_over_time,
        recent_errors=recent_errors,
    )


def get_project_stats(project_id: int) -> ProjectDetail | None:
    """Compute aggregate statistics for a single project."""
    db = get_db()

    # Fetch project
    project = db.execute(
        "SELECT * FROM projects WHERE id = ?", (project_id,)
    ).fetchone()
    if not project:
        return None

    # Aggregated session stats
    agg = db.execute(
        """SELECT
               COUNT(*) as session_count,
               COALESCE(SUM(input_tokens), 0) as total_input_tokens,
               COALESCE(SUM(output_tokens), 0) as total_output_tokens,
               COALESCE(SUM(estimated_cost), 0) as total_cost,
               MAX(started_at) as last_active
           FROM sessions
           WHERE project_id = ?""",
        (project_id,),
    ).fetchone()

    # Tool distribution scoped to project's sessions
    tool_rows = db.execute(
        """SELECT
               tc.tool_name,
               COUNT(*) as count,
               SUM(CASE WHEN tc.status = 'error' THEN 1 ELSE 0 END) as error_count,
               AVG(tc.duration_ms) as avg_duration_ms
           FROM tool_calls tc
           JOIN sessions s ON tc.session_id = s.session_id
           WHERE s.project_id = ?
           GROUP BY tc.tool_name
           ORDER BY count DESC
           LIMIT 20""",
        (project_id,),
    ).fetchall()

    tool_distribution = []
    for r in tool_rows:
        count = r["count"]
        error_count = r["error_count"]
        tool_distribution.append(
            ToolStats(
                tool_name=r["tool_name"],
                count=count,
                error_count=error_count,
                error_rate=round(error_count / count, 4) if count > 0 else 0.0,
                avg_duration_ms=round(r["avg_duration_ms"], 1) if r["avg_duration_ms"] else None,
            )
        )

    # Sessions over time (last 30 days) scoped to project
    sessions_time_rows = db.execute(
        """SELECT DATE(started_at) as date, COUNT(*) as count
           FROM sessions
           WHERE project_id = ? AND started_at >= DATE('now', '-30 days')
           GROUP BY DATE(started_at)
           ORDER BY date""",
        (project_id,),
    ).fetchall()
    sessions_over_time = [
        SessionsOverTime(date=r["date"], count=r["count"])
        for r in sessions_time_rows
    ]

    # Tokens over time (last 30 days) scoped to project
    tokens_time_rows = db.execute(
        """SELECT DATE(started_at) as date,
                  COALESCE(SUM(input_tokens), 0) as tokens_in,
                  COALESCE(SUM(output_tokens), 0) as tokens_out
           FROM sessions
           WHERE project_id = ? AND started_at >= DATE('now', '-30 days')
           GROUP BY DATE(started_at)
           ORDER BY date""",
        (project_id,),
    ).fetchall()
    tokens_over_time = [
        TokensOverTime(date=r["date"], tokens_in=r["tokens_in"], tokens_out=r["tokens_out"])
        for r in tokens_time_rows
    ]

    return ProjectDetail(
        id=project["id"],
        name=project["name"],
        path=project["path"],
        created_at=project["created_at"],
        session_count=agg["session_count"],
        total_input_tokens=agg["total_input_tokens"],
        total_output_tokens=agg["total_output_tokens"],
        total_cost=round(agg["total_cost"], 4),
        last_active=agg["last_active"],
        tool_distribution=tool_distribution,
        sessions_over_time=sessions_over_time,
        tokens_over_time=tokens_over_time,
    )
