"""SQLite database with WAL mode via standard sqlite3 (sync)."""

import os
import sqlite3

from ai_monitor.config import settings

_connection: sqlite3.Connection | None = None

SCHEMA = """
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL UNIQUE,
    project_id INTEGER REFERENCES projects(id),
    status TEXT NOT NULL DEFAULT 'active',
    model TEXT,
    started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    ended_at TEXT,
    last_event_at TEXT,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cache_read_tokens INTEGER NOT NULL DEFAULT 0,
    cache_write_tokens INTEGER NOT NULL DEFAULT 0,
    estimated_cost REAL NOT NULL DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS tool_calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    tool_input TEXT,
    tool_response TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    error TEXT,
    started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    ended_at TEXT,
    duration_ms INTEGER
);

CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    agent_name TEXT,
    agent_type TEXT,
    task_tool_call_id INTEGER REFERENCES tool_calls(id),
    status TEXT NOT NULL DEFAULT 'active',
    started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    ended_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_tool_calls_session_id ON tool_calls(session_id);
CREATE INDEX IF NOT EXISTS idx_agents_session_id ON agents(session_id);
"""


def get_db() -> sqlite3.Connection:
    """Return the singleton database connection, creating it if needed."""
    global _connection
    if _connection is None:
        db_path = os.path.expanduser(settings.ai_monitor_db_path)
        os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
        _connection = sqlite3.connect(db_path, check_same_thread=False)
        _connection.row_factory = sqlite3.Row
        _connection.execute("PRAGMA journal_mode=WAL")
        _connection.execute("PRAGMA busy_timeout=5000")
        _connection.executescript(SCHEMA)
        # Migrate: add last_event_at column for existing databases
        try:
            _connection.execute("ALTER TABLE sessions ADD COLUMN last_event_at TEXT")
            _connection.commit()
        except sqlite3.OperationalError:
            pass  # Column already exists
        _connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_sessions_last_event_at ON sessions(last_event_at)"
        )
        _connection.commit()
        # Migrate: add task_tool_call_id column to agents for existing databases
        try:
            _connection.execute(
                "ALTER TABLE agents ADD COLUMN task_tool_call_id INTEGER REFERENCES tool_calls(id)"
            )
            _connection.commit()
        except sqlite3.OperationalError:
            pass  # Column already exists
        # Migrate existing timestamps to ISO 8601 UTC format
        for table, cols in [
            ("projects", ["created_at"]),
            ("sessions", ["started_at", "ended_at"]),
            ("tool_calls", ["started_at", "ended_at"]),
            ("agents", ["started_at", "ended_at"]),
        ]:
            for col in cols:
                _connection.execute(
                    f"UPDATE {table} SET {col} = REPLACE({col}, ' ', 'T') || 'Z' "
                    f"WHERE {col} IS NOT NULL AND {col} NOT LIKE '%Z'"
                )
        _connection.commit()
    return _connection


def close_db() -> None:
    """Close the database connection."""
    global _connection
    if _connection is not None:
        _connection.close()
        _connection = None
