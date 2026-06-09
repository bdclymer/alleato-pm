"""Backend-only Deep Agents project intelligence pilot.

Slice 1 deliberately proves the typed orchestration contract before adding
Deep Agents as a runtime dependency. The service fails loudly on missing project
context and returns explicit source coverage gaps instead of generic synthesis.
"""

from __future__ import annotations

import os
import time
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, List, Optional, Sequence

from src.services.agents.deep_project_intelligence_contracts import (
    DeepExecutiveIntelligenceRequest,
    DeepExecutiveIntelligenceResponse,
    DeepOrganization,
    DeepProject,
    EvidenceItem,
    DeepProjectIntelligenceRequest,
    DeepProjectIntelligenceResponse,
    MemoryCandidate,
    RecommendedAction,
    SourceCoverage,
    ToolTraceItem,
)
from src.services.agents.alleato_ai_tools import (
    DRAFT_ACTION_TOOLS,
    EXTERNAL_ACCOUNTING_TOOLS,
    READ_ONLY_PM_TOOLS,
    RESOLVERS,
    SQL_TOOLS,
    portfolio_overview as pm_portfolio_overview_tool,
    project_briefing_snapshot as pm_project_briefing_snapshot_tool,
    project_budget_summary as pm_project_budget_summary_tool,
    project_risk_snapshot as pm_project_risk_snapshot_tool,
)
from src.services.agents.alleato_ai_tools.prompts import ORCHESTRATOR_PROMPT
from src.services.agents.alleato_ai_tools.subagents import build_subagents


REQUIRED_SOURCE_TYPES = (
    "packet",
    "teams",
    "meetings",
    "emails",
    "documents",
    "financials",
    "schedule",
    "rfi",
    "submittal",
)

REQUIRED_EXECUTIVE_SOURCE_TYPES = (
    "executive_briefing",
    "tasks",
    "executive_follow_ups",
    "emails",
    "teams",
    "meetings",
    "documents",
    "projects",
    "financials",
    "schedule",
)

DEEP_AGENT_RUNTIME_MODE = "deep_agents"
CONTRACT_SPIKE_MODE = "contract_spike"
RUNTIME_SKILL_NAMES = (
    "deep-agents-core",
    "deep-agents-memory",
    "deep-agents-orchestration",
)
RUNTIME_AGENTS_MD = """# Alleato Deep Agents Project Intelligence Runtime

You are running inside the Alleato PM Render backend.

Use the Deep Agents harness deliberately:
- Create and maintain a concise plan for multi-step project intelligence work.
- Use source coverage and explicit tool evidence before synthesis.
- Delegate focused investigations to the specialist subagents when their tools fit.
- Treat draft/write tools as approval previews only; never claim an action was executed.
- Fail loudly when a source, tool, provider, or memory capability is unavailable.
- Keep tenant, user, and project boundaries from the request config.
"""


def _env_flag(name: str) -> bool:
    return os.getenv(name, "").strip().lower() == "true"


def _standalone_tools_enabled() -> bool:
    return _env_flag("DEEP_AGENTS_STANDALONE_TOOLS_ENABLED")


def _deep_agents_memory_enabled() -> bool:
    return _env_flag("DEEP_AGENTS_MEMORY_ENABLED")


def _repo_root() -> Path:
    current = Path(__file__).resolve()
    for parent in current.parents:
        if (parent / "backend").exists() and (parent / "frontend").exists():
            return parent
    return Path.cwd()


def _runtime_skill_payloads() -> dict[str, str]:
    payloads: dict[str, str] = {}
    roots = [
        _repo_root() / ".agents" / "skills",
        Path(__file__).resolve().parent / "research_agent" / "skills",
    ]
    for name in RUNTIME_SKILL_NAMES:
        for root in roots:
            skill_path = root / name / "SKILL.md"
            if skill_path.exists():
                payloads[f"/skills/{name}/SKILL.md"] = skill_path.read_text(encoding="utf-8")
                break
    return payloads


@lru_cache(maxsize=1)
def _runtime_store() -> Any:
    from deepagents.backends.utils import create_file_data
    from langgraph.store.memory import InMemoryStore

    store = InMemoryStore()
    store.put(("filesystem",), "/AGENTS.md", create_file_data(RUNTIME_AGENTS_MD))
    for key, content in _runtime_skill_payloads().items():
        store.put(("filesystem",), key, create_file_data(content))
    return store


@lru_cache(maxsize=1)
def _runtime_checkpointer() -> Any:
    from langgraph.checkpoint.memory import MemorySaver

    return MemorySaver()


def _store_backend_factory(runtime: Any) -> Any:
    from deepagents.backends import StoreBackend

    return StoreBackend(runtime)


def _runtime_harness_options() -> tuple[dict[str, Any], list[str]]:
    """Build optional Deep Agents harness configuration for web-server use."""
    options: dict[str, Any] = {}
    missing: list[str] = []

    try:
        store = _runtime_store()
        options.update(
            {
                "backend": _store_backend_factory,
                "store": store,
                "skills": ["/skills/"],
                "memory": ["/AGENTS.md"],
            }
        )
    except Exception as exc:
        missing.append(f"StoreBackend skills/memory backend ({exc})")

    try:
        options["checkpointer"] = _runtime_checkpointer()
    except Exception as exc:
        missing.append(f"MemorySaver checkpointer ({exc})")

    return options, missing


def _runtime_memory_middleware() -> list[Any]:
    if not _deep_agents_memory_enabled():
        return []
    try:
        from src.services.agents.memory.middleware import DbMemoryMiddleware

        return [DbMemoryMiddleware()]
    except Exception:
        return []


def _deep_agent_config(
    user_id: str,
    session_id: str | None,
    *,
    project_id: int | None = None,
    scope: str = "project-intelligence",
) -> dict[str, Any]:
    thread_id = session_id or f"{scope}:{user_id}:{project_id or 'global'}"
    configurable: dict[str, Any] = {
        "thread_id": thread_id,
        "user_id": user_id,
    }
    if project_id is not None:
        configurable["project_id"] = project_id
    return {"configurable": configurable}


def _invoke_agent(agent: Any, payload: dict[str, Any], config: dict[str, Any]) -> Any:
    # LangSmith tracing is enabled by env vars (LANGSMITH_TRACING=true +
    # LANGSMITH_API_KEY + LANGSMITH_PROJECT). LangChain's runtime auto-installs
    # the tracer on every Runnable.invoke, so we do NOT need to manually open a
    # tracing_context here — doing so previously installed a context that
    # suppressed trace export in langsmith 0.8.x.
    try:
        return agent.invoke(payload, config=config)
    except TypeError as exc:
        if "config" not in str(exc):
            raise
        return agent.invoke(payload)


