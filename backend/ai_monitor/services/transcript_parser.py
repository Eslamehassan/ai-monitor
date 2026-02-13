"""Parse JSONL transcript files for token usage and cost data."""

import json
import logging
import os

from ai_monitor.db import get_db

logger = logging.getLogger(__name__)

# Pricing per million tokens (USD)
MODEL_PRICING = {
    "sonnet": {"input": 3.0, "output": 15.0},
    "opus": {"input": 15.0, "output": 75.0},
    "haiku": {"input": 0.25, "output": 1.25},
}


def _match_model_pricing(model_name: str) -> dict[str, float]:
    """Match a model string to pricing. Defaults to sonnet pricing."""
    lower = model_name.lower() if model_name else ""
    for key, pricing in MODEL_PRICING.items():
        if key in lower:
            return pricing
    return MODEL_PRICING["sonnet"]


def _calculate_cost(
    input_tokens: int,
    output_tokens: int,
    cache_read_tokens: int,
    cache_write_tokens: int,
    pricing: dict[str, float],
) -> float:
    """Calculate estimated cost in USD."""
    input_cost = (input_tokens / 1_000_000) * pricing["input"]
    output_cost = (output_tokens / 1_000_000) * pricing["output"]
    # Cache read tokens are typically 90% cheaper, write tokens at input price
    cache_read_cost = (cache_read_tokens / 1_000_000) * pricing["input"] * 0.1
    cache_write_cost = (cache_write_tokens / 1_000_000) * pricing["input"] * 1.25
    return input_cost + output_cost + cache_read_cost + cache_write_cost


def parse_transcript(file_path: str) -> None:
    """Parse a single JSONL transcript file and update session token counts."""
    if not os.path.exists(file_path) or not file_path.endswith(".jsonl"):
        return

    total_input = 0
    total_output = 0
    total_cache_read = 0
    total_cache_write = 0
    session_id = None
    model = None

    try:
        with open(file_path, "r") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue

                # Look for costTracker data
                if "costTracker" in entry:
                    tracker = entry["costTracker"]
                    if isinstance(tracker, dict):
                        for _model_key, usage in tracker.items():
                            if isinstance(usage, dict):
                                total_input += usage.get("inputTokens", 0)
                                total_output += usage.get("outputTokens", 0)
                                total_cache_read += usage.get("cacheReadTokens", 0)
                                total_cache_write += usage.get("cacheWriteTokens", 0)
                                if not model and _model_key:
                                    model = _model_key

                # Try to extract session ID from various fields
                if not session_id:
                    session_id = entry.get("sessionId") or entry.get("session_id")

    except (OSError, PermissionError) as e:
        logger.warning("Could not read transcript %s: %s", file_path, e)
        return

    if not session_id or (total_input == 0 and total_output == 0):
        return

    pricing = _match_model_pricing(model or "")
    cost = _calculate_cost(total_input, total_output, total_cache_read, total_cache_write, pricing)

    db = get_db()
    db.execute(
        """UPDATE sessions SET
               input_tokens = ?, output_tokens = ?,
               cache_read_tokens = ?, cache_write_tokens = ?,
               estimated_cost = ?,
               model = COALESCE(?, model)
           WHERE session_id = ?""",
        (total_input, total_output, total_cache_read, total_cache_write, cost, model, session_id),
    )
    db.commit()


def scan_transcripts_dir(projects_dir: str) -> None:
    """Walk the projects directory and parse all JSONL transcripts."""
    projects_dir = os.path.expanduser(projects_dir)
    if not os.path.isdir(projects_dir):
        logger.info("Projects directory not found: %s", projects_dir)
        return

    for root, _dirs, files in os.walk(projects_dir):
        for fname in files:
            if fname.endswith(".jsonl"):
                parse_transcript(os.path.join(root, fname))
