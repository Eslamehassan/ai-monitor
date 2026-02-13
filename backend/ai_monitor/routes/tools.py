"""Tool statistics endpoints."""

from fastapi import APIRouter

from ai_monitor.db import get_db
from ai_monitor.models import ToolStats

router = APIRouter(prefix="/api", tags=["tools"])


@router.get("/tools/stats")
async def tool_stats() -> list[ToolStats]:
    """Get tool usage distribution and error rates."""
    db = get_db()
    rows = db.execute(
        """SELECT
               tool_name,
               COUNT(*) as count,
               SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count,
               AVG(duration_ms) as avg_duration_ms
           FROM tool_calls
           GROUP BY tool_name
           ORDER BY count DESC"""
    ).fetchall()

    results = []
    for r in rows:
        count = r["count"]
        error_count = r["error_count"]
        results.append(
            ToolStats(
                tool_name=r["tool_name"],
                count=count,
                error_count=error_count,
                error_rate=round(error_count / count, 4) if count > 0 else 0.0,
                avg_duration_ms=round(r["avg_duration_ms"], 1) if r["avg_duration_ms"] else None,
            )
        )
    return results
