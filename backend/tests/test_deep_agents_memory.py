"""Tests for backend durable Deep Agents memory."""

from __future__ import annotations

from src.services.agents.memory.middleware import _fetch_memory_block
from src.services.agents.memory.store import ProjectMemory, UserMemory, build_memory_block


def test_build_memory_block_formats_user_and_project_memory():
    block = build_memory_block(
        UserMemory(
            user_id="user-1",
            entries=[("preference", "Keep answers concise.")],
            raw_markdown="## User Memory\n\n### Preferences\n\n- Keep answers concise.",
        ),
        ProjectMemory(
            project_id=983,
            project_name="Union Collective",
            entries=[("commitment", "Owner asked for Division 9 detail.")],
            raw_markdown="## Project Memory - Union Collective\n\n### Commitments\n\n- Owner asked for Division 9 detail.",
        ),
    )

    assert "## User Memory" in block
    assert "Keep answers concise." in block
    assert "## Project Memory - Union Collective" in block
    assert "Owner asked for Division 9 detail." in block


def test_fetch_memory_block_uses_configurable_user_and_project(monkeypatch):
    captured: dict[str, object] = {}

    def fake_user_memory(user_id):
        captured["user_id"] = user_id
        return UserMemory(
            user_id=user_id,
            entries=[("preference", "Prefer live DB evidence.")],
            raw_markdown="## User Memory\n\n### Preferences\n\n- Prefer live DB evidence.",
        )

    def fake_project_memory(project_id):
        captured["project_id"] = project_id
        return ProjectMemory(
            project_id=int(project_id),
            project_name="Union Collective",
            entries=[("context", "Division 9 cost codes were requested.")],
            raw_markdown="## Project Memory - Union Collective\n\n### Contexts\n\n- Division 9 cost codes were requested.",
        )

    monkeypatch.setattr("src.services.agents.memory.middleware.load_user_memory", fake_user_memory)
    monkeypatch.setattr("src.services.agents.memory.middleware.load_project_memory", fake_project_memory)

    block = _fetch_memory_block(
        {
            "configurable": {
                "thread_id": "session-1",
                "user_id": "user-1",
                "project_id": 983,
            }
        }
    )

    assert captured == {"user_id": "user-1", "project_id": 983}
    assert "Prefer live DB evidence." in block
    assert "Division 9 cost codes were requested." in block
