"""Durable memory stores backed by the PM app database."""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from functools import lru_cache

from sqlalchemy import bindparam, create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.pool import NullPool

logger = logging.getLogger(__name__)

USER_MEMORY_LIMIT = 30
PROJECT_MEMORY_LIMIT = 40
HIGH_VALUE_TYPES = ("preference", "lesson", "commitment", "context")


@lru_cache(maxsize=1)
def _memory_engine() -> Engine:
    url = os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL")
    if not url:
        raise RuntimeError("DATABASE_URL or SUPABASE_DB_URL is not set")
    return create_engine(
        url,
        poolclass=NullPool,
        connect_args={
            "connect_timeout": 10,
            "application_name": "alleato-backend-deep-agents-memory",
        },
    )


@dataclass
class UserMemory:
    user_id: str
    entries: list[tuple[str, str]] = field(default_factory=list)
    raw_markdown: str = ""

    def __bool__(self) -> bool:
        return bool(self.entries)


@dataclass
class ProjectMemory:
    project_id: int
    project_name: str
    entries: list[tuple[str, str]] = field(default_factory=list)
    raw_markdown: str = ""

    def __bool__(self) -> bool:
        return bool(self.entries)


def load_user_memory(user_id: str) -> UserMemory | None:
    """Load active user-scoped memories from ai_memories."""
    if not user_id:
        return None

    try:
        engine = _memory_engine()
        with engine.connect() as conn:
            query = text(
                """
                SELECT type, content
                FROM ai_memories
                WHERE user_id = :uid
                  AND project_id IS NULL
                  AND is_active = TRUE
                  AND (expires_at IS NULL OR expires_at > NOW())
                  AND type IN :types
                ORDER BY importance DESC NULLS LAST, created_at DESC
                LIMIT :limit
                """
            ).bindparams(bindparam("types", expanding=True))
            rows = conn.execute(
                query,
                {
                    "uid": user_id,
                    "types": tuple(HIGH_VALUE_TYPES),
                    "limit": USER_MEMORY_LIMIT,
                },
            ).fetchall()
    except Exception:
        logger.warning("Failed to load user memory for %s", user_id, exc_info=True)
        return None

    entries = [(str(row[0]), str(row[1])) for row in rows]
    return UserMemory(
        user_id=user_id,
        entries=entries,
        raw_markdown=_format_user_memory(entries),
    )


def load_project_memory(project_id: int | str) -> ProjectMemory | None:
    """Load active project-scoped memories from ai_memories."""
    try:
        pid = int(project_id)
    except (TypeError, ValueError):
        logger.warning("Invalid project_id for memory load: %r", project_id)
        return None

    try:
        engine = _memory_engine()
        with engine.connect() as conn:
            name_row = conn.execute(
                text("SELECT name FROM projects WHERE id = :pid"),
                {"pid": pid},
            ).fetchone()
            project_name = str(name_row[0]) if name_row else str(pid)

            query = text(
                """
                SELECT type, content
                FROM ai_memories
                WHERE project_id = :pid
                  AND is_active = TRUE
                  AND (expires_at IS NULL OR expires_at > NOW())
                  AND type IN :types
                ORDER BY importance DESC NULLS LAST, created_at DESC
                LIMIT :limit
                """
            ).bindparams(bindparam("types", expanding=True))
            rows = conn.execute(
                query,
                {
                    "pid": pid,
                    "types": tuple(HIGH_VALUE_TYPES),
                    "limit": PROJECT_MEMORY_LIMIT,
                },
            ).fetchall()
    except Exception:
        logger.warning("Failed to load project memory for %s", pid, exc_info=True)
        return None

    entries = [(str(row[0]), str(row[1])) for row in rows]
    return ProjectMemory(
        project_id=pid,
        project_name=project_name,
        entries=entries,
        raw_markdown=_format_project_memory(project_name, entries),
    )


def _format_user_memory(entries: list[tuple[str, str]]) -> str:
    if not entries:
        return ""

    lines = ["## User Memory", ""]
    by_type: dict[str, list[str]] = {}
    for memory_type, content in entries:
        by_type.setdefault(memory_type, []).append(content)

    for memory_type in ("preference", "commitment", "lesson", "context"):
        items = by_type.get(memory_type, [])
        if not items:
            continue
        lines.append(f"### {memory_type.title()}s")
        lines.append("")
        for item in items:
            snippet = item[:300] + ("..." if len(item) > 300 else "")
            lines.append(f"- {snippet}")
        lines.append("")

    return "\n".join(lines).rstrip()


def _format_project_memory(
    project_name: str,
    entries: list[tuple[str, str]],
) -> str:
    if not entries:
        return ""

    lines = [f"## Project Memory - {project_name}", ""]
    by_type: dict[str, list[str]] = {}
    for memory_type, content in entries:
        by_type.setdefault(memory_type, []).append(content)

    for memory_type in ("commitment", "lesson", "preference", "context"):
        items = by_type.get(memory_type, [])
        if not items:
            continue
        lines.append(f"### {memory_type.title()}s")
        lines.append("")
        for item in items:
            snippet = item[:300] + ("..." if len(item) > 300 else "")
            lines.append(f"- {snippet}")
        lines.append("")

    return "\n".join(lines).rstrip()


def build_memory_block(
    user_memory: UserMemory | None,
    project_memory: ProjectMemory | None,
) -> str:
    parts: list[str] = []
    if user_memory and user_memory.raw_markdown:
        parts.append(user_memory.raw_markdown)
    if project_memory and project_memory.raw_markdown:
        parts.append(project_memory.raw_markdown)
    return "\n\n".join(parts)
