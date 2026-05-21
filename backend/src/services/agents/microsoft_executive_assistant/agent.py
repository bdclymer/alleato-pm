"""Microsoft Executive Assistant Deep Agents runtime."""

from __future__ import annotations

import json
import os
import re
import time
from pathlib import Path
from typing import Any, Callable, Optional

from src.services.agents.deep_project_intelligence import (
    _extract_agent_text,
    _resolve_deep_agents_model,
)
from src.services.agents.microsoft_executive_assistant.contracts import (
    MicrosoftAssistantAction,
    MicrosoftAssistantTraceItem,
    MicrosoftExecutiveAssistantRequest,
    MicrosoftExecutiveAssistantResponse,
)
from src.services.agents.microsoft_executive_assistant.tools import (
    microsoft_executive_assistant_tools,
)


ORCHESTRATOR_NAME = "microsoft-executive-assistant"
RUNTIME_DIR = Path(__file__).resolve().parent / "runtime"


def _repo_root() -> Path:
    current = Path(__file__).resolve()
    for parent in current.parents:
        if (parent / "backend").exists() and (parent / "frontend").exists():
            return parent
    return Path.cwd()


def _source_skill_dir() -> Path:
    return RUNTIME_DIR


def _skill_roots() -> list[str]:
    source = _source_skill_dir() / "skills"
    return [str(source)] if source.exists() else []


def _memory_files() -> list[str]:
    source = _source_skill_dir() / "AGENTS.md"
    return [str(source)] if source.exists() else []


def _skills_loaded() -> list[str]:
    loaded: list[str] = []
    source = _source_skill_dir()
    if (source / "AGENTS.md").exists():
        loaded.append("microsoft-executive-assistant-memory")
    skills_root = source / "skills"
    for name in ("inbox-triage", "email-drafting", "humanizer", "wiki-markdown"):
        if (skills_root / name / "SKILL.md").exists():
            loaded.append(name)
    return loaded


def _provider_available() -> bool:
    return bool(os.getenv("AI_GATEWAY_API_KEY") or os.getenv("OPENAI_API_KEY"))


class _TestBackend:
    def __init__(self, root: Path):
        self.cwd = root


def _microsoft_backend(*, allow_fallback: bool = False) -> Any:
    try:
        from deepagents.backends import FilesystemBackend

        return FilesystemBackend(root_dir=str(_repo_root()), virtual_mode=True)
    except Exception as exc:
        if allow_fallback:
            return _TestBackend(_repo_root())
        raise RuntimeError(f"Deep Agents filesystem backend unavailable: {exc}") from exc


def _agent_config(request: MicrosoftExecutiveAssistantRequest) -> dict[str, Any]:
    thread_id = request.session_id or f"microsoft-executive-assistant:{request.user_id}"
    configurable: dict[str, Any] = {
        "thread_id": thread_id,
        "user_id": request.user_id,
        "trigger": request.trigger,
    }
    if request.project_id is not None:
        configurable["project_id"] = request.project_id
    if request.mailbox_user_id:
        configurable["mailbox_user_id"] = request.mailbox_user_id
    return {"configurable": configurable}


def _microsoft_prompt(request: MicrosoftExecutiveAssistantRequest) -> str:
    mailbox = (
        f"Primary mailbox supplied by caller: {request.mailbox_user_id}."
        if request.mailbox_user_id
        else "No mailbox was supplied. Resolve the mailbox from the request context if possible; otherwise fail loudly."
    )
    project = (
        f"Project ID supplied by caller: {request.project_id}."
        if request.project_id
        else "No project ID was supplied."
    )
    return (
        f"Microsoft operator request:\n{request.prompt}\n\n"
        f"Trigger: {request.trigger}.\n"
        f"{mailbox}\n"
        f"{project}\n"
        f"Maximum messages to inspect: {request.max_messages}.\n\n"
        "Required workflow:\n"
        "1. Treat this as Microsoft executive-assistant work for Megan, not as generic Alleato strategist work.\n"
        "2. Use live Outlook inbox reads for date-based inbox questions when a mailbox is available.\n"
        "3. Use Outlook email search, Teams search, calendar reads, and Microsoft file search when they materially improve the answer.\n"
        "4. Draft email or Teams payloads for review only. Never claim an email was sent, a calendar event was changed, or a Teams message was posted.\n"
        "5. Escalate urgent client, prospect, legal, security, or true emergency items with a concise Teams-message draft.\n"
        "6. If a required Microsoft capability is missing, stale, blocked, or failed, include the exact failed capability and what evidence is missing.\n"
        "7. End with recommended next steps for Megan and any approvals needed."
    )


