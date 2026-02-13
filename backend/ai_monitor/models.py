"""Pydantic models for API requests, responses, and DB records."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


# ── Hook event models ──────────────────────────────────────────────

class HookEvent(BaseModel):
    """Incoming hook event from Claude Code."""

    session_id: str
    hook_event_name: Literal[
        "SessionStart",
        "SessionEnd",
        "Stop",
        "PreToolUse",
        "PostToolUse",
        "PostToolUseFailure",
        "SubagentStart",
        "SubagentStop",
    ]
    cwd: str | None = None
    tool_name: str | None = None
    tool_input: Any | None = None
    tool_response: Any | None = None
    error: str | None = None
    agent_name: str | None = None
    agent_type: str | None = None
    model: str | None = None
    timestamp: str | None = None


# ── DB record models ───────────────────────────────────────────────

class Project(BaseModel):
    id: int | None = None
    name: str
    path: str
    created_at: str | None = None
    session_count: int = 0


class Session(BaseModel):
    id: int | None = None
    session_id: str
    project_id: int | None = None
    project_name: str | None = None
    status: str = "active"
    model: str | None = None
    started_at: str | None = None
    ended_at: str | None = None
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_tokens: int = 0
    cache_write_tokens: int = 0
    estimated_cost: float = 0.0
    tool_call_count: int = 0


class ToolCall(BaseModel):
    id: int | None = None
    session_id: str
    tool_name: str
    tool_input: Any | None = None
    tool_response: Any | None = None
    status: str = "pending"
    error: str | None = None
    started_at: str | None = None
    ended_at: str | None = None
    duration_ms: int | None = None


class Agent(BaseModel):
    id: int | None = None
    session_id: str
    agent_name: str | None = None
    agent_type: str | None = None
    status: str = "active"
    started_at: str | None = None
    ended_at: str | None = None


# ── API response models ───────────────────────────────────────────

class PaginatedResponse(BaseModel):
    items: list[Any]
    total: int
    page: int = 1
    page_size: int = 50


class SessionDetail(Session):
    tool_calls: list[ToolCall] = Field(default_factory=list)
    agents: list[Agent] = Field(default_factory=list)


class ToolStats(BaseModel):
    tool_name: str
    count: int
    error_count: int = 0
    error_rate: float = 0.0
    avg_duration_ms: float | None = None


class SessionsOverTime(BaseModel):
    date: str
    count: int = 0


class TokensOverTime(BaseModel):
    date: str
    tokens_in: int = 0
    tokens_out: int = 0


class DashboardStats(BaseModel):
    total_sessions: int = 0
    active_sessions: int = 0
    total_tool_calls: int = 0
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    total_cost: float = 0.0
    tool_distribution: list[ToolStats] = Field(default_factory=list)
    recent_sessions: list[Session] = Field(default_factory=list)
    sessions_over_time: list[SessionsOverTime] = Field(default_factory=list)
    tokens_over_time: list[TokensOverTime] = Field(default_factory=list)
    recent_errors: list[ToolCall] = Field(default_factory=list)
