"""POST /api/events - Receive hook events."""

from fastapi import APIRouter, BackgroundTasks

from ai_monitor.models import HookEvent
from ai_monitor.services.event_processor import process_event

router = APIRouter(prefix="/api", tags=["events"])


@router.post("/events")
async def receive_event(event: HookEvent, background_tasks: BackgroundTasks):
    """Accept a hook event and process it. Returns 200 quickly."""
    background_tasks.add_task(process_event, event)
    return {"status": "ok"}