def _extract_actions(answer: str) -> list[MicrosoftAssistantAction]:
    actions: list[MicrosoftAssistantAction] = []
    for match in re.finditer(r"\{[\s\S]*?\"action\"\s*:\s*\"preview\"[\s\S]*?\}", answer):
        try:
            payload = json.loads(match.group(0))
        except Exception:
            continue
        action_type = "email_draft"
        payload_type = str(payload.get("type") or "")
        if "teams" in payload_type:
            action_type = "teams_message_draft"
        actions.append(
            MicrosoftAssistantAction(
                actionType=action_type,  # type: ignore[arg-type]
                title=str(payload.get("type") or "Microsoft draft"),
                status="drafted",
                detail=str(payload.get("approvalReason") or "Draft prepared for review."),
                payload=payload,
            )
        )
    if not actions and any(marker in answer for marker in ("FAILED:", "UNAVAILABLE:", "BLOCKED:")):
        actions.append(
            MicrosoftAssistantAction(
                actionType="blocked",
                title="Microsoft capability blocked",
                status="blocked",
                detail="The assistant reported a Microsoft capability failure in the answer.",
            )
        )
    return actions


def _messages_from_result(result: Any) -> list[Any]:
    if isinstance(result, dict) and isinstance(result.get("messages"), list):
        return result["messages"]
    messages = getattr(result, "messages", None)
    return messages if isinstance(messages, list) else []


def _message_value(message: Any, key: str) -> Any:
    if isinstance(message, dict):
        return message.get(key)
    return getattr(message, key, None)


def _message_content(message: Any) -> str:
    content = _message_value(message, "content")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and isinstance(item.get("text"), str):
                parts.append(item["text"])
        return "\n".join(parts)
    return ""


def _message_tool_name(message: Any) -> Optional[str]:
    for key in ("name", "tool", "toolName"):
        value = _message_value(message, key)
        if isinstance(value, str) and value:
            return value
    message_type = _message_value(message, "type")
    if isinstance(message_type, str) and message_type == "tool":
        value = _message_value(message, "id")
        if isinstance(value, str) and value:
            return value
    return None


def _parse_tool_json(content: str) -> dict[str, Any]:
    stripped = content.strip()
    if not stripped:
        return {}
    try:
        parsed = json.loads(stripped)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def _tool_trace_from_result(result: Any, *, runtime_trace: MicrosoftAssistantTraceItem) -> list[MicrosoftAssistantTraceItem]:
    traces: list[MicrosoftAssistantTraceItem] = []
    known_tools = {
        "read_live_outlook_inbox",
        "search_outlook_emails",
        "search_microsoft_teams_messages",
        "search_microsoft_files",
        "list_outlook_calendar_events",
        "draft_outlook_email_for_review",
        "draft_teams_message_for_review",
    }
    for message in _messages_from_result(result):
        tool_name = _message_tool_name(message)
        if tool_name not in known_tools:
            continue
        content = _message_content(message)
        parsed = _parse_tool_json(content)
        source = parsed.get("source") if isinstance(parsed.get("source"), str) else None
        error = parsed.get("error") if isinstance(parsed.get("error"), str) else None
        ok = parsed.get("ok") if isinstance(parsed.get("ok"), bool) else None
        if ok is False and not error:
            error = content[:500] if content else f"{tool_name} failed"
        traces.append(
            MicrosoftAssistantTraceItem(
                agent=ORCHESTRATOR_NAME,
                tool=tool_name,
                status="failed" if error else "success",
                durationMs=0,
                detail=error or f"{tool_name} completed.",
                source=source,
                output={
                    key: value
                    for key, value in {
                        "source": source,
                        "ok": ok,
                        "count": parsed.get("count"),
                        "mailboxUserId": parsed.get("mailbox_user_id"),
                        "fetchedAt": parsed.get("fetched_at"),
                        "truncated": parsed.get("truncated"),
                        "error": error,
                    }.items()
                    if value is not None
                },
            )
        )
    traces.append(runtime_trace)
    return traces


