"""Periodic reaper that marks stale active sessions as ended."""

import logging
from datetime import datetime, timedelta, timezone

from ai_monitor.config import settings
from ai_monitor.db import get_db

logger = logging.getLogger(__name__)


def reap_stale_sessions() -> int:
    """Mark active sessions with no recent events as ended.

    Returns the number of sessions reaped.
    """
    db = get_db()
    cutoff = (
        datetime.now(timezone.utc)
        - timedelta(minutes=settings.session_stale_timeout_minutes)
    ).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Reap sessions with a known last_event_at
    cur1 = db.execute(
        """UPDATE sessions SET status = 'ended', ended_at = last_event_at
           WHERE status = 'active' AND last_event_at IS NOT NULL AND last_event_at < ?""",
        (cutoff,),
    )

    # Reap sessions with NULL last_event_at (legacy rows)
    cur2 = db.execute(
        """UPDATE sessions SET status = 'ended', ended_at = started_at
           WHERE status = 'active' AND last_event_at IS NULL AND started_at < ?""",
        (cutoff,),
    )

    db.commit()
    total = cur1.rowcount + cur2.rowcount
    if total:
        logger.info("Reaped %d stale session(s)", total)
    return total