def _runtime_tools() -> list[Any]:
    if not _standalone_tools_enabled():
        return []

    tools: list[Any] = list(READ_ONLY_PM_TOOLS)
    if _env_flag("DEEP_AGENTS_SQL_TOOLS_ENABLED"):
        tools.extend(SQL_TOOLS)
    if _env_flag("DEEP_AGENTS_ACUMATICA_TOOLS_ENABLED"):
        tools.extend(EXTERNAL_ACCOUNTING_TOOLS)
    if _env_flag("DEEP_AGENTS_DRAFT_TOOLS_ENABLED"):
        tools.extend(DRAFT_ACTION_TOOLS)
    return tools


def _runtime_subagents() -> list[dict[str, Any]]:
    if not (_standalone_tools_enabled() and _env_flag("DEEP_AGENTS_SUBAGENTS_ENABLED")):
        return []
    return build_subagents(
        include_sql=_env_flag("DEEP_AGENTS_SQL_TOOLS_ENABLED"),
        include_acumatica=_env_flag("DEEP_AGENTS_ACUMATICA_TOOLS_ENABLED"),
    )


def _subagents_with_skills(
    subagents: Sequence[dict[str, Any]],
    skills: Sequence[str],
) -> list[dict[str, Any]]:
    if not skills:
        return [dict(subagent) for subagent in subagents]
    return [
        {
            **subagent,
            "skills": list(subagent.get("skills") or skills),
        }
        for subagent in subagents
    ]


def deep_agents_runtime_tool_names() -> tuple[str, ...]:
    return tuple(getattr(tool, "name", getattr(tool, "__name__", "")) for tool in _runtime_tools())


def deep_agents_runtime_subagent_names() -> tuple[str, ...]:
    return tuple(subagent["name"] for subagent in _runtime_subagents())


def _subagent_inventory(subagents: Sequence[dict[str, Any]]) -> list[dict[str, Any]]:
    details: list[dict[str, Any]] = []
    for subagent in subagents:
        response_format = subagent.get("response_format")
        details.append(
            {
                "name": subagent["name"],
                "toolCount": len(subagent.get("tools") or []),
                "structuredOutput": response_format is not None,
                "responseFormat": getattr(response_format, "__name__", None),
            }
        )
    return details


def _tool_names(tools: Sequence[Any]) -> list[str]:
    return [getattr(tool, "name", getattr(tool, "__name__", "")) for tool in tools]