def run_microsoft_executive_assistant(
    request: MicrosoftExecutiveAssistantRequest,
    *,
    create_agent: Optional[Callable[..., Any]] = None,
    model: str = "openai:gpt-5.4-mini",
) -> MicrosoftExecutiveAssistantResponse:
    """Run the Microsoft Executive Assistant Deep Agent and return a typed response."""
    started = time.perf_counter()
    loaded_skills = _skills_loaded()
    try:
        if create_agent is None:
            if not _provider_available():
                raise RuntimeError(
                    "AI_GATEWAY_API_KEY or OPENAI_API_KEY is required for the Microsoft Executive Assistant."
                )
            from deepagents import create_deep_agent as create_agent

            model = _resolve_deep_agents_model(model)

        kwargs: dict[str, Any] = {
            "name": ORCHESTRATOR_NAME,
            "model": model,
            "tools": microsoft_executive_assistant_tools(),
            "backend": _microsoft_backend(allow_fallback=create_agent is not None),
            "system_prompt": (
                "You are Alleato's Microsoft Executive Assistant, a specialist delegated to by the Chief Strategist. "
                "Your domain is Outlook, Teams, Microsoft calendar, and Microsoft files. Use Deep Agents planning and "
                "specialized skills for inbox triage, drafting, urgent escalation, calendar review, and Microsoft file context. "
                "Fail loudly for missing provider keys, Microsoft Graph credentials, Graph HTTP failures, stale source context, "
                "or empty results. Never silently skip a tool failure. Never send email, post Teams messages, or mutate calendar "
                "events unless an explicit approved action path exists."
            ),
        }
        skill_roots = _skill_roots()
        if skill_roots:
            kwargs["skills"] = skill_roots
        memory_files = _memory_files()
        if memory_files:
            kwargs["memory"] = memory_files

        agent = create_agent(**kwargs)
        try:
            result = agent.invoke(
                {"messages": [{"role": "user", "content": _microsoft_prompt(request)}]},
                config=_agent_config(request),
            )
        except TypeError as exc:
            if "config" not in str(exc):
                raise
            result = agent.invoke({"messages": [{"role": "user", "content": _microsoft_prompt(request)}]})

        answer = _extract_agent_text(result)
        if not answer:
            raise RuntimeError("Microsoft Executive Assistant returned an empty response.")

        runtime_trace = MicrosoftAssistantTraceItem(
            agent=ORCHESTRATOR_NAME,
            tool="deepagents_microsoft_executive_assistant_runtime",
            status="success",
            durationMs=max(0, int((time.perf_counter() - started) * 1000)),
            detail="Microsoft Executive Assistant produced an answer.",
        )

        return MicrosoftExecutiveAssistantResponse(
            answer=answer,
            mode="deep_agents",
            actions=_extract_actions(answer),
            toolTrace=_tool_trace_from_result(result, runtime_trace=runtime_trace),
            skillsLoaded=loaded_skills,
            orchestrator=ORCHESTRATOR_NAME,
        )
    except Exception as exc:
        return MicrosoftExecutiveAssistantResponse(
            answer=(
                "The Microsoft Executive Assistant could not complete this request. "
                f"Failed capability: deepagents_microsoft_executive_assistant_runtime. Detail: {exc}"
            ),
            mode="unavailable",
            actions=[
                MicrosoftAssistantAction(
                    actionType="blocked",
                    title="Microsoft Executive Assistant unavailable",
                    status="blocked",
                    detail=str(exc),
                )
            ],
            toolTrace=[
                MicrosoftAssistantTraceItem(
                    agent=ORCHESTRATOR_NAME,
                    tool="deepagents_microsoft_executive_assistant_runtime",
                    status="failed",
                    durationMs=max(0, int((time.perf_counter() - started) * 1000)),
                    detail=str(exc),
                )
            ],
            skillsLoaded=loaded_skills,
            orchestrator=ORCHESTRATOR_NAME,
        )
