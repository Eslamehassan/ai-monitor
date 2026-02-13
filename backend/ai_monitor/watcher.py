"""Watchdog file watcher for Claude transcript JSONL files."""

import logging
import os
import threading
import time

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

from ai_monitor.config import settings
from ai_monitor.services.transcript_parser import parse_transcript

logger = logging.getLogger(__name__)

_observer: Observer | None = None

# Debounce: track last-processed time per file
_last_processed: dict[str, float] = {}
_DEBOUNCE_SECONDS = 3.0
_lock = threading.Lock()


class TranscriptHandler(FileSystemEventHandler):
    """Handle changes to .jsonl transcript files."""

    def on_modified(self, event):
        if event.is_directory:
            return
        if event.src_path.endswith(".jsonl"):
            self._debounced_parse(event.src_path)

    def on_created(self, event):
        if event.is_directory:
            return
        if event.src_path.endswith(".jsonl"):
            self._debounced_parse(event.src_path)

    def _debounced_parse(self, path: str) -> None:
        now = time.time()
        with _lock:
            last = _last_processed.get(path, 0)
            if now - last < _DEBOUNCE_SECONDS:
                return
            _last_processed[path] = now

        try:
            parse_transcript(path)
        except Exception:
            logger.exception("Error parsing transcript: %s", path)


def start_watcher() -> None:
    """Start watching the Claude projects directory for transcript changes."""
    global _observer

    watch_dir = os.path.expanduser(settings.claude_projects_dir)
    if not os.path.isdir(watch_dir):
        logger.info("Projects directory not found, skipping watcher: %s", watch_dir)
        return

    _observer = Observer()
    _observer.schedule(TranscriptHandler(), watch_dir, recursive=True)
    _observer.daemon = True
    _observer.start()
    logger.info("Watching for transcript changes in: %s", watch_dir)


def stop_watcher() -> None:
    """Stop the file watcher."""
    global _observer
    if _observer is not None:
        _observer.stop()
        _observer.join(timeout=5)
        _observer = None
