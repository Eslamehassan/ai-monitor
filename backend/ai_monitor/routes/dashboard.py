"""Dashboard statistics endpoint."""

from fastapi import APIRouter

from ai_monitor.models import DashboardStats
from ai_monitor.services.stats import get_dashboard_stats

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dashboard/stats")
async def dashboard_stats() -> DashboardStats:
    """Get aggregate dashboard statistics."""
    return get_dashboard_stats()