def deep_agents_runtime_inventory() -> dict[str, Any]:
    """Return the effective Deep Agents runtime surface without leaking secrets."""
    flags = {
        "projectIntelligenceEnabled": _env_flag("DEEP_AGENTS_PROJECT_INTELLIGENCE_ENABLED"),
        "standaloneToolsEnabled": _env_flag("DEEP_AGENTS_STANDALONE_TOOLS_ENABLED"),
        "sqlToolsEnabled": _env_flag("DEEP_AGENTS_SQL_TOOLS_ENABLED"),
        "acumaticaToolsEnabled": _env_flag("DEEP_AGENTS_ACUMATICA_TOOLS_ENABLED"),
        "draftToolsEnabled": _env_flag("DEEP_AGENTS_DRAFT_TOOLS_ENABLED"),
        "subagentsEnabled": _env_flag("DEEP_AGENTS_SUBAGENTS_ENABLED"),
        "memoryEnabled": _deep_agents_memory_enabled(),
    }
    runtime = os.getenv("DEEP_AGENTS_PROJECT_INTELLIGENCE_RUNTIME", CONTRACT_SPIKE_MODE)
    groups = [
        {
            "name": "resolvers",
            "enabled": flags["standaloneToolsEnabled"],
            "tools": _tool_names(RESOLVERS) if flags["standaloneToolsEnabled"] else [],
        },
        {
            "name": "readOnlyPm",
            "enabled": flags["standaloneToolsEnabled"],
            "tools": _tool_names(READ_ONLY_PM_TOOLS) if flags["standaloneToolsEnabled"] else [],
        },
        {
            "name": "sql",
            "enabled": flags["standaloneToolsEnabled"] and flags["sqlToolsEnabled"],
            "tools": _tool_names(SQL_TOOLS)
            if flags["standaloneToolsEnabled"] and flags["sqlToolsEnabled"]
            else [],
        },
        {
            "name": "draftActions",
            "enabled": flags["standaloneToolsEnabled"] and flags["draftToolsEnabled"],
            "tools": _tool_names(DRAFT_ACTION_TOOLS)
            if flags["standaloneToolsEnabled"] and flags["draftToolsEnabled"]
            else [],
        },
        {
            "name": "externalAccounting",
            "enabled": flags["standaloneToolsEnabled"] and flags["acumaticaToolsEnabled"],
            "tools": _tool_names(EXTERNAL_ACCOUNTING_TOOLS)
            if flags["standaloneToolsEnabled"] and flags["acumaticaToolsEnabled"]
            else [],
        },
    ]
    active_tools = list(deep_agents_runtime_tool_names())
    runtime_subagents = _runtime_subagents()
    active_subagents = [subagent["name"] for subagent in runtime_subagents]
    memory_middleware = _runtime_memory_middleware()
    memory_tool_names: list[str] = []
    if memory_middleware:
        from src.services.agents.memory import build_memory_tools

        memory_tool_names = _tool_names(
            build_memory_tools(user_id="inventory", project_id=1, candidate_sink=[]),
        )
    harness_options, harness_missing = _runtime_harness_options()
    known_missing = list(harness_missing)
    if not memory_middleware:
        known_missing.append("DbMemoryMiddleware")
    return {
        "status": "active"
        if flags["projectIntelligenceEnabled"] and runtime == DEEP_AGENT_RUNTIME_MODE
        else "configured_but_not_runtime_active",
        "runtime": runtime,
        "model": os.getenv("DEEP_AGENTS_PROJECT_INTELLIGENCE_MODEL", "openai:gpt-5.4-mini"),
        "flags": flags,
        "toolCount": len(active_tools),
        "tools": active_tools,
        "groups": groups,
        "subagentCount": len(active_subagents),
        "subagents": active_subagents,
        "subagentDetails": _subagent_inventory(runtime_subagents),
        "memory": {
            "enabled": bool(memory_middleware),
            "middleware": "DbMemoryMiddleware" if memory_middleware else None,
            "tools": memory_tool_names,
            "databaseUrlConfigured": bool(os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")),
        },
        "harness": {
            "backend": "StoreBackend" if "backend" in harness_options else None,
            "skills": list(harness_options.get("skills") or []),
            "memory": list(harness_options.get("memory") or []),
            "checkpointer": "MemorySaver" if "checkpointer" in harness_options else None,
            "store": "InMemoryStore" if "store" in harness_options else None,
        },
        "knownMissing": known_missing,
    }


class _SourceProbe:
    def __init__(
        self,
        source_type: str,
        table: str,
        *,
        timestamp_fields: Sequence[str],
        title_fields: Sequence[str],
        source_id_fields: Sequence[str],
        local_filter: Optional[Callable[[Dict[str, Any]], bool]] = None,
    ) -> None:
        self.source_type = source_type
        self.table = table
        self.timestamp_fields = tuple(timestamp_fields)
        self.title_fields = tuple(title_fields)
        self.source_id_fields = tuple(source_id_fields)
        self.local_filter = local_filter


def _field_text(row: Dict[str, Any], fields: Iterable[str]) -> str:
    for field in fields:
        value = row.get(field)
        if value is not None and str(value).strip():
            return str(value).strip()
    return ""


def _source_id(row: Dict[str, Any], fields: Iterable[str], fallback: str) -> str:
    value = _field_text(row, fields)
    return value or fallback


def _latest_timestamp(rows: Sequence[Dict[str, Any]], fields: Sequence[str]) -> Optional[str]:
    values = [
        str(row.get(field))
        for row in rows
        for field in fields
        if row.get(field)
    ]
    return max(values) if values else None


def _matches_any(row: Dict[str, Any], *terms: str) -> bool:
    haystack = " ".join(
        str(row.get(field) or "")
        for field in ("source", "source_system", "type", "category", "file_name", "title")
    ).lower()
    return any(term in haystack for term in terms)


def _task_register_owner_terms(question: str) -> tuple[str, ...]:
    normalized = question.lower()
    if "brandon" in normalized or "clymer" in normalized:
        return ("brandon", "clymer", "bclymer@alleatogroup.com")
    return ()


def _task_register_owner_filter(row: Dict[str, Any], owner_terms: Sequence[str]) -> bool:
    if not owner_terms:
        return True
    haystack = " ".join(
        str(row.get(field) or "")
        for field in (
            "assignee_name",
            "assignee_email",
            "assignee_person_id",
            "owner",
            "owner_name",
            "owner_email",
        )
    ).lower()
    return any(term in haystack for term in owner_terms)


SOURCE_PROBES = (
    _SourceProbe(
        "teams",
        "document_metadata",
        timestamp_fields=("source_last_modified_at", "captured_at", "date", "created_at"),
        title_fields=("title", "file_name", "summary"),
        source_id_fields=("id", "source_item_id", "fireflies_id"),
        local_filter=lambda row: _matches_any(row, "teams", "team_message", "chat"),
    ),
    _SourceProbe(
        "meetings",
        "document_metadata",
        timestamp_fields=("date", "captured_at", "created_at"),
        title_fields=("title", "summary", "file_name"),
        source_id_fields=("id", "fireflies_id"),
        local_filter=lambda row: _matches_any(row, "fireflies", "meeting", "transcript"),
    ),
    _SourceProbe(
        "emails",
        "project_emails",
        timestamp_fields=("received_at", "sent_at", "updated_at", "created_at"),
        title_fields=("subject",),
        source_id_fields=("graph_message_id", "id"),
    ),
    _SourceProbe(
        "documents",
        "project_documents",
        timestamp_fields=("source_last_modified_at", "last_synced_at", "updated_at", "created_at"),
        title_fields=("title", "file_name"),
        source_id_fields=("source_item_id", "id"),
    ),
    _SourceProbe(
        "financials",
        "acumatica_project_budgets",
        timestamp_fields=("last_modified_at", "acumatica_sync_at", "updated_at", "created_at"),
        title_fields=("description", "cost_code", "external_key"),
        source_id_fields=("external_key", "id"),
    ),
    _SourceProbe(
        "schedule",
        "schedule_tasks",
        timestamp_fields=("finish_date", "start_date", "updated_at", "created_at"),
        title_fields=("name", "wbs_code"),
        source_id_fields=("id",),
    ),
    _SourceProbe(
        "rfi",
        "rfis",
        timestamp_fields=("updated_at", "created_at", "date_initiated", "due_date"),
        title_fields=("subject", "question"),
        source_id_fields=("id", "number"),
    ),
    _SourceProbe(
        "submittal",
        "submittals",
        timestamp_fields=("updated_at", "created_at", "submission_date", "sent_date"),
        title_fields=("title", "submittal_number"),
        source_id_fields=("id", "submittal_number"),
    ),
)

EXECUTIVE_SOURCE_PROBES = (
    _SourceProbe(
        "executive_briefing",
        "daily_recaps",
        timestamp_fields=("recap_date", "approved_at", "sent_at", "created_at"),
        title_fields=("recap_kind", "workflow_status"),
        source_id_fields=("id",),
    ),
    _SourceProbe(
        "tasks",
        "tasks",
        timestamp_fields=("updated_at", "created_at", "due_date"),
        title_fields=(
            "title",
            "description",
            "assignee_name",
            "assignee_email",
            "status",
            "priority",
        ),
        source_id_fields=("id", "metadata_id"),
    ),
    _SourceProbe(
        "executive_follow_ups",
        "executive_briefing_follow_ups",
        timestamp_fields=("updated_at", "source_date", "created_at"),
        title_fields=("title", "summary", "section"),
        source_id_fields=("id", "source_id"),
    ),
    _SourceProbe(
        "emails",
        "project_emails",
        timestamp_fields=("received_at", "sent_at", "updated_at", "created_at"),
        title_fields=("subject",),
        source_id_fields=("graph_message_id", "id"),
    ),
    _SourceProbe(
        "teams",
        "document_metadata",
        timestamp_fields=("source_last_modified_at", "captured_at", "date", "created_at"),
        title_fields=("title", "file_name", "summary"),
        source_id_fields=("id", "source_item_id", "fireflies_id"),
        local_filter=lambda row: _matches_any(row, "teams", "team_message", "chat"),
    ),
    _SourceProbe(
        "meetings",
        "document_metadata",
        timestamp_fields=("date", "captured_at", "created_at"),
        title_fields=("title", "summary", "file_name"),
        source_id_fields=("id", "fireflies_id"),
        local_filter=lambda row: _matches_any(row, "fireflies", "meeting", "transcript"),
    ),
    _SourceProbe(
        "documents",
        "project_documents",
        timestamp_fields=("source_last_modified_at", "last_synced_at", "updated_at", "created_at"),
        title_fields=("title", "file_name"),
        source_id_fields=("source_item_id", "id"),
    ),
    _SourceProbe(
        "projects",
        "projects",
        timestamp_fields=("summary_updated_at", "created_at"),
        title_fields=("name", "project_name", "title"),
        source_id_fields=("id",),
    ),
    _SourceProbe(
        "financials",
        "acumatica_project_budgets",
        timestamp_fields=("last_modified_at", "acumatica_sync_at", "updated_at", "created_at"),
        title_fields=("description", "cost_code", "external_key"),
        source_id_fields=("external_key", "id"),
    ),
    _SourceProbe(
        "schedule",
        "schedule_tasks",
        timestamp_fields=("finish_date", "start_date", "updated_at", "created_at"),
        title_fields=("name", "wbs_code"),
        source_id_fields=("id",),
    ),
)


def _clean_project_name(project: Dict[str, Any], project_id: int) -> str:
    raw_name = project.get("name") or project.get("project_name") or project.get("title")
    name = str(raw_name or "").strip()
    return name or f"Project {project_id}"


def _get_project(store: Any, project_id: int) -> Optional[Dict[str, Any]]:
    get_project = getattr(store, "get_project", None)
    if not callable(get_project):
        return None
    project = get_project(project_id)
    return project if isinstance(project, dict) else None


def _project_lookup_failure_response(
    request: DeepProjectIntelligenceRequest,
    *,
    duration_ms: int,
    answer: str,
    notes: str,
    detail: str,
) -> DeepProjectIntelligenceResponse:
    return DeepProjectIntelligenceResponse(
        answer=answer,
        confidence="low",
        intent="project_status_risk",
        project=DeepProject(id=request.project_id, name=f"Project {request.project_id}"),
        sourcesChecked=[
            SourceCoverage(
                sourceType="project",
                status="failed",
                recordCount=0,
                latestSourceAt=None,
                notes=notes,
            )
        ],
        evidence=[],
        recommendedActions=[],
        toolTrace=[
            ToolTraceItem(
                agent="project-intelligence-orchestrator",
                tool="project_lookup",
                status="failed",
                durationMs=duration_ms,
                detail=detail,
            )
        ],
        memoryCandidates=[],
        orchestrator="deep-agents-project-intelligence",
        mode=CONTRACT_SPIKE_MODE,
    )


def _missing_sources() -> List[SourceCoverage]:
    return [
        SourceCoverage(
            sourceType=source_type,
            status="missing",
            recordCount=0,
            latestSourceAt=None,
            notes=(
                "Slice 1 contract spike has not wired this read tool yet; "
                "future slices must return checked, stale, missing, or failed."
            ),
        )
        for source_type in REQUIRED_SOURCE_TYPES
    ]


def _store_client(store: Any) -> Optional[Any]:
    client = getattr(store, "_client", None) or getattr(store, "client", None)
    return client if callable(getattr(client, "table", None)) else None


def _response_rows(response: Any) -> List[Dict[str, Any]]:
    data = getattr(response, "data", None)
    return data if isinstance(data, list) else []


def _query_project_rows(
    client: Any,
    table: str,
    project_id: int,
    *,
    limit: int = 100,
    order_by: Optional[str] = None,
) -> List[Dict[str, Any]]:
    query = client.table(table).select("*").eq("project_id", project_id).limit(limit)
    if order_by and hasattr(query, "order"):
        query = query.order(order_by, desc=True)
    return _response_rows(query.execute())


def _query_recent_rows(
    client: Any,
    table: str,
    *,
    limit: int = 100,
    order_by: Optional[str] = None,
) -> List[Dict[str, Any]]:
    query = client.table(table).select("*").limit(limit)
    if order_by and hasattr(query, "order"):
        query = query.order(order_by, desc=True)
    return _response_rows(query.execute())


def _source_coverage_from_rows(
    probe: _SourceProbe,
    rows: List[Dict[str, Any]],
) -> SourceCoverage:
    latest = _latest_timestamp(rows, probe.timestamp_fields)
    return SourceCoverage(
        sourceType=probe.source_type,
        status="checked" if rows else "missing",
        recordCount=len(rows),
        latestSourceAt=latest,
        notes=(
            f"Read-only probe found {len(rows)} {probe.source_type} row(s) "
            f"from `{probe.table}`."
            if rows
            else f"No {probe.source_type} rows found in `{probe.table}` for this project."
        ),
    )


def _evidence_from_rows(
    probe: _SourceProbe,
    rows: Sequence[Dict[str, Any]],
) -> List[EvidenceItem]:
    evidence: List[EvidenceItem] = []
    for index, row in enumerate(rows[:2]):
        title = _field_text(row, probe.title_fields) or f"{probe.source_type.title()} source"
        excerpt = _field_text(row, ("summary", "overview", "description", "question", "content", "body_text"))
        evidence.append(
            EvidenceItem(
                sourceType=probe.source_type,
                sourceId=_source_id(row, probe.source_id_fields, f"{probe.source_type}-{index}"),
                title=title,
                excerpt=excerpt[:500] if excerpt else f"Read-only {probe.source_type} source row.",
                occurredAt=_latest_timestamp([row], probe.timestamp_fields),
                confidence="medium",
            )
        )
    return evidence


def _packet_coverage(client: Any, project_id: int) -> tuple[SourceCoverage, List[EvidenceItem], ToolTraceItem]:
    started = time.perf_counter()
    try:
        target_rows = _query_project_rows(
            client,
            "intelligence_targets",
            project_id,
            limit=10,
            order_by="updated_at",
        )
        target_ids = [row.get("id") for row in target_rows if row.get("id")]
        packet_rows: List[Dict[str, Any]] = []
        if target_ids:
            packet_rows = _response_rows(
                client.table("intelligence_packets")
                .select("*")
                .in_("target_id", target_ids)
                .order("generated_at", desc=True)
                .limit(25)
                .execute()
            )
        latest = _latest_timestamp(packet_rows, ("generated_at", "created_at", "covered_end_at"))
        coverage = SourceCoverage(
            sourceType="packet",
            status="checked" if packet_rows else "missing",
            recordCount=len(packet_rows),
            latestSourceAt=latest,
            notes=(
                f"Found {len(packet_rows)} current intelligence packet row(s) "
                f"across {len(target_ids)} target(s)."
                if packet_rows
                else f"No intelligence packet rows found across {len(target_ids)} target(s)."
            ),
        )
        evidence = [
            EvidenceItem(
                sourceType="packet",
                sourceId=str(row.get("id") or f"packet-{index}"),
                title=str(row.get("packet_type") or "Project intelligence packet"),
                excerpt=str(row.get("executive_summary") or row.get("strategic_read") or "")[:500]
                or "Stored project intelligence packet.",
                occurredAt=str(row.get("generated_at") or row.get("created_at") or ""),
                confidence="medium",
            )
            for index, row in enumerate(packet_rows[:2])
        ]
        trace = ToolTraceItem(
            agent="project-intelligence-orchestrator",
            tool="packet_reader",
            status="success",
            durationMs=max(0, int((time.perf_counter() - started) * 1000)),
            detail=coverage.notes,
        )
        return coverage, evidence, trace
    except Exception as exc:
        coverage = SourceCoverage(
            sourceType="packet",
            status="failed",
            recordCount=0,
            latestSourceAt=None,
            notes=f"Packet read-only probe failed: {exc}",
        )
        trace = ToolTraceItem(
            agent="project-intelligence-orchestrator",
            tool="packet_reader",
            status="failed",
            durationMs=max(0, int((time.perf_counter() - started) * 1000)),
            detail=str(exc),
        )
        return coverage, [], trace


def _source_probe_coverage(
    client: Any,
    project_id: int,
    probe: _SourceProbe,
) -> tuple[SourceCoverage, List[EvidenceItem], ToolTraceItem]:
    started = time.perf_counter()
    try:
        rows = _query_project_rows(
            client,
            probe.table,
            project_id,
            limit=100,
            order_by=probe.timestamp_fields[0] if probe.timestamp_fields else None,
        )
        if probe.local_filter:
            rows = [row for row in rows if probe.local_filter(row)]
        coverage = _source_coverage_from_rows(probe, rows)
        trace = ToolTraceItem(
            agent="project-intelligence-orchestrator",
            tool=f"{probe.source_type}_reader",
            status="success",
            durationMs=max(0, int((time.perf_counter() - started) * 1000)),
            detail=coverage.notes,
        )
        return coverage, _evidence_from_rows(probe, rows), trace
    except Exception as exc:
        coverage = SourceCoverage(
            sourceType=probe.source_type,
            status="failed",
            recordCount=0,
            latestSourceAt=None,
            notes=f"{probe.source_type} read-only probe failed: {exc}",
        )
        trace = ToolTraceItem(
            agent="project-intelligence-orchestrator",
            tool=f"{probe.source_type}_reader",
            status="failed",
            durationMs=max(0, int((time.perf_counter() - started) * 1000)),
            detail=str(exc),
        )
        return coverage, [], trace


def _executive_source_probe_coverage(
    client: Any,
    probe: _SourceProbe,
    *,
    task_owner_terms: Sequence[str] = (),
) -> tuple[SourceCoverage, List[EvidenceItem], ToolTraceItem]:
    started = time.perf_counter()
    try:
        limit = 500 if probe.source_type == "tasks" and task_owner_terms else 100
        rows = _query_recent_rows(
            client,
            probe.table,
            limit=limit,
            order_by=probe.timestamp_fields[0] if probe.timestamp_fields else None,
        )
        if probe.local_filter:
            rows = [row for row in rows if probe.local_filter(row)]
        if probe.source_type == "tasks" and task_owner_terms:
            rows = [row for row in rows if _task_register_owner_filter(row, task_owner_terms)]
        coverage = _source_coverage_from_rows(probe, rows)
        coverage.notes = (
            f"Read-only executive probe found {len(rows)} {probe.source_type} row(s) "
            f"from `{probe.table}`."
            if rows
            else f"No {probe.source_type} rows found in `{probe.table}` for the executive briefing."
        )
        trace = ToolTraceItem(
            agent="executive-intelligence-orchestrator",
            tool=f"{probe.source_type}_reader",
            status="success",
            durationMs=max(0, int((time.perf_counter() - started) * 1000)),
            detail=coverage.notes,
        )
        return coverage, _evidence_from_rows(probe, rows), trace
    except Exception as exc:
        coverage = SourceCoverage(
            sourceType=probe.source_type,
            status="failed",
            recordCount=0,
            latestSourceAt=None,
            notes=f"{probe.source_type} executive read-only probe failed: {exc}",
        )
        trace = ToolTraceItem(
            agent="executive-intelligence-orchestrator",
            tool=f"{probe.source_type}_reader",
            status="failed",
            durationMs=max(0, int((time.perf_counter() - started) * 1000)),
            detail=str(exc),
        )
        return coverage, [], trace


def _collect_source_coverage(
    store: Any,
    project_id: int,
) -> tuple[List[SourceCoverage], List[EvidenceItem], List[ToolTraceItem]]:
    client = _store_client(store)
    if client is None:
        return _missing_sources(), [], [
            ToolTraceItem(
                agent="project-intelligence-orchestrator",
                tool="source_client",
                status="skipped",
                durationMs=0,
                detail="No Supabase client was available on the injected store.",
            )
        ]

    sources: List[SourceCoverage] = []
    evidence: List[EvidenceItem] = []
    traces: List[ToolTraceItem] = []

    packet_coverage, packet_evidence, packet_trace = _packet_coverage(client, project_id)
    sources.append(packet_coverage)
    evidence.extend(packet_evidence)
    traces.append(packet_trace)

    for probe in SOURCE_PROBES:
        coverage, probe_evidence, trace = _source_probe_coverage(client, project_id, probe)
        sources.append(coverage)
        evidence.extend(probe_evidence)
        traces.append(trace)

    return sources, evidence[:12], traces


def _missing_executive_sources() -> List[SourceCoverage]:
    return [
        SourceCoverage(
            sourceType=source_type,
            status="missing",
            recordCount=0,
            latestSourceAt=None,
            notes="No Supabase client was available to run the executive source probe.",
        )
        for source_type in REQUIRED_EXECUTIVE_SOURCE_TYPES
    ]


def _collect_executive_source_coverage(
    store: Any,
    request: Optional[DeepExecutiveIntelligenceRequest] = None,
) -> tuple[List[SourceCoverage], List[EvidenceItem], List[ToolTraceItem]]:
    client = _store_client(store)
    if client is None:
        return _missing_executive_sources(), [], [
            ToolTraceItem(
                agent="executive-intelligence-orchestrator",
                tool="source_client",
                status="skipped",
                durationMs=0,
                detail="No Supabase client was available on the injected store.",
            )
        ]

    sources: List[SourceCoverage] = []
    evidence: List[EvidenceItem] = []
    traces: List[ToolTraceItem] = []
    task_owner_terms = _task_register_owner_terms(request.question) if request else ()

    for probe in EXECUTIVE_SOURCE_PROBES:
        coverage, probe_evidence, trace = _executive_source_probe_coverage(
            client,
            probe,
            task_owner_terms=task_owner_terms,
        )
        sources.append(coverage)
        evidence.extend(probe_evidence)
        traces.append(trace)

    return sources, evidence[:16], traces


def _recommended_actions(sources: Sequence[SourceCoverage]) -> List[RecommendedAction]:
    failed = [source.source_type for source in sources if source.status == "failed"]
    missing = [source.source_type for source in sources if source.status == "missing"]
    if failed:
        return [
            RecommendedAction(
                label="Fix failed source probes before synthesis",
                ownerRole="AI/backend",
                reason=f"These read-only source probes failed: {', '.join(failed)}.",
                sourceId=None,
            )
        ]
    if missing:
        return [
            RecommendedAction(
                label="Wire or backfill missing source categories",
                ownerRole="AI/backend",
                reason=f"These source categories have no project rows yet: {', '.join(missing)}.",
                sourceId=None,
            )
        ]
    return [
        RecommendedAction(
            label="Add Deep Agents synthesis on top of checked sources",
            ownerRole="AI/backend",
            reason="All required source probes returned project rows.",
            sourceId=None,
        )
    ]


def _recommended_executive_actions(sources: Sequence[SourceCoverage]) -> List[RecommendedAction]:
    failed = [source.source_type for source in sources if source.status == "failed"]
    missing = [source.source_type for source in sources if source.status == "missing"]
    if failed:
        return [
            RecommendedAction(
                label="Fix failed executive source probes before synthesis",
                ownerRole="AI/backend",
                reason=f"These executive source probes failed: {', '.join(failed)}.",
                sourceId=None,
            )
        ]
    if missing:
        return [
            RecommendedAction(
                label="Backfill missing executive source categories",
                ownerRole="Operations",
                reason=f"These source categories have no rows for the business briefing: {', '.join(missing)}.",
                sourceId=None,
            )
        ]
    return [
        RecommendedAction(
            label="Use executive Deep Agents packet for business-wide chat answers",
            ownerRole="AI/product",
            reason="All required executive source probes returned rows.",
            sourceId=None,
        )
    ]


def _deep_agent_prompt(
    request: DeepProjectIntelligenceRequest,
    project: DeepProject,
    sources: Sequence[SourceCoverage],
    evidence: Sequence[EvidenceItem],
) -> str:
    source_lines = [
        (
            f"- {source.source_type}: status={source.status}, "
            f"records={source.record_count}, latest={source.latest_source_at or 'unknown'}"
        )
        for source in sources
    ]
    evidence_lines = [
        (
            f"- [{item.source_type}] {item.title} "
            f"(id={item.source_id}, occurred={item.occurred_at or 'unknown'}): {item.excerpt}"
        )
        for item in evidence[:8]
    ]
    return "\n".join(
        [
            f"Question: {request.question}",
            f"Project: {project.name} (id={project.id})",
            "",
            "Source coverage:",
            *source_lines,
            "",
            "Evidence snippets:",
            *(evidence_lines or ["- No source evidence rows were available."]),
            "",
            "Write a concise project-status/risk synthesis for an internal construction operator.",
            "Do not claim checked sources are available when source coverage says missing or failed.",
            "Do not mention RAG, embeddings, or implementation internals.",
        ]
    )


def _deep_agent_executive_prompt(
    request: DeepExecutiveIntelligenceRequest,
    organization: DeepOrganization,
    sources: Sequence[SourceCoverage],
    evidence: Sequence[EvidenceItem],
) -> str:
    source_lines = [
        (
            f"- {source.source_type}: status={source.status}, "
            f"records={source.record_count}, latest={source.latest_source_at or 'unknown'}"
        )
        for source in sources
    ]
    evidence_lines = [
        (
            f"- [{item.source_type}] {item.title} "
            f"(id={item.source_id}, occurred={item.occurred_at or 'unknown'}): {item.excerpt}"
        )
        for item in evidence[:10]
    ]
    today = datetime.utcnow().strftime("%Y-%m-%d")
    return "\n".join(
        [
            f"Question: {request.question}",
            f"Organization: {organization.name}",
            f"Today's date (UTC): {today}",
            "",
            "Executive source coverage:",
            *source_lines,
            "",
            "Evidence snippets:",
            *(evidence_lines or ["- No source evidence rows were available."]),
            "",
            "Write a concise business-wide executive synthesis for a construction operator.",
            (
                "When the user asks for tasks, action items, to-dos, or what someone needs to do, "
                "treat the `tasks` source as the canonical PM task register from public.tasks."
            ),
            (
                "Do not treat `executive_follow_ups`, schedule milestones, meetings, emails, or document "
                "snippets as task-register rows unless the task register is missing or you explicitly label "
                "them as non-canonical follow-ups."
            ),
            "Prioritize today's meetings, urgent inbox/team follow-ups, important tasks, operational risks, and process recommendations when the evidence supports them.",
            "A source is only stale if its latest timestamp is more than 7 days behind today's date. Do not add staleness warnings for sources with recent data.",
            "Do not claim checked sources are available when source coverage says missing or failed.",
            "Do not send emails, create invites, mutate tasks, or imply write actions were completed.",
            "Do not mention RAG, embeddings, or implementation internals.",
        ]
    )


def _extract_agent_text(result: Any) -> str:
    if isinstance(result, dict):
        messages = result.get("messages")
        if isinstance(messages, list) and messages:
            last = messages[-1]
            content = getattr(last, "content", None)
            if content is None and isinstance(last, dict):
                content = last.get("content")
            if isinstance(content, str):
                return content.strip()
        for key in ("output", "content", "text"):
            value = result.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    content = getattr(result, "content", None)
    if isinstance(content, str):
        return content.strip()
    return str(result or "").strip()


def _openai_model_name(model: str, *, gateway: bool) -> str:
    normalized = model.strip()
    if normalized.startswith("openai:"):
        normalized = normalized.split(":", 1)[1]
    if gateway:
        return normalized if normalized.startswith("openai/") else f"openai/{normalized}"
    return normalized.split("/", 1)[1] if normalized.startswith("openai/") else normalized


def _resolve_deep_agents_model(model: Any) -> Any:
    if not isinstance(model, str):
        return model

    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(
            model=_openai_model_name(model, gateway=False),
            api_key=openai_key,
            timeout=45,
            max_retries=1,
        )
    return model


def _invoke_canonical_pm_tool(tool_obj: Any, **kwargs: Any) -> str:
    """Invoke canonical Alleato PM LangChain tools from runtime closure tools."""

    if hasattr(tool_obj, "invoke"):
        return str(tool_obj.invoke(kwargs))
    return str(tool_obj(**kwargs))


def _run_deep_agents_runtime(
    request: DeepProjectIntelligenceRequest,
    project: DeepProject,
    sources: Sequence[SourceCoverage],
    evidence: Sequence[EvidenceItem],
    *,
    store: Any,
    memory_candidates: list[MemoryCandidate],
    create_agent: Optional[Callable[..., Any]] = None,
    model: str = "openai:gpt-5.4-mini",
) -> tuple[Optional[str], ToolTraceItem]:
    started = time.perf_counter()
    try:
        if create_agent is None:
            from deepagents import create_deep_agent as create_agent
            model = _resolve_deep_agents_model(model)

        def source_coverage() -> str:
            """Return source coverage already collected by Alleato read-only probes."""
            return "\n".join(
                f"{source.source_type}: {source.status}, records={source.record_count}, latest={source.latest_source_at}"
                for source in sources
            )

        def pm_budget_summary() -> str:
            """Return PM budget and prime-contract financials for this project."""
            return _invoke_canonical_pm_tool(
                pm_project_budget_summary_tool,
                project_id=request.project_id,
            )

        def pm_briefing_snapshot() -> str:
            """Return the broad PM briefing snapshot for this project."""
            return _invoke_canonical_pm_tool(
                pm_project_briefing_snapshot_tool,
                project_id=request.project_id,
            )

        def pm_risk_snapshot() -> str:
            """Return structured risk, overdue, and chase-list context for this project."""
            return _invoke_canonical_pm_tool(
                pm_project_risk_snapshot_tool,
                project_id=request.project_id,
            )

        memory_middleware = _runtime_memory_middleware()
        memory_tools: list[Any] = []
        if memory_middleware:
            from src.services.agents.memory import build_memory_tools

            memory_tools = build_memory_tools(
                user_id=request.user_id,
                project_id=request.project_id,
                candidate_sink=memory_candidates,
            )
        harness_options, _harness_missing = _runtime_harness_options()
        skills = list(harness_options.get("skills") or [])
        agent = create_agent(
            name="alleato-project-intelligence-orchestrator",
            model=model,
            tools=[
                source_coverage,
                pm_budget_summary,
                pm_briefing_snapshot,
                pm_risk_snapshot,
                *memory_tools,
                *_runtime_tools(),
            ],
            system_prompt=(
                f"{ORCHESTRATOR_PROMPT}\n\n"
                "Backend runtime scope: you are answering inside the Render FastAPI backend. "
                "Use source_coverage plus the enabled Alleato PM, resolver, RAG/search, "
                "recent-activity, SQL, Acumatica, draft-preview, and subagent tools as needed. "
                "Use recall_user_memory, recall_project_memory, or recall_team_memory when a question may depend "
                "on prior preferences, project history, commitments, or lessons. Use propose_memory_candidate "
                "only for stable facts that should be reviewed for future memory; it does not write to the database. "
                "Draft tools, if enabled, only produce approval previews; never imply that a "
                "write, email, Teams post, RFI, commitment, change event, or task was actually executed. "
                "If sources are missing, say so plainly."
            ),
            subagents=_subagents_with_skills(_runtime_subagents(), skills),
            middleware=memory_middleware,
            **harness_options,
        )
        result = _invoke_agent(
            agent,
            {"messages": [{"role": "user", "content": _deep_agent_prompt(request, project, sources, evidence)}]},
            _deep_agent_config(request.user_id, request.session_id, project_id=request.project_id),
        )
        text = _extract_agent_text(result)
        if not text:
            raise RuntimeError("Deep Agents runtime returned an empty response.")
        return text, ToolTraceItem(
            agent="project-intelligence-orchestrator",
            tool="deepagents_runtime",
            status="success",
            durationMs=max(0, int((time.perf_counter() - started) * 1000)),
            detail=(
                "Deep Agents runtime produced a synthesis from checked source coverage"
                + (" with durable memory." if memory_middleware else ".")
            ),
        )
    except Exception as exc:
        return None, ToolTraceItem(
            agent="project-intelligence-orchestrator",
            tool="deepagents_runtime",
            status="failed",
            durationMs=max(0, int((time.perf_counter() - started) * 1000)),
            detail=str(exc),
        )


def _run_deep_agents_executive_runtime(
    request: DeepExecutiveIntelligenceRequest,
    organization: DeepOrganization,
    sources: Sequence[SourceCoverage],
    evidence: Sequence[EvidenceItem],
    *,
    store: Any,
    memory_candidates: list[MemoryCandidate],
    create_agent: Optional[Callable[..., Any]] = None,
    model: str = "openai:gpt-5.4-mini",
) -> tuple[Optional[str], ToolTraceItem]:
    started = time.perf_counter()
    try:
        if create_agent is None:
            from deepagents import create_deep_agent as create_agent
            model = _resolve_deep_agents_model(model)

        def source_coverage() -> str:
            """Return executive source coverage already collected by Alleato read-only probes."""
            return "\n".join(
                f"{source.source_type}: {source.status}, records={source.record_count}, latest={source.latest_source_at}"
                for source in sources
            )

        def pm_portfolio_overview() -> str:
            """Return portfolio-level PM context across active projects."""
            return _invoke_canonical_pm_tool(
                pm_portfolio_overview_tool,
                phase="Current",
                max_projects=25,
            )

        memory_middleware = _runtime_memory_middleware()
        memory_tools: list[Any] = []
        if memory_middleware:
            from src.services.agents.memory import build_memory_tools

            memory_tools = build_memory_tools(
                user_id=request.user_id,
                candidate_sink=memory_candidates,
            )
        harness_options, _harness_missing = _runtime_harness_options()
        skills = list(harness_options.get("skills") or [])
        agent = create_agent(
            name="alleato-executive-intelligence-orchestrator",
            model=model,
            tools=[source_coverage, pm_portfolio_overview, *memory_tools, *_runtime_tools()],
            system_prompt=(
                f"{ORCHESTRATOR_PROMPT}\n\n"
                "Backend runtime scope: you are answering inside the Render FastAPI backend. "
                "Use source_coverage plus the enabled Alleato PM, resolver, RAG/search, "
                "recent-activity, SQL, Acumatica, draft-preview, and subagent tools as needed. "
                "Use recall_user_memory or recall_team_memory when business-wide context may depend on prior "
                "preferences, lessons, or organizational commitments. Use propose_memory_candidate only for "
                "stable facts that should be reviewed for future memory; it does not write to the database. "
                "If sources are missing, stale, or failed, say so plainly. "
                "Draft tools, if enabled, only produce approval previews; never imply that an email, invite, "
                "task, project mutation, Teams post, RFI, commitment, or change event was completed."
            ),
            subagents=_subagents_with_skills(_runtime_subagents(), skills),
            middleware=memory_middleware,
            **harness_options,
        )
        result = _invoke_agent(
            agent,
            {"messages": [{"role": "user", "content": _deep_agent_executive_prompt(request, organization, sources, evidence)}]},
            _deep_agent_config(request.user_id, request.session_id, scope="executive-intelligence"),
        )
        text = _extract_agent_text(result)
        if not text:
            raise RuntimeError("Deep Agents runtime returned an empty executive response.")
        return text, ToolTraceItem(
            agent="executive-intelligence-orchestrator",
            tool="deepagents_runtime",
            status="success",
            durationMs=max(0, int((time.perf_counter() - started) * 1000)),
            detail=(
                "Deep Agents runtime produced an executive synthesis from checked source coverage"
                + (" with durable memory." if memory_middleware else ".")
            ),
        )
    except Exception as exc:
        return None, ToolTraceItem(
            agent="executive-intelligence-orchestrator",
            tool="deepagents_runtime",
            status="failed",
            durationMs=max(0, int((time.perf_counter() - started) * 1000)),
            detail=str(exc),
        )


def build_project_status_contract_spike(
    request: DeepProjectIntelligenceRequest,
    store: Any,
    *,
    runtime: str = CONTRACT_SPIKE_MODE,
    create_agent: Optional[Callable[..., Any]] = None,
    model: str = "openai:gpt-5.4-mini",
) -> DeepProjectIntelligenceResponse:
    """Return a typed project-status packet with explicit source gaps."""

    started = time.perf_counter()
    try:
        project_row = _get_project(store, request.project_id)
    except Exception as exc:
        duration_ms = max(0, int((time.perf_counter() - started) * 1000))
        detail = f"Project lookup failed: {exc}"
        return _project_lookup_failure_response(
            request,
            duration_ms=duration_ms,
            answer=(
                f"I could not verify project {request.project_id} because the "
                f"project lookup failed: {exc}"
            ),
            notes=detail,
            detail=detail,
        )

    duration_ms = max(0, int((time.perf_counter() - started) * 1000))

    if project_row is None:
        return _project_lookup_failure_response(
            request,
            duration_ms=duration_ms,
            answer=(
                f"I could not resolve project {request.project_id}, so I did not run "
                "project intelligence synthesis."
            ),
            notes="Project lookup returned no row; synthesis is blocked.",
            detail="Project lookup returned no row.",
        )

    project = DeepProject(
        id=request.project_id,
        name=_clean_project_name(project_row, request.project_id),
    )
    sources = _missing_sources()
    source_traces: List[ToolTraceItem] = [
        ToolTraceItem(
            agent="project-intelligence-orchestrator",
            tool="source_tool_inventory",
            status="skipped",
            durationMs=0,
            detail="No read-only source probes were executed.",
        )
    ]
    evidence: List[EvidenceItem] = []
    sources, evidence, source_traces = _collect_source_coverage(store, request.project_id)
    checked_count = sum(1 for source in sources if source.status == "checked")
    failed_count = sum(1 for source in sources if source.status == "failed")
    missing_count = sum(1 for source in sources if source.status == "missing")
    confidence = "medium" if checked_count and failed_count == 0 else "low"
    runtime_answer: Optional[str] = None
    runtime_trace: Optional[ToolTraceItem] = None
    memory_candidates: list[MemoryCandidate] = []
    mode = CONTRACT_SPIKE_MODE

    if runtime == DEEP_AGENT_RUNTIME_MODE:
        runtime_answer, runtime_trace = _run_deep_agents_runtime(
            request,
            project,
            sources,
            evidence,
            store=store,
            memory_candidates=memory_candidates,
            create_agent=create_agent,
            model=model,
        )
        if runtime_answer:
            mode = DEEP_AGENT_RUNTIME_MODE
            confidence = "high" if checked_count == len(REQUIRED_SOURCE_TYPES) and failed_count == 0 else confidence

    answer = (
        runtime_answer
        or (
            f"Deep Agents project intelligence checked {checked_count} source "
            f"categor{'y' if checked_count == 1 else 'ies'} for {project.name}. "
            f"{missing_count} source categories are missing and {failed_count} failed. "
            "This endpoint is still backend-only; it returns coverage and evidence "
            "for the future orchestrator instead of loose chat synthesis."
        )
    )
    trace = [
        ToolTraceItem(
            agent="project-intelligence-orchestrator",
            tool="project_lookup",
            status="success",
            durationMs=duration_ms,
            detail="Resolved project row before contract-spike response.",
        ),
        *source_traces,
    ]
    if runtime_trace:
        trace.append(runtime_trace)

    return DeepProjectIntelligenceResponse(
        answer=answer,
        confidence=confidence,
        intent="project_status_risk",
        project=project,
        sourcesChecked=sources,
        evidence=evidence,
        recommendedActions=_recommended_actions(sources),
        toolTrace=trace,
        memoryCandidates=memory_candidates,
        orchestrator="deep-agents-project-intelligence",
        mode=mode,
    )


def build_executive_briefing_contract_spike(
    request: DeepExecutiveIntelligenceRequest,
    store: Any,
    *,
    runtime: str = CONTRACT_SPIKE_MODE,
    create_agent: Optional[Callable[..., Any]] = None,
    model: str = "openai:gpt-5.4-mini",
) -> DeepExecutiveIntelligenceResponse:
    """Return a typed business-wide packet with explicit source coverage."""

    organization = DeepOrganization(name=os.getenv("DEEP_AGENTS_ORGANIZATION_NAME", "Alleato"))
    sources, evidence, source_traces = _collect_executive_source_coverage(store, request)
    checked_count = sum(1 for source in sources if source.status == "checked")
    failed_count = sum(1 for source in sources if source.status == "failed")
    missing_count = sum(1 for source in sources if source.status == "missing")
    confidence = "medium" if checked_count and failed_count == 0 else "low"
    runtime_answer: Optional[str] = None
    runtime_trace: Optional[ToolTraceItem] = None
    memory_candidates: list[MemoryCandidate] = []
    mode = CONTRACT_SPIKE_MODE

    if runtime == DEEP_AGENT_RUNTIME_MODE:
        runtime_answer, runtime_trace = _run_deep_agents_executive_runtime(
            request,
            organization,
            sources,
            evidence,
            store=store,
            memory_candidates=memory_candidates,
            create_agent=create_agent,
            model=model,
        )
        if runtime_answer:
            mode = DEEP_AGENT_RUNTIME_MODE
            confidence = "high" if checked_count == len(REQUIRED_EXECUTIVE_SOURCE_TYPES) and failed_count == 0 else confidence

    answer = (
        runtime_answer
        or (
            f"Deep Agents executive intelligence checked {checked_count} source "
            f"categor{'y' if checked_count == 1 else 'ies'} for {organization.name}. "
            f"{missing_count} source categories are missing and {failed_count} failed. "
            "The packet returns source coverage and evidence for business-wide chat synthesis."
        )
    )

    trace = list(source_traces)
    if runtime_trace:
        trace.append(runtime_trace)

    return DeepExecutiveIntelligenceResponse(
        answer=answer,
        confidence=confidence,
        intent="business_briefing",
        organization=organization,
        sourcesChecked=sources,
        evidence=evidence,
        recommendedActions=_recommended_executive_actions(sources),
        toolTrace=trace,
        memoryCandidates=memory_candidates,
        orchestrator="deep-agents-executive-intelligence",
        mode=mode,
    )
